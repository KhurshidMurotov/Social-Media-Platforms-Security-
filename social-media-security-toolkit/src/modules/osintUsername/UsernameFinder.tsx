import { useMemo, useState } from "react";
import { ResultBox } from "@/components/ResultBox";
import { isValidUsername } from "@/lib/validators";
import { USERNAME_PLATFORMS } from "@/lib/constants";

type CheckStatus = "unknown" | "checking" | "exists" | "not_found" | "unavailable";
type StatusMap = Record<string, CheckStatus>;
type VisibleItems = Set<string>;

export function UsernameFinder() {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<StatusMap>({});
  const [visibleItems, setVisibleItems] = useState<VisibleItems>(new Set());
  const [isSearching, setIsSearching] = useState(false);

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
    if (!canRun || isSearching) return;
    const u = username.trim();
    setIsSearching(true);
    setVisibleItems(new Set());
    setStatus({});

    // First, check platforms that support verification
    const supported = USERNAME_PLATFORMS.filter((p) => p.supportsVerification);
    const next: StatusMap = {};
    supported.forEach((p) => (next[p.id] = "checking"));
    setStatus(next);

    // Check each supported platform sequentially with delay
    for (let i = 0; i < supported.length; i++) {
      const p = supported[i];
      try {
        const res = await fetch(
          `/api/username-check?platform=${encodeURIComponent(p.id)}&username=${encodeURIComponent(u)}`
        );
        const json = (await res.json()) as
          | { ok: true; exists: boolean }
          | { ok: false; error: string };
        
        const newStatus = json.ok ? (json.exists ? "exists" : "not_found") : "unavailable";
        setStatus((prev) => ({
          ...prev,
          [p.id]: newStatus
        }));

        // Show result after a short delay (staggered appearance)
        await new Promise((resolve) => setTimeout(resolve, 300 + i * 150));
        setVisibleItems((prev) => new Set([...prev, p.id]));
      } catch {
        setStatus((prev) => ({ ...prev, [p.id]: "unavailable" }));
        await new Promise((resolve) => setTimeout(resolve, 300 + i * 150));
        setVisibleItems((prev) => new Set([...prev, p.id]));
      }
    }

    // Then show non-verifiable platforms with delay
    const nonSupported = USERNAME_PLATFORMS.filter((p) => !p.supportsVerification);
    for (let i = 0; i < nonSupported.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200 + i * 100));
      setVisibleItems((prev) => new Set([...prev, nonSupported[i].id]));
    }

    setIsSearching(false);
  }

  function badge(s: CheckStatus) {
    if (s === "exists") return <span className="pill">verified: exists</span>;
    if (s === "not_found") return <span className="pill">verified: not found</span>;
    if (s === "checking") return <span className="pill">checking…</span>;
    if (s === "unavailable") return <span className="pill">verify unavailable</span>;
    return <span className="pill">not verified</span>;
  }

  const filteredItems = items.filter((it) => visibleItems.has(it.id));

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
            setVisibleItems(new Set());
            setIsSearching(false);
          }}
        />
        <button disabled={!canRun || isSearching} onClick={verifySupported}>
          {isSearching ? "Searching..." : "Search"}
        </button>
      </div>

      {!canRun && username.trim() ? (
        <ResultBox tone="warn" title="Validation">
          Use 2–30 chars: letters, digits, dot, underscore, hyphen. No spaces.
        </ResultBox>
      ) : null}

      {isSearching && visibleItems.size === 0 ? (
        <ResultBox tone="neutral" title="Searching...">
          <div style={{ color: "rgba(255,255,255,0.72)" }}>
            Checking platforms for username availability. Results will appear sequentially...
          </div>
        </ResultBox>
      ) : null}

      {filteredItems.length > 0 ? (
        <ResultBox tone="neutral" title="Profile links (awareness)">
          <div style={{ marginBottom: 8, color: "rgba(255,255,255,0.72)" }}>
            Ethical OSINT: Results shown after verification. Verification is available only for a small set of platforms with safe public APIs.
          </div>
          <ul>
            {filteredItems.map((it) => (
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

