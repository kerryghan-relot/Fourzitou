import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordChangeForm } from "@/components/settings/PasswordChangeForm";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en.json";

vi.mock("@/server/actions/users", () => ({
  changePasswordAction: vi.fn(async () => ({ success: true, data: undefined })),
}));

const wrap = (ui: React.ReactElement) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    {ui}
  </NextIntlClientProvider>
);

// Helper: get each field by exact label text
const field = {
  current: () => screen.getByLabelText("Current password"),
  next: () => screen.getByLabelText("New password"),
  confirm: () => screen.getByLabelText("Confirm new password"),
};

describe("PasswordChangeForm", () => {
  it("renders all three password fields", () => {
    render(wrap(<PasswordChangeForm />));
    expect(field.current()).toBeInTheDocument();
    expect(field.next()).toBeInTheDocument();
    expect(field.confirm()).toBeInTheDocument();
  });

  it("shows the strength meter when typing in the new password field", async () => {
    render(wrap(<PasswordChangeForm />));
    await userEvent.type(field.next(), "abc");
    expect(screen.getByText(/password strength/i)).toBeInTheDocument();
  });

  it("reflects 'strong' for a complex password", async () => {
    render(wrap(<PasswordChangeForm />));
    await userEvent.type(field.next(), "Hello123!@#longer");
    expect(screen.getByText(/strong/i)).toBeInTheDocument();
  });

  it("reflects 'weak' for a trivial password", async () => {
    render(wrap(<PasswordChangeForm />));
    await userEvent.type(field.next(), "abc");
    expect(screen.getByText(/weak/i)).toBeInTheDocument();
  });

  it("shows success message after successful submission", async () => {
    render(wrap(<PasswordChangeForm />));
    await userEvent.type(field.current(), "oldpass");
    await userEvent.type(field.next(), "NewPass123!");
    await userEvent.type(field.confirm(), "NewPass123!");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
  });

  it("shows error message on failure", async () => {
    const { changePasswordAction } = await import("@/server/actions/users");
    vi.mocked(changePasswordAction).mockResolvedValueOnce({
      success: false,
      error: "Current password is incorrect",
    });
    render(wrap(<PasswordChangeForm />));
    await userEvent.type(field.current(), "wrong");
    await userEvent.type(field.next(), "NewPass123!");
    await userEvent.type(field.confirm(), "NewPass123!");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/current password is incorrect/i)).toBeInTheDocument();
  });

  it("toggles current password visibility", async () => {
    render(wrap(<PasswordChangeForm />));
    const input = field.current();
    expect(input).toHaveAttribute("type", "password");
    // First eye button is for the current password field
    const eyeButtons = screen.getAllByRole("button", { name: "" });
    await userEvent.click(eyeButtons[0]);
    expect(input).toHaveAttribute("type", "text");
  });
});
