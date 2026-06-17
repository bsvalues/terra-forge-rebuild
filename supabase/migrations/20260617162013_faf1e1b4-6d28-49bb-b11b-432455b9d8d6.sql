-- Phase 4a: Lock down Realtime broadcast/presence channels.
-- Our app uses postgres_changes (which honors table RLS), not Broadcast/Presence.
-- Add restrictive policies on realtime.messages so anonymous users cannot
-- subscribe to any broadcast topic, and authenticated users can only subscribe
-- to topics scoped to themselves (user:<auth.uid()>) unless they are admins.

-- Ensure RLS is on (it is by default, but be explicit).
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop any prior versions so this migration is idempotent.
DROP POLICY IF EXISTS "tf_realtime_authenticated_self_topic" ON realtime.messages;
DROP POLICY IF EXISTS "tf_realtime_admin_all" ON realtime.messages;

-- Authenticated users may only subscribe to topics scoped to their own uid,
-- e.g. topic = 'user:<uuid>' or topic LIKE 'user:<uuid>:%'.
CREATE POLICY "tf_realtime_authenticated_self_topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = 'user:' || auth.uid()::text)
  OR (realtime.topic() LIKE 'user:' || auth.uid()::text || ':%')
);

-- Admins may subscribe to any topic (operational dashboards, alert feeds).
CREATE POLICY "tf_realtime_admin_all"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));