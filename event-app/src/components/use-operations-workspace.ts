"use client";

import { useEffect, useRef, useState } from "react";
import type { CrewData } from "../lib/crew-model";
import type { Edition } from "../lib/model";
import {
  OperationKind,
  OperationTask,
  OperationsData,
  Registration,
  RegistrationGrant,
  Zone,
  isOperationAccessError,
  newRegistration,
  newTask,
  newZone,
  operationPayload,
  operationRequestFingerprint,
  operationsMessage,
  ownAssignments,
} from "../lib/operations-model";
import { loadOperations, writeOperation } from "../lib/operations-backend";
import type { OperationView } from "./operations-views";

export type OperationSelection =
  | {
      kind: "zone" | "task" | "registration";
      value: Zone | OperationTask | Registration;
    }
  | { kind: "registration_grant"; value: RegistrationGrant };

export type OperationsFilters = {
  search: string;
  status: string;
  includeArchived: boolean;
};

export function useOperationsWorkspace({
  edition,
  crew,
  userId,
  onGuardChange,
}: {
  edition: Edition;
  crew: CrewData;
  userId: string;
  onGuardChange: (guard: () => boolean) => void;
}) {
  const [data, setData] = useState<OperationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selection, setSelection] = useState<OperationSelection | null>(null);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<OperationView>(() =>
    crew.role === "member" ? "service" : "tasks",
  );
  const [filters, setFilters] = useState<OperationsFilters>({
    search: "",
    status: "all",
    includeArchived: false,
  });

  const aliveRef = useRef(true);
  const requestRef = useRef(0);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const requestIdsRef = useRef(new Map<string, string>());

  const canEdit =
    (crew.role === "admin" || crew.role === "coordinator") && !edition.archived;
  const canRegister =
    ["admin", "coordinator", "member"].includes(crew.role ?? "") &&
    !edition.archived &&
    Boolean(data?.canRegistration);

  function confirmDiscard(): boolean {
    if (savingRef.current) return false;
    if (!dirtyRef.current) return true;
    return window.confirm("Zahodit rozepsané změny?");
  }

  function closeDraft(): boolean {
    if (!confirmDiscard()) return false;
    dirtyRef.current = false;
    setDirty(false);
    setSelection(null);
    setNotice(null);
    return true;
  }

  function performLoad() {
    const token = ++requestRef.current;
    setLoading(true);
    setData(null);
    setError(null);
    loadOperations(edition.id)
      .then((result) => {
        if (!aliveRef.current || requestRef.current !== token) return;
        setData(result);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        if (!aliveRef.current || requestRef.current !== token) return;
        setData(null);
        setLoading(false);
        setError(operationsMessage(err));
      });
  }

  useEffect(() => {
    aliveRef.current = true;
    performLoad();
    return () => {
      aliveRef.current = false;
      requestRef.current += 1;
    };
  }, [edition.id, userId]);

  useEffect(() => {
    if (data && !data.canRegistration && selection?.kind === "registration") {
      dirtyRef.current = false;
      setDirty(false);
      setSelection(null);
    }
  }, [data, selection]);

  useEffect(() => {
    onGuardChange(closeDraft);
    return () => {
      onGuardChange(() => true);
    };
  }, [onGuardChange]);

  useEffect(() => {
    function handler(event: BeforeUnloadEvent) {
      if (savingRef.current || dirtyRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  function changeView(next: OperationView) {
    if (!closeDraft()) return;
    setView(next);
    setFilters((current) => ({ ...current, search: "", status: "all" }));
  }

  function changeFilters(next: Partial<OperationsFilters>) {
    if (!closeDraft()) return;
    setFilters((current) => ({ ...current, ...next }));
  }

  function open(kind: "zone" | "task" | "registration", id: string) {
    if (!closeDraft()) return;
    if (!data || !["admin", "coordinator", "member"].includes(crew.role ?? ""))
      return;
    if (kind === "zone") {
      const value = data.zones.find(
        (z) => z.id === id && z.edition_id === edition.id,
      );
      if (!value) return;
      setSelection({ kind: "zone", value: { ...value } });
      return;
    }
    if (kind === "task") {
      const value = data.tasks.find(
        (t) => t.id === id && t.edition_id === edition.id,
      );
      if (!value) return;
      const manager = crew.role === "admin" || crew.role === "coordinator";
      if (!manager) {
        const own = new Set(
          ownAssignments(crew.entries, edition.id, userId)
            .map((e) => e.id)
            .filter(
              (entryId): entryId is string => typeof entryId === "string",
            ),
        );
        if (!value.assignee_roster_id || !own.has(value.assignee_roster_id))
          return;
      }
      setSelection({ kind: "task", value: { ...value } });
      return;
    }
    if (!data.canRegistration) return;
    const value = data.registrations.find(
      (r) => r.id === id && r.edition_id === edition.id,
    );
    if (!value) return;
    setSelection({ kind: "registration", value: { ...value } });
  }

  function create(kind: "zone" | "task" | "registration") {
    if (!closeDraft()) return;
    if (!data) return;
    let id: string;
    try {
      id = crypto.randomUUID();
    } catch (err) {
      setError(operationsMessage(err));
      return;
    }
    if (kind === "registration") {
      if (!canRegister) return;
      setSelection({
        kind: "registration",
        value: newRegistration(edition.id, id),
      });
      return;
    }
    if (!canEdit) return;
    if (kind === "zone") {
      setSelection({
        kind: "zone",
        value: newZone(edition.id, id),
      });
    } else {
      setSelection({
        kind: "task",
        value: newTask(edition.id, id),
      });
    }
  }

  function openGrant(targetUserId: string) {
    if (!closeDraft()) return;
    if (crew.role !== "admin") return;
    if (!data) return;
    const member = crew.members.find(
      (m) => m.edition_id === edition.id && m.user_id === targetUserId,
    );
    if (!member) return;
    const existing = data.grants.find(
      (g) => g.edition_id === edition.id && g.user_id === targetUserId,
    );
    const value: RegistrationGrant = existing ?? {
      edition_id: edition.id,
      user_id: targetUserId,
      can_registration: false,
      version: 0,
    };
    setSelection({ kind: "registration_grant", value: { ...value } });
  }

  function change(
    next: Zone | OperationTask | Registration | RegistrationGrant,
  ) {
    const current = selection;
    if (!current || savingRef.current) return;
    if (current.kind === "registration_grant") {
      const n = next as RegistrationGrant;
      if (n.user_id !== current.value.user_id || n.edition_id !== edition.id)
        return;
      dirtyRef.current = true;
      setDirty(true);
      setSelection({ kind: "registration_grant", value: n });
      return;
    }
    const n = next as Zone | OperationTask | Registration;
    if (n.id !== current.value.id || n.edition_id !== edition.id) return;
    dirtyRef.current = true;
    setDirty(true);
    setSelection({ kind: current.kind, value: n });
  }

  function cancel() {
    closeDraft();
  }

  function reload() {
    if (!closeDraft()) return;
    performLoad();
  }

  async function save(
    next: Zone | OperationTask | Registration | RegistrationGrant,
  ): Promise<void> {
    if (savingRef.current) return;
    const current = selection;
    if (!current) return;

    if (current.kind === "registration_grant") {
      const n = next as RegistrationGrant;
      if (n.user_id !== current.value.user_id || n.edition_id !== edition.id)
        return;
      if (crew.role !== "admin") return;
    } else {
      const n = next as Zone | OperationTask | Registration;
      if (n.id !== current.value.id || n.edition_id !== edition.id) return;
      if (current.kind === "registration") {
        if (!canRegister) return;
      } else if (!canEdit) {
        return;
      }
    }

    const kind: OperationKind = current.kind;

    let payload: Record<string, unknown>;
    let fingerprint: string;
    try {
      payload = operationPayload(kind, next);
      fingerprint = operationRequestFingerprint(edition.id, kind, payload);
    } catch (err) {
      setError(operationsMessage(err));
      return;
    }
    let requestId = requestIdsRef.current.get(fingerprint);
    if (!requestId) {
      try {
        requestId = crypto.randomUUID();
      } catch (err) {
        setError(operationsMessage(err));
        return;
      }
      requestIdsRef.current.set(fingerprint, requestId);
    }

    const token = ++requestRef.current;
    const isCurrent = () => aliveRef.current && requestRef.current === token;
    savingRef.current = true;
    dirtyRef.current = true;
    setDirty(true);
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      await writeOperation(edition.id, kind, payload, requestId);
    } catch (err) {
      if (!isCurrent()) return;
      savingRef.current = false;
      setSaving(false);
      if (isOperationAccessError(err)) {
        setData(null);
        dirtyRef.current = false;
        setDirty(false);
        setSelection(null);
      }
      setError(operationsMessage(err));
      return;
    }

    if (!isCurrent()) return;
    let refreshed: OperationsData;
    try {
      refreshed = await loadOperations(edition.id);
    } catch (err) {
      if (!isCurrent()) return;
      savingRef.current = false;
      setSaving(false);
      if (isOperationAccessError(err)) {
        setData(null);
        dirtyRef.current = false;
        setDirty(false);
        setSelection(null);
        setError(operationsMessage(err));
      } else {
        setError(
          "Zápis byl potvrzený, ale nové údaje se nepodařilo načíst. Opakování uloží stejný požadavek.",
        );
      }
      return;
    }

    if (!isCurrent()) return;
    savingRef.current = false;
    setSaving(false);
    setData(refreshed);

    if (current.kind === "registration_grant") {
      const value = refreshed.grants.find(
        (g) =>
          g.edition_id === edition.id && g.user_id === current.value.user_id,
      );
      setSelection(value ? { kind: "registration_grant", value } : null);
    } else {
      const list =
        current.kind === "zone"
          ? refreshed.zones
          : current.kind === "task"
            ? refreshed.tasks
            : refreshed.registrations;
      const value = (list as Array<Zone | OperationTask | Registration>).find(
        (item) => item.id === current.value.id,
      );
      setSelection(value ? { kind: current.kind, value } : null);
    }

    dirtyRef.current = false;
    setDirty(false);
    setError(null);
    setNotice("Uloženo");
  }

  return {
    data,
    loading,
    saving,
    error,
    notice,
    selection,
    dirty,
    view,
    filters,
    canEdit,
    canRegister,
    changeView,
    changeFilters,
    open,
    create,
    openGrant,
    change,
    cancel,
    reload,
    save,
  };
}
