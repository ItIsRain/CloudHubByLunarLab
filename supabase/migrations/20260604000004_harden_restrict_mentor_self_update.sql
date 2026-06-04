-- Security hardening for the mentor self-update trigger function:
-- pin search_path (prevents search_path hijacking) and revoke direct RPC
-- EXECUTE. The trigger still fires normally (triggers run as the table owner).
ALTER FUNCTION public.restrict_mentor_self_update() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.restrict_mentor_self_update() FROM anon, authenticated;
