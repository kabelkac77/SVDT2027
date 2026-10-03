import { test, expect, Page } from "@playwright/test";
import { freshDemo } from "../../src/lib/demo";

const name = "Ukázka · Horský servis";

test("inline fields persist, failed validation retains draft, and archive has no editors", async ({
  page,
}) => {
  await page.goto("/demo");
  await page
    .getByLabel(`Stav: ${name}`, { exact: true })
    .selectOption("neosloven");
  await expect(page.getByText("Řádek byl uložen.")).toBeVisible();
  await page
    .getByLabel(`Owner: ${name}`, { exact: true })
    .selectOption("demo-owner");
  await expect(
    page.getByLabel(`Owner: ${name}`, { exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel(`Další kontakt: ${name}`, { exact: true })
    .fill("2027-02-01");
  await expect(
    page.getByLabel(`Další kontakt: ${name}`, { exact: true }),
  ).toBeEnabled();
  const note = page.getByLabel(`Poznámka: ${name}`, { exact: true });
  await note.fill("Inline fixture note");
  await note.press("Tab");
  await expect(note).toBeEnabled();
  const email = page.getByLabel(`E-mail kontaktu: ${name}`, { exact: true });
  await email.fill("invalid");
  await email.press("Tab");
  await expect(page.locator(".banners [role=alert]")).toContainText(
    "Zadej jeden platný e-mail",
  );
  await expect(email).toHaveValue("invalid");
  await email.fill("new@example.com");
  await email.press("Tab");
  await expect(page.locator(".banners [role=alert]")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel(`Stav: ${name}`, { exact: true })).toHaveValue(
    "neosloven",
  );
  await expect(page.getByLabel(`Owner: ${name}`, { exact: true })).toHaveValue(
    "demo-owner",
  );
  await expect(note).toHaveValue("Inline fixture note");
  await expect(email).toHaveValue("new@example.com");
  await expect(
    page.getByLabel(`Další kontakt: ${name}`, { exact: true }),
  ).toHaveValue("2027-02-01");
  await page.getByLabel("Ročník", { exact: true }).selectOption("2026");
  await expect(page.locator(".cell-control")).toHaveCount(0);
});

async function loginFixture(page: Page, role: "admin" | "viewer" = "admin") {
  const id = "00000000-0000-4000-8000-000000000001";
  const data = freshDemo();
  data.members = data.members.map((m) => ({
    ...m,
    user_id: m.user_id === "demo-admin" ? id : m.user_id,
    role: m.user_id === "demo-admin" ? role : m.role,
  }));
  data.partnerHistory = [
    {
      id: "history-fixture",
      organization_id: "o1",
      event_name: "SVDT",
      year: 2025,
      cash_amount_czk: null,
      fulfillment: "Fixture evidence",
      position: "",
      source_ref: "fixture:1",
    },
  ];
  const tables: Record<string, unknown> = {
    editions: data.editions,
    edition_members: data.members,
    organizations: data.organizations,
    people: data.people,
    partner_prospects: data.prospects,
    edition_partnerships: data.partnerships,
    partner_deliverables: data.deliverables,
    partner_historical_records: data.partnerHistory,
    audit_log: [],
  };
  await page.route("**/auth/v1/user", (r) =>
    r.fulfill({
      json: {
        id,
        aud: "authenticated",
        role: "authenticated",
        email: "fixture@example.com",
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-01-01T00:00:00Z",
      },
    }),
  );
  await page.route("**/rest/v1/*?*", (r) =>
    r.fulfill({
      json:
        tables[new URL(r.request().url()).pathname.split("/").at(-1)!] ?? [],
    }),
  );
  const encode = (v: unknown) =>
    Buffer.from(JSON.stringify(v)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated", session_id: "fixture" })}.test`;
  await page.goto(
    `/#access_token=${token}&refresh_token=fixture&expires_in=3600&token_type=bearer&type=signup`,
  );
  await expect(
    page.getByRole("heading", { name: "Partneři", exact: true }),
  ).toBeVisible();
}

test("pending RPC locks all row editors; version conflict preserves draft until explicit reload", async ({
  page,
}) => {
  await loginFixture(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route("**/rest/v1/rpc/save_partner", async (r) => {
    writes++;
    await pending;
    await r.fulfill({
      status: 409,
      json: { code: "P0001", message: "VERSION_CONFLICT" },
    });
  });
  const note = page.getByLabel(`Poznámka: ${name}`, { exact: true });
  await note.fill("Retain failed draft");
  await note.press("Tab");
  await expect(
    page.getByLabel("Stav: Ukázka · Městská kavárna", { exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Ročník", { exact: true })).toBeDisabled();
  release();
  await expect(page.locator(".banners [role=alert]")).toContainText(
    "Záznam mezitím upravil někdo jiný",
  );
  await expect(note).toHaveValue("Retain failed draft");
  expect(writes).toBe(1);
  await page
    .getByRole("button", { name: "Načíst aktuální data a zahodit úpravy" })
    .click();
  await expect(note).toHaveValue("Fiktivní data pro vyzkoušení aplikace.");
});

test("viewer sees history with unknown amount and cannot edit rows", async ({
  page,
}) => {
  await loginFixture(page, "viewer");
  await expect(page.locator(".cell-control")).toHaveCount(0);
  const row = page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name }) });
  await expect(row.locator("td").nth(7)).toHaveText("—");
  await page.getByRole("button", { name }).click();
  await expect(page.getByText("Částka: neuvedena")).toBeVisible();
  await expect(page.getByText("Plnění: Fixture evidence")).toBeVisible();
});
