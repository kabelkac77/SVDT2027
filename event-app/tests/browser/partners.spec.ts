import { test, expect } from "@playwright/test";

test("create, confirm, fulfill, audit and archived edition", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Partneři", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Obnovit demo" }).click();
  await page
    .getByRole("button", { name: "+ Přidat partnera", exact: true })
    .click();
  await page.getByLabel("Název organizace").fill("Testovací partner E2E");
  await page
    .getByRole("combobox", { name: "Owner *", exact: true })
    .selectOption("demo-admin");
  await page.getByLabel("Stav spolupráce *").selectOption("osloven");
  await page.getByLabel("Interní poznámka").fill("Důležitá interní domluva.");
  await page
    .getByRole("button", { name: "Uložit partnera", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Testovací partner E2E", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Důležitá interní domluva.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "+ Přidat plnění" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Upravit partnera", exact: true })
    .click();
  await page.getByLabel("Stav spolupráce *").selectOption("potvrzen");
  await page
    .getByRole("button", { name: "Uložit partnera", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Přidat plnění" }).click();
  await page.getByLabel("Název plnění").fill("Banner u cíle");
  await page
    .getByRole("combobox", { name: "Stav plnění", exact: true })
    .selectOption("splněno");
  await page.getByLabel("Důkaz — odkaz").fill("https://example.com/proof");
  await page.getByRole("button", { name: "Uložit plnění" }).click();
  await expect(
    page.getByRole("link", { name: "Otevřít důkaz" }),
  ).toHaveAttribute("href", "https://example.com/proof");
  await page.getByRole("button", { name: /Historie změn/ }).click();
  await expect(page.locator("details.audit")).toHaveCount(3);
  await page.getByRole("button", { name: "← Všichni partneři" }).click();
  await page.getByLabel("Hledat partnera").fill("E2E");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Testovací partner E2E" }),
  ).toBeVisible();
  await page.getByLabel("Ročník", { exact: true }).selectOption("2026");
  await expect(
    page.getByText("Archivovaný ročník · pouze ke čtení."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "+ Přidat partnera", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Ukázka · Horský servis" }).click();
  await expect(
    page.getByRole("button", { name: "Upravit partnera", exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("mobile layout, empty filtering and navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Partneři", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Hledat partnera").fill("nenalezitelný");
  await expect(
    page.getByRole("heading", { name: "Nic neodpovídá filtrům." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zrušit filtry" }).click();
  await page.getByRole("button", { name: "Ukázka · Horský servis" }).click();
  await expect(
    page.getByRole("heading", { name: "Domluvená plnění" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});

test("intake stays local and does not infer outreach or confirmed status", async ({
  page,
}) => {
  let writes = 0;
  page.on("request", (r) => {
    if (r.method() === "POST") writes++;
  });
  await page.goto("/podklady");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "sample.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          format: "svdt-partner-intake-v1",
          target_year: 2027,
          source_file: "test.xlsx",
          source_url: "https://example.com",
          unnamed: [],
          candidates: [
            {
              name: "Zdrojový partner",
              classification: "svdt_candidate",
              reasons: ["Historie DT 2026"],
              emails: ["test@example.com"],
              records: [
                {
                  sheet: "2027 - aktuální",
                  row: 9,
                  task: "DT a Piknik",
                  history_2026: 30000,
                },
              ],
            },
          ],
        }),
      ),
    });
  await page.getByRole("button", { name: /Zdrojový partner/ }).click();
  await expect(
    page.getByRole("heading", { name: "Zdrojový partner" }),
  ).toBeVisible();
  await expect(page.getByText("DT a Piknik", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Zkontrolovat ve formuláři" }),
  ).toHaveCount(0);
  expect(writes).toBe(0);
});

test("desktop screenshot", async ({ page }) => {
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Partneři", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
});
