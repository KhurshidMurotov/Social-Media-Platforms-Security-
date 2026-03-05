export function isValidEmail(email: string): boolean {
  // pragmatic validation (avoids over-restricting)
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim());
}

export function isValidUsername(username: string): boolean {
  // keep permissive but safe for URLs; exclude spaces
  const u = username.trim();
  if (u.length < 2 || u.length > 30) return false;
  return /^[a-zA-Z0-9._-]+$/.test(u);
}

export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  try {
    const withScheme = raw.includes("://") ? raw : `https://${raw}`;
    const url = new URL(withScheme);

    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // avoid scanning localhost / private IPs
    if (
      url.hostname === "localhost" ||
      url.hostname.endsWith(".local") ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

