import type { NextApiRequest, NextApiResponse } from "next";
import { sendError, sendOk, mapUpstreamStatus, type ApiResponse } from "@/lib/apiResponse";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { rateLimit } from "@/lib/rateLimit";
import { isValidUsername } from "@/lib/validators";

type UsernameCheckData = {
  exists: boolean;
};

function getClientIp(req: NextApiRequest) {
  return (
    (typeof req.headers["x-forwarded-for"] === "string" &&
      req.headers["x-forwarded-for"].split(",")[0]?.trim()) ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

async function checkGithub(username: string): Promise<boolean> {
  const response = await fetchWithTimeout(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: { "user-agent": "social-media-security-toolkit (academic project)" }
  });
  if (response.status === 404) return false;
  if (!response.ok) {
    const mapped = mapUpstreamStatus(response.status);
    throw new Error(`GITHUB_ERROR:${mapped}`);
  }
  return true;
}

async function checkReddit(username: string): Promise<boolean> {
  const response = await fetchWithTimeout(`https://www.reddit.com/user/${encodeURIComponent(username)}/about.json`, {
    headers: { "user-agent": "social-media-security-toolkit (academic project)" }
  });
  if (response.status === 404) return false;
  if (!response.ok) {
    const mapped = mapUpstreamStatus(response.status);
    throw new Error(`REDDIT_ERROR:${mapped}`);
  }
  return true;
}

function parseUpstreamErrorStatus(message: string): number | null {
  const match = message.match(/:(\d{3})$/);
  return match ? Number(match[1]) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<UsernameCheckData>>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendError(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed.");
  }

  const platform = typeof req.query.platform === "string" ? req.query.platform : "";
  const usernameRaw = typeof req.query.username === "string" ? req.query.username : "";
  const username = usernameRaw.trim();

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
    if (platform === "github") {
      const exists = await checkGithub(username);
      return sendOk(res, { exists });
    }

    if (platform === "reddit") {
      const exists = await checkReddit(username);
      return sendOk(res, { exists });
    }

    return sendError(
      res,
      400,
      "UNSUPPORTED_PLATFORM",
      "Verification is not supported for this platform; only links are generated."
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UPSTREAM_TIMEOUT") {
      return sendError(res, 503, "UPSTREAM_TIMEOUT", "Upstream platform request timed out.");
    }

    if (error instanceof Error) {
      const upstreamStatus = parseUpstreamErrorStatus(error.message);
      if (upstreamStatus) {
        const code =
          upstreamStatus === 401 || upstreamStatus === 403 ? "UPSTREAM_AUTH_FAILED" : "UPSTREAM_REQUEST_FAILED";
        return sendError(res, upstreamStatus, code, "Username verification request failed.");
      }
    }

    return sendError(res, 502, "UPSTREAM_REQUEST_FAILED", "Failed to verify username with upstream platform.");
  }
}

