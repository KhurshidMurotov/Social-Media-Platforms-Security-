export const APP_NAME = "Social Media Security Toolkit";

export const DISCLAIMER =
  "Educational and awareness purposes only. Results are best-effort and not a guarantee of safety.";

export const PRIVACY_NOTICE =
  "No data storage: this tool does not store passwords, emails, usernames, or URLs. Inputs are processed transiently to display results.";

export type UsernamePlatform = {
  id: string;
  label: string;
  profileUrl: (username: string) => string;
  supportsVerification: boolean;
};

export const USERNAME_PLATFORMS: UsernamePlatform[] = [
  {
    id: "instagram",
    label: "Instagram",
    profileUrl: (u) => `https://www.instagram.com/${encodeURIComponent(u)}/`,
    supportsVerification: false
  },
  {
    id: "x",
    label: "X (Twitter)",
    profileUrl: (u) => `https://x.com/${encodeURIComponent(u)}`,
    supportsVerification: false
  },
  {
    id: "tiktok",
    label: "TikTok",
    profileUrl: (u) => `https://www.tiktok.com/@${encodeURIComponent(u)}`,
    supportsVerification: false
  },
  {
    id: "facebook",
    label: "Facebook",
    profileUrl: (u) => `https://www.facebook.com/${encodeURIComponent(u)}`,
    supportsVerification: false
  },
  {
    id: "youtube",
    label: "YouTube (handle)",
    profileUrl: (u) => `https://www.youtube.com/@${encodeURIComponent(u)}`,
    supportsVerification: false
  },
  {
    id: "github",
    label: "GitHub",
    profileUrl: (u) => `https://github.com/${encodeURIComponent(u)}`,
    supportsVerification: true
  },
  {
    id: "reddit",
    label: "Reddit",
    profileUrl: (u) => `https://www.reddit.com/user/${encodeURIComponent(u)}/`,
    supportsVerification: true
  }
];

