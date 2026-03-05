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

type EmailLeakData = {
  provider: "leakcheck";
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

async function queryLeakCheckPublic(email: string): Promise<{ found: boolean; breaches: BreachSummary[] }> {
  const url = `https://leakcheck.io/api/public?check=${encodeURIComponent(email)}`;
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const mapped = mapUpstreamStatus(response.status);
    const code =
      mapped === 401 || mapped === 403
        ? "UPSTREAM_AUTH_FAILED"
        : mapped === 429
          ? "UPSTREAM_RATE_LIMITED"
          : "UPSTREAM_REQUEST_FAILED";
    throw new UpstreamServiceError(mapped, code, `LeakCheck public request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  const root = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const found = Number(root.found ?? 0);
  const sources = Array.isArray(root.sources) ? root.sources : [];

  const breaches = sources
    .map((source) => {
      const item = typeof source === "object" && source !== null ? (source as Record<string, unknown>) : {};
      const name = item.name ? String(item.name) : "Unknown source";
      const breachDate = item.date ? String(item.date) : undefined;
      return {
        Name: name,
        Title: name,
        BreachDate: breachDate
      };
    })
    .filter((breach) => breach.Name);

  breaches.sort((a, b) => {
    if (!a.BreachDate) return 1;
    if (!b.BreachDate) return -1;
    return b.BreachDate.localeCompare(a.BreachDate);
  });

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

  try {
    const data = await queryLeakCheckPublic(email);
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
