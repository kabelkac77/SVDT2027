import { test, expect } from "@playwright/test";

test("WhatsApp validates phone, sends only on request, retries invalid code and opens unprivileged session", async ({
  page,
}) => {
  const requests: Record<string, unknown>[] = [];
  await page.route("**/auth/v1/settings", (route) =>
    route.fulfill({ json: { external: { phone: true } } }),
  );
  await page.route("**/auth/v1/otp", (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: {} });
  });
  let checks = 0;
  const user = {
    id: "00000000-0000-4000-8000-000000000002",
    aud: "authenticated",
    role: "authenticated",
    phone: "420777123456",
    app_metadata: { provider: "phone" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, session_id: "test-whatsapp" })}.test`;
  await page.route("**/auth/v1/verify", (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      phone: "+420777123456",
      type: "sms",
      token: "123456",
    });
    checks++;
    return checks === 1
      ? route.fulfill({
          status: 403,
          json: { msg: "Token expired", code: "otp_expired" },
        })
      : route.fulfill({
          json: {
            access_token: token,
            refresh_token: "test-refresh",
            token_type: "bearer",
            expires_in: 3600,
            user,
          },
        });
  });
  await page.route("**/auth/v1/user", (route) => route.fulfill({ json: user }));
  await page.route("**/rest/v1/**", (route) => route.fulfill({ json: [] }));
  await page.goto("/");
  await page.getByRole("button", { name: "Pokračovat přes WhatsApp" }).click();
  expect(requests).toHaveLength(0);
  await page.getByLabel("Telefon s předvolbou").fill("777123456");
  await page.getByRole("button", { name: "Poslat kód na WhatsApp" }).click();
  await expect(page.locator("main [role=alert]")).toContainText(
    "mezinárodní předvolby",
  );
  expect(requests).toHaveLength(0);
  await page.getByLabel("Telefon s předvolbou").fill("+420 777 123 456");
  await page.getByRole("button", { name: "Poslat kód na WhatsApp" }).click();
  await expect(page.getByLabel("Kód z WhatsAppu")).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    phone: "+420777123456",
    channel: "whatsapp",
    create_user: true,
  });
  await expect(
    page.getByRole("button", { name: "Poslat nový kód" }),
  ).toBeDisabled();
  await page.getByLabel("Kód z WhatsAppu").fill("123456");
  await page.getByRole("button", { name: "Ověřit kód a přihlásit se" }).click();
  await expect(page.locator("main [role=alert]")).toContainText(
    "Kód není platný",
  );
  await page.getByRole("button", { name: "Ověřit kód a přihlásit se" }).click();
  await expect(
    page.getByRole("heading", { name: "Zatím nemáš přístup k ročníku." }),
  ).toBeVisible();
  expect(requests).toHaveLength(1);
});

test("failed WhatsApp delivery offers retry with cooldown and no automatic SMS", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/auth/v1/settings", (route) =>
    route.fulfill({ json: { external: { phone: true } } }),
  );
  await page.route("**/auth/v1/otp", (route) => {
    requests++;
    return route.fulfill({ status: 429, json: { msg: "Rate limited" } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Pokračovat přes WhatsApp" }).click();
  await page.getByLabel("Telefon s předvolbou").fill("+420777123456");
  await page.getByRole("button", { name: "Poslat kód na WhatsApp" }).click();
  await expect(page.locator("main [role=alert]")).toContainText(
    "Kód se nepodařilo odeslat",
  );
  await expect(
    page.getByRole("button", { name: "Poslat kód na WhatsApp" }),
  ).toBeDisabled();
  expect(requests).toBe(1);
  await expect(
    page.getByRole("button", { name: "Přihlásit se", exact: true }),
  ).toBeEnabled();
});

test("WhatsApp stays hidden when phone provider is off", async ({ page }) => {
  await page.route("**/auth/v1/settings", (route) =>
    route.fulfill({ json: { external: { phone: false, google: true } } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Pokračovat přes Google" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pokračovat přes WhatsApp" }),
  ).toHaveCount(0);
});
