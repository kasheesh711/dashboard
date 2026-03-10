create or replace function public.bootstrap_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_profile_id uuid;
  profile_email text;
begin
  profile_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if auth.uid() is null or profile_email = '' then
    return null;
  end if;

  update profiles
  set auth_user_id = auth.uid()
  where lower(email) = profile_email
    and (auth_user_id is null or auth_user_id = auth.uid())
  returning id into resolved_profile_id;

  return resolved_profile_id;
end;
$$;

grant execute on function public.bootstrap_profile() to authenticated;
