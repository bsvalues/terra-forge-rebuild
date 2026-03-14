
-- Parcel Watchlist: users can bookmark/star parcels for quick access
CREATE TABLE public.parcel_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  county_id uuid NOT NULL DEFAULT (public.get_user_county_id()),
  note text,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, parcel_id)
);

-- Indexes
CREATE INDEX idx_parcel_watchlist_user ON public.parcel_watchlist(user_id, created_at DESC);
CREATE INDEX idx_parcel_watchlist_parcel ON public.parcel_watchlist(parcel_id);

-- RLS
ALTER TABLE public.parcel_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist"
  ON public.parcel_watchlist FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can add to own watchlist"
  ON public.parcel_watchlist FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own watchlist items"
  ON public.parcel_watchlist FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove from own watchlist"
  ON public.parcel_watchlist FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
