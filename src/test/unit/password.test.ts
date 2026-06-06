import { describe, it, expect } from "vitest";
import { getPasswordStrength } from "@/lib/password";

describe("getPasswordStrength", () => {
  it("rates a very short password as weak", () => {
    const { strength } = getPasswordStrength("abc");
    expect(strength).toBe("weak");
  });

  it("rates a long mixed-case alphanumeric password as good", () => {
    const { strength } = getPasswordStrength("Hello123");
    expect(strength).toBe("good");
  });

  it("rates a full complexity password as strong", () => {
    const { strength, score } = getPasswordStrength("Hello123!@#longer");
    expect(strength).toBe("strong");
    expect(score).toBeGreaterThanOrEqual(5);
  });

  it("provides feedback for missing uppercase", () => {
    const { feedback } = getPasswordStrength("hello123!");
    expect(feedback).toContain("Include an uppercase letter");
  });

  it("provides feedback for missing special character", () => {
    const { feedback } = getPasswordStrength("Hello123");
    expect(feedback).toContain("Include a special character");
  });

  it("provides no feedback for a strong password", () => {
    const { feedback } = getPasswordStrength("Hello123!longer");
    expect(feedback).toHaveLength(0);
  });

  it("returns score as a number between 0 and 6", () => {
    const { score } = getPasswordStrength("test");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(6);
  });
});
