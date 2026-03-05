import type { NextApiRequest, NextApiResponse } from "next";
import { sendError, sendOk, mapUpstreamStatus, type ApiResponse } from "@/lib/apiResponse";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { rateLimit } from "@/lib/rateLimit";
import { normalizeUrl } from "@/lib/validators";

type VtVerdict = "MALICIOUS" | "SUSPICIOUS" | "CLEAN" | "UNKNOWN";
type VtCategory = "malicious" | "suspicious";

type VtStats = {
  harmless: number;
  malicious: number;
  suspicious: number;
  undetected: number;
  timeout: number;
};

type VtVendor = {
  engine: string;
  category: VtCategory;
  result?: string;
};

type VtUrlData = {
  verdict: VtVerdict;
  stats: VtStats;
  vendors: VtVendor[];
};

type VtErrorCode = "UPSTREAM_AUTH_FAILED" | "UPSTREAM_RATE_LIMITED" | "UPSTREAM_REQUEST_FAILED";
type CachedEntry = {
  data: VtUrlData;
  cachedAt: number;
};

const CACHE_TTL_MS = 900_000;
const CACHE_MAX_ENTRIES = 200;
const vtCache = new Map<string, CachedEntry>();

function getClientIp(req: NextApiRequest) {
  return (
    (typeof req.headers["x-forwarded-for"] === "string" &&
      req.headers["x-forwarded-for"].split(",")[0]?.trim()) ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function getUrlId(url: string) {
  return Buffer.from(url).toString("base64url");
}

function appendDetails(message: string, details?: string) {
  if (!details) return message;
  return `${message} Details: ${details}`;
}

function toVtStats(input: unknown): VtStats {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  return {
    harmless: Number(source.harmless ?? 0),
    malicious: Number(source.malicious ?? 0),
    suspicious: Number(source.suspicious ?? 0),
    undetected: Number(source.undetected ?? 0),
    timeout: Number(source.timeout ?? 0)
  };
}

function computeVerdict(stats: VtStats): VtVerdict {
  if (stats.malicious > 0) return "MALICIOUS";
  if (stats.suspicious > 0 && stats.malicious === 0) return "SUSPICIOUS";
  if (stats.malicious === 0 && stats.suspicious === 0 && stats.harmless > 0) return "CLEAN";
  return "UNKNOWN";
}

function extractVendors(input: unknown): VtVendor[] {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const vendors: VtVendor[] = [];
  for (const [engine, payload] of Object.entries(source)) {
    const item = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
    const categoryRaw = String(item.category ?? "");
    if (categoryRaw !== "malicious" && categoryRaw !== "suspicious") continue;

    const vendor: VtVendor = {
      engine,
      category: categoryRaw as VtCategory
    };
    if (item.result) {
      vendor.result = String(item.result);
    }
    vendors.push(vendor);
    if (vendors.length >= 5) break;
  }
  return vendors;
}

function getVtError(status: number, details?: string): { status: number; code: VtErrorCode; message: string } {
  if (status === 401 || status === 403) {
    return {
      status,
      code: "UPSTREAM_AUTH_FAILED",
      message: appendDetails("VirusTotal request was not authorized.", details)
    };
  }
  if (status === 429) {
    return {
      status: 429,
      code: "UPSTREAM_RATE_LIMITED",
      message: appendDetails("VirusTotal rate limit exceeded. Please retry later.", details)
    };
  }
  if (status === 400 || status === 422) {
    return {
      status,
      code: "UPSTREAM_REQUEST_FAILED",
      message: appendDetails(
        "VirusTotal rejected the URL. It may be invalid, private, reserved, or unsupported.",
        details
      )
    };
  }
  if (status >= 400 && status < 500) {
    const mapped = mapUpstreamStatus(status);
    return {
      status: mapped === 502 ? status : mapped,
      code: "UPSTREAM_REQUEST_FAILED",
      message: appendDetails("VirusTotal request failed.", details)
    };
  }
  return {
    status: 502,
    code: "UPSTREAM_REQUEST_FAILED",
    message: appendDetails("VirusTotal request failed.", details)
  };
}

function getRecord(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
}

async function vtRequest(apiKey: string, path: string, init?: RequestInit) {
  return fetchWithTimeout(`https://www.virustotal.com/api/v3${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "x-apikey": apiKey,
      ...(init?.headers ?? {})
    }
  });
}

async function readVtErrorDetails(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as unknown;
    const root = getRecord(payload);
    const error = getRecord(root.error);
    const message = error.message ? String(error.message) : "";
    const code = error.code ? String(error.code) : "";
    const text = message || code;
    return text ? text.slice(0, 250) : "";
  } catch {
    try {
      const text = await response.text();
      return text ? text.slice(0, 250) : "";
    } catch {
      return "";
    }
  }
}

function isPrivateIpv4(hostname: string): boolean {
  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const octets = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if (octets.some((x) => x < 0 || x > 255)) return false;
  if (octets[0] === 10) return true;
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  if (octets[0] === 192 && octets[1] === 168) return true;
  if (octets[0] === 127) return true;
  return false;
}

function readCache(url: string): VtUrlData | null {
  const entry = vtCache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    vtCache.delete(url);
    return null;
  }
  return entry.data;
}

function writeCache(url: string, data: VtUrlData) {
  if (vtCache.has(url)) vtCache.delete(url);
  vtCache.set(url, { data, cachedAt: Date.now() });

  while (vtCache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = vtCache.keys().next().value;
    if (!oldestKey) break;
    vtCache.delete(oldestKey);
  }
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
    return sendError(res, 503, "MISSING_API_KEY", "URL scanner is not configured. Set VT_API_KEY to enable this feature.");
  }

  const urlInput = typeof req.body?.url === "string" ? req.body.url : "";
  const raw = urlInput.trim();
  if (raw) {
    try {
      const maybeUrl = new URL(raw.includes("://") ? raw : `https://${raw}`);
      const host = maybeUrl.hostname.toLowerCase();
      if (host.endsWith(".invalid")) {
        return sendError(
          res,
          400,
          "INVALID_INPUT",
          ".invalid is a reserved training TLD and may not be scannable by VirusTotal."
        );
      }
      if (isPrivateIpv4(host)) {
        return sendError(res, 400, "INVALID_INPUT", "Private network IPs are not scannable by VirusTotal.");
      }
    } catch {
      // fall through to existing URL validation
    }
  }

  const url = normalizeUrl(urlInput);
  if (!url) {
    return sendError(res, 400, "INVALID_INPUT", "Please provide a valid public http/https URL.");
  }

  const cached = readCache(url);
  if (cached) {
    return sendOk(res, cached);
  }

  try {
    const urlId = getUrlId(url);
    const lookupRes = await vtRequest(apiKey, `/urls/${encodeURIComponent(urlId)}`, { method: "GET" });

    if (lookupRes.ok) {
      const payload = getRecord(await lookupRes.json());
      const data = getRecord(payload.data);
      const attributes = getRecord(data.attributes);
      const stats = toVtStats(attributes.last_analysis_stats);
      const vendors = extractVendors(attributes.last_analysis_results);
      const responseData: VtUrlData = { verdict: computeVerdict(stats), stats, vendors };
      writeCache(url, responseData);
      return sendOk(res, responseData);
    }

    if (lookupRes.status !== 404) {
      const details = await readVtErrorDetails(lookupRes);
      const vtError = getVtError(lookupRes.status, details);
      return sendError(res, vtError.status, vtError.code, vtError.message);
    }

    const submitRes = await vtRequest(apiKey, "/urls", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `url=${encodeURIComponent(url)}`
    });

    if (!submitRes.ok) {
      const details = await readVtErrorDetails(submitRes);
      const vtError = getVtError(submitRes.status, details);
      return sendError(res, vtError.status, vtError.code, vtError.message);
    }

    const submitPayload = getRecord(await submitRes.json());
    const submitData = getRecord(submitPayload.data);
    const analysisId = String(submitData.id ?? "");
    if (!analysisId) {
      return sendError(res, 502, "UPSTREAM_REQUEST_FAILED", "VirusTotal returned no analysis id.");
    }

    const maxAttempts = 6;
    const delayMs = 1200;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const analysisRes = await vtRequest(apiKey, `/analyses/${encodeURIComponent(analysisId)}`, { method: "GET" });
      if (!analysisRes.ok) {
        const details = await readVtErrorDetails(analysisRes);
        const vtError = getVtError(analysisRes.status, details);
        return sendError(res, vtError.status, vtError.code, vtError.message);
      }

      const payload = getRecord(await analysisRes.json());
      const data = getRecord(payload.data);
      const attributes = getRecord(data.attributes);
      const status = String(attributes.status ?? "");
      const stats = toVtStats(attributes.stats);
      const vendors = extractVendors(attributes.results);

      if (status === "completed") {
        const responseData: VtUrlData = { verdict: computeVerdict(stats), stats, vendors };
        writeCache(url, responseData);
        return sendOk(res, responseData);
      }

      if (attempt < maxAttempts - 1) {
        await sleep(delayMs);
      }
    }

    return sendError(res, 503, "UPSTREAM_TIMEOUT", "VirusTotal analysis not ready yet. Please retry.");
  } catch (error) {
    if (error instanceof Error && error.message === "UPSTREAM_TIMEOUT") {
      return sendError(res, 503, "UPSTREAM_TIMEOUT", "VirusTotal analysis not ready yet. Please retry.");
    }
    return sendError(res, 502, "UPSTREAM_REQUEST_FAILED", "Failed to reach VirusTotal.");
  }
}
