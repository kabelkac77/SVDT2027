-- Initial create/keep importer. No live approval or import is performed by this migration.
BEGIN;
CREATE TABLE public.crew_import_approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),edition_id uuid NOT NULL REFERENCES public.editions,
 actor_id uuid NOT NULL REFERENCES auth.users,plan_text text NOT NULL CHECK(octet_length(plan_text)<=16777216),
 plan_sha256 text NOT NULL CHECK(plan_sha256 ~ '^[0-9a-f]{64}$'),source_sha256 text NOT NULL CHECK(source_sha256 ~ '^[0-9a-f]{64}$'),
 target_fingerprint text NOT NULL CHECK(target_fingerprint ~ '^[0-9a-f]{64}$'),backup_receipt_sha256 text NOT NULL CHECK(backup_receipt_sha256 ~ '^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,
 CHECK(expires_at>created_at AND expires_at<=created_at+interval '24 hours'),UNIQUE(id,edition_id)
);
CREATE TABLE public.crew_import_revocations (
 approval_id uuid PRIMARY KEY,edition_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES auth.users,created_at timestamptz NOT NULL,
 FOREIGN KEY(approval_id,edition_id) REFERENCES public.crew_import_approvals(id,edition_id)
);
CREATE TABLE public.crew_import_requests (
 edition_id uuid NOT NULL REFERENCES public.editions,actor_id uuid NOT NULL REFERENCES auth.users,request_id uuid NOT NULL,
 approval_id uuid NOT NULL UNIQUE,fingerprint text NOT NULL,response jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(edition_id,actor_id,request_id),FOREIGN KEY(approval_id,edition_id) REFERENCES public.crew_import_approvals(id,edition_id)
);
-- Private cache of identities verified once from the complete source. No client access or separate write RPC.
CREATE TABLE public.crew_import_source_rows (
 package_id uuid NOT NULL,edition_id uuid NOT NULL,approval_id uuid NOT NULL,source_row_id text NOT NULL,source_history_id text,
 PRIMARY KEY(package_id,source_row_id),FOREIGN KEY(package_id,edition_id) REFERENCES public.crew_transfer_packages(id,edition_id),
 FOREIGN KEY(approval_id,edition_id) REFERENCES public.crew_import_approvals(id,edition_id)
);
ALTER TABLE public.crew_import_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_import_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_import_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_import_source_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY crew_import_approvals_admin_read ON public.crew_import_approvals FOR SELECT TO authenticated USING(public.crew_role(edition_id)='admin');
CREATE POLICY crew_import_revocations_admin_read ON public.crew_import_revocations FOR SELECT TO authenticated USING(public.crew_role(edition_id)='admin');
REVOKE ALL ON public.crew_import_approvals,public.crew_import_revocations,public.crew_import_requests,public.crew_import_source_rows FROM public,anon,authenticated;
GRANT SELECT ON public.crew_import_approvals,public.crew_import_revocations TO authenticated;
CREATE FUNCTION public.crew_import_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'CREW_IMPORT_IMMUTABLE' USING ERRCODE='42501'; END;
$$;
CREATE TRIGGER crew_import_approvals_immutable BEFORE UPDATE OR DELETE ON public.crew_import_approvals FOR EACH ROW EXECUTE FUNCTION public.crew_import_immutable();
CREATE TRIGGER crew_import_approvals_no_truncate BEFORE TRUNCATE ON public.crew_import_approvals FOR EACH STATEMENT EXECUTE FUNCTION public.crew_import_immutable();
CREATE TRIGGER crew_import_revocations_immutable BEFORE UPDATE OR DELETE ON public.crew_import_revocations FOR EACH ROW EXECUTE FUNCTION public.crew_import_immutable();
CREATE TRIGGER crew_import_revocations_no_truncate BEFORE TRUNCATE ON public.crew_import_revocations FOR EACH STATEMENT EXECUTE FUNCTION public.crew_import_immutable();
CREATE TRIGGER crew_import_requests_immutable BEFORE UPDATE OR DELETE ON public.crew_import_requests FOR EACH ROW EXECUTE FUNCTION public.crew_import_immutable();
CREATE TRIGGER crew_import_requests_no_truncate BEFORE TRUNCATE ON public.crew_import_requests FOR EACH STATEMENT EXECUTE FUNCTION public.crew_import_immutable();
CREATE TRIGGER crew_import_source_rows_immutable BEFORE UPDATE OR DELETE ON public.crew_import_source_rows FOR EACH ROW EXECUTE FUNCTION public.crew_import_immutable();
CREATE TRIGGER crew_import_source_rows_no_truncate BEFORE TRUNCATE ON public.crew_import_source_rows FOR EACH STATEMENT EXECUTE FUNCTION public.crew_import_immutable();

CREATE FUNCTION public.crew_import_json_unique(v json,depth integer) RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE x record;keys text[]:=ARRAY[]::text[];
BEGIN
 IF depth>64 THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE'; END IF;
 IF json_typeof(v)='object' THEN
  FOR x IN SELECT * FROM json_each(v) LOOP
   IF x.key=ANY(keys) THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE'; END IF;
   keys:=array_append(keys,x.key);PERFORM public.crew_import_json_unique(x.value,depth+1);
  END LOOP;
 ELSIF json_typeof(v)='number' THEN
  PERFORM (v::text)::double precision;
 ELSIF json_typeof(v)='array' THEN
  FOR x IN SELECT value FROM json_array_elements(v) LOOP PERFORM public.crew_import_json_unique(x.value,depth+1); END LOOP;
 END IF;
END;
$$;
CREATE FUNCTION public.crew_import_json(p_text text) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE j json;
BEGIN j:=p_text::json;PERFORM public.crew_import_json_unique(j,0);RETURN j::jsonb;
EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE' USING ERRCODE='22023'; END;
$$;
CREATE FUNCTION public.crew_import_rows(doc jsonb,n text) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE t jsonb;r jsonb;c jsonb;names text[]:=ARRAY[]::text[];out_rows jsonb:='[]';obj jsonb;i integer;cell jsonb;
BEGIN
 IF (SELECT count(*) FROM jsonb_array_elements(doc) x WHERE x->>'name'=n)<>1 THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE'; END IF;
 SELECT x INTO t FROM jsonb_array_elements(doc) x WHERE x->>'name'=n;
 IF jsonb_typeof(t->'columns') IS DISTINCT FROM 'array' OR jsonb_typeof(t->'rows') IS DISTINCT FROM 'array' OR jsonb_array_length(t->'rows')>10000 THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE'; END IF;
 FOR c IN SELECT value FROM jsonb_array_elements(t->'columns') LOOP
  IF jsonb_typeof(c)<>'string' OR c#>>'{}'='' OR (c#>>'{}')=ANY(names) THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE'; END IF;
  names:=array_append(names,c#>>'{}');
 END LOOP;
 FOR r IN SELECT value FROM jsonb_array_elements(t->'rows') LOOP
  IF jsonb_typeof(r)<>'array' OR jsonb_array_length(r)<>cardinality(names) THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE'; END IF;
  FOR cell IN SELECT value FROM jsonb_array_elements(r) LOOP
   IF jsonb_typeof(cell) NOT IN ('null','string','number','object') THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
   IF jsonb_typeof(cell)='object' AND (NOT(cell ?& ARRAY['type','base64']) OR (SELECT count(*) FROM jsonb_object_keys(cell))<>2 OR cell->'type' IS DISTINCT FROM to_jsonb('blob'::text) OR jsonb_typeof(cell->'base64') IS DISTINCT FROM 'string' OR cell->>'base64' !~ '^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$') THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
  END LOOP;
  obj:='{}';IF cardinality(names)>0 THEN FOR i IN 1..cardinality(names) LOOP obj:=obj||jsonb_build_object(names[i],r->(i-1));END LOOP;END IF;
  out_rows:=out_rows||jsonb_build_array(obj);
 END LOOP;
 IF 'id'=ANY(names) AND ((SELECT count(*) FROM jsonb_array_elements(out_rows))<>(SELECT count(DISTINCT x->'id') FROM jsonb_array_elements(out_rows) x)) THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
 RETURN out_rows;
EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE' USING ERRCODE='22023'; END;
$$;
CREATE FUNCTION public.crew_import_source(p_text text) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE doc jsonb;t jsonb;r jsonb;c jsonb;m jsonb;hist jsonb;cats jsonb;work jsonb;meta jsonb;aux jsonb;
 names text[]:=ARRAY[]::text[];k text;lim record;out_cats jsonb:='[]';out_rows jsonb:='[]';roster jsonb;comp jsonb;
 limits jsonb:='{"name":200,"categoryId":100,"position":500,"owner":500,"email":500,"phone":500,"contactOriginal":2000,"statusNote":4000,"notes":10000,"barter":4000,"merch":2000,"term":1000,"friday":100,"saturday":100}';
BEGIN
 IF p_text IS NULL OR octet_length(p_text)>134217728 THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
 doc:=public.crew_import_json(p_text);IF jsonb_typeof(doc)<>'array' THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
 FOR t IN SELECT value FROM jsonb_array_elements(doc) LOOP
  IF jsonb_typeof(t)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(t))<>3 OR jsonb_typeof(t->'name') IS DISTINCT FROM 'string' OR t->>'name'='' OR t->>'name'=ANY(names) THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
  names:=array_append(names,t->>'name');
  IF (t->>'name'='meta' AND NOT((t->'columns') ?& ARRAY['key','value'])) OR
     (t->>'name'='categories' AND NOT((t->'columns') ?& ARRAY['id','name','name_key','color','sort_order','version'])) OR
     (t->>'name'='working' AND NOT((t->'columns') ?& ARRAY['id','year','category_id','content','source_id','version','updated_at'])) OR
     (t->>'name'='history' AND NOT((t->'columns') ?& ARRAY['id','year','content'])) OR
     (t->>'name'='audit' AND NOT((t->'columns') ?& ARRAY['id','at','kind','record_id','before_json','after_json'])) OR
     (t->>'name'='requests' AND NOT((t->'columns') ?& ARRAY['id','fingerprint','response']))
  THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
  PERFORM public.crew_import_rows(doc,t->>'name');
 END LOOP;
 IF NOT names @> ARRAY['meta','categories','working','history','audit','requests'] THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
 meta:=public.crew_import_rows(doc,'meta');
 IF (SELECT count(*) FROM jsonb_array_elements(meta) x WHERE x->>'key'='initialized' AND jsonb_typeof(x->'value')='string' AND btrim(x->>'value')<>'')<>1 OR (SELECT count(*) FROM jsonb_array_elements(meta))<>(SELECT count(DISTINCT x->'key') FROM jsonb_array_elements(meta) x) THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(meta) x WHERE jsonb_typeof(x->'key') IS DISTINCT FROM 'string' OR x->>'key'='') THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
 aux:=public.crew_import_rows(doc,'audit');
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(aux) x WHERE jsonb_typeof(x->'id') IS DISTINCT FROM 'number' OR coalesce(x->>'id','') !~ '^[1-9][0-9]*$') THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
 aux:=public.crew_import_rows(doc,'requests');
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(aux) x WHERE jsonb_typeof(x->'id') IS DISTINCT FROM 'string' OR x->>'id'='') THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
 hist:=public.crew_import_rows(doc,'history');cats:=public.crew_import_rows(doc,'categories');work:=public.crew_import_rows(doc,'working');
 FOR r IN SELECT value FROM jsonb_array_elements(hist) LOOP
  IF jsonb_typeof(r->'id') IS DISTINCT FROM 'string' OR r->>'id'='' OR jsonb_typeof(r->'year') IS DISTINCT FROM 'string' OR r->>'year' NOT IN ('2025','2026') OR jsonb_typeof(r->'content') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
  PERFORM public.crew_import_json(r->>'content');
 END LOOP;
 IF (SELECT count(*) FROM jsonb_array_elements(cats))<>(SELECT count(DISTINCT x->>'name_key') FROM jsonb_array_elements(cats) x) THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(cats) LOOP
  IF jsonb_typeof(r->'id') IS DISTINCT FROM 'string' OR length(r->>'id') NOT BETWEEN 1 AND 100 OR jsonb_typeof(r->'name') IS DISTINCT FROM 'string' OR length(r->>'name')>100 OR btrim(r->>'name')='' OR jsonb_typeof(r->'name_key') IS DISTINCT FROM 'string' OR r->>'name_key'='' OR jsonb_typeof(r->'color') IS DISTINCT FROM 'string' OR r->>'color' !~ '^cat-([0-9]|1[01])$' OR coalesce(r->>'version','') !~ '^[1-9][0-9]*$' OR jsonb_typeof(r->'version') IS DISTINCT FROM 'number' OR coalesce(r->>'sort_order','') !~ '^(0|[1-9][0-9]*)$' OR jsonb_typeof(r->'sort_order') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
  out_cats:=out_cats||jsonb_build_array(jsonb_build_object('sourceCategoryId',r->'id','name',r->'name','color',r->'color'));
 END LOOP;
 FOR r IN SELECT value FROM jsonb_array_elements(work) LOOP
  IF jsonb_typeof(r->'id') IS DISTINCT FROM 'string' OR length(r->>'id') NOT BETWEEN 1 AND 200 OR jsonb_typeof(r->'category_id') IS DISTINCT FROM 'string' OR r->'year' IS DISTINCT FROM to_jsonb('2027'::text) OR coalesce(r->>'version','') !~ '^[1-9][0-9]*$' OR jsonb_typeof(r->'version') IS DISTINCT FROM 'number' OR jsonb_typeof(r->'updated_at') IS DISTINCT FROM 'string' OR r->>'updated_at'='' OR jsonb_typeof(r->'content') IS DISTINCT FROM 'string' OR NOT(r ? 'source_id') OR jsonb_typeof(r->'source_id') NOT IN ('null','string') THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
  IF r->>'source_id' IS NOT NULL AND (SELECT count(*) FROM jsonb_array_elements(hist) h WHERE h->>'id'=r->>'source_id' AND h->>'year'='2026')<>1 THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
  c:=public.crew_import_json(r->>'content');IF jsonb_typeof(c)<>'object' THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
  c:=jsonb_build_object('friday','','saturday','')||c;
  FOR lim IN SELECT key,value FROM jsonb_each(limits) LOOP
   IF jsonb_typeof(c->lim.key) IS DISTINCT FROM 'string' OR length(c->>lim.key)>(lim.value::text)::integer THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
  END LOOP;
  IF btrim(c->>'name')='' OR c->>'categoryId' IS DISTINCT FROM r->>'category_id' OR (SELECT count(*) FROM jsonb_array_elements(cats) q WHERE q->>'id'=r->>'category_id')<>1 OR jsonb_typeof(c->'status') IS DISTINCT FROM 'string' OR c->>'status' NOT IN ('candidate','contacted','confirmed','declined','unknown') OR jsonb_typeof(c->'archived') IS DISTINCT FROM 'boolean' OR (c->>'status'='confirmed' AND btrim(c->>'term')='') OR jsonb_typeof(c->'money') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
  m:=c->'money';comp:='{}';
  FOREACH k IN ARRAY ARRAY['estimate','agreed','total','paid'] LOOP
   IF NOT(m ? k) OR (m->k<>'null'::jsonb AND (((r->>'content')::json->'money'->k)::text !~ '^(0|[1-9][0-9]*)$' OR jsonb_typeof(m->k)<>'number' OR m->>k !~ '^(0|[1-9][0-9]*)$' OR (m->>k)::numeric>99999999999)) THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE';END IF;
   comp:=comp||jsonb_build_object(k,m->k);
  END LOOP;
  comp:=comp||jsonb_build_object('barter',c->'barter','merch',c->'merch');
  roster:=jsonb_build_object('name',c->'name','position',c->'position','owner_label',c->'owner','email',c->'email','phone',c->'phone','status',c->'status','term',c->'term','friday',c->'friday','saturday',c->'saturday','notes',c->'notes','archived',c->'archived');
  out_rows:=out_rows||jsonb_build_array(jsonb_build_object('sourceRowId',r->'id','sourceCategoryId',r->'category_id','sourceHistoryId',r->'source_id','roster',roster,'compensation',comp));
 END LOOP;
 RETURN jsonb_build_object('categories',out_cats,'entries',out_rows,'categoryMap',coalesce((SELECT jsonb_object_agg(q->>'sourceCategoryId',q) FROM jsonb_array_elements(out_cats) q),'{}'::jsonb),'entryMap',coalesce((SELECT jsonb_object_agg(q->>'sourceRowId',q) FROM jsonb_array_elements(out_rows) q),'{}'::jsonb));
EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_SOURCE' USING ERRCODE='22023';END;
$$;
CREATE FUNCTION public.crew_import_uuid(v text) RETURNS uuid LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
BEGIN IF v IS NULL OR v !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR v='00000000-0000-0000-0000-000000000000' THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_PLAN';END IF;RETURN v::uuid;
EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_PLAN' USING ERRCODE='22023';END;
$$;
CREATE FUNCTION public.crew_import_plan(e uuid,p_text text) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE p jsonb;x jsonb;k text;sc text[]:=ARRAY[]::text[];sr text[]:=ARRAY[]::text[];tc uuid[]:=ARRAY[]::uuid[];tr uuid[]:=ARRAY[]::uuid[];u uuid;v bigint;
BEGIN
 IF p_text IS NULL OR octet_length(p_text)>16777216 THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_PLAN';END IF;
 p:=public.crew_import_json(p_text);
 IF jsonb_typeof(p)<>'object' OR NOT(p ?& ARRAY['version','editionId','sourceSha256','targetFingerprint','categories','entries']) OR (SELECT count(*) FROM jsonb_object_keys(p))<>6 OR p->>'version'<>'1' OR jsonb_typeof(p->'version') IS DISTINCT FROM 'number' OR public.crew_import_uuid(p->>'editionId')<>e OR jsonb_typeof(p->'sourceSha256') IS DISTINCT FROM 'string' OR p->>'sourceSha256' !~ '^[0-9a-f]{64}$' OR jsonb_typeof(p->'targetFingerprint') IS DISTINCT FROM 'string' OR p->>'targetFingerprint' !~ '^[0-9a-f]{64}$' OR jsonb_typeof(p->'categories') IS DISTINCT FROM 'array' OR jsonb_typeof(p->'entries') IS DISTINCT FROM 'array' OR greatest(jsonb_array_length(p->'categories'),jsonb_array_length(p->'entries'))>10000 THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_PLAN';END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(p->'categories') LOOP
  IF jsonb_typeof(x)<>'object' OR NOT(x ?& ARRAY['sourceCategoryId','targetCategoryId','action','expectedVersion']) OR (SELECT count(*) FROM jsonb_object_keys(x))<>4 OR jsonb_typeof(x->'sourceCategoryId') IS DISTINCT FROM 'string' OR length(x->>'sourceCategoryId') NOT BETWEEN 1 AND 100 OR x->>'sourceCategoryId'=ANY(sc) OR x->>'action' NOT IN ('create','keep') OR jsonb_typeof(x->'action') IS DISTINCT FROM 'string' OR jsonb_typeof(x->'expectedVersion') IS DISTINCT FROM 'number' OR coalesce(x->>'expectedVersion','') !~ '^(0|[1-9][0-9]{0,9})$' THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_PLAN';END IF;
  u:=public.crew_import_uuid(x->>'targetCategoryId');v:=(x->>'expectedVersion')::bigint;
  IF u=ANY(tc) OR v>2147483647 OR (x->>'action'='create')<>(v=0) THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_PLAN';END IF;
  sc:=array_append(sc,x->>'sourceCategoryId');tc:=array_append(tc,u);
 END LOOP;
 FOR x IN SELECT value FROM jsonb_array_elements(p->'entries') LOOP
  IF jsonb_typeof(x)<>'object' OR NOT(x ?& ARRAY['sourceRowId','targetRosterId','action','expectedVersion','compensationAction','expectedCompensationVersion','kind','personId','linkedUserId']) OR (SELECT count(*) FROM jsonb_object_keys(x))<>9 OR jsonb_typeof(x->'sourceRowId') IS DISTINCT FROM 'string' OR length(x->>'sourceRowId') NOT BETWEEN 1 AND 200 OR x->>'sourceRowId'=ANY(sr) OR jsonb_typeof(x->'action') IS DISTINCT FROM 'string' OR x->>'action' NOT IN ('create','keep') OR jsonb_typeof(x->'compensationAction') IS DISTINCT FROM 'string' OR x->>'compensationAction' NOT IN ('create','keep') OR jsonb_typeof(x->'kind') IS DISTINCT FROM 'string' OR x->>'kind' NOT IN ('person','group','unresolved') OR jsonb_typeof(x->'personId') NOT IN ('null','string') OR jsonb_typeof(x->'linkedUserId') NOT IN ('null','string') THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_PLAN';END IF;
  u:=public.crew_import_uuid(x->>'targetRosterId');IF u=ANY(tr) THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_PLAN';END IF;
  sr:=array_append(sr,x->>'sourceRowId');tr:=array_append(tr,u);
  FOREACH k IN ARRAY ARRAY['expectedVersion','expectedCompensationVersion'] LOOP
   IF jsonb_typeof(x->k) IS DISTINCT FROM 'number' OR coalesce(x->>k,'') !~ '^(0|[1-9][0-9]{0,9})$' OR (x->>k)::bigint>2147483647 THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_PLAN';END IF;
  END LOOP;
  IF (x->>'action'='create')<>((x->>'expectedVersion')::integer=0) OR (x->>'compensationAction'='create')<>((x->>'expectedCompensationVersion')::integer=0) THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_PLAN';END IF;
  IF x->>'personId' IS NOT NULL THEN PERFORM public.crew_import_uuid(x->>'personId');END IF;
  IF x->>'linkedUserId' IS NOT NULL THEN PERFORM public.crew_import_uuid(x->>'linkedUserId');END IF;
  IF (x->>'kind'='person')<>(x->>'personId' IS NOT NULL) OR (x->>'action'='create' AND (x->>'kind' NOT IN ('group','unresolved') OR x->>'personId' IS NOT NULL OR x->>'linkedUserId' IS NOT NULL OR x->>'compensationAction'<>'create')) THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_PLAN';END IF;
 END LOOP;
 RETURN p;
EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_PLAN' USING ERRCODE='22023';END;
$$;
CREATE FUNCTION public.crew_import_actor(e uuid,allow_archived boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL OR coalesce(public.crew_role(e),'')<>'admin' THEN RAISE EXCEPTION 'CREW_IMPORT_ACCESS_DENIED' USING ERRCODE='42501';END IF;
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'CREW_IMPORT_ISOLATION_REQUIRED' USING ERRCODE='25001';END IF;
 PERFORM 1 FROM public.editions WHERE id=e AND year=2027 AND (allow_archived OR NOT archived) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CREW_IMPORT_EDITION_LOCKED' USING ERRCODE='42501';END IF;
 IF coalesce(public.crew_role(e),'')<>'admin' THEN RAISE EXCEPTION 'CREW_IMPORT_ACCESS_DENIED' USING ERRCODE='42501';END IF;
 RETURN uid;
END;
$$;
CREATE FUNCTION public.crew_import_target_fingerprint(e uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT encode(sha256(convert_to((public.crew_transfer_target_snapshot(e)-'capturedAt')::text,'UTF8')),'hex');
$$;
CREATE FUNCTION public.crew_import_target_preview(e uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH snapshot AS (SELECT public.crew_transfer_target_snapshot(e) AS data)
 SELECT data||jsonb_build_object('targetFingerprint',encode(sha256(convert_to((data-'capturedAt')::text,'UTF8')),'hex')) FROM snapshot;
$$;
CREATE FUNCTION public.crew_import_stage_approval(e uuid,p_plan_text text,backup_receipt_sha256 text,expires_at timestamptz DEFAULT current_timestamp+interval '1 hour') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid;p jsonb;a uuid:=gen_random_uuid();t timestamptz:=clock_timestamp();
BEGIN
 uid:=public.crew_import_actor(e,false);p:=public.crew_import_plan(e,p_plan_text);
 IF backup_receipt_sha256 IS NULL OR backup_receipt_sha256 !~ '^[0-9a-f]{64}$' OR expires_at IS NULL OR expires_at<=clock_timestamp() OR expires_at>t+interval '24 hours' THEN RAISE EXCEPTION 'CREW_IMPORT_APPROVAL_INVALID' USING ERRCODE='22023';END IF;
 IF p->>'targetFingerprint'<>public.crew_import_target_fingerprint(e) THEN RAISE EXCEPTION 'CREW_IMPORT_TARGET_CHANGED' USING ERRCODE='40001';END IF;
 INSERT INTO public.crew_import_approvals VALUES(a,e,uid,p_plan_text,encode(sha256(convert_to(p_plan_text,'UTF8')),'hex'),p->>'sourceSha256',p->>'targetFingerprint',backup_receipt_sha256,t,expires_at);
 INSERT INTO public.crew_audit(edition_id,actor_id,kind,entity_id,new_data) VALUES(e,uid,'import_approval',a,jsonb_build_object('approval_id',a,'plan_sha256',encode(sha256(convert_to(p_plan_text,'UTF8')),'hex'),'source_sha256',p->>'sourceSha256','expires_at',expires_at));RETURN a;
END;
$$;
CREATE FUNCTION public.crew_import_revoke(e uuid,a_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid;
BEGIN uid:=public.crew_import_actor(e,true);
 IF NOT EXISTS(SELECT 1 FROM public.crew_import_approvals WHERE id=a_id AND edition_id=e) THEN RAISE EXCEPTION 'CREW_IMPORT_APPROVAL_REQUIRED' USING ERRCODE='42501';END IF;
 INSERT INTO public.crew_import_revocations VALUES(a_id,e,uid,clock_timestamp()) ON CONFLICT DO NOTHING;
 IF FOUND THEN INSERT INTO public.crew_audit(edition_id,actor_id,kind,entity_id,new_data) VALUES(e,uid,'import_revocation',a_id,jsonb_build_object('approval_id',a_id));END IF;
END;
$$;
CREATE FUNCTION public.crew_import_apply(e uuid,a_id uuid,r_id uuid,p_plan_text text,p_source_text text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid;a public.crew_import_approvals;cached public.crew_import_requests;psha text;ssha text;fp text;p jsonb;s jsonb;x jsonb;src jsonb;expected jsonb;
 package_id uuid:=gen_random_uuid();target_id uuid;cat_id uuid;category_map jsonb;c public.crew_categories;r public.crew_roster;m public.crew_compensation;result jsonb;
 cc integer:=0;kc integer:=0;cr integer:=0;kr integer:=0;cm integer:=0;km integer:=0;
BEGIN
 uid:=public.crew_import_actor(e,false);
 IF a_id IS NULL OR r_id IS NULL OR p_plan_text IS NULL OR p_source_text IS NULL OR octet_length(p_plan_text)>16777216 OR octet_length(p_source_text)>134217728 THEN RAISE EXCEPTION 'CREW_IMPORT_INVALID_INPUT' USING ERRCODE='22023';END IF;
 psha:=encode(sha256(convert_to(p_plan_text,'UTF8')),'hex');ssha:=encode(sha256(convert_to(p_source_text,'UTF8')),'hex');fp:=encode(sha256(convert_to(a_id::text||'|'||psha||'|'||ssha,'UTF8')),'hex');
 SELECT * INTO a FROM public.crew_import_approvals q WHERE q.id=a_id AND q.edition_id=e AND q.actor_id=uid;
 IF NOT FOUND THEN RAISE EXCEPTION 'CREW_IMPORT_APPROVAL_REQUIRED' USING ERRCODE='42501';END IF;
 IF EXISTS(SELECT 1 FROM public.crew_import_revocations WHERE approval_id=a_id) THEN RAISE EXCEPTION 'CREW_IMPORT_APPROVAL_REVOKED' USING ERRCODE='42501';END IF;
 SELECT * INTO cached FROM public.crew_import_requests q WHERE q.edition_id=e AND q.actor_id=uid AND q.request_id=r_id;
 IF FOUND THEN
  IF cached.fingerprint<>fp THEN RAISE EXCEPTION 'CREW_IMPORT_REQUEST_REUSED' USING ERRCODE='40001';END IF;
  RETURN cached.response;
 END IF;
 IF a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'CREW_IMPORT_APPROVAL_EXPIRED' USING ERRCODE='42501';END IF;
 IF EXISTS(SELECT 1 FROM public.crew_import_requests WHERE approval_id=a_id) THEN RAISE EXCEPTION 'CREW_IMPORT_APPROVAL_USED' USING ERRCODE='40001';END IF;
 IF a.plan_sha256<>psha OR a.plan_text<>p_plan_text OR a.source_sha256<>ssha THEN RAISE EXCEPTION 'CREW_IMPORT_APPROVAL_MISMATCH' USING ERRCODE='40001';END IF;
 p:=public.crew_import_plan(e,p_plan_text);
 IF p->>'sourceSha256'<>ssha OR p->>'targetFingerprint'<>a.target_fingerprint THEN RAISE EXCEPTION 'CREW_IMPORT_APPROVAL_MISMATCH' USING ERRCODE='40001';END IF;
 LOCK TABLE public.crew_categories,public.crew_roster,public.crew_compensation,public.crew_transfer_packages,public.crew_transfer_links IN SHARE ROW EXCLUSIVE MODE;
 IF public.crew_import_target_fingerprint(e)<>a.target_fingerprint THEN RAISE EXCEPTION 'CREW_IMPORT_TARGET_CHANGED' USING ERRCODE='40001';END IF;
 IF EXISTS(SELECT 1 FROM public.crew_transfer_packages WHERE edition_id=e AND source_sha256=ssha) THEN RAISE EXCEPTION 'CREW_IMPORT_SOURCE_ALREADY_PRESENT' USING ERRCODE='40001';END IF;
 s:=public.crew_import_source(p_source_text);
 IF jsonb_array_length(s->'categories')<>jsonb_array_length(p->'categories') OR jsonb_array_length(s->'entries')<>jsonb_array_length(p->'entries') OR EXISTS(SELECT 1 FROM jsonb_array_elements(p->'categories') q WHERE NOT((s->'categoryMap') ? (q->>'sourceCategoryId'))) OR EXISTS(SELECT 1 FROM jsonb_array_elements(p->'entries') q WHERE NOT((s->'entryMap') ? (q->>'sourceRowId'))) THEN RAISE EXCEPTION 'CREW_IMPORT_SOURCE_COVERAGE' USING ERRCODE='22023';END IF;
 SELECT jsonb_object_agg(q->>'sourceCategoryId',q->'targetCategoryId') INTO category_map FROM jsonb_array_elements(p->'categories') q;
 INSERT INTO public.crew_transfer_packages(id,edition_id,source_sha256,source_text) VALUES(package_id,e,ssha,p_source_text);
 FOR src IN SELECT value FROM jsonb_array_elements(s->'entries') LOOP
  INSERT INTO public.crew_import_source_rows VALUES(package_id,e,a_id,src->>'sourceRowId',src->>'sourceHistoryId');
 END LOOP;
 FOR x IN SELECT value FROM jsonb_array_elements(p->'categories') LOOP
  src:=(s->'categoryMap')->(x->>'sourceCategoryId');target_id:=(x->>'targetCategoryId')::uuid;
  SELECT * INTO c FROM public.crew_categories WHERE id=target_id FOR UPDATE;
  IF x->>'action'='create' THEN
   IF FOUND THEN RAISE EXCEPTION 'CREW_IMPORT_VERSION_CONFLICT' USING ERRCODE='40001';END IF;
   INSERT INTO public.crew_categories(id,edition_id,name,color,required_count,required_term) VALUES(target_id,e,src->>'name',src->>'color',NULL,'');cc:=cc+1;
  ELSE
   IF NOT FOUND OR c.edition_id<>e OR c.version<>(x->>'expectedVersion')::integer THEN RAISE EXCEPTION 'CREW_IMPORT_VERSION_CONFLICT' USING ERRCODE='40001';END IF;
   IF c.name IS DISTINCT FROM src->>'name' OR c.color IS DISTINCT FROM src->>'color' THEN RAISE EXCEPTION 'CREW_IMPORT_TARGET_DIFFERENT' USING ERRCODE='40001';END IF;kc:=kc+1;
  END IF;
 END LOOP;
 FOR x IN SELECT value FROM jsonb_array_elements(p->'entries') LOOP
  src:=(s->'entryMap')->(x->>'sourceRowId');target_id:=(x->>'targetRosterId')::uuid;
  cat_id:=(category_map->>(src->>'sourceCategoryId'))::uuid;
  expected:=src->'roster'||jsonb_build_object('category_id',cat_id,'kind',x->'kind','person_id',x->'personId','linked_user_id',x->'linkedUserId');
  SELECT * INTO r FROM public.crew_roster WHERE id=target_id FOR UPDATE;
  IF x->>'action'='create' THEN
   IF FOUND THEN RAISE EXCEPTION 'CREW_IMPORT_VERSION_CONFLICT' USING ERRCODE='40001';END IF;
   INSERT INTO public.crew_roster(id,edition_id,category_id,kind,person_id,linked_user_id,name,position,owner_label,email,phone,status,term,friday,saturday,notes,archived)
    VALUES(target_id,e,cat_id,x->>'kind',NULL,NULL,expected->>'name',expected->>'position',expected->>'owner_label',expected->>'email',expected->>'phone',expected->>'status',expected->>'term',expected->>'friday',expected->>'saturday',expected->>'notes',(expected->>'archived')::boolean);cr:=cr+1;
  ELSE
   IF NOT FOUND OR r.edition_id<>e OR r.version<>(x->>'expectedVersion')::integer THEN RAISE EXCEPTION 'CREW_IMPORT_VERSION_CONFLICT' USING ERRCODE='40001';END IF;
   IF EXISTS(SELECT 1 FROM jsonb_each(expected) z WHERE to_jsonb(r)->z.key IS DISTINCT FROM z.value) THEN RAISE EXCEPTION 'CREW_IMPORT_TARGET_DIFFERENT' USING ERRCODE='40001';END IF;kr:=kr+1;
  END IF;
  expected:=src->'compensation';SELECT * INTO m FROM public.crew_compensation WHERE roster_id=target_id FOR UPDATE;
  IF x->>'compensationAction'='create' THEN
   IF FOUND THEN RAISE EXCEPTION 'CREW_IMPORT_VERSION_CONFLICT' USING ERRCODE='40001';END IF;
   INSERT INTO public.crew_compensation(roster_id,edition_id,estimate,agreed,total,paid,barter,merch) VALUES(target_id,e,(expected->>'estimate')::bigint,(expected->>'agreed')::bigint,(expected->>'total')::bigint,(expected->>'paid')::bigint,expected->>'barter',expected->>'merch');cm:=cm+1;
  ELSE
   IF NOT FOUND OR m.edition_id<>e OR m.version<>(x->>'expectedCompensationVersion')::integer THEN RAISE EXCEPTION 'CREW_IMPORT_VERSION_CONFLICT' USING ERRCODE='40001';END IF;
   IF EXISTS(SELECT 1 FROM jsonb_each(expected) z WHERE to_jsonb(m)->z.key IS DISTINCT FROM z.value) THEN RAISE EXCEPTION 'CREW_IMPORT_TARGET_DIFFERENT' USING ERRCODE='40001';END IF;km:=km+1;
  END IF;
  INSERT INTO public.crew_transfer_links(package_id,edition_id,source_row_id,roster_id,source_history_id) VALUES(package_id,e,src->>'sourceRowId',target_id,src->>'sourceHistoryId');
 END LOOP;
 result:=jsonb_build_object('version',1,'editionId',e,'approvalId',a_id,'requestId',r_id,'packageId',package_id,'sourceSha256',ssha,'planSha256',psha,'createdCategories',cc,'keptCategories',kc,'createdEntries',cr,'keptEntries',kr,'createdCompensations',cm,'keptCompensations',km,'sourceRows',jsonb_array_length(s->'entries'));
 INSERT INTO public.crew_audit(edition_id,actor_id,kind,entity_id,new_data) VALUES(e,uid,'crew_import',a_id,result);
 INSERT INTO public.crew_import_requests(edition_id,actor_id,request_id,approval_id,fingerprint,response) VALUES(e,uid,r_id,a_id,fp,result);
 RETURN result;
EXCEPTION WHEN OTHERS THEN
 IF SQLERRM ~ '^CREW_IMPORT_[A-Z_]+$' THEN RAISE; END IF;
 RAISE EXCEPTION 'CREW_IMPORT_FAILED' USING ERRCODE='22023';
END;
$$;

-- Retain original guards and fallback for non-import captures; use privately validated row identities for bulk imports.
CREATE OR REPLACE FUNCTION public.crew_transfer_capture() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); source_payload text; source_hash text; source_row jsonb; historical_row jsonb; expected_history text;
BEGIN
 IF uid IS NULL OR coalesce(public.crew_role(NEW.edition_id),'')<>'admin'
 THEN RAISE EXCEPTION 'CREW_TRANSFER_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.editions WHERE id=NEW.edition_id AND NOT archived FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CREW_TRANSFER_EDITION_ARCHIVED' USING ERRCODE='42501'; END IF;
 IF coalesce(public.crew_role(NEW.edition_id),'')<>'admin'
 THEN RAISE EXCEPTION 'CREW_TRANSFER_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 NEW.actor_id:=uid; NEW.created_at:=transaction_timestamp();
 IF TG_TABLE_NAME='crew_transfer_packages' THEN
  BEGIN
   IF NEW.source_text IS NULL OR octet_length(NEW.source_text)>134217728
   THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_SOURCE' USING ERRCODE='22023'; END IF;
   IF jsonb_typeof(NEW.source_text::jsonb) IS DISTINCT FROM 'array'
      OR NEW.source_sha256 IS DISTINCT FROM encode(sha256(convert_to(NEW.source_text,'UTF8')),'hex')
   THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_SOURCE' USING ERRCODE='22023'; END IF;
  EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_SOURCE' USING ERRCODE='22023'; END;
  INSERT INTO public.crew_audit(edition_id,actor_id,kind,entity_id,new_data)
   VALUES(NEW.edition_id,uid,'transfer_package',NEW.id,jsonb_build_object('package_id',NEW.id,'source_sha256',NEW.source_sha256,'source_format',NEW.source_format));
 ELSE
  SELECT p.source_sha256 INTO source_hash FROM public.crew_transfer_packages p WHERE p.id=NEW.package_id AND p.edition_id=NEW.edition_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_LINK' USING ERRCODE='22023'; END IF;
  SELECT v.source_history_id INTO expected_history FROM public.crew_import_source_rows v
   JOIN public.crew_import_approvals a ON a.id=v.approval_id AND a.edition_id=v.edition_id AND a.actor_id=uid
   WHERE v.package_id=NEW.package_id AND v.edition_id=NEW.edition_id AND v.source_row_id=NEW.source_row_id
    AND a.source_sha256=source_hash;
  IF FOUND THEN
   IF NEW.source_history_id IS DISTINCT FROM expected_history THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_LINK' USING ERRCODE='22023';END IF;
  ELSE
  SELECT p.source_text INTO source_payload FROM public.crew_transfer_packages p WHERE p.id=NEW.package_id AND p.edition_id=NEW.edition_id;
  BEGIN
   source_row:=public.crew_transfer_source_row(source_payload,'working',NEW.source_row_id);
   IF source_row->'year' IS DISTINCT FROM to_jsonb('2027'::text) OR NOT(source_row ? 'source_id')
     OR jsonb_typeof(source_row->'source_id') NOT IN ('null','string')
   THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_LINK' USING ERRCODE='22023'; END IF;
   expected_history:=source_row->>'source_id';
   IF NEW.source_history_id IS DISTINCT FROM expected_history THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_LINK' USING ERRCODE='22023'; END IF;
   IF expected_history IS NOT NULL THEN
    historical_row:=public.crew_transfer_source_row(source_payload,'history',expected_history);
    IF historical_row->'year' IS DISTINCT FROM to_jsonb('2026'::text) THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_LINK' USING ERRCODE='22023'; END IF;
   END IF;
  EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_LINK' USING ERRCODE='22023'; END;
  END IF;
  INSERT INTO public.crew_audit(edition_id,actor_id,kind,entity_id,new_data)
   VALUES(NEW.edition_id,uid,'transfer_link',NEW.roster_id,jsonb_build_object('package_id',NEW.package_id,'source_row_id',NEW.source_row_id,'roster_id',NEW.roster_id,'source_history_id',NEW.source_history_id));
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.crew_import_immutable() FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.crew_import_json_unique(json,integer) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.crew_import_json(text) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.crew_import_rows(jsonb,text) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.crew_import_source(text) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.crew_import_uuid(text) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.crew_import_plan(uuid,text) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.crew_import_actor(uuid,boolean) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.crew_import_target_fingerprint(uuid) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.crew_import_target_preview(uuid) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.crew_import_stage_approval(uuid,text,text,timestamptz) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.crew_import_revoke(uuid,uuid) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.crew_import_apply(uuid,uuid,uuid,text,text) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crew_import_target_preview(uuid),public.crew_import_apply(uuid,uuid,uuid,text,text) TO authenticated;
COMMIT;
