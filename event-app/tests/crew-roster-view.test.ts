import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CrewRosterView } from "../src/components/crew-roster-view";
import { emptyCrewEntry } from "../src/lib/crew-model";
const edition = {
  id: "edition-a",
  year: 2027,
  name: "Synthetic edition",
  archived: false,
};
const category = {
  id: "category-a",
  edition_id: edition.id,
  name: "Synthetic category",
  color: "cat-0",
  required_count: 1,
  required_term: "Slot A",
  version: 1,
};
const own = {
  ...emptyCrewEntry(category.id),
  id: "row-a",
  edition_id: edition.id,
  name: "Synthetic own crew",
  kind: "person" as const,
  person_id: "person-a",
  linked_user_id: "member-a",
  status: "confirmed" as const,
  term: "Slot A",
  friday: "08:00–16:00",
  saturday: "07:00–18:00",
  email: "own@example.invalid",
  phone: "00123",
  version: 1,
};
const other = {
  ...own,
  id: "row-b",
  name: "Synthetic other crew",
  person_id: "person-b",
  linked_user_id: "member-b",
  status: "declined" as const,
};
const fee = {
  roster_id: own.id,
  edition_id: edition.id,
  estimate: null,
  agreed: 123450,
  total: null,
  paid: 0,
  barter: "Synthetic private barter",
  merch: "Synthetic private merch",
  version: 1,
};
function base() {
  return {
    edition,
    data: {
      role: "admin",
      canFinance: true,
      categories: [category],
      entries: [own, other],
      members: [],
      compensation: [fee],
    },
    userId: "member-a",
    filters: { search: "", status: "all", includeArchived: false },
    expanded: [category.id],
    draft: null,
    anchorCategoryId: null,
    pendingKind: null,
    saving: false,
    onToggle: () => {},
    onOpen: () => {},
    onChange: () => {},
    onCancel: () => {},
    onSave: async () => false,
    onDirty: () => {},
  } as any;
}
function render(props: any) {
  return renderToStaticMarkup(createElement(CrewRosterView, props));
}
function noFinance(data: any) {
  Object.defineProperty(data, "compensation", {
    get() {
      throw Error("Private compensation must not be accessed");
    },
  });
  return data;
}
function heading(html: string) {
  return (
    html
      .match(
        /<tr[^>]*class="[^"]*crew-group-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/,
      )?.[1]
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ") || ""
  );
}
test("member view filters a wider stale snapshot to own assignments and never reads compensation", () => {
  const p = base();
  p.data.role = "member";
  p.data.canFinance = false;
  p.data = noFinance(p.data);
  p.draft = own;
  p.anchorCategoryId = category.id;
  const html = render(p);
  assert.ok(html.includes(own.name));
  assert.ok(!html.includes(other.name));
  assert.ok(html.includes("Moje přiřazení"));
  assert.ok(!html.includes("Cíl pokryt"));
  assert.ok(!html.includes("Chybí 1"));
  assert.ok(!html.includes("Synthetic private"));
});
test("non-financial coordinator never reads fee data even for an open inline detail", () => {
  const p = base();
  p.data.role = "coordinator";
  p.data.canFinance = false;
  p.data = noFinance(p.data);
  p.draft = own;
  p.anchorCategoryId = category.id;
  const html = render(p);
  assert.ok(html.includes("Odměna neveřejná"));
  assert.ok(!html.includes("Synthetic private"));
});
test("financial admin sees the known agreement and its separately saved details", () => {
  const p = base();
  p.draft = own;
  p.anchorCategoryId = category.id;
  const html = render(p);
  assert.ok(html.includes("1234,50"));
  assert.ok(html.includes(fee.barter));
  assert.ok(html.includes(fee.merch));
  assert.match(html, /<tr[^>]*crew-detail[\s\S]*?<td[^>]*col[Ss]pan="8"/);
});
test("coverage uses all saved assignments while the visible status filter can exclude the confirmation", () => {
  const p = base();
  p.filters.status = "declined";
  const html = render(p),
    h = heading(html);
  assert.ok(h.includes("Cíl pokryt"));
  assert.ok(h.includes("Slot A"));
  assert.ok(!html.includes(own.name));
  assert.ok(html.includes(other.name));
});
test("new draft remains anchored and visible after category changes despite incompatible filters", () => {
  const p = base();
  p.data.categories.push({
    ...category,
    id: "category-b",
    name: "Second category",
    color: "cat-1",
  });
  p.filters.status = "declined";
  p.draft = {
    ...own,
    id: "new-row",
    category_id: "category-b",
    name: "Unsaved new person",
    version: 0,
  };
  p.anchorCategoryId = category.id;
  const html = render(p);
  assert.ok(html.includes("Unsaved new person"));
  assert.match(html, /<tr[^>]*crew-detail[\s\S]*?<td[^>]*col[Ss]pan="8"/);
});
test("archive exposes saved values read-only in both operational and compensation fieldsets", () => {
  const p = base();
  p.edition = { ...edition, archived: true };
  p.draft = own;
  p.anchorCategoryId = category.id;
  const html = render(p);
  assert.ok((html.match(/<fieldset[^>]*disabled/g) || []).length >= 2);
});
test("collapsed categories retain their summaries without rendering personal rows or details", () => {
  const p = base();
  p.expanded = [];
  const html = render(p);
  assert.ok(heading(html).includes("Synthetic category"));
  assert.ok(!html.includes(own.name));
  assert.ok(!html.includes(other.name));
  assert.ok(!html.includes("crew-detail"));
});
test("invalid category color cannot inject CSS classes", () => {
  const p = base();
  p.data.categories = [{ ...category, color: "cat-0 injected" }];
  const html = render(p);
  assert.ok(!html.includes("injected"));
  assert.ok(html.includes("cat-11"));
});
test("table retains eight main columns and keeps contact details outside the collapsed entry rows", () => {
  const html = render(base()),
    thead = html.match(/<thead[^>]*>([\s\S]*?)<\/thead>/)?.[1] || "";
  assert.equal((thead.match(/<th[\s>]/g) || []).length, 8);
  assert.ok(html.includes(own.friday));
  assert.ok(html.includes(own.saturday));
  assert.ok(!html.includes(own.email));
  assert.ok(!html.includes(own.phone));
});
test("main agreement renders explicit zero and keeps an unknown amount unknown", () => {
  const zero = base();
  zero.data.entries = [own];
  zero.data.compensation = [{ ...fee, agreed: 0 }];
  assert.ok(render(zero).includes("0,00"));
  const unknown = base();
  unknown.data.entries = [own];
  unknown.data.compensation = [{ ...fee, agreed: null }];
  const html = render(unknown);
  assert.ok(html.includes("Částka neurčena"));
  assert.ok(!html.includes("0,00"));
});
test("a stale fee from another edition never appears on the current row", () => {
  const p = base();
  p.data.entries = [own];
  p.data.compensation = [{ ...fee, edition_id: "different-edition" }];
  const html = render(p);
  assert.ok(!html.includes("1234,50"));
  assert.ok(html.includes("Částka neurčena"));
});
test("rendering never mutates categories or assignments passed by the workspace", () => {
  const p = base();
  Object.freeze(p.data.categories);
  Object.freeze(p.data.entries);
  for (const r of p.data.entries) Object.freeze(r);
  assert.doesNotThrow(() => render(p));
});

test("agreement and year are displayed under their correct main-row column labels", () => {
  const p = base();
  p.data.entries = [own];
  const html = render(p);
  assert.match(html, /data-label="Domluva">1234,50 Kč/);
  assert.match(html, /data-label="Rok">2027</);
});
test("an unsaved UUID-bearing draft cannot edit compensation before its roster exists", () => {
  const p = base();
  p.draft = { ...own, id: "not-yet-saved", version: 0 };
  p.anchorCategoryId = category.id;
  const html = render(p);
  assert.ok(html.includes("Nejdřív ulož záznam."));
  assert.ok(!html.includes('name="agreed"'));
});
test("an archived person can be restored inside an active edition", () => {
  const p = base();
  p.data.entries = [{ ...own, archived: true }];
  p.filters.includeArchived = true;
  p.draft = { ...own, archived: true };
  p.anchorCategoryId = category.id;
  const html = render(p);
  assert.ok(!/<fieldset[^>]*disabled/.test(html));
});
test("losing every crew role hides a stale roster and its open draft", () => {
  const p = base();
  p.data.role = null;
  p.data.canFinance = false;
  p.data = noFinance(p.data);
  p.draft = own;
  p.anchorCategoryId = category.id;
  const html = render(p);
  assert.ok(!html.includes(own.name));
  assert.ok(!html.includes("crew-detail"));
});

test("a stale draft outside the current member or edition scope never opens under an allowed row", () => {
  for (const extra of [
    { linked_user_id: "other-user" },
    { edition_id: "other-edition" },
  ]) {
    const p = base();
    p.data.role = "member";
    p.data.canFinance = false;
    p.draft = { ...own, ...extra, name: "Private stale draft" };
    p.anchorCategoryId = category.id;
    const html = render(p);
    assert.ok(!html.includes("Private stale draft"));
    assert.ok(!html.includes("crew-detail"));
  }
});
