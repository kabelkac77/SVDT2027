import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as domain from "../src/lib/operations-model";
import * as crewDomain from "../src/lib/crew-model";
import * as views from "../src/components/operations-views";
import * as forms from "../src/components/operations-forms";
// SSR integration boundary: real child components and a controlled hook snapshot; no browser/Auth/network claim.
const source = readFileSync(
  new URL("../src/components/operations-panel.tsx", import.meta.url),
  "utf8",
);
const js = transformSync(source, {
  loader: "tsx",
  format: "cjs",
  jsx: "automatic",
  target: "es2022",
}).code;
const own = {
    ...crewDomain.emptyCrewEntry("cat"),
    id: "mine",
    edition_id: "e1",
    name: "Own person",
    linked_user_id: "u1",
  },
  other = {
    ...own,
    id: "other",
    name: "FORBIDDEN-OTHER-PERSON",
    linked_user_id: "u2",
  },
  foreign = {
    ...own,
    id: "foreign",
    edition_id: "e2",
    name: "FORBIDDEN-FOREIGN-PERSON",
  };
const task = {
  ...domain.newTask("e1", "t"),
  title: "Own task",
  assignee_roster_id: "mine",
};
const rider = {
  ...domain.newRegistration("e1", "r"),
  full_name: "PRIVATE-RIDER",
  email: "PRIVATE-EMAIL",
  phone: "PRIVATE-PHONE",
};
const data = {
  zones: [],
  tasks: [task],
  registrations: [rider],
  grants: [],
  canRegistration: true,
};
function render(extra: any = {}) {
  const noop = () => {};
  const state: any = {
    data,
    loading: false,
    saving: false,
    error: null,
    notice: null,
    selection: null,
    dirty: false,
    view: "tasks",
    filters: { search: "", status: "all", includeArchived: false },
    canEdit: true,
    canRegister: true,
    changeView: noop,
    changeFilters: noop,
    open: noop,
    create: noop,
    openGrant: noop,
    change: noop,
    cancel: noop,
    reload: noop,
    save: async () => {},
    ...extra.state,
  };
  const crew: any = {
    role: "admin",
    canFinance: true,
    categories: [],
    entries: [own, other, foreign],
    members: [
      {
        edition_id: "e1",
        user_id: "u1",
        email: "synthetic-member@example.invalid",
      },
    ],
    compensation: [],
    ...extra.crew,
  };
  const mocks: any = {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    "../lib/operations-model": domain,
    "../lib/crew-model": crewDomain,
    "./operations-views": views,
    "./operations-forms": forms,
    "./use-operations-workspace": { useOperationsWorkspace: () => state },
  };
  const mod: any = { exports: {} };
  runInNewContext(js, {
    module: mod,
    exports: mod.exports,
    require: (name: string) => {
      if (name in mocks) return mocks[name];
      throw Error("Unexpected panel import " + name);
    },
  });
  return renderToStaticMarkup(
    React.createElement(mod.exports.OperationsPanel, {
      edition: { id: "e1", year: 2027, archived: false, ...extra.edition },
      crew,
      userId: "u1",
      onGuardChange: noop,
    }),
  );
}
test("member readonly task detail never exposes another person through dropdown choices", () => {
  const html = render({
    crew: { role: "member" },
    state: {
      canEdit: false,
      canRegister: false,
      data: { ...data, canRegistration: false },
      selection: { kind: "task", value: task },
    },
  });
  assert.match(html, /Own task/);
  assert.match(html, /Own person/);
  assert.doesNotMatch(
    html,
    /FORBIDDEN-|synthetic-member@example.invalid|PRIVATE-/,
  );
  assert.doesNotMatch(html, />Uložit</);
});
test("without loaded operations an old private draft cannot appear beneath an error", () => {
  const html = render({
    state: {
      data: null,
      error: "Načtení selhalo",
      selection: { kind: "registration", value: rider },
    },
  });
  assert.match(html, /Načtení selhalo/);
  assert.doesNotMatch(html, /PRIVATE-/);
});
test("revoked registration permission hides a stale unsaved rider draft", () => {
  const html = render({
    state: {
      data: { ...data, canRegistration: false },
      canRegister: false,
      view: "registrations",
      selection: {
        kind: "registration",
        value: { ...rider, id: "unsaved-private", version: 0 },
      },
    },
  });
  assert.doesNotMatch(html, /PRIVATE-/);
});
test("archive registration details stay readable and their fields cannot save", () => {
  const html = render({
    edition: { archived: true },
    state: {
      view: "registrations",
      canEdit: false,
      canRegister: false,
      selection: { kind: "registration", value: { ...rider, version: 1 } },
    },
  });
  assert.match(html, /PRIVATE-RIDER/);
  assert.match(html, /PRIVATE-EMAIL/);
  assert.match(html, /<fieldset[^>]* disabled/);
  assert.doesNotMatch(html, />Uložit</);
});
test("existing account registration grant is admin-only and remains editable in archive", () => {
  const grant = {
    edition_id: "e1",
    user_id: "u1",
    version: 0,
    can_registration: false,
  };
  const html = render({
    edition: { archived: true },
    state: {
      canEdit: false,
      canRegister: false,
      selection: { kind: "registration_grant", value: grant },
    },
  });
  assert.match(html, /synthetic-member@example.invalid/);
  assert.match(html, /type="checkbox"/);
  assert.doesNotMatch(
    render({
      crew: { role: "coordinator" },
      state: { selection: { kind: "registration_grant", value: grant } },
    }),
    /synthetic-member@example.invalid/,
  );
});
test("new task editor appears exactly once as an inline draft", () => {
  const html = render({
    state: {
      selection: {
        kind: "task",
        value: { ...domain.newTask("e1", "new"), title: "UNSAVED-NEW-TASK" },
      },
    },
  });
  assert.equal(html.match(/value="UNSAVED-NEW-TASK"/g)?.length, 1);
});
test("an unknown role cannot expose loaded operation records or private grant accounts", () => {
  assert.doesNotMatch(
    render({
      crew: { role: null },
      state: {
        view: "registrations",
        selection: {
          kind: "registration",
          value: { ...rider, id: "unsaved-private", version: 0 },
        },
      },
    }),
    /PRIVATE-|synthetic-member@example.invalid/,
  );
});
