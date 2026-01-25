import { useMemo, useState } from "react";
import { ResultBox } from "@/components/ResultBox";
import { isValidUsername } from "@/lib/validators";
import { USERNAME_PLATFORMS } from "@/lib/constants";

type CheckStatus = "unknown" | "checking" | "exists" | "not_found" | "unavailable";
type StatusMap = Record<string, CheckStatus>;

export function UsernameFinder() {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<StatusMap>({});

  const canRun = isValidUsername(username);

  const items = useMemo(() => {
    const u = username.trim();
    if (!u) return [];
    return USERNAME_PLATFORMS.map((p) => ({
      ...p,
      url: p.profileUrl(u)
    }));
  }, [username]);

  async function verifySupported() {
    if (!canRun) return;
    const u = username.trim();
    const supported = USERNAME_PLATFORMS.filter((p) => p.supportsVerification);
    const next: StatusMap = { ...status };
    supported.forEach((p) => (next[p.id] = "checking"));
    setStatus(next);

    await Promise.all(
      supported.map(async (p) => {
        try {
          const res = await fetch(
            `/api/username-check?platform=${encodeURIComponent(p.id)}&username=${encodeURIComponent(u)}`
          );
          const json = (await res.json()) as
            | { ok: true; exists: boolean }
            | { ok: false; error: string };
          setStatus((prev) => ({
            ...prev,
            [p.id]: json.ok ? (json.exists ? "exists" : "not_found") : "unavailable"
          }));
        } catch {
          setStatus((prev) => ({ ...prev, [p.id]: "unavailable" }));
        }
      })
    );
  }

  function badge(s: CheckStatus) {
    if (s === "exists") return <span className="pill">verified: exists</span>;
    if (s === "not_found") return <span className="pill">verified: not found</span>;
    if (s === "checking") return <span className="pill">checking…</span>;
    if (s === "unavailable") return <span className="pill">verify unavailable</span>;
    return <span className="pill">not verified</span>;
  }

  return (
    <div>
      <div className="row">
        <input
          type="text"
          value={username}
          placeholder="Enter a username (e.g. john_doe)"
          onChange={(e) => {
            setUsername(e.target.value);
            setStatus({});
          }}
        />
        <button disabled={!canRun} onClick={verifySupported}>
          Verify (limited)
        </button>
      </div>

      {!canRun && username.trim() ? (
        <ResultBox tone="warn" title="Validation">
          Use 2–30 chars: letters, digits, dot, underscore, hyphen. No spaces.
        </ResultBox>
      ) : null}

      {items.length ? (
        <ResultBox tone="neutral" title="Profile links (awareness)">
          <div style={{ marginBottom: 8, color: "rgba(255,255,255,0.72)" }}>
            Ethical OSINT: by default we only generate links. Verification is available only for a small set of platforms with safe public APIs.
          </div>
          <ul>
            {items.map((it) => (
              <li key={it.id} style={{ marginBottom: 6 }}>
                <a href={it.url} target="_blank" rel="noreferrer">
                  {it.label}
                </a>{" "}
                — <span style={{ color: "rgba(255,255,255,0.72)" }}>{it.url}</span>{" "}
                {badge(status[it.id] ?? "unknown")}
              </li>
            ))}
          </ul>
        </ResultBox>
      ) : null}
    </div>
  );
}

