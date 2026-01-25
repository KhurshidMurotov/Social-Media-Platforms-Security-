import type { NextApiRequest, NextApiResponse } from "next";
import { isValidEmail } from "@/lib/validators";
import { rateLimit } from "@/lib/rateLimit";

type BreachSummary = {
  Name: string;
  Title?: string;
  BreachDate?: string;
  Domain?: string;
};

async function queryHibp(email: string, apiKey: string): Promise<{ found: boolean; breaches: BreachSummary[] }> {
  const url = `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`;
  const hibpRes = await fetch(url, {
    headers: {
      "hibp-api-key": apiKey,
      "user-agent": "social-media-security-toolkit (academic project)"
    }
  });

  if (hibpRes.status === 404) {
    return { found: false, breaches: [] };
  }

  if (!hibpRes.ok) {
    const text = await hibpRes.text();
    throw new Error(`HIBP request failed (${hibpRes.status}). ${text}`.slice(0, 400));
  }

  const breaches = (await hibpRes.json()) as unknown;
  if (!Array.isArray(breaches)) {
    throw new Error("Unexpected HIBP response");
  }

  const simplified = breaches.map((b) => {
    const obj = typeof b === "object" && b !== null ? (b as Record<string, unknown>) : {};
    return {
      Name: String(obj.Name ?? ""),
      Title: obj.Title ? String(obj.Title) : undefined,
      Domain: obj.Domain ? String(obj.Domain) : undefined,
      BreachDate: obj.BreachDate ? String(obj.BreachDate) : undefined
    };
  });

  return { found: true, breaches: simplified };
}

async function queryLeakCheck(email: string, apiKey: string): Promise<{ found: boolean; breaches: BreachSummary[] }> {
  const url = `https://leakcheck.io/api/v2/query/${encodeURIComponent(email)}?type=email`;
  const r = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-API-Key": apiKey,
      "user-agent": "social-media-security-toolkit (academic project)"
    }
  });

  if (r.status === 404) return { found: false, breaches: [] };

  if (!r.ok) {
    const text = await r.text();
    // Common when a key is missing/invalid or plan isn't active.
    if (r.status === 401 || text.includes("Invalid X-API-Key")) {
      throw new Error("LEAKCHECK_INVALID_KEY");
    }
    throw new Error(`LeakCheck request failed (${r.status}). ${text}`.slice(0, 400));
  }

  const json = (await r.json()) as unknown;
  const obj = typeof json === "object" && json !== null ? (json as Record<string, unknown>) : {};
  const found = Number(obj.found ?? 0);
  const result = Array.isArray(obj.result) ? obj.result : [];

  // IMPORTANT: do not expose compromised fields (passwords, etc). Only show source info.
  const breaches: BreachSummary[] = result
    .map((row) => {
      const rowObj = typeof row === "object" && row !== null ? (row as Record<string, unknown>) : {};
      const sourceObj =
        typeof rowObj.source === "object" && rowObj.source !== null
          ? (rowObj.source as Record<string, unknown>)
          : {};
      const name = sourceObj.name ? String(sourceObj.name) : "Unknown source";
      const breachDate = sourceObj.breach_date ? String(sourceObj.breach_date) : undefined;
      return {
        Name: name,
        Title: name,
        BreachDate: breachDate
      };
    })
    .filter((b) => b.Name);

  return { found: found > 0, breaches };
}

async function queryLeakCheckPublic(email: string): Promise<{ found: boolean; breaches: BreachSummary[] }> {
  const url = `https://leakcheck.io/api/public?check=${encodeURIComponent(email)}`;
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`LeakCheck public request failed (${r.status}). ${text}`.slice(0, 400));
  }

  const json = (await r.json()) as unknown;
  const obj = typeof json === "object" && json !== null ? (json as Record<string, unknown>) : {};
  const found = Number(obj.found ?? 0);
  const sources = Array.isArray(obj.sources) ? obj.sources : [];
  const breaches: BreachSummary[] = sources
    .map((s) => {
      const src = typeof s === "object" && s !== null ? (s as Record<string, unknown>) : {};
      const name = src.name ? String(src.name) : "Unknown source";
      const date = src.date ? String(src.date) : undefined;
      return { Name: name, Title: name, BreachDate: date };
    })
    .filter((b) => b.Name);

  return { found: found > 0, breaches };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const emailRaw = typeof req.query.email === "string" ? req.query.email : "";
  const email = emailRaw.trim();
  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: "Invalid email" });
  }

  const ip =
    (typeof req.headers["x-forwarded-for"] === "string" && req.headers["x-forwarded-for"].split(",")[0]?.trim()) ||
    req.socket.remoteAddress ||
    "unknown";

  const rl = rateLimit({ key: `hibp:${ip}`, limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfterSeconds));
    return res.status(429).json({ ok: false, error: "Too many requests. Please retry later." });
  }

  const hibpKey = process.env.HIBP_API_KEY;
  const leakCheckKey = process.env.LEAKCHECK_API_KEY;
  // Note: LeakCheck also has a Public API (no key). We'll use it as a safe fallback.

  try {
    // Prefer HIBP when configured; otherwise try LeakCheck Pro, then LeakCheck Public.
    let data: { found: boolean; breaches: BreachSummary[] } | null = null;

    if (hibpKey) {
      data = await queryHibp(email, hibpKey);
    } else if (leakCheckKey) {
      try {
        data = await queryLeakCheck(email, leakCheckKey);
      } catch (e) {
        if (e instanceof Error && e.message === "LEAKCHECK_INVALID_KEY") {
          data = await queryLeakCheckPublic(email);
        } else {
          throw e;
        }
      }
    } else {
      data = await queryLeakCheckPublic(email);
    }

    return res.status(200).json({ ok: true, found: data.found, breaches: data.breaches });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
  }
}

