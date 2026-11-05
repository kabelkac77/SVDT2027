import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";

test("review-only deployment plan pins every checked-in migration in dependency order", async () => {
  const plan = JSON.parse(
    await readFile(
      new URL(
        "../../event-app-zadani/shared-deployment-plan.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(plan.autoApply, false);
  assert.equal(plan.mode, "operator_review_required");
  assert.equal(plan.targetAppliedState, "unknown");
  const directory = new URL("../supabase/migrations/", import.meta.url);
  const files = (await readdir(directory))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  assert.deepEqual(
    plan.migrations.map((item) => item.name),
    files,
  );
  const prior = new Set();
  for (const item of plan.migrations) {
    assert.match(item.name, /^\d{12}_[a-z_]+\.sql$/);
    assert.equal(item.autoApply, false);
    assert.ok(
      item.dependsOn.every((name) => prior.has(name)),
      "dependency must precede its migration",
    );
    const bytes = await readFile(new URL(item.name, directory));
    assert.equal(
      item.sha256,
      createHash("sha256").update(bytes).digest("hex"),
      "migration drift requires a new reviewed plan",
    );
    prior.add(item.name);
  }
  for (const gate of [
    "verified_database_and_storage_backup",
    "isolated_restore",
    "reconciled_existing_migration_state",
  ])
    assert.ok(plan.requiredBeforeDdl.includes(gate));
  for (const gate of [
    "existing_account_uuids_and_scopes",
    "approved_private_import_mapping",
    "two_account_negative_access_checks",
  ])
    assert.ok(plan.requiredBeforeLive.includes(gate));
});
