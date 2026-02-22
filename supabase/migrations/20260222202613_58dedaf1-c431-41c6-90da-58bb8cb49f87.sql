
-- PATCH: Use WKID 2927 (WA State Plane South, feet) for Benton County
-- Adds trace_events logging per batch run

create or replace function public.backfill_parcel_wgs84_from_raw(
  p_county_id uuid,
  p_limit integer default 5000
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
  v_skipped integer := 0;
  v_already_done integer := 0;
  v_total_remaining integer := 0;
begin
  select count(*) into v_already_done
  from parcels
  where county_id = p_county_id
    and latitude_wgs84 is not null
    and longitude_wgs84 is not null;

  with candidates as (
    select id, latitude as raw_lat, longitude as raw_lng
    from parcels
    where county_id = p_county_id
      and latitude is not null and longitude is not null
      and not (latitude = 0 and longitude = 0)
      and (latitude_wgs84 is null or longitude_wgs84 is null)
    order by id
    limit p_limit
  ),
  classified as (
    select
      id, raw_lat, raw_lng,
      (raw_lat between -90 and 90 and raw_lng between -180 and 180) as is_wgs84,
      (raw_lat between 150000 and 650000 and raw_lng between 1700000 and 2200000) as looks_like_2927
    from candidates
  ),
  computed as (
    select
      id, raw_lat, raw_lng,
      case
        when is_wgs84 then raw_lat
        when looks_like_2927 then st_y(st_transform(st_setsrid(st_makepoint(raw_lng, raw_lat), 2927), 4326))
        else null
      end as new_lat,
      case
        when is_wgs84 then raw_lng
        when looks_like_2927 then st_x(st_transform(st_setsrid(st_makepoint(raw_lng, raw_lat), 2927), 4326))
        else null
      end as new_lng,
      case when is_wgs84 then 4326 when looks_like_2927 then 2927 else null end as detected_srid,
      case when is_wgs84 then 'raw_wgs84' when looks_like_2927 then 'derived_from_wkid_2927' else 'unknown' end as source,
      case when is_wgs84 then 95 when looks_like_2927 then 90 else 10 end as confidence
    from classified
  ),
  upd as (
    update parcels p
    set
      latitude_wgs84 = c.new_lat,
      longitude_wgs84 = c.new_lng,
      coord_detected_srid = c.detected_srid,
      coord_source = c.source,
      coord_confidence = c.confidence,
      coord_updated_at = now()
    from computed c
    where p.id = c.id
      and c.new_lat is not null
      and c.new_lng is not null
    returning p.id
  )
  select count(*) into v_updated from upd;

  select count(*) into v_skipped
  from classified cl
  where not cl.is_wgs84 and not cl.looks_like_2927;

  select count(*) into v_total_remaining
  from parcels
  where county_id = p_county_id
    and latitude is not null and longitude is not null
    and not (latitude = 0 and longitude = 0)
    and (latitude_wgs84 is null or longitude_wgs84 is null);

  insert into trace_events (county_id, source_module, event_type, event_data)
  values (
    p_county_id,
    'geometry-backfill',
    'srid_backfill_run',
    jsonb_build_object(
      'assumed_projected_wkid', 2927,
      'updated', v_updated,
      'skipped_unknown', v_skipped,
      'already_done', v_already_done + v_updated,
      'remaining', v_total_remaining,
      'batch_limit', p_limit
    )
  );

  return jsonb_build_object(
    'county_id', p_county_id,
    'updated', v_updated,
    'skipped_unknown', v_skipped,
    'limit', p_limit,
    'assumed_projected_wkid', 2927
  );
end;
$$;

revoke all on function public.backfill_parcel_wgs84_from_raw(uuid, integer) from public;
grant execute on function public.backfill_parcel_wgs84_from_raw(uuid, integer) to authenticated;

-- Also patch the health report to use convertible_wkid_2927 naming consistently
create or replace function public.get_geometry_health_report()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_county_id uuid;
  v_total integer;
  v_with_coords integer;
  v_null_coords integer;
  v_zero_coords integer;
  v_invalid_wgs84 integer;
  v_convertible_2927 integer;
  v_out_of_bounds integer;
  v_dup_groups integer;
  v_backfill_done integer;
  v_backfill_eligible integer;
  v_issues jsonb := '[]'::jsonb;
begin
  select get_user_county_id() into v_county_id;

  select count(*) into v_total from parcels where county_id = v_county_id;

  select count(*) into v_with_coords
  from parcels where county_id = v_county_id
    and (latitude is not null or longitude is not null
         or latitude_wgs84 is not null or longitude_wgs84 is not null);

  select count(*) into v_null_coords
  from parcels where county_id = v_county_id
    and latitude is null and longitude is null
    and latitude_wgs84 is null and longitude_wgs84 is null;

  select count(*) into v_zero_coords
  from parcels where county_id = v_county_id
    and latitude = 0 and longitude = 0;

  -- Convertible WKID 2927: raw coords match State Plane feet bands, no WGS84 yet
  select count(*) into v_convertible_2927
  from parcels where county_id = v_county_id
    and (latitude_wgs84 is null or longitude_wgs84 is null)
    and latitude is not null and longitude is not null
    and not (latitude = 0 and longitude = 0)
    and latitude between 150000 and 650000
    and longitude between 1700000 and 2200000;

  -- Invalid WGS84: has raw coords, not zero, not in 2927 bands, not valid WGS84
  select count(*) into v_invalid_wgs84
  from parcels where county_id = v_county_id
    and (latitude_wgs84 is null or longitude_wgs84 is null)
    and latitude is not null and longitude is not null
    and not (latitude = 0 and longitude = 0)
    and not (latitude between -90 and 90 and longitude between -180 and 180)
    and not (latitude between 150000 and 650000 and longitude between 1700000 and 2200000);

  -- Out of CONUS bounds: check canonical WGS84 fields
  select count(*) into v_out_of_bounds
  from parcels where county_id = v_county_id
    and latitude_wgs84 is not null and longitude_wgs84 is not null
    and not (latitude_wgs84 between 24.0 and 50.0 and longitude_wgs84 between -125.0 and -66.0);

  select count(*) into v_dup_groups
  from (
    select latitude_wgs84, longitude_wgs84
    from parcels where county_id = v_county_id
      and latitude_wgs84 is not null and longitude_wgs84 is not null
    group by latitude_wgs84, longitude_wgs84
    having count(*) > 1
  ) sub;

  -- Backfill progress
  select count(*) into v_backfill_done
  from parcels where county_id = v_county_id
    and latitude_wgs84 is not null and longitude_wgs84 is not null;

  select count(*) into v_backfill_eligible
  from parcels where county_id = v_county_id
    and latitude is not null and longitude is not null
    and not (latitude = 0 and longitude = 0);

  -- Build issues array
  if v_null_coords > 0 then
    v_issues := v_issues || jsonb_build_object('type','null_coordinates','severity','warning','count',v_null_coords,'description','Parcels with no coordinate data at all');
  end if;
  if v_zero_coords > 0 then
    v_issues := v_issues || jsonb_build_object('type','zero_coordinates','severity','warning','count',v_zero_coords,'description','Parcels with (0,0) placeholder coordinates');
  end if;
  if v_convertible_2927 > 0 then
    v_issues := v_issues || jsonb_build_object('type','convertible_wkid_2927','severity','warning','count',v_convertible_2927,'description','Raw coords match WKID 2927 (State Plane feet) — auto-convertible to WGS84');
  end if;
  if v_invalid_wgs84 > 0 then
    v_issues := v_issues || jsonb_build_object('type','invalid_wgs84','severity','error','count',v_invalid_wgs84,'description','Coordinates not valid WGS84 and not recognized as any known projection');
  end if;
  if v_out_of_bounds > 0 then
    v_issues := v_issues || jsonb_build_object('type','out_of_conus_bounds','severity','warning','count',v_out_of_bounds,'description','WGS84 coordinates outside continental US bounds');
  end if;
  if v_dup_groups > 0 then
    v_issues := v_issues || jsonb_build_object('type','duplicate_coordinates','severity','info','count',v_dup_groups,'description','Groups of parcels sharing identical WGS84 coordinates');
  end if;

  return jsonb_build_object(
    'county_id', v_county_id,
    'total_parcels', v_total,
    'generated_at', now(),
    'sections', jsonb_build_object(
      'coordinate_quality', jsonb_build_object(
        'total_with_coords', v_with_coords,
        'null_coordinates', v_null_coords,
        'zero_coordinates', v_zero_coords,
        'invalid_wgs84', v_invalid_wgs84,
        'convertible_wkid_2927', v_convertible_2927,
        'out_of_conus_bounds', v_out_of_bounds,
        'duplicate_coordinate_groups', v_dup_groups
      ),
      'wgs84_backfill', jsonb_build_object(
        'completed', v_backfill_done,
        'total_eligible', v_backfill_eligible,
        'remaining', v_backfill_eligible - v_backfill_done,
        'pct_done', case when v_backfill_eligible > 0 then round((v_backfill_done::numeric / v_backfill_eligible) * 100, 1) else 0 end
      )
    ),
    'issues', v_issues
  );
end;
$$;
