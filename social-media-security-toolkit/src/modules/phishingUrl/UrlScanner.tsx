import { useState } from "react";
import { ResultBox } from "@/components/ResultBox";
import { normalizeUrl } from "@/lib/validators";

type VtVerdict = "malicious" | "suspicious" | "clean" | "unknown";

type VtUrlData = {
  url: string;
  analysisId: string;
  verdict: VtVerdict;
  stats: Record<string, number>;
};

type ApiError = {
  code: string;
  message: string;
};

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export function UrlScanner() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse<VtUrlData> | null>(null);

  const normalized = normalizeUrl(input);
  const examples = [
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
      const response = await fetch("/api/vt-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized })
      });
      const payload = (await response.json()) as ApiResponse<VtUrlData>;
      setResult(payload);
    } catch (error) {
      setResult({
        ok: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Unknown network error."
        }
      });
    } finally {
      setLoading(false);
    }
  }

  const tone =
    !result || !result.ok
      ? "neutral"
      : result.data.verdict === "malicious"
        ? "bad"
        : result.data.verdict === "suspicious"
          ? "warn"
          : result.data.verdict === "clean"
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
          These are fictional, malicious-looking examples for awareness training.
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {examples.map((url) => (
            <li key={url} style={{ marginBottom: 6 }}>
              <span
                style={{
                  userSelect: "text",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                }}
              >
                {url}
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
          <ResultBox tone={tone} title={`Verdict: ${result.data.verdict.toUpperCase()}`}>
            <div style={{ marginBottom: 8 }}>Vendor detections (summary):</div>
            <ul>
              {Object.entries(result.data.stats).map(([key, value]) => (
                <li key={key}>
                  {key}: {value}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 10, color: "rgba(255,255,255,0.72)" }}>
              Note: this is best-effort and not a guarantee. Always verify the domain and avoid entering credentials on
              suspicious pages.
            </div>
          </ResultBox>
        ) : (
          <ResultBox tone="warn" title="Unavailable">
            {result.error.message}
          </ResultBox>
        )
      ) : null}
    </div>
  );
}

