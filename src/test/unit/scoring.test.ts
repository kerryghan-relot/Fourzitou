import { describe, it, expect } from "vitest";
import { aggregateScores, validateStars, getCrownItemIdForUser } from "@/lib/scoring";

describe("aggregateScores", () => {
  it("returns zeros for empty scores", () => {
    expect(aggregateScores([])).toEqual({
      averageStars: 0,
      crownCount: 0,
      poopCount: 0,
      voterCount: 0,
    });
  });

  it("calculates average stars excluding zeros", () => {
    const scores = [
      { userId: "u1", stars: 4, crown: false, poop: false },
      { userId: "u2", stars: 0, crown: false, poop: false },
      { userId: "u3", stars: 2, crown: false, poop: false },
    ];
    const result = aggregateScores(scores);
    expect(result.averageStars).toBe(3);
    expect(result.voterCount).toBe(2);
  });

  it("counts crowns and poops", () => {
    const scores = [
      { userId: "u1", stars: 5, crown: true, poop: false },
      { userId: "u2", stars: 1, crown: false, poop: true },
      { userId: "u3", stars: 3, crown: false, poop: true },
    ];
    const result = aggregateScores(scores);
    expect(result.crownCount).toBe(1);
    expect(result.poopCount).toBe(2);
  });

  it("rounds average to one decimal", () => {
    const scores = [
      { userId: "u1", stars: 1, crown: false, poop: false },
      { userId: "u2", stars: 2, crown: false, poop: false },
    ];
    expect(aggregateScores(scores).averageStars).toBe(1.5);
  });
});

describe("validateStars", () => {
  it("accepts 0 through 5", () => {
    [0, 1, 2, 3, 4, 5].forEach((s) => expect(validateStars(s)).toBe(true));
  });
  it("rejects values outside 0-5", () => {
    [-1, 6, 10].forEach((s) => expect(validateStars(s)).toBe(false));
  });
  it("rejects non-integers", () => {
    expect(validateStars(2.5)).toBe(false);
  });
});

describe("getCrownItemIdForUser", () => {
  const scores = [
    { itemId: "i1", userId: "u1", crown: true },
    { itemId: "i2", userId: "u1", crown: false },
    { itemId: "i1", userId: "u2", crown: false },
  ];

  it("returns the crowned item id for a user", () => {
    expect(getCrownItemIdForUser(scores, "u1")).toBe("i1");
  });

  it("returns null when user has no crown", () => {
    expect(getCrownItemIdForUser(scores, "u2")).toBeNull();
  });

  it("returns null for unknown user", () => {
    expect(getCrownItemIdForUser(scores, "u99")).toBeNull();
  });
});
