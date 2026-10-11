-- Private county source artifacts: county members read their county folder; admins manage it.
CREATE POLICY "County members read source artifacts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'county-source-artifacts' AND (storage.foldername(name))[1] = public.get_user_county_id()::text);

CREATE POLICY "County admins upload source artifacts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'county-source-artifacts' AND public.is_admin() AND (storage.foldername(name))[1] = public.get_user_county_id()::text);
