import { useState } from "react";
import { ResultBox } from "@/components/ResultBox";
import { normalizeUrl } from "@/lib/validators";

type VtVerdict = "malicious" | "suspicious" | "clean" | "unknown";
type VtVendor = { engine: string; category: "malicious" | "suspicious"; result?: string };

type VtUrlData = {
  verdict: "MALICIOUS" | "SUSPICIOUS" | "CLEAN" | "UNKNOWN";
  stats: {
    harmless: number;
    malicious: number;
    suspicious: number;
    undetected: number;
    timeout: number;
  };
  vendors: VtVendor[];
};

type LegacyVtData = {
  verdict: VtVerdict;
  stats: Record<string, number>;
  vendors?: VtVendor[];
};

type ApiError = {
  code: string;
  message: string;
};

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export function UrlScanner() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse<VtUrlData | LegacyVtData> | null>(null);

  const normalized = normalizeUrl(input);
  const examples: Array<{ url: string; note?: string }> = [
    { url: "https://login-microsoftonline-com.account-verify.example.com/secure" },
    { url: "http://bit.ly/suspicious-redirect-xyz" },
    { url: "https://amaz0n.com/deals/special-offer" },
    { url: "https://paypal.com.security-check.example.com/signin" },
    { url: "http://192.168.1.100:8080/update-required", note: "Private IP (not scannable by VirusTotal)" },
    { url: "https://appleid.apple.com.verify-session.example.com/reset" },
    { url: "http://free-gift-claim.tk/claim-now" },
    { url: "https://dropbox.com.share-file.example.com/login" },
    { url: "https://banking-update-required.example.com/confirm" },
    { url: "http://suspicious-short.link/abc123xyz" },
    { url: "https://faceb00k.com/login/verify-account" },
    { url: "http://unsecured-site.info/enter-details" }
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
      const payload = (await response.json()) as ApiResponse<VtUrlData | LegacyVtData>;
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
      : String(result.data.verdict).toUpperCase() === "MALICIOUS"
        ? "bad"
        : String(result.data.verdict).toUpperCase() === "SUSPICIOUS"
          ? "warn"
          : String(result.data.verdict).toUpperCase() === "CLEAN"
            ? "good"
            : "neutral";
  const errorMessage = result && !result.ok ? result.error.message : "";
  const showRejectedHint =
    !!errorMessage &&
    (errorMessage.toLowerCase().includes("rejected") ||
      errorMessage.toLowerCase().includes("status 400") ||
      errorMessage.toLowerCase().includes("invalid") ||
      errorMessage.toLowerCase().includes("not scannable"));
  const showRateLimitHint =
    !!errorMessage &&
    (errorMessage.toLowerCase().includes("rate limit") || errorMessage.toLowerCase().includes("upstream_rate_limited"));
  const summaryRows = result && result.ok
    ? [
        { key: "harmless", label: "Marked safe by", value: Number(result.data.stats.harmless ?? 0) },
        { key: "malicious", label: "Flagged as dangerous by", value: Number(result.data.stats.malicious ?? 0) },
        { key: "suspicious", label: "Flagged as suspicious by", value: Number(result.data.stats.suspicious ?? 0) },
        { key: "undetected", label: "No verdict from", value: Number(result.data.stats.undetected ?? 0) },
        { key: "timeout", label: "Did not respond (timeout)", value: Number(result.data.stats.timeout ?? 0) }
      ]
    : [];
  const totalVendorsChecked = summaryRows.reduce((sum, row) => sum + row.value, 0);

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
        {loading ? (
          <span className="scan-loading" aria-live="polite">
            <span className="scan-spinner" aria-hidden="true" />
            Scanning with VirusTotal...
          </span>
        ) : null}
        {normalized ? <span className="pill">{new URL(normalized).hostname}</span> : null}
      </div>

      <ResultBox tone="neutral" title="Example suspicious URLs (non-clickable)">
        <div style={{ color: "rgba(255,255,255,0.72)", marginBottom: 8 }}>
          These are fictional, malicious-looking examples for awareness training.
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {examples.map((item) => (
            <li key={item.url} style={{ marginBottom: 6 }}>
              <span
                style={{
                  userSelect: "text",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                }}
              >
                {item.url}
              </span>
              {item.note ? <span style={{ color: "rgba(255,255,255,0.6)" }}> - {item.note}</span> : null}
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
          <ResultBox tone={tone} title={`Verdict: ${String(result.data.verdict).toUpperCase()}`}>
            <div style={{ marginBottom: 8 }}>Scan summary:</div>
            <ul>
              {summaryRows.map((row) => (
                <li key={row.key}>
                  {row.label}: {row.value}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 8, color: "rgba(255,255,255,0.72)" }}>
              Total vendors checked: {totalVendorsChecked}
            </div>
            <div style={{ marginTop: 8, color: "rgba(255,255,255,0.72)" }}>
              VirusTotal aggregates results from multiple scanners. Timeout means some vendors did not return a result in
              time and is not a guarantee of safety.
            </div>
            {result.data.vendors && result.data.vendors.length > 0 ? (
              <>
                <div style={{ marginTop: 10, marginBottom: 6 }}>Flagged by these vendors:</div>
                <ul>
                  {result.data.vendors.map((vendor) => (
                    <li key={`${vendor.engine}-${vendor.category}-${vendor.result ?? ""}`}>
                      {vendor.engine}: {vendor.category}
                      {vendor.result ? ` (${vendor.result})` : ""}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <div style={{ marginTop: 10, color: "rgba(255,255,255,0.72)" }}>
              Note: this is best-effort and not a guarantee. Always verify the domain and avoid entering credentials on
              suspicious pages.
            </div>
          </ResultBox>
        ) : (
          <ResultBox tone="warn" title="Unavailable">
            <div>{result.error.message}</div>
            {showRejectedHint ? (
              <div style={{ marginTop: 8, color: "rgba(255,255,255,0.72)" }}>
                Try a real public URL like https://example.com
              </div>
            ) : null}
            {showRateLimitHint ? (
              <div style={{ marginTop: 8, color: "rgba(255,255,255,0.72)" }}>
                Free tier limit is low; wait 15-30 seconds and retry.
              </div>
            ) : null}
          </ResultBox>
        )
      ) : null}
    </div>
  );
}
