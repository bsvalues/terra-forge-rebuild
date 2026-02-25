
-- 1) Admin/CI sibling: parametrized, fails loud on null county
CREATE OR REPLACE FUNCTION public.get_geometry_health_report_for_county(p_county_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_total integer;
  v_raw_present integer;
  v_usable_wgs84 integer;
  v_null_coords integer;
  v_zero_coords integer;
  v_invalid_wgs84 integer;
  v_convertible_2927 integer;
  v_out_of_bounds integer;
  v_dup_groups integer;
  v_backfill_done integer;
  v_backfill_eligible integer;
  v_issues jsonb := '[]'::jsonb;
  v_zero_severity text;
begin
  if p_county_id is null then
    raise exception 'p_county_id must not be null';
  end if;

  select count(*) into v_total from parcels where county_id = p_county_id;

  select count(*) into v_raw_present
  from parcels where county_id = p_county_id
    and latitude is not null and longitude is not null
    and not (latitude = 0 and longitude = 0);

  select count(*) into v_usable_wgs84
  from parcels where county_id = p_county_id
    and (
      (latitude_wgs84 is not null and longitude_wgs84 is not null
       and latitude_wgs84 between 24.0 and 50.0
       and longitude_wgs84 between -125.0 and -66.0)
      or (
        latitude_wgs84 is null and longitude_wgs84 is null
        and latitude between 24.0 and 50.0
        and longitude between -125.0 and -66.0
      )
    );

  select count(*) into v_null_coords
  from parcels where county_id = p_county_id
    and latitude is null and longitude is null
    and latitude_wgs84 is null and longitude_wgs84 is null;

  select count(*) into v_zero_coords
  from parcels where county_id = p_county_id
    and latitude = 0 and longitude = 0;

  select count(*) into v_convertible_2927
  from parcels where county_id = p_county_id
    and (latitude_wgs84 is null or longitude_wgs84 is null)
    and latitude is not null and longitude is not null
    and not (latitude = 0 and longitude = 0)
    and latitude between 150000 and 650000
    and longitude between 1700000 and 2200000;

  select count(*) into v_invalid_wgs84
  from parcels where county_id = p_county_id
    and (latitude_wgs84 is null or longitude_wgs84 is null)
    and latitude is not null and longitude is not null
    and not (latitude = 0 and longitude = 0)
    and not (latitude between -90 and 90 and longitude between -180 and 180)
    and not (latitude between 150000 and 650000 and longitude between 1700000 and 2200000);

  select count(*) into v_out_of_bounds
  from parcels where county_id = p_county_id
    and (
      (latitude_wgs84 is not null and longitude_wgs84 is not null
       and not (latitude_wgs84 between 24.0 and 50.0 and longitude_wgs84 between -125.0 and -66.0))
      or (
        latitude_wgs84 is null and longitude_wgs84 is null
        and latitude between -90 and 90 and longitude between -180 and 180
        and not (latitude = 0 and longitude = 0)
        and not (latitude between 24.0 and 50.0 and longitude between -125.0 and -66.0)
      )
    );

  select count(*) into v_dup_groups
  from (
    select
      coalesce(latitude_wgs84, case when latitude between -90 and 90 then latitude end) as eff_lat,
      coalesce(longitude_wgs84, case when longitude between -180 and 180 then longitude end) as eff_lng
    from parcels
    where county_id = p_county_id
      and (
        (latitude_wgs84 is not null and longitude_wgs84 is not null)
        or (latitude_wgs84 is null and longitude_wgs84 is null
            and latitude between -90 and 90 and longitude between -180 and 180
            and not (latitude = 0 and longitude = 0))
      )
    group by eff_lat, eff_lng
    having count(*) > 1
  ) sub;

  select count(*) into v_backfill_done
  from parcels where county_id = p_county_id
    and latitude_wgs84 is not null and longitude_wgs84 is not null;

  v_backfill_eligible := v_raw_present;

  v_zero_severity := case
    when v_total > 0 and (v_zero_coords::numeric / v_total) > 0.1 then 'error'
    else 'warning'
  end;

  if v_null_coords > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'type','null_coordinates','severity','warning','count',v_null_coords,
      'description','Parcels with no coordinate data at all'));
  end if;
  if v_zero_coords > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'type','zero_coordinates','severity',v_zero_severity,'count',v_zero_coords,
      'description', format('Parcels with (0,0) placeholder coordinates (%s%% of roll)',
        case when v_total > 0 then round((v_zero_coords::numeric / v_total) * 100, 1)::text else '0' end)));
  end if;
  if v_convertible_2927 > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'type','convertible_wkid_2927','severity','warning','count',v_convertible_2927,
      'description','Raw coords match WKID 2927 (State Plane feet) — auto-convertible to WGS84'));
  end if;
  if v_invalid_wgs84 > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'type','invalid_wgs84','severity','error','count',v_invalid_wgs84,
      'description','Coordinates not valid WGS84 and not recognized as any known projection'));
  end if;
  if v_out_of_bounds > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'type','out_of_conus_bounds','severity','warning','count',v_out_of_bounds,
      'description','Effective coordinate (canonical or raw) is valid WGS84 but outside CONUS'));
  end if;
  if v_dup_groups > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'type','duplicate_coordinates','severity','info','count',v_dup_groups,
      'description','Groups of parcels sharing identical effective WGS84 coordinates'));
  end if;

  return jsonb_build_object(
    'schema_version', 1,
    'county_id', p_county_id,
    'total_parcels', v_total,
    'generated_at', now(),
    'definitions', jsonb_build_object(
      'usable_wgs84', 'Effective coordinate (canonical WGS84 if present, else raw-as-degrees) within CONUS bounds (24-50°N, 66-125°W). Canonical wins.',
      'raw_present', 'Any non-null raw lat/lng pair excluding (0,0) placeholders. Includes all SRIDs.',
      'raw_any_present', 'raw_present + zero_coordinates. Every parcel that has any raw coordinate data, including placeholders.',
      'convertible_wkid_2927', 'Raw coords in State Plane feet range (WKID 2927) without canonical WGS84 yet.',
      'null_coordinates', 'No raw or canonical coordinate data. Resolvable via polygon point-on-surface.',
      'out_of_conus_bounds', 'Effective coord is valid WGS84 but outside CONUS. Canonical-in-CONUS parcels are never flagged.',
      'duplicate_coordinate_groups', 'Groups sharing identical effective coordinates (canonical wins).',
      'zero_severity_denominator', 'total_parcels (county-wide roll risk)',
      'effective_coord_rule', 'canonical (latitude_wgs84/longitude_wgs84) takes precedence over raw for all classification',
      'backfill_completed', 'Count of parcels with canonical WGS84 present (regardless of raw). May exceed backfill_eligible when vendors populate canonical directly.',
      'backfill_eligible', 'Equals raw_present. Parcels with raw coords that could be converted to canonical WGS84.'
    ),
    'sections', jsonb_build_object(
      'coordinate_quality', jsonb_build_object(
        'usable_wgs84', v_usable_wgs84,
        'raw_present', v_raw_present,
        'raw_any_present', v_raw_present + v_zero_coords,
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
        'remaining', greatest(v_backfill_eligible - v_backfill_done, 0),
        'pct_done', case when v_backfill_eligible > 0 then round((v_backfill_done::numeric / v_backfill_eligible) * 100, 1) else 0 end
      )
    ),
    'issues', v_issues
  );
end;
$$;

-- 2) Update user-scoped RPC: rename total_with_coords → raw_any_present, update backfill definitions
CREATE OR REPLACE FUNCTION public.get_geometry_health_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_county_id uuid;
begin
  select get_user_county_id() into v_county_id;
  if v_county_id is null then
    raise exception 'No county context: user must be authenticated with a county assignment';
  end if;
  return public.get_geometry_health_report_for_county(v_county_id);
end;
$$;
