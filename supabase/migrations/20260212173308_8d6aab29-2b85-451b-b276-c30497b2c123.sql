
-- Drop the overly restrictive property_class check constraint
-- Real county data uses numeric codes (11, 65, 83, etc.) not English labels
ALTER TABLE public.parcels DROP CONSTRAINT parcels_property_class_check;
