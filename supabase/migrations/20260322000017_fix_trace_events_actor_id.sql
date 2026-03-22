-- TerraFusion OS — Fix trace_events actor_id for service_role seeding
-- =====================================================================
-- auth.uid() called with a service_role JWT (no sub claim) throws:
--   22P02: invalid input syntax for type uuid: ""
-- because Supabase coalesces the missing sub to '' and then casts to uuid.
--
-- Fix: make actor_id nullable so the INSERT in assign_parcels_from_polygon_layer
-- (and any other SECURITY DEFINER function called via service_role) can proceed
-- without a valid user ID.

ALTER TABLE trace_events ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE trace_events ALTER COLUMN actor_id DROP DEFAULT;
