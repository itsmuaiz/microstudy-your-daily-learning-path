REVOKE ALL ON FUNCTION public.is_group_member(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.shares_group_with(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_group_with(uuid, uuid) TO authenticated;