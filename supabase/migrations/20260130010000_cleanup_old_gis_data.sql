-- Cleanup old FGDB data and partial SalesHistory seed via direct SQL
-- This is much faster than REST API batch deletes

-- Delete remaining features from old FGDB "Benton Parcels" layer
DELETE FROM gis_features WHERE layer_id = '0ca6c75e-a5a5-43a8-b7be-95e20782b7ca';

-- Delete the old FGDB layer itself
DELETE FROM gis_layers WHERE id = '0ca6c75e-a5a5-43a8-b7be-95e20782b7ca';

-- Delete the old FGDB data source
DELETE FROM gis_data_sources WHERE id = '3f6a3c16-aa5e-462b-9922-df77d47a6998';

-- Delete partial SalesHistory seed (103,999 features that will be re-seeded)
DELETE FROM gis_features WHERE layer_id = '4cabec75-7c0a-45f7-ab6a-5ea6ac95d73e';

-- Delete the partial SalesHistory layer
DELETE FROM gis_layers WHERE id = '4cabec75-7c0a-45f7-ab6a-5ea6ac95d73e';
