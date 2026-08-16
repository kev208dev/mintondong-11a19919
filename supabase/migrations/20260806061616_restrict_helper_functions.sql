REVOKE EXECUTE ON FUNCTION public.is_club_member(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_club_owner(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_club_member(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_club_owner(UUID) TO authenticated, service_role;;
