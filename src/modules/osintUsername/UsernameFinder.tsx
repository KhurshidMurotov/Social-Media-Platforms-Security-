import { useMemo, useState } from "react";
import { ResultBox } from "@/components/ResultBox";
import { CyberButton } from "@/components/ui/CyberButton";
import { CyberInput } from "@/components/ui/CyberInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { USERNAME_PLATFORMS } from "@/lib/constants";
import { isValidUsername } from "@/lib/validators";

type CheckStatus = "unknown" | "checking" | "exists" | "not_found" | "unavailable";
type StatusMap = Record<string, CheckStatus>;
type VisibleItems = Set<string>;

type UsernameCheckData = {
  platform: string;
  username: string;
  exists: boolean | null;
  verified: boolean;
  profileUrl: string;
  note?: string;
};

type ApiError = {
  code: string;
  message: string;
};

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export function UsernameFinder() {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<StatusMap>({});
  const [visibleItems, setVisibleItems] = useState<VisibleItems>(new Set());
  const [isSearching, setIsSearching] = useState(false);

  const canRun = isValidUsername(username);

  const items = useMemo(() => {
    const value = username.trim();
    if (!value) return [];
    return USERNAME_PLATFORMS.map((platform) => ({
      ...platform,
      url: platform.profileUrl(value)
    }));
  }, [username]);

  async function verifySupported() {
    if (!canRun || isSearching) return;

    const value = username.trim();
    setIsSearching(true);
    setVisibleItems(new Set());
    setStatus({});

    const supported = USERNAME_PLATFORMS.filter((platform) => platform.supportsVerification);
    const next: StatusMap = {};
    supported.forEach((platform) => {
      next[platform.id] = "checking";
    });
    setStatus(next);

    for (let i = 0; i < supported.length; i += 1) {
      const platform = supported[i];
      try {
        const response = await fetch(
          `/api/username-check?platform=${encodeURIComponent(platform.id)}&username=${encodeURIComponent(value)}`
        );
        const payload = (await response.json()) as ApiResponse<UsernameCheckData>;

        const newStatus = payload.ok
          ? payload.data.verified
            ? payload.data.exists
              ? "exists"
              : "not_found"
            : "unavailable"
          : "unavailable";
        setStatus((prev) => ({
          ...prev,
          [platform.id]: newStatus
        }));

        await new Promise((resolve) => setTimeout(resolve, 300 + i * 150));
        setVisibleItems((prev) => new Set([...prev, platform.id]));
      } catch {
        setStatus((prev) => ({ ...prev, [platform.id]: "unavailable" }));
        await new Promise((resolve) => setTimeout(resolve, 300 + i * 150));
        setVisibleItems((prev) => new Set([...prev, platform.id]));
      }
    }

    const nonSupported = USERNAME_PLATFORMS.filter((platform) => !platform.supportsVerification);
    for (let i = 0; i < nonSupported.length; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 200 + i * 100));
      setVisibleItems((prev) => new Set([...prev, nonSupported[i].id]));
    }

    setIsSearching(false);
  }

  function badge(value: CheckStatus) {
    if (value === "exists") return <StatusBadge variant="safe">found</StatusBadge>;
    if (value === "not_found") return <StatusBadge variant="warning">not found</StatusBadge>;
    if (value === "checking") return <StatusBadge variant="pending">checking...</StatusBadge>;
    if (value === "unavailable") return <StatusBadge variant="blocked">check blocked</StatusBadge>;
    return <StatusBadge variant="pending">checking...</StatusBadge>;
  }

  const filteredItems = items.filter((item) => visibleItems.has(item.id));

  return (
    <div>
      <div className="row">
        <CyberInput
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
        <CyberButton disabled={!canRun || isSearching} onClick={verifySupported}>
          {isSearching ? "Searching..." : "Search"}
        </CyberButton>
      </div>

      {!canRun && username.trim() ? (
        <ResultBox tone="warn" title="Validation">
          Use 2-30 chars: letters, digits, dot, underscore, hyphen. No spaces.
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
            Ethical OSINT: Results are shown after a direct check of the public profile page when the platform allows it.
            Some platforms may still block automated public verification.
          </div>
          <ul>
            {filteredItems.map((item) => (
              <li key={item.id} style={{ marginBottom: 6 }}>
                {status[item.id] === "not_found" ? (
                  <span>{item.label}</span>
                ) : (
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    {item.label}
                  </a>
                )}{" "}
                {badge(status[item.id] ?? "unknown")}
              </li>
            ))}
          </ul>
        </ResultBox>
      ) : null}
    </div>
  );
}
