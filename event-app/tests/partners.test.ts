import { test } from "node:test";
import assert from "node:assert/strict";
import { freshDemo, readDemo } from "../src/lib/demo";
import { historicalAmount, PartnerHistoricalRecord } from "../src/lib/model";

test("historical totals distinguish unknown, zero and overlapping source rows", () => {
  const row: PartnerHistoricalRecord = {
    id: "h1",
    organization_id: "o1",
    event_name: "SVDT",
    year: 2025,
    cash_amount_czk: null,
    fulfillment: "",
    position: "",
    source_ref: "fixture:1",
  };
  assert.equal(historicalAmount([]), null);
  assert.equal(historicalAmount([row]), null);
  assert.equal(historicalAmount([{ ...row, cash_amount_czk: 0 }]), 0);
  assert.equal(historicalAmount([{ ...row, cash_amount_czk: 1234 }]), 1234);
  assert.equal(
    historicalAmount([row, { ...row, id: "h2", cash_amount_czk: 1234 }]),
    null,
  );
});

test("existing demo storage gains history without resetting users' edits", () => {
  const data = freshDemo();
  const { partnerHistory: _, ...old } = data;
  old.prospects[0].internal_note = "Retained fixture edit";
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => JSON.stringify(old) },
  });
  try {
    assert.deepEqual(readDemo().partnerHistory, []);
    assert.equal(
      readDemo().prospects[0].internal_note,
      "Retained fixture edit",
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
