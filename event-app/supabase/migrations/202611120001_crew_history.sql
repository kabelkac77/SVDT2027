-- Read-only original source history for an explicit roster/package. No import or activation.
BEGIN;
CREATE FUNCTION public.crew_transfer_history_index(e uuid,r uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR coalesce(public.crew_role(e),'')<>'admin' THEN
  RAISE EXCEPTION 'CREW_HISTORY_ACCESS_DENIED' USING ERRCODE='42501';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.editions WHERE id=e AND year=2027)
   OR NOT EXISTS(SELECT 1 FROM public.crew_roster WHERE id=r AND edition_id=e) THEN
  RAISE EXCEPTION 'CREW_HISTORY_NOT_FOUND' USING ERRCODE='22023';END IF;
 IF (SELECT count(*) FROM public.crew_transfer_links WHERE edition_id=e AND roster_id=r)>1000 THEN
  RAISE EXCEPTION 'CREW_HISTORY_LIMIT_EXCEEDED' USING ERRCODE='54000';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('packageId',p.id,'sourceSha256',p.source_sha256,
  'sourceFormat',p.source_format,'sourceRowId',l.source_row_id,'sourceHistoryId',l.source_history_id,
  'capturedBy',p.actor_id,'capturedAt',p.created_at) ORDER BY p.created_at,p.id),'[]'::jsonb)
 INTO result FROM public.crew_transfer_links l JOIN public.crew_transfer_packages p
  ON p.id=l.package_id AND p.edition_id=l.edition_id WHERE l.edition_id=e AND l.roster_id=r;
 RETURN jsonb_build_object('version',1,'editionId',e,'rosterId',r,'sources',result);
END;
$$;
CREATE FUNCTION public.crew_transfer_history_row(e uuid,r uuid,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE source_payload text;source_hash text;source_format text;source_id text;history_id text;
 working_row jsonb;history_row jsonb;captured_by uuid;captured_at timestamptz;
BEGIN
 IF auth.uid() IS NULL OR coalesce(public.crew_role(e),'')<>'admin' THEN
  RAISE EXCEPTION 'CREW_HISTORY_ACCESS_DENIED' USING ERRCODE='42501';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.editions WHERE id=e AND year=2027)
   OR NOT EXISTS(SELECT 1 FROM public.crew_roster WHERE id=r AND edition_id=e) THEN
  RAISE EXCEPTION 'CREW_HISTORY_NOT_FOUND' USING ERRCODE='22023';END IF;
 SELECT p.source_text,p.source_sha256,p.source_format,l.source_row_id,l.source_history_id,p.actor_id,p.created_at
 INTO source_payload,source_hash,source_format,source_id,history_id,captured_by,captured_at
 FROM public.crew_transfer_links l JOIN public.crew_transfer_packages p ON p.id=l.package_id AND p.edition_id=l.edition_id
 WHERE l.edition_id=e AND l.roster_id=r AND l.package_id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'CREW_HISTORY_NOT_FOUND' USING ERRCODE='22023';END IF;
 BEGIN
  working_row:=public.crew_transfer_source_row(source_payload,'working',source_id);
  IF working_row->'year' IS DISTINCT FROM to_jsonb('2027'::text)
    OR NOT(working_row ? 'source_id') OR working_row->>'source_id' IS DISTINCT FROM history_id THEN
   RAISE EXCEPTION 'CREW_HISTORY_INVALID_SOURCE';END IF;
  IF history_id IS NOT NULL THEN
   history_row:=public.crew_transfer_source_row(source_payload,'history',history_id);
   IF history_row->'year' IS DISTINCT FROM to_jsonb('2026'::text) THEN RAISE EXCEPTION 'CREW_HISTORY_INVALID_SOURCE';END IF;
  END IF;
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'CREW_HISTORY_INVALID_SOURCE' USING ERRCODE='22023';END;
 RETURN jsonb_build_object('version',1,'editionId',e,'rosterId',r,'packageId',p_id,
  'sourceSha256',source_hash,'sourceFormat',source_format,'capturedBy',captured_by,'capturedAt',captured_at,
  'sourceRow',working_row,'historyRow',history_row);
END;
$$;
REVOKE ALL ON FUNCTION public.crew_transfer_history_index(uuid,uuid) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.crew_transfer_history_row(uuid,uuid,uuid) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.crew_transfer_history_index(uuid,uuid),public.crew_transfer_history_row(uuid,uuid,uuid) TO authenticated;
COMMIT;
