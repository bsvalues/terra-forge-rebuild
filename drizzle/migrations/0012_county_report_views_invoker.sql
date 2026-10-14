-- Report views run with the caller's permissions so county row security applies.
DO $$ DECLARE v text; BEGIN
  FOREACH v IN ARRAY ARRAY['vw_assessment_yoy','vw_assessment_yoy_summary','vw_assessment_top_movers','vw_sales_ratio_detail','vw_sales_ratio_by_neighborhood','vw_sales_ratio_county_summary','vw_exemption_county_summary','vw_exemption_by_type','vw_exemption_detail'] LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', v);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', v);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated, service_role', v);
  END LOOP;
END $$;