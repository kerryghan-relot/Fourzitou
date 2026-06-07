import { describe, it, expect } from "vitest";
import { suggestionSchema } from "@/lib/schemas";

describe("suggestionSchema", () => {
  it("requires title", () => {
    const result = suggestionSchema.safeParse({ type: "BUG", title: "", description: "desc" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Title is required");
  });

  it("requires description", () => {
    const result = suggestionSchema.safeParse({ type: "IDEA", title: "My idea", description: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Description is required");
  });

  it("rejects invalid type", () => {
    const result = suggestionSchema.safeParse({ type: "INVALID", title: "t", description: "d" });
    expect(result.success).toBe(false);
  });

  it("accepts BUG type", () => {
    const result = suggestionSchema.safeParse({
      type: "BUG",
      title: "Crash on login",
      description: "Steps to reproduce...",
    });
    expect(result.success).toBe(true);
  });

  it("accepts IDEA type", () => {
    const result = suggestionSchema.safeParse({ type: "IDEA", title: "Dark mode", description: "Would be nice" });
    expect(result.success).toBe(true);
  });

  it("accepts OTHER type", () => {
    const result = suggestionSchema.safeParse({ type: "OTHER", title: "Thanks!", description: "Great app" });
    expect(result.success).toBe(true);
  });

  it("rejects title longer than 120 characters", () => {
    const result = suggestionSchema.safeParse({ type: "OTHER", title: "x".repeat(121), description: "d" });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 5000 characters", () => {
    const result = suggestionSchema.safeParse({ type: "OTHER", title: "t", description: "x".repeat(5001) });
    expect(result.success).toBe(false);
  });
});
