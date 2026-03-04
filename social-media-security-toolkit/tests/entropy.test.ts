import { describe, expect, it } from "vitest";
import { estimatePasswordStrength } from "@/modules/passwordStrength/entropy";

describe("estimatePasswordStrength", () => {
  it("returns weak for empty password", () => {
    const result = estimatePasswordStrength("");
    expect(result.label).toBe("Weak");
    expect(result.bits).toBe(0);
  });

  it("returns strong for long mixed password", () => {
    const result = estimatePasswordStrength("My$trongPassw0rd2026!");
    expect(result.label).toBe("Strong");
    expect(result.bits).toBeGreaterThanOrEqual(60);
  });
});

