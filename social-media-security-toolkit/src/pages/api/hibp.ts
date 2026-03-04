import type { NextApiRequest, NextApiResponse } from "next";
import { sendError, sendOk, mapUpstreamStatus, type ApiResponse } from "@/lib/apiResponse";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { rateLimit } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/validators";

type BreachSummary = {
  Name: string;
  Title?: string;
  BreachDate?: string;
  Domain?: string;
};

type LeakProvider = "hibp" | "leakcheck";

type EmailLeakData = {
  provider: LeakProvider;
  found: boolean;
  breaches: BreachSummary[];
};

class UpstreamServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

function getClientIp(req: NextApiRequest) {
  return (
    (typeof req.headers["x-forwarded-for"] === "string" &&
      req.headers["x-forwarded-for"].split(",")[0]?.trim()) ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

async function queryHibp(email: string, apiKey: string): Promise<{ found: boolean; breaches: BreachSummary[] }> {
  const url = `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`;
  const response = await fetchWithTimeout(url, {
    headers: {
      "hibp-api-key": apiKey,
      "user-agent": "social-media-security-toolkit (academic project)"
    }
  });

  if (response.status === 404) {
    return { found: false, breaches: [] };
  }

  if (!response.ok) {
    const mapped = mapUpstreamStatus(response.status);
    const code = mapped === 401 || mapped === 403 ? "UPSTREAM_AUTH_FAILED" : "UPSTREAM_REQUEST_FAILED";
    throw new UpstreamServiceError(mapped, code, `HIBP request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) {
    throw new UpstreamServiceError(502, "INVALID_UPSTREAM_RESPONSE", "HIBP returned an unexpected response format.");
  }

  const breaches = payload
    .map((item) => {
      const obj = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
      return {
        Name: String(obj.Name ?? ""),
        Title: obj.Title ? String(obj.Title) : undefined,
        Domain: obj.Domain ? String(obj.Domain) : undefined,
        BreachDate: obj.BreachDate ? String(obj.BreachDate) : undefined
      };
    })
    .filter((breach) => breach.Name);

  return { found: breaches.length > 0, breaches };
}

async function queryLeakCheck(email: string, apiKey: string): Promise<{ found: boolean; breaches: BreachSummary[] }> {
  const url = `https://leakcheck.io/api/v2/query/${encodeURIComponent(email)}?type=email`;
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "application/json",
      "X-API-Key": apiKey,
      "user-agent": "social-media-security-toolkit (academic project)"
    }
  });

  if (response.status === 404) {
    return { found: false, breaches: [] };
  }

  if (!response.ok) {
    const mapped = mapUpstreamStatus(response.status);
    const code = mapped === 401 || mapped === 403 ? "UPSTREAM_AUTH_FAILED" : "UPSTREAM_REQUEST_FAILED";
    throw new UpstreamServiceError(mapped, code, `LeakCheck request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  const root = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const found = Number(root.found ?? 0);
  const result = Array.isArray(root.result) ? root.result : [];

  const breaches = result
    .map((row) => {
      const item = typeof row === "object" && row !== null ? (row as Record<string, unknown>) : {};
      const source =
        typeof item.source === "object" && item.source !== null
          ? (item.source as Record<string, unknown>)
          : {};
      const name = source.name ? String(source.name) : "Unknown source";
      const breachDate = source.breach_date ? String(source.breach_date) : undefined;
      return {
        Name: name,
        Title: name,
        BreachDate: breachDate
      };
    })
    .filter((breach) => breach.Name);

  return { found: found > 0, breaches };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<EmailLeakData>>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  }

  const emailRaw = typeof req.query.email === "string" ? req.query.email : "";
  const email = emailRaw.trim();
  if (!isValidEmail(email)) {
    return sendError(res, 400, "INVALID_INPUT", "Please provide a valid email address.");
  }

  const rl = rateLimit({ key: `hibp:${getClientIp(req)}`, limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return sendError(res, 429, "RATE_LIMITED", "Too many requests. Please retry later.", {
      "Retry-After": String(rl.retryAfterSeconds)
    });
  }

  const hibpKey = process.env.HIBP_API_KEY;
  const leakCheckKey = process.env.LEAKCHECK_API_KEY;

  if (!hibpKey && !leakCheckKey) {
    return sendError(
      res,
      503,
      "MISSING_API_KEY",
      "Email leak checker is not configured. Set HIBP_API_KEY or LEAKCHECK_API_KEY."
    );
  }

  try {
    if (hibpKey) {
      const data = await queryHibp(email, hibpKey);
      return sendOk(res, { provider: "hibp", found: data.found, breaches: data.breaches });
    }

    const data = await queryLeakCheck(email, leakCheckKey as string);
    return sendOk(res, { provider: "leakcheck", found: data.found, breaches: data.breaches });
  } catch (error) {
    if (error instanceof UpstreamServiceError) {
      return sendError(res, error.status, error.code, error.message);
    }

    if (error instanceof Error && error.message === "UPSTREAM_TIMEOUT") {
      return sendError(res, 503, "UPSTREAM_TIMEOUT", "Upstream provider timed out.");
    }

    return sendError(res, 502, "UPSTREAM_REQUEST_FAILED", "Failed to fetch data from upstream provider.");
  }
}

