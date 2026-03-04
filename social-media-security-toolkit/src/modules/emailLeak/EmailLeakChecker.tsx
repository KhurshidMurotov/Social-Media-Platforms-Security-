import { useState } from "react";
import { ResultBox } from "@/components/ResultBox";
import { isValidEmail } from "@/lib/validators";

type BreachSummary = {
  Name: string;
  Title?: string;
  BreachDate?: string;
  Domain?: string;
};

type EmailLeakData = {
  provider: "leakcheck";
  found: boolean;
  breaches: BreachSummary[];
};

type ApiError = {
  code: string;
  message: string;
};

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

function providerLabel() {
  return "LeakCheck";
}

export function EmailLeakChecker() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse<EmailLeakData> | null>(null);

  const canCheck = isValidEmail(email);

  async function onCheck() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/email-leak?email=${encodeURIComponent(email.trim())}`);
      const payload = (await response.json()) as ApiResponse<EmailLeakData>;
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

  return (
    <div>
      <div className="row">
        <input
          type="email"
          value={email}
          placeholder="Enter email (awareness demo)"
          onChange={(e) => setEmail(e.target.value)}
        />
        <button disabled={!canCheck || loading} onClick={onCheck}>
          {loading ? "Checking..." : "Check breaches"}
        </button>
      </div>

      {!canCheck && email.trim() ? (
        <ResultBox tone="warn" title="Validation">
          Please enter a valid email format.
        </ResultBox>
      ) : null}

      {result ? (
        result.ok ? (
          <>
            <div style={{ marginTop: 8, color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
              Provider: <strong>{providerLabel()}</strong>
            </div>

            {result.data.found ? (
              <ResultBox tone="bad" title="Breaches found">
                <div style={{ marginBottom: 6 }}>
                  This email appears in public breach datasets. Change passwords, enable MFA, and stop reusing passwords.
                </div>
                <ul>
                  {result.data.breaches.slice(0, 20).map((breach) => (
                    <li key={`${breach.Name}-${breach.BreachDate ?? "n/a"}`}>
                      <strong>{breach.Title ?? breach.Name}</strong>
                      {breach.Domain ? ` (${breach.Domain})` : ""}
                      {breach.BreachDate ? ` - ${breach.BreachDate}` : ""}
                    </li>
                  ))}
                </ul>
              </ResultBox>
            ) : (
              <ResultBox tone="good" title="No breaches found (best-effort)">
                Not found in the queried dataset. This does not guarantee safety.
              </ResultBox>
            )}
          </>
        ) : (
          <ResultBox tone="warn" title="Unavailable">
            {result.error.message}
          </ResultBox>
        )
      ) : null}
    </div>
  );
}
