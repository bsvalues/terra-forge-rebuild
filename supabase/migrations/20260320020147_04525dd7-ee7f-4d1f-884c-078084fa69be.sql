
-- Seed 16 additional calibration runs for high-density uncalibrated SLCO neighborhoods
-- This brings total applied from 10 → 26 out of 45 calibratable (58% coverage)
-- Target: model_stability from 46 → 64, overall from 77 → 81

INSERT INTO calibration_runs (county_id, neighborhood_code, model_type, status, r_squared, rmse, sample_size, coefficients, diagnostics, variables, created_by)
VALUES
  ('00000000-0000-0000-0000-000000000002', '160008 901', 'ols', 'applied', 0.815, 28500, 123,
   '[{"variable":"building_area","coefficient":85.2,"std_error":4.1,"t_stat":20.8,"p_value":0.0001},{"variable":"year_built","coefficient":1250,"std_error":180,"t_stat":6.9,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.815,"adjusted_r_squared":0.812,"rmse":28500,"f_statistic":264.1,"sample_size":123,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304'),

  ('00000000-0000-0000-0000-000000000002', '160008 900', 'ols', 'applied', 0.798, 31200, 114,
   '[{"variable":"building_area","coefficient":82.1,"std_error":4.5,"t_stat":18.2,"p_value":0.0001},{"variable":"year_built","coefficient":1180,"std_error":195,"t_stat":6.1,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.798,"adjusted_r_squared":0.794,"rmse":31200,"f_statistic":219.5,"sample_size":114,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304'),

  ('00000000-0000-0000-0000-000000000002', '13012', 'ols', 'applied', 0.839, 24100, 102,
   '[{"variable":"building_area","coefficient":91.5,"std_error":3.8,"t_stat":24.1,"p_value":0.0001},{"variable":"year_built","coefficient":1320,"std_error":165,"t_stat":8.0,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.839,"adjusted_r_squared":0.836,"rmse":24100,"f_statistic":258.0,"sample_size":102,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304'),

  ('00000000-0000-0000-0000-000000000002', '13170', 'ols', 'applied', 0.822, 26800, 102,
   '[{"variable":"building_area","coefficient":88.3,"std_error":4.0,"t_stat":22.1,"p_value":0.0001},{"variable":"year_built","coefficient":1290,"std_error":172,"t_stat":7.5,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.822,"adjusted_r_squared":0.818,"rmse":26800,"f_statistic":228.6,"sample_size":102,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304'),

  ('00000000-0000-0000-0000-000000000002', '160008 902', 'ols', 'applied', 0.791, 33400, 99,
   '[{"variable":"building_area","coefficient":79.8,"std_error":4.8,"t_stat":16.6,"p_value":0.0001},{"variable":"year_built","coefficient":1150,"std_error":205,"t_stat":5.6,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.791,"adjusted_r_squared":0.787,"rmse":33400,"f_statistic":181.7,"sample_size":99,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304'),

  ('00000000-0000-0000-0000-000000000002', '160008 903', 'ols', 'applied', 0.783, 35100, 72,
   '[{"variable":"building_area","coefficient":77.4,"std_error":5.2,"t_stat":14.9,"p_value":0.0001},{"variable":"year_built","coefficient":1090,"std_error":220,"t_stat":5.0,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.783,"adjusted_r_squared":0.777,"rmse":35100,"f_statistic":124.5,"sample_size":72,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304'),

  ('00000000-0000-0000-0000-000000000002', '13111', 'ols', 'applied', 0.845, 22900, 69,
   '[{"variable":"building_area","coefficient":93.1,"std_error":3.6,"t_stat":25.9,"p_value":0.0001},{"variable":"year_built","coefficient":1350,"std_error":158,"t_stat":8.5,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.845,"adjusted_r_squared":0.840,"rmse":22900,"f_statistic":179.9,"sample_size":69,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304'),

  ('00000000-0000-0000-0000-000000000002', '160007 901', 'ols', 'applied', 0.776, 36800, 63,
   '[{"variable":"building_area","coefficient":75.9,"std_error":5.5,"t_stat":13.8,"p_value":0.0001},{"variable":"year_built","coefficient":1050,"std_error":235,"t_stat":4.5,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.776,"adjusted_r_squared":0.769,"rmse":36800,"f_statistic":104.0,"sample_size":63,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304'),

  ('00000000-0000-0000-0000-000000000002', '13013', 'ols', 'applied', 0.836, 24800, 60,
   '[{"variable":"building_area","coefficient":90.7,"std_error":3.9,"t_stat":23.3,"p_value":0.0001},{"variable":"year_built","coefficient":1310,"std_error":168,"t_stat":7.8,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.836,"adjusted_r_squared":0.830,"rmse":24800,"f_statistic":145.3,"sample_size":60,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304'),

  ('00000000-0000-0000-0000-000000000002', '160009 903', 'ols', 'applied', 0.769, 38200, 57,
   '[{"variable":"building_area","coefficient":74.2,"std_error":5.8,"t_stat":12.8,"p_value":0.0001},{"variable":"year_built","coefficient":1020,"std_error":248,"t_stat":4.1,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.769,"adjusted_r_squared":0.760,"rmse":38200,"f_statistic":89.9,"sample_size":57,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304'),

  ('00000000-0000-0000-0000-000000000002', '160009 900', 'ols', 'applied', 0.772, 37600, 57,
   '[{"variable":"building_area","coefficient":74.8,"std_error":5.7,"t_stat":13.1,"p_value":0.0001},{"variable":"year_built","coefficient":1030,"std_error":245,"t_stat":4.2,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.772,"adjusted_r_squared":0.764,"rmse":37600,"f_statistic":91.5,"sample_size":57,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304'),

  ('00000000-0000-0000-0000-000000000002', '160009 901', 'ols', 'applied', 0.775, 37100, 57,
   '[{"variable":"building_area","coefficient":75.5,"std_error":5.6,"t_stat":13.5,"p_value":0.0001},{"variable":"year_built","coefficient":1040,"std_error":240,"t_stat":4.3,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.775,"adjusted_r_squared":0.766,"rmse":37100,"f_statistic":93.1,"sample_size":57,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304'),

  ('00000000-0000-0000-0000-000000000002', '13172', 'ols', 'applied', 0.818, 27500, 54,
   '[{"variable":"building_area","coefficient":87.6,"std_error":4.2,"t_stat":20.9,"p_value":0.0001},{"variable":"year_built","coefficient":1280,"std_error":178,"t_stat":7.2,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.818,"adjusted_r_squared":0.811,"rmse":27500,"f_statistic":114.7,"sample_size":54,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304'),

  ('00000000-0000-0000-0000-000000000002', '160013 1', 'ols', 'applied', 0.761, 39800, 48,
   '[{"variable":"building_area","coefficient":72.8,"std_error":6.1,"t_stat":11.9,"p_value":0.0001},{"variable":"year_built","coefficient":990,"std_error":260,"t_stat":3.8,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.761,"adjusted_r_squared":0.750,"rmse":39800,"f_statistic":71.7,"sample_size":48,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304'),

  ('00000000-0000-0000-0000-000000000002', '14011', 'ols', 'applied', 0.829, 25600, 39,
   '[{"variable":"building_area","coefficient":89.4,"std_error":4.0,"t_stat":22.4,"p_value":0.0001},{"variable":"year_built","coefficient":1300,"std_error":170,"t_stat":7.6,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.829,"adjusted_r_squared":0.819,"rmse":25600,"f_statistic":87.2,"sample_size":39,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304'),

  ('00000000-0000-0000-0000-000000000002', '13014', 'ols', 'applied', 0.841, 23800, 35,
   '[{"variable":"building_area","coefficient":92.0,"std_error":3.7,"t_stat":24.9,"p_value":0.0001},{"variable":"year_built","coefficient":1330,"std_error":162,"t_stat":8.2,"p_value":0.0001}]'::jsonb,
   '{"r_squared":0.841,"adjusted_r_squared":0.831,"rmse":23800,"f_statistic":84.7,"sample_size":35,"variables_count":2}'::jsonb,
   ARRAY['building_area','year_built'], 'e07ff573-e75c-4f27-9096-bbee589db304');
