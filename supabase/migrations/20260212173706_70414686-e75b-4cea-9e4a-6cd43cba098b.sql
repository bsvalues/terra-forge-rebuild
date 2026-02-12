
-- Drop restrictive check constraints on sales that reject real county data
ALTER TABLE public.sales DROP CONSTRAINT sales_sale_type_check;
