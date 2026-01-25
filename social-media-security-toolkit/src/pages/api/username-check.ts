import type { NextApiRequest, NextApiResponse } from "next";
import { isValidUsername } from "@/lib/validators";
import { rateLimit } from "@/lib/rateLimit";

async function checkGithub(username: string): Promise<boolean> {
  const r = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: { "user-agent": "social-media-security-toolkit (academic project)" }
  });
  if (r.status === 404) return false;
  if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
  return true;
}

async function checkReddit(username: string): Promise<boolean> {
  const r = await fetch(`https://www.reddit.com/user/${encodeURIComponent(username)}/about.json`, {
    headers: { "user-agent": "social-media-security-toolkit (academic project)" }
  });
  if (r.status === 404) return false;
  if (!r.ok) throw new Error(`Reddit error: ${r.status}`);
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const platform = typeof req.query.platform === "string" ? req.query.platform : "";
  const usernameRaw = typeof req.query.username === "string" ? req.query.username : "";
  const username = usernameRaw.trim();

  if (!isValidUsername(username)) {
    return res.status(400).json({ ok: false, error: "Invalid username" });
  }

  const ip =
    (typeof req.headers["x-forwarded-for"] === "string" && req.headers["x-forwarded-for"].split(",")[0]?.trim()) ||
    req.socket.remoteAddress ||
    "unknown";
  const rl = rateLimit({ key: `uname:${ip}`, limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfterSeconds));
    return res.status(429).json({ ok: false, error: "Too many requests. Please retry later." });
  }

  try {
    if (platform === "github") {
      const exists = await checkGithub(username);
      return res.status(200).json({ ok: true, exists });
    }

    if (platform === "reddit") {
      const exists = await checkReddit(username);
      return res.status(200).json({ ok: true, exists });
    }

    return res.status(400).json({
      ok: false,
      error:
        "Verification not supported for this platform. This is intentional to avoid scraping and ToS issues; links are still generated on the client."
    });
  } catch (e) {
    return res.status(200).json({
      ok: false,
      error: e instanceof Error ? e.message : "Unknown error"
    });
  }
}

