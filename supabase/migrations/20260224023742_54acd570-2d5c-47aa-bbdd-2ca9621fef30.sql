
CREATE OR REPLACE FUNCTION public.get_geometry_health_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_county_id uuid;
  v_total integer;
  v_with_coords integer;
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
  select get_user_county_id() into v_county_id;

  select count(*) into v_total from parcels where county_id = v_county_id;

  -- raw_present: any non-null lat/lng except (0,0)
  select count(*) into v_raw_present
  from parcels where county_id = v_county_id
    and latitude is not null and longitude is not null
    and not (latitude = 0 and longitude = 0);

  -- legacy: total_with_coords (any coord field non-null, kept for backward compat)
  select count(*) into v_with_coords
  from parcels where county_id = v_county_id
    and (latitude is not null or longitude is not null
         or latitude_wgs84 is not null or longitude_wgs84 is not null);

  -- usable_wgs84: canonical WGS84 exists OR raw is valid degrees (not zero, not 2927-range)
  select count(*) into v_usable_wgs84
  from parcels where county_id = v_county_id
    and (
      -- canonical WGS84 fields populated
      (latitude_wgs84 is not null and longitude_wgs84 is not null)
      or (
        -- no canonical yet, but raw coords are valid WGS84 degrees
        latitude_wgs84 is null and longitude_wgs84 is null
        and latitude between -90 and 90
        and longitude between -180 and 180
        and not (latitude = 0 and longitude = 0)
      )
    );

  select count(*) into v_null_coords
  from parcels where county_id = v_county_id
    and latitude is null and longitude is null
    and latitude_wgs84 is null and longitude_wgs84 is null;

  select count(*) into v_zero_coords
  from parcels where county_id = v_county_id
    and latitude = 0 and longitude = 0;

  select count(*) into v_convertible_2927
  from parcels where county_id = v_county_id
    and (latitude_wgs84 is null or longitude_wgs84 is null)
    and latitude is not null and longitude is not null
    and not (latitude = 0 and longitude = 0)
    and latitude between 150000 and 650000
    and longitude between 1700000 and 2200000;

  select count(*) into v_invalid_wgs84
  from parcels where county_id = v_county_id
    and (latitude_wgs84 is null or longitude_wgs84 is null)
    and latitude is not null and longitude is not null
    and not (latitude = 0 and longitude = 0)
    and not (latitude between -90 and 90 and longitude between -180 and 180)
    and not (latitude between 150000 and 650000 and longitude between 1700000 and 2200000);

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

  select count(*) into v_backfill_done
  from parcels where county_id = v_county_id
    and latitude_wgs84 is not null and longitude_wgs84 is not null;

  select count(*) into v_backfill_eligible
  from parcels where county_id = v_county_id
    and latitude is not null and longitude is not null
    and not (latitude = 0 and longitude = 0);

  -- Ratio-based severity for zero coordinates
  v_zero_severity := case
    when v_total > 0 and (v_zero_coords::numeric / v_total) > 0.1 then 'error'
    else 'warning'
  end;

  -- Build issues array
  if v_null_coords > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type','null_coordinates','severity','warning','count',v_null_coords,'description','Parcels with no coordinate data at all'));
  end if;
  if v_zero_coords > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type','zero_coordinates','severity',v_zero_severity,'count',v_zero_coords,'description','Parcels with (0,0) placeholder coordinates'));
  end if;
  if v_convertible_2927 > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type','convertible_wkid_2927','severity','warning','count',v_convertible_2927,'description','Raw coords match WKID 2927 (State Plane feet) — auto-convertible to WGS84'));
  end if;
  if v_invalid_wgs84 > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type','invalid_wgs84','severity','error','count',v_invalid_wgs84,'description','Coordinates not valid WGS84 and not recognized as any known projection'));
  end if;
  if v_out_of_bounds > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type','out_of_conus_bounds','severity','warning','count',v_out_of_bounds,'description','WGS84 coordinates outside continental US bounds'));
  end if;
  if v_dup_groups > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type','duplicate_coordinates','severity','info','count',v_dup_groups,'description','Groups of parcels sharing identical WGS84 coordinates'));
  end if;

  return jsonb_build_object(
    'county_id', v_county_id,
    'total_parcels', v_total,
    'generated_at', now(),
    'sections', jsonb_build_object(
      'coordinate_quality', jsonb_build_object(
        'usable_wgs84', v_usable_wgs84,
        'raw_present', v_raw_present,
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
