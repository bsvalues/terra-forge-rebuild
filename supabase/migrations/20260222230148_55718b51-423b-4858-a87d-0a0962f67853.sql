
-- Step 1: Replace bulk RPC to remove coordinates/ST_AsGeoJSON writes
create or replace function public.upsert_parcel_polygons_bulk(
  p_county_id uuid,
  p_layer_id uuid,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_upserted bigint := 0;
  v_matched bigint := 0;
begin
  with input as (
    select
      (r->>'parcel_number') as parcel_number,
      nullif(r->>'source_object_id','') as source_object_id,
      (r->'geom') as geom_geojson,
      coalesce(r->'props', '{}'::jsonb) as props
    from jsonb_array_elements(p_rows) r
  ),
  parsed as (
    select
      parcel_number,
      source_object_id,
      props,
      case
        when geom_geojson is null then null
        else st_setsrid(st_geomfromgeojson(geom_geojson::text), 4326)
      end as geom
    from input
  ),
  norm as (
    select
      parcel_number,
      source_object_id,
      props,
      case
        when geom is null then null
        when st_geometrytype(geom) = 'ST_Polygon' then st_multi(geom)
        else geom
      end as geom
    from parsed
    where source_object_id is not null
      and parcel_number is not null
      and geom is not null
  ),
  up as (
    insert into gis_features (county_id, layer_id, source_object_id, geometry_type, coordinates, properties, geom)
    select
      p_county_id,
      p_layer_id,
      source_object_id,
      'MultiPolygon',
      '{}'::jsonb,
      props,
      geom
    from norm
    on conflict (county_id, layer_id, source_object_id)
    where source_object_id is not null
    do update set
      properties = excluded.properties,
      geom = excluded.geom
    returning 1
  ),
  pu as (
    update parcels p
    set
      parcel_geom_wgs84 = n.geom,
      neighborhood_code = coalesce(nullif(n.props->>'neighborhood_code',''), p.neighborhood_code)
    from norm n
    where p.county_id = p_county_id
      and n.parcel_number = p.parcel_number
    returning 1
  )
  select (select count(*) from up), (select count(*) from pu)
  into v_upserted, v_matched;

  return jsonb_build_object(
    'upserted_features', v_upserted,
    'matched_parcels', v_matched
  );
end;
$$;

-- Step 2: Replace single-row RPC to remove coordinates writes
create or replace function public.upsert_parcel_polygon(
  p_county_id uuid,
  p_layer_id uuid,
  p_parcel_number text,
  p_geojson_geometry jsonb,
  p_properties jsonb default '{}'::jsonb,
  p_source_object_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parcel_id uuid;
  v_feature_id uuid;
  v_geom geometry;
begin
  v_geom := st_setsrid(st_geomfromgeojson(p_geojson_geometry::text), 4326);
  if st_geometrytype(v_geom) = 'ST_Polygon' then
    v_geom := st_multi(v_geom);
  end if;

  select id into v_parcel_id
  from parcels
  where county_id = p_county_id
    and parcel_number = p_parcel_number
  limit 1;

  insert into gis_features (county_id, layer_id, source_object_id, geometry_type, coordinates, properties, geom)
  values (
    p_county_id, p_layer_id, p_source_object_id,
    'MultiPolygon',
    '{}'::jsonb,
    coalesce(p_properties, '{}'::jsonb),
    v_geom
  )
  on conflict (county_id, layer_id, source_object_id)
  where source_object_id is not null
  do update set
    properties = excluded.properties,
    geom = excluded.geom
  returning id into v_feature_id;

  if v_parcel_id is not null then
    update parcels
    set parcel_geom_wgs84 = v_geom
    where id = v_parcel_id;
  end if;

  return jsonb_build_object(
    'parcel_id', v_parcel_id,
    'feature_id', v_feature_id,
    'matched', v_parcel_id is not null
  );
end;
$$;

-- Step 3: Add link coverage stats RPC
create or replace function public.get_parcel_polygon_link_stats(
  p_county_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
select jsonb_build_object(
  'county_id', p_county_id,
  'parcels_total', (select count(*) from parcels where county_id = p_county_id),
  'parcels_with_situs_point', (select count(*) from parcels where county_id = p_county_id and situs_point_wgs84 is not null),
  'parcels_with_polygon', (select count(*) from parcels where county_id = p_county_id and parcel_geom_wgs84 is not null),
  'coverage_pct_of_situs', (
    select case
      when (select count(*) from parcels where county_id = p_county_id and situs_point_wgs84 is not null) = 0 then 0
      else round(
        (
          (select count(*) from parcels where county_id = p_county_id and parcel_geom_wgs84 is not null)::numeric
          /
          (select count(*) from parcels where county_id = p_county_id and situs_point_wgs84 is not null)::numeric
        ) * 100, 1
      )
    end
  ),
  'features_ingested', (select count(*) from gis_features where county_id = p_county_id),
  'features_linked_to_parcels', (select count(*) from gis_features where county_id = p_county_id and parcel_id is not null)
);
$$;

revoke all on function public.get_parcel_polygon_link_stats(uuid) from public;
grant execute on function public.get_parcel_polygon_link_stats(uuid) to authenticated;
