-- Allow any authenticated user to insert model_receipts (audit trail records)
CREATE POLICY "Authenticated users can insert model receipts"
ON public.model_receipts
FOR INSERT
WITH CHECK (auth.uid() = operator_id);

-- Also promote bsvalues user to admin for full system access
UPDATE public.user_roles SET role = 'admin' WHERE user_id = 'e07ff573-e75c-4f27-9096-bbee589db304';