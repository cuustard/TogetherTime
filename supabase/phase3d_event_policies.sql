-- Phase 3D: shared timeline event policies
-- Run this in Supabase SQL Editor if event loading/saving gives permission errors.

create or replace function public.is_timeline_member(target_timeline_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.timeline_members tm
    where tm.timeline_id = target_timeline_id
      and tm.user_id = auth.uid()
  );
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.events to authenticated;
grant execute on function public.is_timeline_member(uuid) to authenticated;

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
using (
  owner_user_id = auth.uid()
  and public.is_timeline_member(timeline_id)
)
with check (
  owner_user_id = auth.uid()
  and public.is_timeline_member(timeline_id)
);

create policy "Users can delete their own events"
on public.events
for delete
to authenticated
using (
  owner_user_id = auth.uid()
  and public.is_timeline_member(timeline_id)
);
