import { test, expect } from "@playwright/test";

// Unique suffix per run so tests don't collide on repeated execution
const suffix = Date.now();
const userA = { email: `usera_${suffix}@example.com`, name: `UserA${suffix}`, password: "TestPass123!" };
const userB = { email: `userb_${suffix}@example.com`, name: `UserB${suffix}`, password: "TestPass123!" };

test.describe("Golden path", () => {
  test("sign up, create topic + item, score, comment, invite friend", async ({ page, context }) => {
    // ── Sign up user A ────────────────────────────────────────────────────────
    await page.goto("/signup");
    await page.getByLabel(/email/i).fill(userA.email);
    await page.getByLabel(/display name/i).fill(userA.name);
    await page.getByLabel(/^password$/i).fill(userA.password);
    await page.getByLabel(/confirm password/i).fill(userA.password);
    await page.getByRole("button", { name: /sign up/i }).click();
    await page.waitForURL("/topics");

    // ── Create a topic ────────────────────────────────────────────────────────
    await page.getByRole("button", { name: /new topic/i }).click();
    await page.getByPlaceholder(/movie night/i).fill("E2E Topic");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText("E2E Topic")).toBeVisible();

    // ── Open the topic ────────────────────────────────────────────────────────
    await page.getByText("E2E Topic").click();
    await expect(page).toHaveURL(/\/topics\/.+/);

    // ── Add an item ───────────────────────────────────────────────────────────
    await page.getByRole("button", { name: /new item/i }).click();
    await page.getByLabel(/title/i).fill("My Test Item");
    await page.getByLabel(/description/i).fill("A great item worth scoring.");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText("My Test Item")).toBeVisible();

    // ── Score with stars ──────────────────────────────────────────────────────
    // Click 4th star (aria title "4 stars")
    await page.getByTitle("4 stars").first().click();
    // Crown toggle
    await page.getByTitle(/my favorite/i).first().click();
    // Brief wait for optimistic update to settle
    await page.waitForTimeout(300);

    // ── Open item modal and add a comment ─────────────────────────────────────
    await page.getByText("My Test Item").first().click();
    await expect(page.getByRole("heading", { name: "My Test Item" })).toBeVisible();
    const commentBox = page.getByPlaceholder(/write a comment/i);
    await commentBox.fill("Great choice!");
    await page.getByRole("button", { name: /send/i }).click();
    await expect(page.getByText("Great choice!")).toBeVisible();
    await page.keyboard.press("Escape");

    // ── Sign up user B in a new tab, then come back ───────────────────────────
    const pageB = await context.newPage();
    await pageB.goto("/signup");
    await pageB.getByLabel(/email/i).fill(userB.email);
    await pageB.getByLabel(/display name/i).fill(userB.name);
    await pageB.getByLabel(/^password$/i).fill(userB.password);
    await pageB.getByLabel(/confirm password/i).fill(userB.password);
    await pageB.getByRole("button", { name: /sign up/i }).click();
    await pageB.waitForURL("/topics");
    await pageB.close();

    // ── Add user B as a member ────────────────────────────────────────────────
    await page.bringToFront();
    const memberInput = page.getByPlaceholder(/add member/i);
    await memberInput.fill(userB.name);
    await memberInput.press("Enter");
    await expect(page.getByText(userB.name)).toBeVisible();

    // ── Profile page ──────────────────────────────────────────────────────────
    await page.getByRole("link", { name: /profile/i }).click();
    await expect(page).toHaveURL("/profile");
    await expect(page.getByRole("textbox", { name: /display name/i })).toHaveValue(userA.name);

    // ── Settings page: change password ────────────────────────────────────────
    await page.getByRole("link", { name: /settings/i }).click();
    await expect(page).toHaveURL("/settings");
    await page.getByLabel(/current password/i).fill(userA.password);
    const newPwd = "NewPass456!";
    await page.getByLabel(/new password/i).fill(newPwd);
    await page.getByLabel(/confirm/i).fill(newPwd);
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText(/password updated/i)).toBeVisible();

    // ── Stats page ────────────────────────────────────────────────────────────
    await page.getByRole("link", { name: /statistics/i }).click();
    await expect(page).toHaveURL("/stats");
    await expect(page.getByText(/topics owned/i)).toBeVisible();

    // ── Sign out ──────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL("/login");
  });

  test("admin can see all users", async ({ page }) => {
    // Use env-seeded admin credentials
    const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme123";

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(adminEmail);
    await page.getByLabel(/password/i).fill(adminPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("/topics");

    await page.getByRole("link", { name: /admin/i }).click();
    await expect(page).toHaveURL("/admin/users");
    await expect(page.getByRole("heading", { name: /user management/i })).toBeVisible();
  });
});
