import { describe, expect, it } from "vitest";
import { calculateEntropy } from "@/modules/passwordStrength/entropy";
import { validateEmail, validateUrl, validateUsername } from "@/lib/validators";

describe("UT", () => {
  it("UT01 calculateEntropy() Empty string returns 0 bits", () => {
    expect(calculateEntropy("")).toBe(0);
  });

  it("UT02 calculateEntropy() 'abc123' returns below 40 bits", () => {
    expect(calculateEntropy("abc123")).toBeLessThan(40);
  });

  it("UT03 calculateEntropy() 'Tr0ub4dor&3#kX9!' returns above 70 bits", () => {
    expect(calculateEntropy("Tr0ub4dor&3#kX9!")).toBeGreaterThan(70);
  });

  it("UT04 validateEmail() 'user@example.com' returns true", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("UT05 validateEmail() 'not-an-email' returns false", () => {
    expect(validateEmail("not-an-email")).toBe(false);
  });

  it("UT06 validateEmail() empty string returns false", () => {
    expect(validateEmail("")).toBe(false);
  });

  it("UT07 validateUrl() 'https://github.com' returns true", () => {
    expect(validateUrl("https://github.com")).toBe(true);
  });

  it("UT08 validateUrl() '192.168.1.1' returns false", () => {
    expect(validateUrl("192.168.1.1")).toBe(false);
  });

  it("UT09 validateUrl() 'http://localhost:3000' returns false", () => {
    expect(validateUrl("http://localhost:3000")).toBe(false);
  });

  it("UT10 validateUsername() 'KhurshidMurotov' returns true", () => {
    expect(validateUsername("KhurshidMurotov")).toBe(true);
  });

  it("UT11 validateUsername() 'user name' returns false", () => {
    expect(validateUsername("user name")).toBe(false);
  });
});
