import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeUrl } from "@/lib/validators";

describe("validators", () => {
  it("accepts valid email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("rejects malformed email", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("normalizes url and injects https scheme", () => {
    expect(normalizeUrl("example.com/path")).toBe("https://example.com/path");
  });

  it("rejects localhost and private-ip style host input", () => {
    expect(normalizeUrl("http://localhost:3000")).toBeNull();
    expect(normalizeUrl("http://192.168.0.1/login")).toBeNull();
  });
});

