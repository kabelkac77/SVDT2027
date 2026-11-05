-- Private immutable provenance only. No data import or client write RPC.
BEGIN;
CREATE TABLE public.crew_transfer_packages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), edition_id uuid NOT NULL REFERENCES public.editions,
 source_sha256 text NOT NULL CHECK(source_sha256 ~ '^[0-9a-f]{64}$'),
 source_text text NOT NULL CHECK(octet_length(source_text)<=134217728),
 source_format text NOT NULL DEFAULT 'crew-tables-v1' CHECK(source_format='crew-tables-v1'),
 actor_id uuid NOT NULL REFERENCES auth.users, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,edition_id), UNIQUE(edition_id,source_sha256)
);
CREATE TABLE public.crew_transfer_links (
 package_id uuid NOT NULL, edition_id uuid NOT NULL, source_row_id text NOT NULL CHECK(length(source_row_id) BETWEEN 1 AND 200),
 roster_id uuid NOT NULL, source_history_id text CHECK(source_history_id IS NULL OR length(source_history_id) BETWEEN 1 AND 200),
 actor_id uuid NOT NULL REFERENCES auth.users, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(package_id,source_row_id), UNIQUE(package_id,roster_id),
 FOREIGN KEY(package_id,edition_id) REFERENCES public.crew_transfer_packages(id,edition_id),
 FOREIGN KEY(roster_id,edition_id) REFERENCES public.crew_roster(id,edition_id)
);
CREATE INDEX crew_transfer_packages_edition_idx ON public.crew_transfer_packages(edition_id);
CREATE INDEX crew_transfer_links_roster_idx ON public.crew_transfer_links(roster_id,edition_id);
ALTER TABLE public.crew_transfer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_transfer_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY crew_transfer_packages_admin_read ON public.crew_transfer_packages FOR SELECT TO authenticated
 USING(public.crew_role(edition_id)='admin');
CREATE POLICY crew_transfer_links_admin_read ON public.crew_transfer_links FOR SELECT TO authenticated
 USING(public.crew_role(edition_id)='admin');

-- Internal parser, not an exposed RPC. Preserve source_text; do not reconstruct it from jsonb.
CREATE FUNCTION public.crew_transfer_source_row(source_text text, table_name text, row_id text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE doc jsonb; part jsonb; chosen jsonb; row_value jsonb; col jsonb; col_name text;
 names text[]:=ARRAY[]::text[]; id_index integer; result jsonb; tables_count integer:=0; rows_count integer:=0; i integer;
BEGIN
 doc:=source_text::jsonb;
 IF jsonb_typeof(doc)<>'array' THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_SOURCE' USING ERRCODE='22023'; END IF;
 FOR part IN SELECT value FROM jsonb_array_elements(doc) LOOP
  IF part->>'name'=table_name THEN tables_count:=tables_count+1; chosen:=part; END IF;
 END LOOP;
 IF tables_count<>1 OR jsonb_typeof(chosen->'columns') IS DISTINCT FROM 'array' OR jsonb_typeof(chosen->'rows') IS DISTINCT FROM 'array'
 THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_SOURCE' USING ERRCODE='22023'; END IF;
 FOR col IN SELECT value FROM jsonb_array_elements(chosen->'columns') LOOP
  IF jsonb_typeof(col)<>'string' THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_SOURCE' USING ERRCODE='22023'; END IF;
  col_name:=col#>>'{}';
  IF col_name='' OR col_name=ANY(names) THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_SOURCE' USING ERRCODE='22023'; END IF;
  names:=array_append(names,col_name);
 END LOOP;
 id_index:=array_position(names,'id')-1;
 IF id_index IS NULL OR array_position(names,'year') IS NULL OR jsonb_array_length(chosen->'rows')>10000
 THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_SOURCE' USING ERRCODE='22023'; END IF;
 FOR row_value IN SELECT value FROM jsonb_array_elements(chosen->'rows') LOOP
  IF jsonb_typeof(row_value)<>'array' OR jsonb_array_length(row_value)<>cardinality(names)
  THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_SOURCE' USING ERRCODE='22023'; END IF;
  IF jsonb_typeof(row_value->id_index)='string' AND row_value->>id_index=row_id THEN
   rows_count:=rows_count+1; result:='{}'::jsonb;
   FOR i IN 1..cardinality(names) LOOP result:=result||jsonb_build_object(names[i],row_value->(i-1)); END LOOP;
  END IF;
 END LOOP;
 IF rows_count<>1 THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_SOURCE' USING ERRCODE='22023'; END IF;
 RETURN result;
EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_SOURCE' USING ERRCODE='22023';
END;
$$;
CREATE FUNCTION public.crew_transfer_capture() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); source_payload text; source_row jsonb; historical_row jsonb; expected_history text;
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
  SELECT p.source_text INTO source_payload FROM public.crew_transfer_packages p WHERE p.id=NEW.package_id AND p.edition_id=NEW.edition_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CREW_TRANSFER_INVALID_LINK' USING ERRCODE='22023'; END IF;
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
  INSERT INTO public.crew_audit(edition_id,actor_id,kind,entity_id,new_data)
   VALUES(NEW.edition_id,uid,'transfer_link',NEW.roster_id,jsonb_build_object('package_id',NEW.package_id,'source_row_id',NEW.source_row_id,'roster_id',NEW.roster_id,'source_history_id',NEW.source_history_id));
 END IF;
 RETURN NEW;
END;
$$;
CREATE FUNCTION public.crew_transfer_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'CREW_TRANSFER_IMMUTABLE' USING ERRCODE='42501'; END;
$$;
CREATE TRIGGER crew_transfer_packages_capture BEFORE INSERT ON public.crew_transfer_packages FOR EACH ROW EXECUTE FUNCTION public.crew_transfer_capture();
CREATE TRIGGER crew_transfer_links_capture BEFORE INSERT ON public.crew_transfer_links FOR EACH ROW EXECUTE FUNCTION public.crew_transfer_capture();
CREATE TRIGGER crew_transfer_packages_immutable BEFORE UPDATE OR DELETE ON public.crew_transfer_packages FOR EACH ROW EXECUTE FUNCTION public.crew_transfer_immutable();
CREATE TRIGGER crew_transfer_links_immutable BEFORE UPDATE OR DELETE ON public.crew_transfer_links FOR EACH ROW EXECUTE FUNCTION public.crew_transfer_immutable();
CREATE TRIGGER crew_transfer_packages_no_truncate BEFORE TRUNCATE ON public.crew_transfer_packages FOR EACH STATEMENT EXECUTE FUNCTION public.crew_transfer_immutable();
CREATE TRIGGER crew_transfer_links_no_truncate BEFORE TRUNCATE ON public.crew_transfer_links FOR EACH STATEMENT EXECUTE FUNCTION public.crew_transfer_immutable();
REVOKE ALL ON public.crew_transfer_packages,public.crew_transfer_links FROM public,anon,authenticated;
GRANT SELECT ON public.crew_transfer_packages,public.crew_transfer_links TO authenticated;
REVOKE ALL ON FUNCTION public.crew_transfer_source_row(text,text,text),public.crew_transfer_capture(),public.crew_transfer_immutable() FROM public,anon,authenticated;
COMMIT;
