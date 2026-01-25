import { useState } from "react";
import { normalizeUrl } from "@/lib/validators";
import { ResultBox } from "@/components/ResultBox";

type VtVerdict = "malicious" | "suspicious" | "clean" | "unknown";
type VtResponse =
  | { ok: true; url: string; verdict: VtVerdict; stats: Record<string, number>; analysisId?: string }
  | { ok: false; error: string; code?: string };

export function UrlScanner() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VtResponse | null>(null);

  const normalized = normalizeUrl(input);
  const examples = [
    // Intentionally non-real / non-active "malicious-looking" examples (use for awareness UX)
    // Diverse examples: typosquatting, suspicious domains, short links, mixed content
    "https://login-microsoftonline-com.account-verify.example/secure",
    "http://bit.ly/suspicious-redirect-xyz",
    "https://amaz0n.com/deals/special-offer",
    "https://paypal.com.security-check.invalid/signin",
    "http://192.168.1.100:8080/update-required",
    "https://appleid.apple.com.verify-session.example/reset",
    "http://free-gift-claim.tk/claim-now",
    "https://dropbox.com.share-file.example/login",
    "https://banking-update-required.example/confirm",
    "http://suspicious-short.link/abc123xyz",
    "https://faceb00k.com/login/verify-account",
    "http://unsecured-site.info/enter-details"
  ];

  async function scan() {
    if (!normalized) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/vt-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized })
      });
      const json = (await res.json()) as VtResponse;
      setResult(json);
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  }

  const tone =
    !result || !result.ok
      ? "neutral"
      : result.verdict === "malicious"
        ? "bad"
        : result.verdict === "suspicious"
          ? "warn"
          : result.verdict === "clean"
            ? "good"
            : "neutral";

  return (
    <div>
      <div className="row">
        <input
          type="text"
          value={input}
          placeholder="Enter a URL (e.g. https://example.com)"
          onChange={(e) => setInput(e.target.value)}
        />
        <button disabled={!normalized || loading} onClick={scan}>
          {loading ? "Scanning..." : "Scan URL"}
        </button>
        {normalized ? <span className="pill">{new URL(normalized).hostname}</span> : null}
      </div>

      <ResultBox tone="neutral" title="Example suspicious URLs (non-clickable)">
        <div style={{ color: "rgba(255,255,255,0.72)", marginBottom: 8 }}>
          These are fictional, “malicious-looking” examples for awareness training.
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {examples.map((u) => (
            <li key={u} style={{ marginBottom: 6 }}>
              <span style={{ userSelect: "text", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" }}>
                {u}
              </span>
            </li>
          ))}
        </ul>
      </ResultBox>

      {!normalized && input.trim() ? (
        <ResultBox tone="warn" title="Validation">
          Please enter a valid http/https URL (not localhost/private IP).
        </ResultBox>
      ) : null}

      {result ? (
        result.ok ? (
          <ResultBox tone={tone} title={`Verdict: ${result.verdict.toUpperCase()}`}>
            <div style={{ marginBottom: 8 }}>Vendor detections (summary):</div>
            <ul>
              {Object.entries(result.stats).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 10, color: "rgba(255,255,255,0.72)" }}>
              Note: this is best-effort and not a guarantee. Always verify the domain and avoid entering credentials on suspicious pages.
            </div>
          </ResultBox>
        ) : (
          <ResultBox tone="warn" title="Unavailable">
            {result.error}
          </ResultBox>
        )
      ) : null}
    </div>
  );
}

