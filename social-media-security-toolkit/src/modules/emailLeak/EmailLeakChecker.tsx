import { useState } from "react";
import { isValidEmail } from "@/lib/validators";
import { ResultBox } from "@/components/ResultBox";

type HibpResponse =
  | { ok: true; found: false }
  | { ok: true; found: true; breaches: Array<{ Name: string; Title?: string; BreachDate?: string; Domain?: string }> }
  | { ok: false; error: string; code?: string };

export function EmailLeakChecker() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HibpResponse | null>(null);

  const canCheck = isValidEmail(email);

  async function onCheck() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/hibp?email=${encodeURIComponent(email.trim())}`);
      const json = (await res.json()) as HibpResponse;
      setResult(json);
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
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

      <div style={{ marginTop: 8, color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
        Powered by{" "}
        <a href="https://leakcheck.io" target="_blank" rel="noreferrer">
          LeakCheck
        </a>
        .
      </div>

      {!canCheck && email.trim() ? (
        <ResultBox tone="warn" title="Validation">
          Please enter a valid email format.
        </ResultBox>
      ) : null}

      {result ? (
        result.ok ? (
          result.found ? (
            <ResultBox tone="bad" title="Breaches found">
              <div style={{ marginBottom: 6 }}>
                This email appears in public breach datasets. Change passwords, enable MFA, and stop reusing passwords.
              </div>
              <ul>
                {result.breaches.slice(0, 20).map((b) => (
                  <li key={b.Name}>
                    <strong>{b.Title ?? b.Name}</strong>
                    {b.Domain ? ` (${b.Domain})` : ""} {b.BreachDate ? `— ${b.BreachDate}` : ""}
                  </li>
                ))}
              </ul>
            </ResultBox>
          ) : (
            <ResultBox tone="good" title="No breaches found (best-effort)">
              Not found in the queried dataset. This does not guarantee safety.
            </ResultBox>
          )
        ) : (
          <ResultBox tone="warn" title="Unavailable">
            {result.error}
          </ResultBox>
        )
      ) : null}
    </div>
  );
}

