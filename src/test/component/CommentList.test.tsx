import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommentList } from "@/components/comments/CommentList";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";

// CommentList → updateCommentAction → next-auth → next/server (server-only)
vi.mock("@/server/actions/comments", () => ({
  createCommentAction: vi.fn(async () => ({ success: true, data: undefined })),
  updateCommentAction: vi.fn(async () => ({ success: true, data: undefined })),
}));

const wrap = (ui: React.ReactElement) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {ui}
  </NextIntlClientProvider>
);

const BASE = new Date("2025-01-01T12:00:00Z").toISOString();

const comment = (overrides?: object) => ({
  id: "c1",
  body: "Hello world",
  createdAt: BASE,
  updatedAt: BASE,
  author: { id: "u1", displayName: "Alice" },
  ...overrides,
});

describe("CommentList", () => {
  it("renders the empty state when there are no comments", () => {
    render(wrap(<CommentList comments={[]} currentUserId="u1" />));
    expect(screen.getByText(/no comments/i)).toBeInTheDocument();
  });

  it("renders a comment body and author name", () => {
    render(wrap(<CommentList comments={[comment()]} currentUserId="u2" />));
    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("shows the edit button only for the current user's own comment", () => {
    const comments = [
      comment({ id: "c1", author: { id: "u1", displayName: "Alice" } }),
      comment({ id: "c2", author: { id: "u2", displayName: "Bob" } }),
    ];
    render(wrap(<CommentList comments={comments} currentUserId="u1" />));
    // Only Alice's comment should have an edit button (title = "Edit comment")
    const editButtons = screen.getAllByTitle("Edit comment");
    expect(editButtons).toHaveLength(1);
  });

  it("shows (edited) label when updatedAt is later than createdAt", () => {
    const edited = comment({
      updatedAt: new Date("2025-01-01T13:00:00Z").toISOString(),
    });
    render(wrap(<CommentList comments={[edited]} currentUserId="u1" />));
    expect(screen.getByText(/edited/i)).toBeInTheDocument();
  });

  it("does not show (edited) label when updatedAt equals createdAt", () => {
    render(wrap(<CommentList comments={[comment()]} currentUserId="u1" />));
    expect(screen.queryByText(/edited/i)).not.toBeInTheDocument();
  });

  it("renders author initials in avatar", () => {
    render(wrap(<CommentList comments={[comment()]} currentUserId="u2" />));
    // Alice → "AL"
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("renders multiple comments", () => {
    const comments = [
      comment({ id: "c1", body: "First" }),
      comment({ id: "c2", body: "Second", author: { id: "u2", displayName: "Bob" } }),
    ];
    render(wrap(<CommentList comments={comments} currentUserId="u1" />));
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });
});
