GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
-- Users may only create notifications addressed to themselves; others go through create_notification.
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
ALTER FUNCTION public.create_notification(uuid, uuid, text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.trg_appeal_deadline_notify() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, uuid, text, text, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, uuid, text, text, text, text, text) TO service_role;