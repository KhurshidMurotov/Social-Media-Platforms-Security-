import { useMemo, useState } from "react";
import { estimatePasswordStrength } from "./entropy";
import { ResultBox } from "@/components/ResultBox";
import { CyberInput } from "@/components/ui/CyberInput";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function PasswordChecker() {
  const [password, setPassword] = useState("");
  const hasPassword = password.length > 0;

  const strength = useMemo(() => estimatePasswordStrength(password), [password]);

  const tone =
    strength.label === "Strong" ? "good" : strength.label === "Medium" ? "warn" : "bad";

  return (
    <div>
      <div className="row">
        <CyberInput
          type="password"
          value={password}
          autoComplete="off"
          placeholder="Enter a password (do NOT use a real one)"
          onChange={(e) => setPassword(e.target.value)}
        />
        {hasPassword ? (
          <StatusBadge variant={tone === "good" ? "safe" : tone === "warn" ? "warning" : "malicious"}>
            Rating: {strength.label}
          </StatusBadge>
        ) : null}
      </div>

      {hasPassword ? (
        <ResultBox tone={tone} title="Guidance">
          {strength.warnings.length ? (
            <>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>Warnings</div>
              <ul>
                {strength.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </>
          ) : null}
          <div style={{ marginTop: 10, fontWeight: 600 }}>Suggestions</div>
          <ul>
            {strength.suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </ResultBox>
      ) : null}
    </div>
  );
}
