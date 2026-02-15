
-- Review queues: a named batch of parcels to review
CREATE TABLE public.review_queues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  county_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.counties(id),
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  filter_criteria JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Review queue items: individual parcels in a queue with completion tracking
CREATE TABLE public.review_queue_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_id UUID NOT NULL REFERENCES public.review_queues(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES public.parcels(id),
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(queue_id, parcel_id),
  UNIQUE(queue_id, position)
);

-- Enable RLS
ALTER TABLE public.review_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_queue_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for review_queues
CREATE POLICY "Users can view queues for their county"
ON public.review_queues FOR SELECT
USING (county_id = get_user_county_id());

CREATE POLICY "Users can create queues for their county"
ON public.review_queues FOR INSERT
WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update queues for their county"
ON public.review_queues FOR UPDATE
USING (county_id = get_user_county_id());

CREATE POLICY "Users can delete their own queues"
ON public.review_queues FOR DELETE
USING (county_id = get_user_county_id() AND created_by = auth.uid());

-- RLS policies for review_queue_items
CREATE POLICY "Users can view items in their county queues"
ON public.review_queue_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.review_queues q
  WHERE q.id = queue_id AND q.county_id = get_user_county_id()
));

CREATE POLICY "Users can insert items in their county queues"
ON public.review_queue_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.review_queues q
  WHERE q.id = queue_id AND q.county_id = get_user_county_id()
));

CREATE POLICY "Users can update items in their county queues"
ON public.review_queue_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.review_queues q
  WHERE q.id = queue_id AND q.county_id = get_user_county_id()
));

CREATE POLICY "Users can delete items in their county queues"
ON public.review_queue_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.review_queues q
  WHERE q.id = queue_id AND q.county_id = get_user_county_id()
));

-- Indexes for performance
CREATE INDEX idx_review_queue_items_queue_id ON public.review_queue_items(queue_id);
CREATE INDEX idx_review_queue_items_parcel_id ON public.review_queue_items(parcel_id);
CREATE INDEX idx_review_queue_items_position ON public.review_queue_items(queue_id, position);
CREATE INDEX idx_review_queues_county ON public.review_queues(county_id);

-- Triggers for updated_at
CREATE TRIGGER update_review_queues_updated_at
BEFORE UPDATE ON public.review_queues
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_review_queue_items_updated_at
BEFORE UPDATE ON public.review_queue_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
