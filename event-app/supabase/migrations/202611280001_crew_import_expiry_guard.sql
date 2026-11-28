-- Additive expiry guard only; no approval, import or live activation is performed.
-- Preserve the existing signature, owner, SECURITY DEFINER, search_path and ACL.
CREATE OR REPLACE FUNCTION public.crew_import_apply(e uuid,a_id uuid,r_id uuid,p_plan_text text,p_source_text text) RETURNS jsonb
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
 -- Waiting for locks and validating source can outlive the approval.
 -- Identical successful replay has already returned above without new writes.
 IF a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'CREW_IMPORT_APPROVAL_EXPIRED' USING ERRCODE='42501';END IF;
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
