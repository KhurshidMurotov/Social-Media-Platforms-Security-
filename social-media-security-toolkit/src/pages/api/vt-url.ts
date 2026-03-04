import type { NextApiRequest, NextApiResponse } from "next";
import { sendError, sendOk, mapUpstreamStatus, type ApiResponse } from "@/lib/apiResponse";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { rateLimit } from "@/lib/rateLimit";
import { normalizeUrl } from "@/lib/validators";

type VtStats = Record<string, number>;
type VtVerdict = "malicious" | "suspicious" | "clean" | "unknown";

type VtUrlData = {
  url: string;
  analysisId: string;
  stats: VtStats;
  verdict: VtVerdict;
};

function getClientIp(req: NextApiRequest) {
  return (
    (typeof req.headers["x-forwarded-for"] === "string" &&
      req.headers["x-forwarded-for"].split(",")[0]?.trim()) ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function computeVerdict(stats: VtStats): VtVerdict {
  const malicious = stats.malicious ?? 0;
  const suspicious = stats.suspicious ?? 0;
  const harmless = stats.harmless ?? 0;

  if (malicious > 0) return "malicious";
  if (suspicious > 0) return "suspicious";
  if (harmless > 0 && malicious === 0 && suspicious === 0) return "clean";
  return "unknown";
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<VtUrlData>>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  }

  const rl = rateLimit({ key: `vt:${getClientIp(req)}`, limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return sendError(res, 429, "RATE_LIMITED", "Too many requests. Please retry later.", {
      "Retry-After": String(rl.retryAfterSeconds)
    });
  }

  const apiKey = process.env.VT_API_KEY;
  if (!apiKey) {
    return sendError(
      res,
      503,
      "MISSING_API_KEY",
      "URL scanner is not configured. Set VT_API_KEY to enable this feature."
    );
  }

  const urlInput = typeof req.body?.url === "string" ? req.body.url : "";
  const url = normalizeUrl(urlInput);
  if (!url) {
    return sendError(res, 400, "INVALID_INPUT", "Please provide a valid public http/https URL.");
  }

  try {
    const submitRes = await fetchWithTimeout("https://www.virustotal.com/api/v3/urls", {
      method: "POST",
      headers: {
        "x-apikey": apiKey,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: `url=${encodeURIComponent(url)}`
    });

    if (!submitRes.ok) {
      const mapped = mapUpstreamStatus(submitRes.status);
      const code = mapped === 401 || mapped === 403 ? "UPSTREAM_AUTH_FAILED" : "UPSTREAM_REQUEST_FAILED";
      return sendError(res, mapped, code, `VirusTotal submit failed with status ${submitRes.status}.`);
    }

    const submitJson = (await submitRes.json()) as unknown;
    const submitObj = typeof submitJson === "object" && submitJson !== null ? (submitJson as Record<string, unknown>) : {};
    const dataObj =
      typeof submitObj.data === "object" && submitObj.data !== null ? (submitObj.data as Record<string, unknown>) : {};
    const analysisId = String(dataObj.id ?? "");

    if (!analysisId) {
      return sendError(res, 502, "INVALID_UPSTREAM_RESPONSE", "VirusTotal returned no analysis id.");
    }

    for (let i = 0; i < 3; i += 1) {
      const analysisRes = await fetchWithTimeout(
        `https://www.virustotal.com/api/v3/analyses/${encodeURIComponent(analysisId)}`,
        { headers: { "x-apikey": apiKey } }
      );

      if (!analysisRes.ok) {
        const mapped = mapUpstreamStatus(analysisRes.status);
        const code = mapped === 401 || mapped === 403 ? "UPSTREAM_AUTH_FAILED" : "UPSTREAM_REQUEST_FAILED";
        return sendError(res, mapped, code, `VirusTotal analysis failed with status ${analysisRes.status}.`);
      }

      const analysisJson = (await analysisRes.json()) as unknown;
      const analysisObj =
        typeof analysisJson === "object" && analysisJson !== null ? (analysisJson as Record<string, unknown>) : {};
      const data =
        typeof analysisObj.data === "object" && analysisObj.data !== null ? (analysisObj.data as Record<string, unknown>) : {};
      const attrs =
        typeof data.attributes === "object" && data.attributes !== null ? (data.attributes as Record<string, unknown>) : {};
      const status = String(attrs.status ?? "");
      const stats =
        typeof attrs.stats === "object" && attrs.stats !== null ? (attrs.stats as VtStats) : ({} as VtStats);

      if (status === "completed" || status === "completed_successfully") {
        return sendOk(res, {
          url,
          analysisId,
          stats,
          verdict: computeVerdict(stats)
        });
      }

      await sleep(1500);
    }

    return sendOk(res, {
      url,
      analysisId,
      stats: {},
      verdict: "unknown"
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UPSTREAM_TIMEOUT") {
      return sendError(res, 503, "UPSTREAM_TIMEOUT", "VirusTotal request timed out.");
    }

    return sendError(res, 502, "UPSTREAM_REQUEST_FAILED", "Failed to reach VirusTotal.");
  }
}

