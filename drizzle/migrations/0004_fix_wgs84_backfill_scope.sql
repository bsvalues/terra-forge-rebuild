CREATE OR REPLACE FUNCTION public.backfill_parcel_wgs84_from_raw(p_county_id uuid, p_limit integer DEFAULT 5000)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_updated integer := 0; v_skipped integer := 0; v_remaining integer := 0;
begin
  if auth.uid() is not null and not (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'analyst')) then
    raise exception 'not authorized';
  end if;
  -- Unknown projections are counted but never converted (no invented geography).
  select count(*) into v_skipped from parcels
  where county_id = p_county_id and latitude is not null and longitude is not null
    and (latitude_wgs84 is null or longitude_wgs84 is null)
    and not (latitude between -90 and 90 and longitude between -180 and 180)
    and not (latitude between 150000 and 650000 and longitude between 1700000 and 2200000);

  with c as (
    select id, latitude raw_lat, longitude raw_lng,
      (latitude between -90 and 90 and longitude between -180 and 180 and not (latitude=0 and longitude=0)) is_wgs84,
      (latitude between 150000 and 650000 and longitude between 1700000 and 2200000) is_2927
    from parcels
    where county_id = p_county_id and latitude is not null and longitude is not null
      and (latitude_wgs84 is null or longitude_wgs84 is null)
    order by id limit p_limit
  ), t as (
    select id, is_wgs84,
      case when is_wgs84 then st_setsrid(st_makepoint(raw_lng, raw_lat),4326)
           else st_transform(st_setsrid(st_makepoint(raw_lng, raw_lat),2927),4326) end pt
    from c where is_wgs84 or is_2927
  ), upd as (
    update parcels p set latitude_wgs84 = st_y(t.pt), longitude_wgs84 = st_x(t.pt),
      coord_detected_srid = case when t.is_wgs84 then 4326 else 2927 end,
      coord_source = case when t.is_wgs84 then 'raw_wgs84' else 'derived_from_wkid_2927' end,
      coord_confidence = case when t.is_wgs84 then 95 else 90 end,
      coord_updated_at = now()
    from t where p.id = t.id returning p.id
  ) select count(*) into v_updated from upd;

  select count(*) into v_remaining from parcels
  where county_id = p_county_id and latitude is not null and longitude is not null
    and (latitude_wgs84 is null or longitude_wgs84 is null)
    and ((latitude between -90 and 90 and longitude between -180 and 180) or (latitude between 150000 and 650000 and longitude between 1700000 and 2200000));

  insert into trace_events (county_id, source_module, event_type, event_data)
  values (p_county_id, 'geometry-backfill', 'srid_backfill_run',
    jsonb_build_object('assumed_projected_wkid',2927,'updated',v_updated,'skipped_unknown',v_skipped,'remaining',v_remaining,'batch_limit',p_limit));
  return jsonb_build_object('updated',v_updated,'skipped_unknown',v_skipped,'remaining',v_remaining);
end;
$function$;