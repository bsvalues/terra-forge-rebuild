create or replace function public.upsert_gis_features_bulk(
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
      nullif(r->>'parcel_number', '') as parcel_number,
      nullif(r->>'source_object_id', '') as source_object_id,
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
      and geom is not null
  ),
  up as (
    insert into gis_features (county_id, layer_id, source_object_id, geometry_type, coordinates, properties, geom)
    select
      p_county_id,
      p_layer_id,
      source_object_id,
      replace(st_geometrytype(geom), 'ST_', ''),
      null,
      props,
      geom
    from norm
    on conflict (county_id, layer_id, source_object_id)
    where source_object_id is not null
    do update set
      geometry_type = excluded.geometry_type,
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
    where n.parcel_number is not null
      and p.county_id = p_county_id
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