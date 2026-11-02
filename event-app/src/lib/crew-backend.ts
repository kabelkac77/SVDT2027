import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./backend";
import { Edition } from "./model";
import {
  CrewCategory,
  CrewCompensation,
  CrewData,
  CrewEntry,
  CrewMembership,
  CrewRole,
  CrewWriteKind,
} from "./crew-model";

function requireClient(): SupabaseClient {
  const client = supabase();
  if (!client) throw Error("CREW_CONFIG_MISSING");
  return client;
}

async function loadAllEditions(client: SupabaseClient): Promise<Edition[]> {
  const rows: Edition[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await client
      .from("editions")
      .select("*")
      .order("year", { ascending: false })
      .order("id")
      .range(from, from + 499);
    if (error) throw error;
    rows.push(...((data ?? []) as Edition[]));
    if (!data || data.length < 500) return rows;
  }
}

export async function loadCrewEditions(): Promise<Edition[]> {
  const client = requireClient();
  const editions = await loadAllEditions(client);
  const withRole = await Promise.all(
    editions.map(async (edition) => {
      const { data, error } = await client.rpc("crew_role", { e: edition.id });
      if (error) throw error;
      return data ? edition : null;
    }),
  );
  return withRole.filter((edition): edition is Edition => edition !== null);
}

async function allCrewRows<T>(
  client: SupabaseClient,
  table: string,
  editionId: string,
): Promise<T[]> {
  const order =
    table === "crew_members"
      ? "user_id"
      : table === "crew_compensation"
        ? "roster_id"
        : "id";
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .eq("edition_id", editionId)
      .order(order)
      .range(from, from + 499);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 500) return rows;
  }
}

export async function loadCrew(editionId: string): Promise<CrewData> {
  const client = requireClient();
  const { data: roleData, error: roleError } = await client.rpc("crew_role", {
    e: editionId,
  });
  if (roleError) throw roleError;
  const role = (roleData ?? null) as CrewRole | null;
  if (!role) throw Error("CREW_ACCESS_DENIED");
  const { data: financeData, error: financeError } = await client.rpc(
    "crew_finance",
    { e: editionId },
  );
  if (financeError) throw financeError;
  const canFinance = Boolean(financeData);
  const categories = await allCrewRows<CrewCategory>(
    client,
    "crew_categories",
    editionId,
  );
  const entries = await allCrewRows<CrewEntry>(client, "crew_roster", editionId);
  let members: CrewMembership[];
  if (role === "admin") {
    members = [];
    for (let from = 0; ; from += 500) {
      const result = await client.rpc("crew_member_directory", { e: editionId })
        .order("user_id").range(from, from + 499);
      if (result.error) throw result.error;
      members.push(...((result.data ?? []) as CrewMembership[]));
      if (!result.data || result.data.length < 500) break;
    }
  } else members = await allCrewRows<CrewMembership>(client, "crew_members", editionId);
  const compensation = canFinance
    ? await allCrewRows<CrewCompensation>(client, "crew_compensation", editionId)
    : [];
  return { role, canFinance, categories, entries, compensation, members };
}

export async function writeCrew(
  editionId: string,
  kind: CrewWriteKind,
  payload: Record<string, unknown>,
  requestId: string,
): Promise<unknown> {
  const client = requireClient();
  const { data, error } = await client.rpc("crew_write", {
    e: editionId,
    k: kind,
    p: payload,
    request_id: requestId,
  });
  if (error) throw error;
  return data;
}
