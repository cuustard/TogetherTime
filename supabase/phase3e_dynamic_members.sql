-- Together Time Phase 3E: dynamic timeline members
-- Run this in Supabase SQL Editor before using the dynamic member UI.

create or replace function public.get_timeline_member_profiles(target_timeline_id uuid)
returns table (
  user_id uuid,
  display_name text,
  home_timezone text,
  role text,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    tm.user_id,
    p.display_name,
    p.home_timezone,
    tm.role,
    tm.joined_at
  from public.timeline_members tm
  join public.profiles p on p.id = tm.user_id
  where tm.timeline_id = target_timeline_id
    and (
      public.is_timeline_member(target_timeline_id)
      or public.is_timeline_creator(target_timeline_id)
    )
  order by tm.joined_at asc;
$$;

grant execute on function public.get_timeline_member_profiles(uuid) to authenticated;

-- Optional safety for the couple product model: keep timelines to two members.
create or replace function public.join_timeline_by_invite_code(raw_invite_code text)
returns public.timelines
language plpgsql
security definer
set search_path = public
as $$
declare
  target_timeline public.timelines;
  existing_count integer;
begin
  select *
  into target_timeline
  from public.timelines
  where invite_code = upper(regexp_replace(trim(raw_invite_code), '[^A-Z0-9]', '', 'g'));

  if target_timeline.id is null then
    raise exception 'Invite code not found';
  end if;

  select count(*)
  into existing_count
  from public.timeline_members
  where timeline_id = target_timeline.id;

  if existing_count >= 2 and not exists (
    select 1
    from public.timeline_members
    where timeline_id = target_timeline.id
      and user_id = auth.uid()
  ) then
    raise exception 'This timeline already has two members';
  end if;

  insert into public.timeline_members (timeline_id, user_id, role)
  values (target_timeline.id, auth.uid(), 'member')
  on conflict (timeline_id, user_id) do nothing;

  return target_timeline;
end;
$$;

grant execute on function public.join_timeline_by_invite_code(text) to authenticated;
