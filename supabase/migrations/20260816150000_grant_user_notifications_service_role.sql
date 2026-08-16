-- Notification server functions use the service role for server-controlled writes.
-- Keep this grant additive; RLS remains enabled for client roles.
grant select, insert, update on table public.user_notifications to service_role;
