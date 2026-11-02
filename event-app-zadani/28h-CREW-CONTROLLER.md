# Crew workspace controller — implementační kontrakt

Write only event-app/src/components/crew-workspace.tsx, a client component exporting CrewWorkspace({userId,onLogout}), with userId:string, optional userEmail?:string, and onLogout:()=>Promise<void>. Show the signed-in email when present, not the UUID as its primary label. Authentication is already implemented by the keyed CrewApp wrapper. Do not duplicate auth, the table JSX, or forms. Import CrewRosterView from ./crew-roster-view with the props documented in 28g; import CrewCategoryForm/CrewMembershipForm from ./crew-forms for the small settings area. Use crew-model, crew-backend, Edition. No demo, localStorage, real accounts, import, SQL or other files. Keep the file approximately 200–300 lines by composing existing components. All product text in Czech.

## State and loading

State: editions, editionId, data, loading, saving, error, notice, filters, expanded category IDs, draft, anchorCategoryId, pendingKind:CrewWriteKind|null, settings:{kind:'category'|'member',id:string|null}|null, formEpoch. Refs: live/generation, write lock, request IDs by fingerprint. Load available editions, choose newest active edition (otherwise newest archive), then loadCrew. Missing membership/setup is an explicit error/empty-access state, never a demo or successful empty-data fallback. Make logout and retry accessible even if loading fails.

Every async load/write response must match its generation and mounted scope. Invalidate generation on cleanup and context changes, clear old data immediately when changing editions. Parent key changes on real auth UID changes; token refresh does not remount this workspace. Catch all promises; display constant Czech errors via crewMessage or context-specific constants. An access-denied response must hide previous roster, compensation and membership directory.

## Draft protection

Only one form kind may be dirty at a time. onChange updates the controlled roster draft and marks pendingKind='roster'; onDirty(kind) marks the relevant form. CrewRosterView receives pendingKind and disables other form kinds. save(kind,...) must reject a different dirty kind. Do not clear an unsaved compensation form when saving a roster, or clear roster edits when saving compensation. Explain briefly that the opened part must be saved or discarded first.

Use a common leave/discard guard. While saving (ref lock), return false. If dirty, ask window.confirm; rejection must leave all controls/drafts unchanged. Acceptance clears draft/settings/pending and increments formEpoch so child local state is discarded. Apply guard to changing edition, filters, selected row, new record, settings target, closing detail, collapsing its anchor category, and logout. Ordinary expansion of another category is safe. beforeunload protects pending or saving. Modified-link clicks opening a new tab must not discard the current draft. Logout calls the supplied onLogout after guard, catches failure, and uses the lock to prevent writes during logout.

Opening a row clones its saved value, remembers its saved category as anchor, expands it and closes settings. A new row requires an active edition and admin/coordinator plus a category; assign crypto.randomUUID BEFORE its first save, use emptyCrewEntry, edition_id and version0. Changing the draft category does not change its anchor until saved. onCancel uses the guard. No automatic identity merge.

## Saving

Handler (kind,payload)=>Promise<boolean> matching SaveCrew. Recheck role and archive: member writes only for admin, also allowed in an archived edition; roster/category only admin/coordinator in an active edition; compensation also requires canFinance. Use the ref lock before awaiting. Canonical flat payload keys plus edition/kind identify a request. Preserve its UUID through failures, changed values and later returning to the same body; never generate a new request for an unchanged uncertain retry. Keep request data only in memory.

After writeCrew succeeds, reload current server data before clearing dirty or replacing drafts. For roster, select the loaded row by payload.id, use its new version/category, expand that category, keep detail open. For category/member, keep the selected saved entity using result.id/user_id or payload; increment formEpoch after successful refresh to reset child versions. On any error preserve draft, pending kind, formEpoch and request ID. Provide explicit discard/reload for version conflicts.

If write succeeded but refresh failed, say the change was confirmed but current data could not be loaded, return false and preserve retry identity/client row ID. Never discard a new draft after an uncertain create. Access-denied must hide protected data. A stale result after unmount or edition change must not overwrite the current snapshot or release a newer write lock.

## Small composed JSX

Root app-shell crew-app, sidebar with SVDT typographic wordmark, active Lidi a crew, Partneři link '/', logout; main #content and skip link. Topbar edition select/year, archive notice, note that current local data is not imported automatically. Filters: search, five statuses/all, include archived. Buttons: new person and categories only editable active roles, access management only admin (including archives). Render CrewRosterView using its existing props; do not reimplement rows/categories/details here.

Settings: new/existing category/member selector, guarded selection changes and close. Labels are category names or member email/role, never UUID as the main label. CrewCategoryForm props category?,onSave,onDirty=>mark category,disabled saving/archive. CrewMembershipForm member?,onSave,onDirty=>mark member,disabled saving. Keys include kind,id,formEpoch and version. Hide no-longer-authorized settings and other users' drafts after role loss. No invitations, actual account creation or automatic grants. Host supplies CSS, route, integration and independent tests.
