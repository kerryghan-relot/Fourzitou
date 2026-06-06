import { describe, it, expect } from "vitest";
import {
  isAdmin,
  canViewTopic,
  canEditTopic,
  canEditItem,
  canEditComment,
  canManageUsers,
} from "@/lib/permissions";

const admin = { id: "a1", role: "ADMIN" as const };
const user1 = { id: "u1", role: "USER" as const };
const user2 = { id: "u2", role: "USER" as const };

describe("isAdmin", () => {
  it("returns true for ADMIN role", () => expect(isAdmin(admin)).toBe(true));
  it("returns false for USER role", () => expect(isAdmin(user1)).toBe(false));
});

describe("canViewTopic", () => {
  const topic = { ownerId: "u1", memberIds: ["u2"] };

  it("admin can view any topic", () => expect(canViewTopic(admin, topic)).toBe(true));
  it("owner can view their topic", () => expect(canViewTopic(user1, topic)).toBe(true));
  it("member can view the topic", () => expect(canViewTopic(user2, topic)).toBe(true));
  it("non-member cannot view", () => {
    expect(canViewTopic({ id: "u3", role: "USER" }, topic)).toBe(false);
  });
});

describe("canEditTopic", () => {
  const topic = { ownerId: "u1" };

  it("admin can edit any topic", () => expect(canEditTopic(admin, topic)).toBe(true));
  it("owner can edit their topic", () => expect(canEditTopic(user1, topic)).toBe(true));
  it("non-owner cannot edit", () => expect(canEditTopic(user2, topic)).toBe(false));
});

describe("canEditItem", () => {
  const item = { creatorId: "u1" };

  it("admin can edit any item", () => expect(canEditItem(admin, item)).toBe(true));
  it("creator can edit their item", () => expect(canEditItem(user1, item)).toBe(true));
  it("non-creator cannot edit", () => expect(canEditItem(user2, item)).toBe(false));
});

describe("canEditComment", () => {
  const comment = { authorId: "u1" };

  it("author can edit their comment", () =>
    expect(canEditComment(user1, comment)).toBe(true));
  it("other user cannot edit", () => expect(canEditComment(user2, comment)).toBe(false));
  it("admin cannot edit another user comment", () =>
    expect(canEditComment(admin, comment)).toBe(false));
});

describe("canManageUsers", () => {
  it("admin can manage users", () => expect(canManageUsers(admin)).toBe(true));
  it("regular user cannot manage users", () => expect(canManageUsers(user1)).toBe(false));
});
