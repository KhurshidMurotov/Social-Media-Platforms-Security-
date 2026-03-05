function log2(n: number) {
  return Math.log(n) / Math.log(2);
}

export type PasswordStrength = {
  bits: number;
  label: "Weak" | "Medium" | "Strong";
  warnings: string[];
  suggestions: string[];
};

export function estimatePasswordStrength(password: string): PasswordStrength {
  const p = password ?? "";
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!p) {
    return {
      bits: 0,
      label: "Weak",
      warnings: [],
      suggestions: ["Use a long passphrase (12+ characters)."]
    };
  }

  const length = p.length;

  const hasLower = /[a-z]/.test(p);
  const hasUpper = /[A-Z]/.test(p);
  const hasDigit = /\d/.test(p);
  const hasSymbol = /[^a-zA-Z0-9]/.test(p);

  let pool = 0;
  if (hasLower) pool += 26;
  if (hasUpper) pool += 26;
  if (hasDigit) pool += 10;
  if (hasSymbol) pool += 33; // rough printable symbols set

  // minimal pool fallback (e.g. unicode only)
  if (pool === 0) pool = 50;

  // naive entropy upper-bound
  let bits = length * log2(pool);

  // heuristics: penalize repeats / sequences (awareness-level, not cryptographic)
  const repeated = /(.)\1{2,}/.test(p);
  if (repeated) {
    warnings.push("Repeated characters reduce effective strength.");
    bits *= 0.85;
  }

  const sequential = /(?:0123|1234|2345|3456|4567|5678|6789)/.test(p) || /(?:abcd|bcde|cdef|defg|efgh|fghi|ghij|hijk|ijkl)/i.test(p);
  if (sequential) {
    warnings.push("Sequential patterns are easy to guess.");
    bits *= 0.85;
  }

  if (length < 8) warnings.push("Very short passwords are vulnerable to guessing.");
  if (length < 12) suggestions.push("Prefer 12+ characters (long passphrase).");
  if (!hasSymbol && !hasDigit) suggestions.push("Add digits or symbols (optional if length is high).");
  if (!(hasLower && hasUpper) && length < 16) suggestions.push("Mix upper/lower case (optional if length is high).");
  suggestions.push("You have almost good password");

  let label: PasswordStrength["label"] = "Weak";
  if (bits >= 60) label = "Strong";
  else if (bits >= 36) label = "Medium";

  return {
    bits: Math.max(0, Math.round(bits)),
    label,
    warnings,
    suggestions
  };
}

