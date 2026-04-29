import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

export type SupportedPlatform =
  | "github"
  | "reddit"
  | "devto"
  | "keybase"
  | "instagram"
  | "x"
  | "tiktok"
  | "facebook"
  | "youtube";

export type VerifyResult =
  | { exists: boolean; verified: true; note?: string }
  | { exists: null; verified: false; note: string };

type DetectionContext = {
  username: string;
  profileUrl: string;
  requestUrl: string;
  response: Response;
  body: string;
};

type PlatformConfig = {
  profileUrl: (username: string) => string;
  requestUrl?: (username: string) => string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  detect?: (context: DetectionContext) => VerifyResult | null;
};

const PROFILE_HEADERS = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
};

const PROFILE_CHECK_TIMEOUT_MS = 15_000;

export class UpstreamStatusError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export const profileUrlByPlatform: Record<SupportedPlatform, (username: string) => string> = {
  github: (u) => `https://github.com/${encodeURIComponent(u)}`,
  reddit: (u) => `https://www.reddit.com/user/${encodeURIComponent(u)}/`,
  devto: (u) => `https://dev.to/${encodeURIComponent(u)}`,
  keybase: (u) => `https://keybase.io/${encodeURIComponent(u)}`,
  instagram: (u) => `https://www.instagram.com/${encodeURIComponent(u)}/`,
  x: (u) => `https://x.com/${encodeURIComponent(u)}`,
  tiktok: (u) => `https://www.tiktok.com/@${encodeURIComponent(u)}`,
  facebook: (u) => `https://www.facebook.com/${encodeURIComponent(u)}`,
  youtube: (u) => `https://www.youtube.com/@${encodeURIComponent(u)}`
};

const platformConfigs: Record<SupportedPlatform, PlatformConfig> = {
  github: {
    profileUrl: profileUrlByPlatform.github
  },
  reddit: {
    profileUrl: profileUrlByPlatform.reddit,
    requestUrl: (u) => `https://old.reddit.com/user/${encodeURIComponent(u)}/`
  },
  devto: {
    profileUrl: profileUrlByPlatform.devto
  },
  keybase: {
    profileUrl: profileUrlByPlatform.keybase
  },
  instagram: {
    profileUrl: profileUrlByPlatform.instagram,
    detect: detectInstagramProfile
  },
  x: {
    profileUrl: profileUrlByPlatform.x,
    detect: detectXProfile
  },
  tiktok: {
    profileUrl: profileUrlByPlatform.tiktok,
    timeoutMs: 20_000,
    detect: detectTikTokProfile
  },
  facebook: {
    profileUrl: profileUrlByPlatform.facebook,
    detect: detectFacebookProfile
  },
  youtube: {
    profileUrl: profileUrlByPlatform.youtube
  }
};

function blocked(note = "public profile check blocked"): VerifyResult {
  return { exists: null, verified: false, note };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasExactMetaUrl(body: string, profileUrl: string) {
  const escapedUrl = escapeRegExp(profileUrl.replace(/\/+$/, ""));
  const patterns = [
    new RegExp(`<meta[^>]+property=["']og:url["'][^>]+content=["']${escapedUrl}/?["']`, "i"),
    new RegExp(`<link[^>]+rel=["']canonical["'][^>]+href=["']${escapedUrl}/?["']`, "i")
  ];
  return patterns.some((pattern) => pattern.test(body));
}

function detectInstagramProfile({ body, profileUrl }: DetectionContext): VerifyResult | null {
  if (body.includes('"pageID":"httpErrorPage"')) {
    return { exists: false, verified: true };
  }
  if (body.includes('"pageID":"profilePage"') || hasExactMetaUrl(body, profileUrl)) {
    return { exists: true, verified: true };
  }
  return blocked("profile page loaded, but Instagram did not expose a verifiable profile payload");
}

function detectXProfile({ body, username }: DetectionContext): VerifyResult | null {
  const exactScreenName = new RegExp(`"screen_name":"${escapeRegExp(username)}"`, "i");
  if (exactScreenName.test(body)) {
    return { exists: true, verified: true };
  }
  if (body.includes("window.__INITIAL_STATE__=")) {
    return { exists: false, verified: true };
  }
  return blocked("profile page loaded, but X did not expose a verifiable profile payload");
}

function detectTikTokProfile({ body, username }: DetectionContext): VerifyResult | null {
  const exactUniqueId = new RegExp(`"uniqueId":"${escapeRegExp(username)}"`, "i");
  if (exactUniqueId.test(body)) {
    return { exists: true, verified: true };
  }
  if (body.includes('"statusCode":10221') || body.includes('"statusCode":10202')) {
    return { exists: false, verified: true };
  }
  return blocked("public TikTok profile check was blocked or did not return a verifiable profile payload");
}

function detectFacebookProfile({ response, body }: DetectionContext): VerifyResult | null {
  if (response.status === 400 && /<title[^>]*>Error(?: Facebook)?<\/title>/i.test(body)) {
    return blocked("public Facebook profile check was blocked");
  }
  return blocked("public Facebook profile check was blocked");
}

export async function checkPlatform(platform: SupportedPlatform, username: string): Promise<VerifyResult> {
  const config = platformConfigs[platform];
  const profileUrl = config.profileUrl(username);
  const requestUrl = config.requestUrl?.(username) ?? profileUrl;

  const response = await fetchWithTimeout(
    requestUrl,
    {
      headers: {
        ...PROFILE_HEADERS,
        ...config.headers
      }
    },
    config.timeoutMs ?? PROFILE_CHECK_TIMEOUT_MS
  );

  if (response.status === 404) {
    return { exists: false, verified: true };
  }

  if (response.status === 401 || response.status === 403 || response.status === 429) {
    return blocked();
  }

  const needsBody = response.status === 200 || response.status === 400;
  const body = needsBody ? await response.text() : "";

  if (config.detect) {
    const detected = config.detect({ username, profileUrl, requestUrl, response, body });
    if (detected) {
      return detected;
    }
  }

  if (response.status === 200) {
    return { exists: true, verified: true };
  }

  if (response.status === 400) {
    return blocked();
  }

  throw new UpstreamStatusError(response.status, `Profile endpoint returned ${response.status}`);
}
