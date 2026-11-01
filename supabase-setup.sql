create table if not exists public.repair_requests (
  ticket_id text primary key check (char_length(ticket_id) between 1 and 80),
  source_page text not null check (source_page in ('home.html', 'computer-repair.html')),
  name text not null check (char_length(name) between 1 and 160),
  email text not null check (char_length(email) between 3 and 320),
  phone text not null check (char_length(phone) between 1 and 50),
  issue text not null check (char_length(issue) between 1 and 3000),
  service text check (service is null or char_length(service) <= 120),
  submitted_at timestamptz not null default now(),
  status text not null default 'New'
    check (status in ('New', 'In review', 'Repair in progress', 'Ready for pickup', 'Completed'))
);

alter table public.repair_requests enable row level security;

revoke all on public.repair_requests from anon, authenticated;
grant insert on public.repair_requests to anon;
grant select, delete on public.repair_requests to authenticated;
grant update (status) on public.repair_requests to authenticated;

drop policy if exists "Public can submit requests" on public.repair_requests;
create policy "Public can submit requests"
  on public.repair_requests
  for insert
  to anon
  with check (status = 'New');

drop policy if exists "Signed-in admins can view requests" on public.repair_requests;
create policy "Signed-in admins can view requests"
  on public.repair_requests
  for select
  to authenticated
  using (true);

drop policy if exists "Signed-in admins can update request status" on public.repair_requests;
create policy "Signed-in admins can update request status"
  on public.repair_requests
  for update
  to authenticated
  using (true)
  with check (status in ('New', 'In review', 'Repair in progress', 'Ready for pickup', 'Completed'));

drop policy if exists "Signed-in admins can delete requests" on public.repair_requests;
create policy "Signed-in admins can delete requests"
  on public.repair_requests
  for delete
  to authenticated
  using (true);
