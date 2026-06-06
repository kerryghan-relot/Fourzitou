export type PasswordStrength = "weak" | "fair" | "good" | "strong";

export type PasswordCriteria = {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
};

export function getPasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number;
  criteria: PasswordCriteria;
} {
  const criteria: PasswordCriteria = {
    minLength: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
  };

  const requiredMet = Object.values(criteria).filter(Boolean).length;

  let bonus = 0;
  if (password.length >= 12) bonus++;
  if (/[0-9]/.test(password)) bonus++;
  if (/[^A-Za-z0-9]/.test(password)) bonus++;

  const score = requiredMet + bonus;

  const strength: PasswordStrength =
    requiredMet < 3 ? "weak"
    : bonus === 0 ? "fair"
    : bonus === 1 ? "good"
    : "strong";

  return { strength, score, criteria };
}
