-- Add finalized_at and finalized_by columns to dossier_packets for finalization workflow
ALTER TABLE public.dossier_packets
ADD COLUMN IF NOT EXISTS finalized_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS finalized_by uuid DEFAULT NULL;