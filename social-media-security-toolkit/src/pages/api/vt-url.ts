import type { NextApiRequest, NextApiResponse } from "next";
import { normalizeUrl } from "@/lib/validators";
import { rateLimit } from "@/lib/rateLimit";

type VtStats = Record<string, number>;

function computeVerdict(stats: VtStats): "malicious" | "suspicious" | "clean" | "unknown" {
  const malicious = stats.malicious ?? 0;
  const suspicious = stats.suspicious ?? 0;
  const harmless = stats.harmless ?? 0;

  if (malicious > 0) return "malicious";
  if (suspicious > 0) return "suspicious";
  if (harmless > 0 && malicious === 0 && suspicious === 0) return "clean";
  return "unknown";
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const ip =
    (typeof req.headers["x-forwarded-for"] === "string" && req.headers["x-forwarded-for"].split(",")[0]?.trim()) ||
    req.socket.remoteAddress ||
    "unknown";
  const rl = rateLimit({ key: `vt:${ip}`, limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfterSeconds));
    return res.status(429).json({ ok: false, error: "Too many requests. Please retry later." });
  }

  const apiKey = process.env.VT_API_KEY;
  if (!apiKey) {
    return res.status(501).json({
      ok: false,
      code: "MISSING_VT_KEY",
      error: "VirusTotal API key is not configured. Set VT_API_KEY in Vercel / .env.local."
    });
  }

  const urlInput = typeof req.body?.url === "string" ? req.body.url : "";
  const url = normalizeUrl(urlInput);
  if (!url) {
    return res.status(400).json({ ok: false, error: "Invalid URL" });
  }

  try {
    // 1) Submit URL for analysis
    const submitRes = await fetch("https://www.virustotal.com/api/v3/urls", {
      method: "POST",
      headers: {
        "x-apikey": apiKey,
        "content-type": "application/x-www-form-urlencoded"
      },
      body: `url=${encodeURIComponent(url)}`
    });

    if (!submitRes.ok) {
      const text = await submitRes.text();
      return res.status(submitRes.status).json({
        ok: false,
        code: "VT_SUBMIT_FAILED",
        error: `VirusTotal submit failed (${submitRes.status}). ${text}`.slice(0, 400)
      });
    }

    const submitJson = (await submitRes.json()) as unknown;
    const submitObj = typeof submitJson === "object" && submitJson !== null ? (submitJson as Record<string, unknown>) : {};
    const dataObj =
      typeof submitObj.data === "object" && submitObj.data !== null ? (submitObj.data as Record<string, unknown>) : {};
    const analysisId = String(dataObj.id ?? "");
    if (!analysisId) {
      return res.status(502).json({ ok: false, error: "VirusTotal returned no analysis id" });
    }

    // 2) Poll analysis a few times (best-effort). If not ready, return id.
    for (let i = 0; i < 3; i += 1) {
      const analysisRes = await fetch(`https://www.virustotal.com/api/v3/analyses/${encodeURIComponent(analysisId)}`, {
        headers: { "x-apikey": apiKey }
      });

      if (!analysisRes.ok) {
        const text = await analysisRes.text();
        return res.status(analysisRes.status).json({
          ok: false,
          code: "VT_ANALYSIS_FAILED",
          error: `VirusTotal analysis fetch failed (${analysisRes.status}). ${text}`.slice(0, 400)
        });
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
        return res.status(200).json({
          ok: true,
          url,
          analysisId,
          stats,
          verdict: computeVerdict(stats)
        });
      }

      await sleep(1500);
    }

    return res.status(200).json({
      ok: true,
      url,
      analysisId,
      stats: {},
      verdict: "unknown"
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
  }
}

