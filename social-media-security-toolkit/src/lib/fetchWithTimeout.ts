const DEFAULT_TIMEOUT_MS = 10_000;

export async function fetchWithTimeout(
  input: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("UPSTREAM_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

