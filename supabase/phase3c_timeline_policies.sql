-- Together Time Phase 3C: timeline membership policies + invite-code join function
-- Run this in Supabase SQL Editor before using the create/join timeline UI.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.timelines to authenticated;
grant select, insert, update, delete on table public.timeline_members to authenticated;
grant select, insert, update, delete on table public.events to authenticated;

create or replace function public.is_timeline_member(target_timeline_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.timeline_members tm
    where tm.timeline_id = target_timeline_id
      and tm.user_id = auth.uid()
  );
$$;

grant execute on function public.is_timeline_member(uuid) to authenticated;

-- Replace earlier policies with non-recursive versions.
drop policy if exists "Members can view their timelines" on public.timelines;
drop policy if exists "Authenticated users can create timelines" on public.timelines;
drop policy if exists "Timeline creator can update timeline" on public.timelines;

create policy "Members can view their timelines"
on public.timelines
for select
to authenticated
using (public.is_timeline_member(id));

create policy "Authenticated users can create timelines"
on public.timelines
for insert
to authenticated
with check (created_by = auth.uid());

create policy "Timeline creator can update timeline"
on public.timelines
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "Members can view members of their timelines" on public.timeline_members;
drop policy if exists "Users can add themselves to timelines" on public.timeline_members;
drop policy if exists "Users can leave timelines" on public.timeline_members;

create policy "Users can view their own memberships"
on public.timeline_members
for select
to authenticated
using (user_id = auth.uid() or public.is_timeline_member(timeline_id));

create policy "Users can add themselves to timelines"
on public.timeline_members
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can leave timelines"
on public.timeline_members
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Members can view timeline events" on public.events;
drop policy if exists "Members can create their own events" on public.events;
drop policy if exists "Users can update their own events" on public.events;
drop policy if exists "Users can delete their own events" on public.events;

create policy "Members can view timeline events"
on public.events
for select
to authenticated
using (public.is_timeline_member(timeline_id));

create policy "Members can create their own events"
on public.events
for insert
to authenticated
with check (
  owner_user_id = auth.uid()
  and public.is_timeline_member(timeline_id)
);

create policy "Users can update their own events"
on public.events
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid() and public.is_timeline_member(timeline_id));

create policy "Users can delete their own events"
on public.events
for delete
to authenticated
using (owner_user_id = auth.uid());

create or replace function public.join_timeline_by_invite_code(raw_invite_code text)
returns public.timelines
language plpgsql
security definer
set search_path = public
as $$
declare
  target_timeline public.timelines;
begin
  select *
  into target_timeline
  from public.timelines
  where invite_code = upper(regexp_replace(trim(raw_invite_code), '[^A-Z0-9]', '', 'g'));

  if target_timeline.id is null then
    raise exception 'Invite code not found';
  end if;

  insert into public.timeline_members (timeline_id, user_id, role)
  values (target_timeline.id, auth.uid(), 'member')
  on conflict (timeline_id, user_id) do nothing;

  return target_timeline;
end;
$$;

grant execute on function public.join_timeline_by_invite_code(text) to authenticated;
