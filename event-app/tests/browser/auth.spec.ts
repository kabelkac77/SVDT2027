import { test, expect } from "@playwright/test";

test("OAuth providers redirect through Supabase to this app only", async ({
  page,
}) => {
  await page.route("**/auth/v1/settings", (route) =>
    route.fulfill({
      json: { external: { google: true, apple: true, facebook: true } },
    }),
  );
  await page.route("**/auth/v1/authorize?**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<p>Provider authorization</p>",
    }),
  );
  for (const [id, label] of [
    ["google", "Google"],
    ["apple", "Apple"],
    ["facebook", "Facebook"],
  ]) {
    await page.goto("/?next=https://example.org");
    await page
      .getByRole("button", { name: `Pokračovat přes ${label}` })
      .click();
    await expect(page).toHaveURL(/\/auth\/v1\/authorize\?/);
    const target = new URL(page.url());
    expect(target.searchParams.get("provider")).toBe(id);
    expect(target.searchParams.get("redirect_to")).toBe(
      "http://127.0.0.1:3000/",
    );
  }
});

test("disabled providers stay hidden and cancellation allows retry", async ({
  page,
}) => {
  await page.route("**/auth/v1/settings", (route) =>
    route.fulfill({
      json: { external: { google: true, apple: false, facebook: false } },
    }),
  );
  await page.goto(
    "/#error=access_denied&error_description=private-provider-detail",
  );
  await expect(
    page.getByRole("button", { name: "Pokračovat přes Google" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pokračovat přes Apple" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Pokračovat přes Facebook" }),
  ).toHaveCount(0);
  await expect(page.locator("main [role=alert]")).toContainText(
    "Přihlášení nebylo dokončeno",
  );
  expect(page.url()).not.toContain("private-provider-detail");
  await expect(page.getByLabel("Heslo")).toBeVisible();
});

test("OAuth callback establishes session but does not grant membership", async ({
  page,
}) => {
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "oauth-test@example.com",
    app_metadata: { provider: "google" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  await page.route("**/auth/v1/user", (route) => route.fulfill({ json: user }));
  await page.route("**/rest/v1/**", (route) => route.fulfill({ json: [] }));
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated", session_id: "test-session" })}.test-signature`;
  await page.goto(
    `/#access_token=${token}&refresh_token=test-refresh&expires_in=3600&token_type=bearer&type=signup`,
  );
  await expect(
    page.getByRole("heading", { name: "Zatím nemáš přístup k ročníku." }),
  ).toBeVisible();
  expect(page.url()).not.toContain("access_token");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Zatím nemáš přístup k ročníku." }),
  ).toBeVisible();
});

test("settings outage keeps password login available and can recover", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/auth/v1/settings", (route) =>
    fail
      ? route.fulfill({ status: 503, body: "unavailable" })
      : route.fulfill({ json: { external: { google: true } } }),
  );
  await page.goto("/");
  await expect(
    page.getByText("Další možnosti přihlášení se nepodařilo načíst.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Přihlásit se", exact: true }),
  ).toBeEnabled();
  fail = false;
  await page.getByRole("button", { name: "Zkusit znovu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pokračovat přes Google" }),
  ).toBeVisible();
});
