import type { NextApiRequest, NextApiResponse } from "next";
import { sendError, sendOk, mapUpstreamStatus, type ApiResponse } from "@/lib/apiResponse";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { rateLimit } from "@/lib/rateLimit";
import { isValidUsername } from "@/lib/validators";

type SupportedPlatform =
  | "github"
  | "reddit"
  | "devto"
  | "keybase"
  | "instagram"
  | "x"
  | "tiktok"
  | "facebook"
  | "youtube";

type UsernameCheckData = {
  platform: SupportedPlatform;
  username: string;
  exists: boolean | null;
  verified: boolean;
  profileUrl: string;
  note?: string;
};

type VerifyResult =
  | { exists: boolean; verified: true; note?: string }
  | { exists: null; verified: false; note: string };

class UpstreamStatusError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const profileUrlByPlatform: Record<SupportedPlatform, (username: string) => string> = {
  github: (u) => `https://github.com/${encodeURIComponent(u)}`,
  reddit: (u) => `https://www.reddit.com/user/${encodeURIComponent(u)}/`,
  devto: (u) => `https://dev.to/${encodeURIComponent(u)}`,
  keybase: (u) => `https://keybase.io/${encodeURIComponent(u)}`,
  instagram: (u) => `https://www.instagram.com/${encodeURIComponent(u)}/`,
  x: (u) => `https://x.com/${encodeURIComponent(u)}`,
  tiktok: (u) => `https://www.tiktok.com/@${encodeURIComponent(u)}`,
  facebook: (u) => `https://www.facebook.com/${encodeURIComponent(u)}`,
  youtube: (u) => `https://www.youtube.com/@${encodeURIComponent(u)}`
};

function getClientIp(req: NextApiRequest) {
  return (
    (typeof req.headers["x-forwarded-for"] === "string" &&
      req.headers["x-forwarded-for"].split(",")[0]?.trim()) ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function toSupportedPlatform(value: string): SupportedPlatform | null {
  if (
    value === "github" ||
    value === "reddit" ||
    value === "devto" ||
    value === "keybase" ||
    value === "instagram" ||
    value === "x" ||
    value === "tiktok" ||
    value === "facebook" ||
    value === "youtube"
  ) {
    return value;
  }
  return null;
}

function mapUpstreamError(res: NextApiResponse, status: number) {
  const mapped = mapUpstreamStatus(status);
  if (mapped === 429) {
    return sendError(res, 429, "UPSTREAM_RATE_LIMITED", "Username verification provider rate limit exceeded.");
  }
  if (mapped === 503) {
    return sendError(res, 503, "UPSTREAM_UNAVAILABLE", "Username verification provider is temporarily unavailable.");
  }
  if (mapped === 401 || mapped === 403) {
    return sendError(res, mapped, "UPSTREAM_AUTH_FAILED", "Username verification request was not authorized.");
  }
  return sendError(res, 502, "UPSTREAM_REQUEST_FAILED", "Username verification request failed.");
}

async function checkGithub(username: string): Promise<VerifyResult> {
  const response = await fetchWithTimeout(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: { "user-agent": "social-media-security-toolkit (academic project)" }
  });
  if (response.status === 200) return { exists: true, verified: true };
  if (response.status === 404) return { exists: false, verified: true };
  throw new UpstreamStatusError(response.status, `GitHub returned ${response.status}`);
}

async function checkReddit(username: string): Promise<VerifyResult> {
  const response = await fetchWithTimeout(`https://www.reddit.com/user/${encodeURIComponent(username)}/about.json`, {
    headers: { "user-agent": "social-media-security-toolkit (academic project)" }
  });
  if (response.status === 200) return { exists: true, verified: true };
  if (response.status === 404) return { exists: false, verified: true };
  if (response.status === 403 || response.status === 429) {
    return { exists: null, verified: false, note: "check blocked" };
  }
  throw new UpstreamStatusError(response.status, `Reddit returned ${response.status}`);
}

async function checkByHeadThenGet(url: string): Promise<Response> {
  const head = await fetchWithTimeout(url, { method: "HEAD" });
  if (head.status === 200 || head.status === 404) return head;
  if (head.status === 405 || head.status === 501) {
    return fetchWithTimeout(url, { method: "GET" });
  }
  return fetchWithTimeout(url, { method: "GET" });
}

async function checkProfileByStatus(url: string): Promise<VerifyResult> {
  const response = await checkByHeadThenGet(url);
  if (response.status === 200) return { exists: true, verified: true };
  if (response.status === 404) return { exists: false, verified: true };
  if (response.status === 403 || response.status === 429) {
    return { exists: null, verified: false, note: "check blocked" };
  }
  throw new UpstreamStatusError(response.status, `Profile endpoint returned ${response.status}`);
}

async function checkPlatform(platform: SupportedPlatform, username: string): Promise<VerifyResult> {
  if (platform === "github") return checkGithub(username);
  if (platform === "reddit") return checkReddit(username);
  const url = profileUrlByPlatform[platform](username);
  return checkProfileByStatus(url);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<UsernameCheckData>>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  }

  const platformRaw = typeof req.query.platform === "string" ? req.query.platform : "";
  const platform = toSupportedPlatform(platformRaw);
  const usernameRaw = typeof req.query.username === "string" ? req.query.username : "";
  const username = usernameRaw.trim();

  if (!platform) {
    return sendError(
      res,
      400,
      "UNSUPPORTED_PLATFORM",
      "Verification is not supported for this platform; only links are generated."
    );
  }

  if (!isValidUsername(username)) {
    return sendError(res, 400, "INVALID_INPUT", "Please provide a valid username.");
  }

  const rl = rateLimit({ key: `uname:${getClientIp(req)}`, limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return sendError(res, 429, "RATE_LIMITED", "Too many requests. Please retry later.", {
      "Retry-After": String(rl.retryAfterSeconds)
    });
  }

  try {
    const verify = await checkPlatform(platform, username);
    return sendOk(res, {
      platform,
      username,
      exists: verify.exists,
      verified: verify.verified,
      profileUrl: profileUrlByPlatform[platform](username),
      note: verify.note
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UPSTREAM_TIMEOUT") {
      return sendError(res, 503, "UPSTREAM_UNAVAILABLE", "Username verification provider timed out.");
    }
    if (error instanceof UpstreamStatusError) {
      return mapUpstreamError(res, error.status);
    }
    return sendError(res, 502, "UPSTREAM_REQUEST_FAILED", "Failed to verify username with upstream platform.");
  }
}

