import type { NextApiRequest, NextApiResponse } from "next";
import { sendError, sendOk, mapUpstreamStatus, type ApiResponse } from "@/lib/apiResponse";
import { rateLimit } from "@/lib/rateLimit";
import {
  checkPlatform,
  profileUrlByPlatform,
  type SupportedPlatform,
  UpstreamStatusError
} from "@/lib/usernameVerification";
import { isValidUsername } from "@/lib/validators";

type UsernameCheckData = {
  platform: SupportedPlatform;
  username: string;
  exists: boolean | null;
  verified: boolean;
  profileUrl: string;
  note?: string;
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

