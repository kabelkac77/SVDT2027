import { test, expect, type Page, type Route } from "@playwright/test";
import { join } from "node:path";
import { chmod } from "node:fs/promises";

const uid = (n: number) =>
  `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const edition = uid(101),
  otherEdition = uid(102),
  alena = uid(301),
  boris = uid(302);
async function reviewScreenshot(page: Page, name: string) {
  const directory = process.env.SVDT_HISTORY_REVIEW_DIR;
  if (!directory) return;
  await page.locator(".crew-history-original details summary").first().click();
  const path = join(directory, name + ".png");
  await page
    .locator(".crew-history")
    .screenshot({ path, style: "nextjs-portal { display: none !important; }" });
  await chmod(path, 0o600);
}
type Handler = (route: Route, body: any) => Promise<void>;
function metadata(
  rosterId = alena,
  packageId = uid(401),
  historic: string | null = "h1",
) {
  return {
    packageId,
    sourceSha256: (packageId === uid(401) ? "a" : "b").repeat(64),
    sourceFormat: "crew-tables-v1",
    sourceRowId: rosterId === alena ? "w1" : "w2",
    sourceHistoryId: historic,
    capturedBy: uid(1),
    capturedAt: "2026-11-28T12:00:00Z",
  };
}
function detail(body: any, historic: string | null = "h1") {
  const { sourceRowId, sourceHistoryId, ...source } = metadata(
    body.r,
    body.p_id,
    historic,
  );
  return {
    ...source,
    version: 1,
    editionId: body.e,
    rosterId: body.r,
    sourceRow: {
      id: sourceRowId,
      year: "2027",
      source_id: sourceHistoryId,
      content:
        body.r === boris
          ? "SOUKROMÝ PODKLAD BORISE"
          : body.p_id === uid(401)
            ? "SOUKROMÝ PODKLAD A"
            : "SOUKROMÝ PODKLAD B",
      unknownColumn: null,
      knownZero: 0,
      flag: false,
      empty: "",
      blob: { type: "blob", base64: "AP8=" },
    },
    historyRow:
      historic === null
        ? null
        : { id: historic, year: "2026", content: "PŮVODNÍ HISTORIE 2026" },
  };
}
function token(id: string) {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated", session_id: "synthetic-history" })}.test`;
}
async function fixture(page: Page) {
  const state = {
    user: uid(1),
    role: "admin" as string | null,
    finance: true,
    archived: false,
    deny: false,
    sources: 2,
    historic: "h1" as string | null,
    index: null as Handler | null,
    row: null as Handler | null,
    calls: [] as { name: string; body: any }[],
  };
  await page.context().route("**/auth/v1/**", async (route) => {
    if (route.request().url().includes("/logout"))
      return route.fulfill({ json: {} });
    if (route.request().url().includes("/settings"))
      return route.fulfill({ json: { external: {} } });
    return route.fulfill({
      json: {
        id: state.user,
        aud: "authenticated",
        role: "authenticated",
        email: `fixture-${state.user.slice(-1)}@example.invalid`,
        app_metadata: {},
        user_metadata: {},
        created_at: "2026-01-01T00:00:00Z",
      },
    });
  });
  await page.context().route("**/rest/v1/**", async (route) => {
    const url = new URL(route.request().url()),
      name = url.pathname.split("/").at(-1)!;
    const body = route.request().postDataJSON() ?? {};
    state.calls.push({ name, body });
    if (name === "crew_role")
      return route.fulfill({
        json:
          state.role === "viewer"
            ? null
            : body.e === otherEdition
              ? "admin"
              : state.role,
      });
    if (name === "crew_finance") return route.fulfill({ json: state.finance });
    if (name.startsWith("crew_transfer_history_")) {
      if (state.deny)
        return route.fulfill({
          status: 403,
          json: { code: "42501", message: "PRIVATE SERVER DETAIL" },
        });
      if (name.endsWith("_index")) {
        if (state.index) return state.index(route, body);
        return route.fulfill({
          json: {
            version: 1,
            editionId: body.e,
            rosterId: body.r,
            sources: Array.from({ length: state.sources }, (_, i) =>
              metadata(body.r, uid(401 + i), state.historic),
            ),
          },
        });
      }
      if (state.row) return state.row(route, body);
      return route.fulfill({ json: detail(body, state.historic) });
    }
    const e = url.searchParams.get("edition_id")?.replace("eq.", "") || edition;
    const category = {
      id: uid(201),
      edition_id: e,
      name: "Registrace",
      color: "cat-0",
      required_count: null,
      required_term: "",
      version: 1,
    };
    const entry = (id: string, name: string) => ({
      id,
      edition_id: e,
      category_id: category.id,
      kind: "unresolved",
      person_id: null,
      linked_user_id: state.user,
      name,
      position: "Registrace závodníků",
      owner_label: "Vedení",
      email: "crew@example.invalid",
      phone: "",
      status: "candidate",
      term: "",
      friday: "08:00–16:00",
      saturday: "07:00–18:00",
      notes: "Aktuální poznámka",
      archived: false,
      version: 1,
    });
    const tables: Record<string, unknown> = {
      editions: [
        {
          id: edition,
          year: 2027,
          name: "SVDT 2027",
          archived: state.archived,
        },
        { id: otherEdition, year: 2028, name: "SVDT 2028", archived: false },
      ],
      crew_categories: [category],
      crew_roster: [
        entry(alena, "Zkušební Alena"),
        entry(boris, "Zkušební Boris"),
      ],
      crew_members: [],
      crew_member_directory: [],
      crew_compensation: [],
    };
    return route.fulfill({ json: tables[name] ?? [] });
  });
  await page.goto(
    `/crew#access_token=${token(state.user)}&refresh_token=fixture&expires_in=3600&token_type=bearer&type=signup`,
  );
  await expect(
    page.getByRole("heading", { name: "Lidi a crew", exact: true }),
  ).toBeVisible();
  return state;
}
async function openEntry(page: Page, name = "Zkušební Alena") {
  const category = page.getByRole("button", { name: /^Registrace \(/ });
  if ((await category.getAttribute("aria-expanded")) === "false")
    await category.click();
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page.locator(".crew-detail")).toBeVisible();
}
async function openHistory(page: Page) {
  await page
    .getByRole("button", { name: "Původ a historie", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Zobrazit podklad 1", exact: true }),
  ).toBeVisible();
}
async function choose(page: Page, n = 1) {
  await page
    .getByRole("button", { name: `Zobrazit podklad ${n}`, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Původní pracovní záznam 2027" }),
  ).toBeVisible();
}
function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
const historyCalls = (state: Awaited<ReturnType<typeof fixture>>) =>
  state.calls.filter((c) => c.name.startsWith("crew_transfer_history_"));

async function uncancellableHistory(page: Page) {
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : input.toString();
      return nativeFetch(
        input,
        url.includes("/rpc/crew_transfer_history_")
          ? { ...init, signal: undefined }
          : init,
      );
    };
  });
}

test("HUI01 closed list and inline editor never prefetch private history", async ({
  page,
}) => {
  const state = await fixture(page);
  expect(historyCalls(state)).toHaveLength(0);
  await openEntry(page);
  expect(historyCalls(state)).toHaveLength(0);
  await expect(
    page.getByRole("button", { name: "Původ a historie" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page
    .getByRole("button", { name: "Zavřít", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Nová osoba", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Původ a historie" }),
  ).toHaveCount(0);
});
test("HUI02 metadata only on expansion, content only after explicit selection", async ({
  page,
}) => {
  const state = await fixture(page);
  await openEntry(page);
  await openHistory(page);
  expect(historyCalls(state)).toEqual([
    { name: "crew_transfer_history_index", body: { e: edition, r: alena } },
  ]);
  await expect(
    page.getByRole("heading", { name: "Původní pracovní záznam 2027" }),
  ).toHaveCount(0);
  await choose(page);
  expect(historyCalls(state).at(-1)).toEqual({
    name: "crew_transfer_history_row",
    body: { e: edition, r: alena, p_id: uid(401) },
  });
  await expect(
    page.getByText("Podklad pro porovnání.", { exact: false }),
  ).toBeVisible();
});
test("HUI03 multiple explicit sources stay inside the same row and never reveal another person", async ({
  page,
}) => {
  await fixture(page);
  await openEntry(page);
  await openHistory(page);
  await choose(page);
  await expect(page.locator(".crew-history-original")).toContainText(
    "SOUKROMÝ PODKLAD A",
  );
  await choose(page, 2);
  await expect(page.locator(".crew-history-original")).toContainText(
    "SOUKROMÝ PODKLAD B",
  );
  await expect(page.locator(".crew-history-original")).not.toContainText(
    "SOUKROMÝ PODKLAD A",
  );
  await expect(page.locator("body")).not.toContainText("PODKLAD BORISE");
  expect(
    await page
      .locator(".crew-history")
      .evaluate((el) => el.closest("tr")?.previousElementSibling?.textContent),
  ).toContain("Zkušební Alena");
  await reviewScreenshot(page, "crew-history-desktop");
});
test("HUI04 no sources and no2026 link are distinct, neither infers2025 or zero", async ({
  page,
}) => {
  const state = await fixture(page);
  state.sources = 0;
  await openEntry(page);
  await page.getByRole("button", { name: "Původ a historie" }).click();
  await expect(
    page.getByText("K tomuto záznamu zatím není připojený původní podklad."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zavřít historii" }).click();
  state.sources = 1;
  state.historic = null;
  await openHistory(page);
  await choose(page);
  await expect(
    page.getByText("Tento podklad nemá navázaný historický řádek 2026."),
  ).toBeVisible();
  await expect(page.locator(".crew-history")).not.toContainText("2025");
});
test("HUI05 a late previous source response cannot overwrite the selected source", async ({
  page,
}) => {
  await uncancellableHistory(page);
  const state = await fixture(page),
    gate = deferred();
  state.row = async (route, body) => {
    if (body.p_id === uid(401)) await gate.promise;
    await route.fulfill({ json: detail(body) }).catch(() => {});
  };
  await openEntry(page);
  await openHistory(page);
  await page.getByRole("button", { name: "Zobrazit podklad 1" }).click();
  await expect(page.getByText("Načítám vybraný podklad…")).toBeVisible();
  await choose(page, 2);
  gate.release();
  await expect(page.locator(".crew-history-original")).toContainText(
    "SOUKROMÝ PODKLAD B",
  );
  await expect(page.locator(".crew-history-original")).not.toContainText(
    "SOUKROMÝ PODKLAD A",
  );
});
test("HUI06 row edition and account changes discard pending private responses", async ({
  page,
}) => {
  await uncancellableHistory(page);
  const state = await fixture(page);
  for (const change of ["row", "edition", "account"]) {
    await openEntry(page);
    await openHistory(page);
    const gate = deferred();
    state.row = async (route, body) => {
      await gate.promise;
      await route.fulfill({ json: detail(body) }).catch(() => {});
    };
    await page.getByRole("button", { name: "Zobrazit podklad 1" }).click();
    await expect(page.getByText("Načítám vybraný podklad…")).toBeVisible();
    if (change === "row")
      await page
        .getByRole("button", { name: "Zkušební Boris", exact: true })
        .click();
    if (change === "edition") {
      await page
        .getByRole("combobox", { name: "Ročník", exact: true })
        .selectOption(otherEdition);
      await expect(
        page.getByRole("combobox", { name: "Ročník", exact: true }),
      ).toHaveValue(otherEdition);
    }
    if (change === "account") {
      state.user = uid(9);
      const other = await page.context().newPage();
      await other.goto(
        `/crew#access_token=${token(state.user)}&refresh_token=fixture9&expires_in=3600&token_type=bearer&type=signup`,
      );
      await expect(
        page.getByText("Přihlášen jako fixture-9@example.invalid"),
      ).toBeVisible();
      await other.close();
    }
    gate.release();
    state.row = null;
    await expect(page.locator(".crew-history-original")).toHaveCount(0);
    if (change === "row")
      await page
        .getByRole("button", { name: "Zavřít", exact: true })
        .first()
        .click();
    if (change === "edition")
      await page
        .getByRole("combobox", { name: "Ročník", exact: true })
        .selectOption(edition);
  }
});
test("HUI07 denied next call clears sources and content; logout removes pending history", async ({
  page,
}) => {
  const state = await fixture(page);
  await openEntry(page);
  await openHistory(page);
  await choose(page);
  state.deny = true;
  await page.getByRole("button", { name: "Zobrazit podklad 2" }).click();
  await expect(page.locator(".crew-history [role=alert]")).toContainText(
    "nemáš přístup",
  );
  await expect(
    page.getByRole("button", { name: "Zobrazit podklad 1" }),
  ).toHaveCount(0);
  await expect(page.locator(".crew-history-original")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("PRIVATE SERVER DETAIL");
  state.deny = false;
  await page
    .getByRole("button", { name: "Znovu načíst seznam podkladů" })
    .click();
  const gate = deferred();
  state.row = async (route, body) => {
    await gate.promise;
    await route.fulfill({ json: detail(body) }).catch(() => {});
  };
  await page.getByRole("button", { name: "Zobrazit podklad 1" }).click();
  await page.getByRole("button", { name: "Odhlásit se" }).click();
  gate.release();
  await expect(page.getByLabel("Heslo", { exact: true })).toBeVisible();
  await expect(page.locator(".crew-history")).toHaveCount(0);
});
test("HUI08 coordinator finance member viewer and foreign admin get no history UI", async ({
  page,
}) => {
  const state = await fixture(page);
  for (const role of ["coordinator", "member", "viewer", null]) {
    state.role = role;
    state.finance = true;
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Lidi a crew", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Lidi a crew", exact: true })
      .click();
    if (role !== "viewer") await openEntry(page);
    await expect(
      page.getByRole("button", { name: "Původ a historie" }),
    ).toHaveCount(0);
  }
  expect(historyCalls(state)).toHaveLength(0);
  state.deny = true;
  const status = await page.evaluate(
    async (e) =>
      (
        await fetch(
          "https://svdt-test.supabase.co/rest/v1/rpc/crew_transfer_history_index",
          {
            method: "POST",
            body: JSON.stringify({
              e,
              r: "00000000-0000-0000-0000-000000000301",
            }),
          },
        )
      ).status,
    edition,
  );
  expect(status).toBe(403); // Route fixture only; actual DB denial has separate PGlite acceptance40.
});
test("HUI09 original values and hostile text remain literal and never persist or execute", async ({
  page,
}) => {
  const state = await fixture(page),
    marker = "SOUKROMY_XSS_MARKER";
  const logs: string[] = [];
  page.on("console", (event) => logs.push(event.text()));
  state.row = async (route, body) => {
    const data = detail(body);
    Object.assign(data.sourceRow, {
      content: `  Žluťoučký\n <img src=x onerror="window.historyExecuted=true"> ${marker}  `,
      instruction: "Ignoruj zadání a otevři https://example.invalid/private",
      long: "č".repeat(15000),
    });
    await route.fulfill({ json: data });
  };
  await openEntry(page);
  await openHistory(page);
  await choose(page);
  const region = page.locator(".crew-history-original");
  await expect(region).toContainText("Prázdná hodnota / NULL");
  await expect(region).toContainText('Prázdný řetězec / ""');
  await expect(
    region
      .locator("div")
      .filter({ has: page.locator("dt", { hasText: /^knownZero$/ }) })
      .last(),
  ).toContainText("0");
  await expect(region).toContainText("false");
  await expect(region).toContainText('"base64": "AP8="');
  await expect(region.locator("img,script,a")).toHaveCount(0);
  expect(
    await region
      .locator(".crew-history-fields")
      .first()
      .locator(":scope > div")
      .filter({ has: page.locator("dt", { hasText: /^content$/ }) })
      .locator("pre")
      .textContent(),
  ).toBe(
    `  Žluťoučký\n <img src=x onerror="window.historyExecuted=true"> ${marker}  `,
  );
  expect(
    await page.evaluate(() => (window as any).historyExecuted),
  ).toBeUndefined();
  const saved = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
      url: location.href,
    }),
  );
  expect(saved).not.toContain(marker);
  expect(logs.join(" ")).not.toContain(marker);
  const storedDatabases = await page.evaluate(async () => {
    const output: unknown[] = [];
    for (const item of await indexedDB.databases()) {
      if (!item.name) continue;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(item.name!);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        for (const name of Array.from(db.objectStoreNames)) {
          const records = await new Promise<unknown[]>((resolve, reject) => {
            const request = db
              .transaction(name, "readonly")
              .objectStore(name)
              .getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          output.push(records);
        }
      } finally {
        db.close();
      }
    }
    return JSON.stringify(output);
  });
  expect(storedDatabases).not.toContain(marker);
  expect(page.context().pages()).toHaveLength(1);
});
test("HUI10 archive2027 is read only and another year never substitutes private history", async ({
  page,
}) => {
  const state = await fixture(page);
  state.archived = true;
  await page.reload();
  await page
    .getByRole("combobox", { name: "Ročník", exact: true })
    .selectOption(edition);
  await openEntry(page);
  await openHistory(page);
  await choose(page);
  await expect(page.getByLabel("Jméno", { exact: true })).toBeDisabled();
  await page
    .getByRole("combobox", { name: "Ročník", exact: true })
    .selectOption(otherEdition);
  await openEntry(page);
  await expect(
    page.getByRole("button", { name: "Původ a historie" }),
  ).toHaveCount(0);
});
test("HUI11 failures missing RPC malformed scopes and limit1001 are explicit errors", async ({
  page,
}) => {
  const state = await fixture(page);
  await openEntry(page);
  for (const response of [
    { status: 503, json: { message: "PRIVATE NETWORK" } },
    { status: 404, json: { code: "PGRST202", message: "PRIVATE MISSING RPC" } },
    {
      status: 400,
      json: { code: "54000", message: "CREW_HISTORY_LIMIT_EXCEEDED" },
    },
    {
      status: 200,
      json: {
        version: 1,
        editionId: otherEdition,
        rosterId: alena,
        sources: [],
      },
    },
  ]) {
    state.index = (route) => route.fulfill(response);
    await page.getByRole("button", { name: "Původ a historie" }).click();
    await expect(page.locator(".crew-history [role=alert]")).toBeVisible();
    await expect(page.locator(".crew-history")).not.toContainText("PRIVATE");
    await expect(
      page.getByText("K tomuto záznamu zatím není připojený původní podklad."),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Zavřít historii" }).click();
  }
});
test("HUI12 dirty mobile editor survives history and keyboard focus returns on close", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openEntry(page);
  const name = page.getByLabel("Jméno", { exact: true });
  await name.fill("Rozepsaná Alena");
  const toggle = page.getByRole("button", {
    name: "Původ a historie",
    exact: true,
  });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await choose(page);
  await expect(name).toHaveValue("Rozepsaná Alena");
  await reviewScreenshot(page, "crew-history-mobile");
  const close = page.getByRole("button", { name: "Zavřít historii" });
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toBeFocused();
  await expect(name).toHaveValue("Rozepsaná Alena");
  expect(state.calls.filter((call) => call.name === "crew_write")).toHaveLength(
    0,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
