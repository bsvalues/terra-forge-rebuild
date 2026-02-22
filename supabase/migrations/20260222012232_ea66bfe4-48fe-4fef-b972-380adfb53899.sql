-- Fix review_queue_items RLS: replace overly permissive policies with county-scoped ones

DROP POLICY IF EXISTS "Users can view review queue items" ON public.review_queue_items;
DROP POLICY IF EXISTS "Users can update review queue items" ON public.review_queue_items;

-- County-scoped SELECT via parent queue
CREATE POLICY "Users can view queue items in their county"
  ON public.review_queue_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.review_queues rq
      WHERE rq.id = review_queue_items.queue_id
        AND rq.county_id = public.get_user_county_id()
    )
  );

-- County-scoped UPDATE (own reviews or unreviewed items)
CREATE POLICY "Users can update queue items in their county"
  ON public.review_queue_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.review_queues rq
      WHERE rq.id = review_queue_items.queue_id
        AND rq.county_id = public.get_user_county_id()
    )
    AND (reviewed_by IS NULL OR reviewed_by = auth.uid())
  );

-- County-scoped INSERT
CREATE POLICY "Users can add items to queues in their county"
  ON public.review_queue_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.review_queues rq
      WHERE rq.id = review_queue_items.queue_id
        AND rq.county_id = public.get_user_county_id()
    )
  );

-- Also drop the hardcoded default on workflow_tasks.county_id
ALTER TABLE public.workflow_tasks
  ALTER COLUMN county_id DROP DEFAULT;