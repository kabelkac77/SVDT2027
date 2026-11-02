import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./backend";
import {
  OperationKind,
  OperationTask,
  OperationsData,
  Registration,
  RegistrationGrant,
  Zone,
} from "./operations-model";

function requireClient(): SupabaseClient {
  const client = supabase();
  if (!client) throw Error("OPERATIONS_CONFIG_MISSING");
  return client;
}

async function allOperationRows<T>(
  client: SupabaseClient,
  table: string,
  editionId: string,
): Promise<T[]> {
  const order = table === "operations_grants" ? "user_id" : "id";
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

export async function loadOperations(
  editionId: string,
): Promise<OperationsData> {
  const client = requireClient();
  const { data: roleData, error: roleError } = await client.rpc("crew_role", {
    e: editionId,
  });
  if (roleError) throw roleError;
  if (!roleData) throw Error("OPERATIONS_ACCESS_DENIED");
  const { data: accessData, error: accessError } = await client.rpc(
    "operations_registration_access",
    { e: editionId },
  );
  if (accessError) throw accessError;
  const canRegistration = Boolean(accessData);
  const zones = await allOperationRows<Zone>(
    client,
    "operations_zones",
    editionId,
  );
  const tasks = await allOperationRows<OperationTask>(
    client,
    "operations_tasks",
    editionId,
  );
  const grants = await allOperationRows<RegistrationGrant>(
    client,
    "operations_grants",
    editionId,
  );
  const registrations = canRegistration
    ? await allOperationRows<Registration>(
        client,
        "operations_registrations",
        editionId,
      )
    : [];
  return { zones, tasks, registrations, grants, canRegistration };
}

export async function writeOperation(
  editionId: string,
  kind: OperationKind,
  payload: Record<string, unknown>,
  requestId: string,
): Promise<unknown> {
  const client = requireClient();
  const { data, error } = await client.rpc("operations_write", {
    e: editionId,
    k: kind,
    p: payload,
    request_id: requestId,
  });
  if (error) throw error;
  return data;
}
