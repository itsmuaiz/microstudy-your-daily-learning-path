CREATE OR REPLACE FUNCTION public.join_group_by_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _group_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  SELECT id INTO _group_id FROM public.groups WHERE upper(invite_code) = upper(trim(_code));

  IF _group_id IS NULL THEN
    RAISE EXCEPTION 'Geen groep met deze code gevonden';
  END IF;

  INSERT INTO public.group_members (group_id, user_id)
  VALUES (_group_id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN _group_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_group_by_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.join_group_by_code(text) TO authenticated;