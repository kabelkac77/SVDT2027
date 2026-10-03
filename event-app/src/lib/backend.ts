import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  Data,
  PartnerInput,
  DeliverableInput,
  validatePartner,
  validateDeliverable,
} from "./model";
let client: SupabaseClient | null = null;
export function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key);
  return client;
}
async function allRows(table: string) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase()!
      .from(table)
      .select("*")
      .order(table === "edition_members" ? "user_id" : "id")
      .range(from, from + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export async function loadData(): Promise<Data> {
  const names = [
    "editions",
    "edition_members",
    "organizations",
    "people",
    "partner_prospects",
    "edition_partnerships",
    "partner_deliverables",
    "partner_historical_records",
    "audit_log",
  ];
  const values = await Promise.all(names.map(allRows));
  return Object.fromEntries(
    [
      "editions",
      "members",
      "organizations",
      "people",
      "prospects",
      "partnerships",
      "deliverables",
      "partnerHistory",
      "audit",
    ].map((k, i) => [k, values[i]]),
  ) as Data;
}
export async function savePartner(edition: string, payload: PartnerInput) {
  validatePartner(payload);
  const { data, error } = await supabase()!.rpc("save_partner", {
    e: edition,
    payload,
  });
  if (error) throw error;
  return data as string;
}
export async function saveDeliverable(
  edition: string,
  payload: DeliverableInput,
) {
  validateDeliverable(payload);
  const { data, error } = await supabase()!.rpc("save_deliverable", {
    e: edition,
    payload,
  });
  if (error) throw error;
  return data as string;
}
