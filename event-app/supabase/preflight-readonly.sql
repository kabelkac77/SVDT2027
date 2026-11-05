-- Run only on the separately confirmed project. Catalog-only diagnostics; no migration proof.
-- Does not read business rows, issue grants or apply DDL.
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog;
SELECT 'catalog_only_not_migration_proof' AS scope,
       current_setting('transaction_read_only') AS transaction_read_only;
WITH expected(name,scope) AS (VALUES
 ('public.events','application'),
 ('public.editions','application'),
 ('public.edition_members','application'),
 ('public.people','application'),
 ('public.organizations','application'),
 ('public.partner_prospects','application'),
 ('public.edition_partnerships','application'),
 ('public.partner_deliverables','application'),
 ('public.audit_log','application'),
 ('public.partner_historical_records','application'),
 ('public.crew_members','application'),
 ('public.crew_categories','application'),
 ('public.crew_roster','application'),
 ('public.crew_compensation','application'),
 ('public.crew_audit','application'),
 ('public.crew_requests','application'),
 ('public.operations_grants','application'),
 ('public.operations_zones','application'),
 ('public.operations_tasks','application'),
 ('public.operations_registrations','application'),
 ('auth.users','platform'),
 ('auth.identities','platform'),
 ('storage.buckets','platform'),
 ('storage.objects','platform')
), objects AS (
 SELECT expected.*,to_regclass(name) AS object_id FROM expected
), roles AS (
 SELECT to_regrole('authenticated') AS authenticated_id,to_regrole('anon') AS anon_id
)
SELECT o.name,o.scope,o.object_id IS NOT NULL AS present,c.relrowsecurity AS rls_enabled,
       CASE WHEN o.object_id IS NOT NULL AND r.authenticated_id IS NOT NULL
         THEN has_table_privilege(r.authenticated_id,o.object_id,'SELECT') ELSE false END AS authenticated_select,
       CASE WHEN o.object_id IS NOT NULL AND r.authenticated_id IS NOT NULL
         THEN has_table_privilege(r.authenticated_id,o.object_id,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') ELSE false END AS authenticated_direct_mutation,
       CASE WHEN o.object_id IS NOT NULL AND r.anon_id IS NOT NULL
         THEN has_table_privilege(r.anon_id,o.object_id,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') ELSE false END AS anon_table_access,
       (SELECT count(*)::integer FROM pg_policy p WHERE p.polrelid=o.object_id) AS policy_count
FROM objects o CROSS JOIN roles r LEFT JOIN pg_class c ON c.oid=o.object_id ORDER BY o.name;
WITH expected(signature) AS (VALUES
 ('public.save_partner(uuid,jsonb)'),
 ('public.save_deliverable(uuid,jsonb)'),
 ('public.crew_role(uuid)'),
 ('public.crew_finance(uuid)'),
 ('public.crew_member_directory(uuid)'),
 ('public.crew_write(uuid,text,jsonb,uuid)'),
 ('public.operations_registration_access(uuid)'),
 ('public.operations_write(uuid,text,jsonb,uuid)')
), procedures AS (
 SELECT signature,to_regprocedure(signature) AS object_id FROM expected
), roles AS (
 SELECT to_regrole('authenticated') AS authenticated_id,to_regrole('anon') AS anon_id
)
SELECT p.signature,p.object_id IS NOT NULL AS present,
       CASE WHEN p.object_id IS NOT NULL AND r.authenticated_id IS NOT NULL
         THEN has_function_privilege(r.authenticated_id,p.object_id,'EXECUTE') ELSE false END AS authenticated_execute,
       CASE WHEN p.object_id IS NOT NULL AND r.anon_id IS NOT NULL
         THEN has_function_privilege(r.anon_id,p.object_id,'EXECUTE') ELSE false END AS anon_execute,
       EXISTS(SELECT 1 FROM pg_proc q CROSS JOIN LATERAL aclexplode(coalesce(q.proacl,acldefault('f',q.proowner))) a WHERE q.oid=p.object_id AND a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute
FROM procedures p CROSS JOIN roles r ORDER BY p.signature;
SELECT expected.name,r.oid IS NOT NULL AS present,r.rolbypassrls AS bypass_rls
FROM (VALUES ('anon'),('authenticated'),('service_role')) expected(name)
LEFT JOIN pg_roles r ON r.rolname=expected.name ORDER BY expected.name;
COMMIT;
