-- Phase 85: Notification & Alert System
-- DB-backed notifications table with Supabase Realtime delivery.
-- Complements the existing in-memory useNotificationStore for transient toasts.

-- ══════════════════════════════════════════════════════════
-- Notifications table
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id     uuid        REFERENCES public.counties(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL,
  notification_type text    NOT NULL DEFAULT 'system',
  title         text        NOT NULL,
  body          text,
  severity      text        NOT NULL DEFAULT 'info',
  read_at       timestamptz,
  action_url    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users see their own notifications
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Any authenticated insert (service role bypasses RLS via service client)
CREATE POLICY "Authenticated can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id IS NOT NULL);

-- Users can mark their own as read
CREATE POLICY "Users can mark own read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, county_id)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- Wire into Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ══════════════════════════════════════════════════════════
-- Alert helper: create_notification (SECURITY DEFINER so
-- triggers and service code can insert without bypassing RLS)
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id       uuid,
  p_county_id     uuid,
  p_type          text,
  p_title         text,
  p_body          text     DEFAULT NULL,
  p_severity      text     DEFAULT 'info',
  p_action_url    text     DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications
    (user_id, county_id, notification_type, title, body, severity, action_url)
  VALUES
    (p_user_id, p_county_id, p_type, p_title, p_body, p_severity, p_action_url)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ══════════════════════════════════════════════════════════
-- Deadline alert trigger: fires when an appeal is inserted
-- with a hearing_date within 7 days; notifies the assessor.
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trg_appeal_deadline_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_days_until int;
  v_admin_ids  uuid[];
BEGIN
  -- Only care if hearing_date is set and is within 7 days
  IF NEW.hearing_date IS NULL THEN
    RETURN NEW;
  END IF;

  v_days_until := (NEW.hearing_date::date - CURRENT_DATE);

  IF v_days_until < 0 OR v_days_until > 7 THEN
    RETURN NEW;
  END IF;

  -- Find admin users for this county
  SELECT ARRAY_AGG(DISTINCT ur.user_id)
    INTO v_admin_ids
    FROM public.user_roles ur
    JOIN public.profiles pr ON pr.user_id = ur.user_id
   WHERE pr.county_id = NEW.county_id
     AND ur.role IN ('admin', 'analyst');

  IF v_admin_ids IS NULL OR array_length(v_admin_ids, 1) = 0 THEN
    RETURN NEW;
  END IF;

  -- Insert a notification for each admin/analyst in the county
  INSERT INTO public.notifications
    (user_id, county_id, notification_type, title, body, severity, action_url)
  SELECT
    uid,
    NEW.county_id,
    'deadline',
    CASE v_days_until
      WHEN 0 THEN 'Appeal Hearing TODAY'
      WHEN 1 THEN 'Appeal Hearing Tomorrow'
      ELSE 'Appeal Hearing in ' || v_days_until || ' days'
    END,
    'Parcel ' || COALESCE(
      (SELECT parcel_number FROM public.parcels WHERE id = NEW.parcel_id LIMIT 1),
      NEW.parcel_id::text
    ) || ' — hearing ' || TO_CHAR(NEW.hearing_date, 'Mon DD, YYYY'),
    CASE WHEN v_days_until <= 1 THEN 'critical'
         WHEN v_days_until <= 3 THEN 'warning'
         ELSE 'info' END,
    NULL
  FROM UNNEST(v_admin_ids) AS uid
  -- Deduplicate: skip if we already notified for this appeal within the last 24 h
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications n
     WHERE n.user_id = uid
       AND n.notification_type = 'deadline'
       AND n.body LIKE '%' || NEW.id::text || '%'
       AND n.created_at > now() - interval '24 hours'
  );

  RETURN NEW;
END;
$$;

-- Attach trigger to appeals on INSERT and on UPDATE of hearing_date
CREATE TRIGGER trg_appeal_deadline_notify
  AFTER INSERT OR UPDATE OF hearing_date ON public.appeals
  FOR EACH ROW EXECUTE FUNCTION public.trg_appeal_deadline_notify();
