-- =====================================================================

-- Maintaino · database schema

-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query

-- Safe to re-run on an empty project. Do not re-run on a project with data.

-- =====================================================================


 

-- ---------------------------------------------------------------------

-- 1. Helper functions (plpgsql so they can be created before the tables)

--    SECURITY DEFINER lets policies look up the caller's membership

--    without recursing into row level security.

-- ---------------------------------------------------------------------

create or replace function public.my_apartment_id() returns uuid

language plpgsql stable security definer set search_path = public as $$

declare v uuid;

begin

  select apartment_id into v from public.members

   where user_id = auth.uid() and state <> 'Archived' limit 1;

  return v;

end $$;


 

create or replace function public.my_house_id() returns uuid

language plpgsql stable security definer set search_path = public as $$

declare v uuid;

begin

  select house_id into v from public.members

   where user_id = auth.uid() and state <> 'Archived' limit 1;

  return v;

end $$;


 

create or replace function public.is_admin() returns boolean

language plpgsql stable security definer set search_path = public as $$

declare v boolean;

begin

  select exists (

    select 1 from public.members m

    join public.apartments a on a.id = m.apartment_id

    where m.user_id = auth.uid() and m.state <> 'Archived' and a.admin_house_id = m.house_id

  ) into v;

  return coalesce(v, false);

end $$;


 

-- ---------------------------------------------------------------------

-- 2. Tables. Nothing is ever hard-deleted: rows move Active → Edited → Archived.

-- ---------------------------------------------------------------------

create table public.apartments (

  id             uuid primary key default gen_random_uuid(),

  name           text not null,

  city           text,

  upi            text,

  admin_house_id uuid,                        -- FK added below (circular with houses)

  current_month  text not null,               -- 'YYYY-MM'

  created_at     timestamptz not null default now()

);


 

create table public.houses (

  id           uuid primary key default gen_random_uuid(),

  apartment_id uuid not null default public.my_apartment_id() references public.apartments(id) on delete cascade,

  name         text not null,

  number       text not null,

  state        text not null default 'Active' check (state in ('Active','Edited','Archived')),

  created_at   timestamptz not null default now()

);

alter table public.apartments

  add constraint apartments_admin_house_fk foreign key (admin_house_id) references public.houses(id);


 

-- Admin schedule: any house can be Admin for any number of months. No fixed rotation order.

create table public.admin_terms (

  id           uuid primary key default gen_random_uuid(),

  apartment_id uuid not null default public.my_apartment_id() references public.apartments(id) on delete cascade,

  house_id     uuid not null references public.houses(id),

  start_ym     text not null,                 -- first month of the term, 'YYYY-MM'

  months       int  not null check (months between 1 and 24),

  state        text not null default 'Active' check (state in ('Active','Edited','Archived')),

  created_at   timestamptz not null default now()

);


 

create or replace function public.ym_idx(t text) returns int

language sql immutable as $$ select substr(t, 1, 4)::int * 12 + substr(t, 6, 2)::int - 1 $$;


 

create or replace function public.ym_add(t text, n int) returns text

language sql immutable as $$ select to_char((t || '-01')::date + make_interval(months => n), 'YYYY-MM') $$;


 

create table public.members (

  id           uuid primary key default gen_random_uuid(),

  apartment_id uuid not null default public.my_apartment_id() references public.apartments(id) on delete cascade,

  house_id     uuid not null references public.houses(id),

  user_id      uuid unique references auth.users(id) on delete set null,

  name         text not null,

  role         text not null default 'Family Member' check (role in ('Owner','Family Member','Tenant')),

  mobile       text,

  email        text,

  state        text not null default 'Active' check (state in ('Active','Edited','Archived')),

  created_at   timestamptz not null default now()

);

create unique index members_email_unique on public.members (apartment_id, lower(email))

  where email is not null and state <> 'Archived';


 

create table public.months (

  id           uuid primary key default gen_random_uuid(),

  apartment_id uuid not null default public.my_apartment_id() references public.apartments(id) on delete cascade,

  ym           text not null,

  opening      numeric not null default 0,

  due          numeric not null default 0,    -- maintenance per house for this month

  created_at   timestamptz not null default now(),

  unique (apartment_id, ym)

);


 

create table public.payments (

  id           uuid primary key default gen_random_uuid(),

  apartment_id uuid not null default public.my_apartment_id() references public.apartments(id) on delete cascade,

  house_id     uuid not null references public.houses(id),

  ym           text not null,

  amount       numeric not null check (amount > 0),

  paid_on      date not null,

  mode         text not null default 'UPI',

  receipt      text,                          -- storage path in the 'receipts' bucket

  status       text not null default 'Awaiting' check (status in ('Confirmed','Awaiting','Rejected')),

  state        text not null default 'Active' check (state in ('Active','Edited','Archived')),

  created_by   uuid default auth.uid(),

  created_at   timestamptz not null default now()

);


 

create table public.expenses (

  id           uuid primary key default gen_random_uuid(),

  apartment_id uuid not null default public.my_apartment_id() references public.apartments(id) on delete cascade,

  spent_on     date not null,

  category     text not null,

  description  text not null,

  amount       numeric not null check (amount > 0),

  vendor       text,

  receipt      text,

  house_id     uuid references public.houses(id),   -- house that was Admin when added

  state        text not null default 'Active' check (state in ('Active','Edited','Archived')),

  edits        jsonb not null default '[]'::jsonb,

  created_at   timestamptz not null default now()

);


 

create table public.notices (

  id              uuid primary key default gen_random_uuid(),

  apartment_id    uuid not null default public.my_apartment_id() references public.apartments(id) on delete cascade,

  type            text not null,

  title           text not null,

  description     text not null,

  start_date      date not null,

  expiry_date     date not null,

  created_by_name text,

  pinned          boolean not null default false,

  state           text not null default 'Active' check (state in ('Active','Edited','Archived')),

  created_at      timestamptz not null default now()

);


 

create table public.complaints (

  id           uuid primary key default gen_random_uuid(),

  apartment_id uuid not null default public.my_apartment_id() references public.apartments(id) on delete cascade,

  category     text not null,

  title        text not null,

  description  text not null,

  photo        text,

  house_id     uuid not null references public.houses(id),

  by_name      text,

  created_on   date not null,

  status       text not null default 'Open' check (status in ('Open','In Progress','Resolved','Closed')),

  state        text not null default 'Active' check (state in ('Active','Edited','Archived')),

  events       jsonb not null default '[]'::jsonb,   -- timeline

  created_at   timestamptz not null default now()

);


 

create table public.work_requests (

  id               uuid primary key default gen_random_uuid(),

  apartment_id     uuid not null default public.my_apartment_id() references public.apartments(id) on delete cascade,

  title            text not null,

  description      text,

  estimate         numeric not null check (estimate > 0),

  vendor           text,

  quotation        text,

  due_date         date,

  created_by_house text,

  created_on       date not null,

  state            text not null default 'Active' check (state in ('Active','Edited','Archived')),

  created_at       timestamptz not null default now()

);


 

create table public.votes (

  id           uuid primary key default gen_random_uuid(),

  apartment_id uuid not null default public.my_apartment_id() references public.apartments(id) on delete cascade,

  work_id      uuid not null references public.work_requests(id),

  house_id     uuid not null references public.houses(id),

  vote         text not null check (vote in ('Approve','Reject')),

  comment      text not null default '',

  voted_on     date not null,

  by_name      text,

  state        text not null default 'Active' check (state in ('Active','Edited','Archived')),

  created_at   timestamptz not null default now(),

  unique (work_id, house_id)                  -- one vote per house

);


 

create table public.vendors (

  id           uuid primary key default gen_random_uuid(),

  apartment_id uuid not null default public.my_apartment_id() references public.apartments(id) on delete cascade,

  name         text not null,

  phone        text not null,

  category     text not null,

  notes        text,

  state        text not null default 'Active' check (state in ('Active','Edited','Archived')),

  created_at   timestamptz not null default now()

);


 

create table public.reviews (                 -- "Reviewed financial report" acknowledgements

  id           uuid primary key default gen_random_uuid(),

  apartment_id uuid not null default public.my_apartment_id() references public.apartments(id) on delete cascade,

  ym           text not null,

  house_id     uuid not null references public.houses(id),

  member_name  text,

  reviewed_on  date not null,

  created_at   timestamptz not null default now(),

  unique (apartment_id, ym, house_id)

);


 

create table public.transfers (               -- permanent Admin hand-over record

  id              uuid primary key default gen_random_uuid(),

  apartment_id    uuid not null default public.my_apartment_id() references public.apartments(id) on delete cascade,

  from_house      uuid references public.houses(id),

  to_house        uuid references public.houses(id),

  ym              text not null,            -- month that was closed

  closing_balance numeric not null default 0,

  notes           text,

  transferred_on  date not null default (timezone('Asia/Kolkata', now()))::date,

  created_at      timestamptz not null default now()

);


 

create table public.audit_log (               -- append-only

  id           uuid primary key default gen_random_uuid(),

  apartment_id uuid not null default public.my_apartment_id() references public.apartments(id) on delete cascade,

  ts           timestamptz not null default now(),

  kind         text not null default 'admin',

  message      text not null,

  by_name      text not null default 'System',

  actor_id     uuid

);


 

create index on public.payments (apartment_id, ym);

create index on public.expenses (apartment_id, spent_on);

create index on public.audit_log (apartment_id, ts desc);

create index on public.members (lower(email));


 

-- ---------------------------------------------------------------------

-- 3. Audit log protection

-- ---------------------------------------------------------------------

-- The server decides who did it and when, so a client cannot forge either.

create or replace function public.audit_before_insert() returns trigger

language plpgsql security definer set search_path = public as $$

begin

  if coalesce(current_setting('app.restoring', true), '') = '1' then

    return new;                              -- restoring a backup keeps original values

  end if;

  new.ts := now();

  new.actor_id := auth.uid();

  if auth.uid() is not null then

    select m.name || ' · ' || h.name into new.by_name

      from public.members m join public.houses h on h.id = m.house_id

     where m.user_id = auth.uid() and m.state <> 'Archived' limit 1;

  end if;

  return new;

end $$;

create trigger audit_before_insert before insert on public.audit_log

  for each row execute function public.audit_before_insert();


 

create or replace function public.audit_immutable() returns trigger

language plpgsql as $$

begin raise exception 'The audit log is permanent and cannot be changed or deleted'; end $$;

create trigger audit_no_update before update or delete on public.audit_log

  for each row execute function public.audit_immutable();


 

-- ---------------------------------------------------------------------

-- 4. Row level security

-- ---------------------------------------------------------------------

do $$

declare t text;

begin

  foreach t in array array['apartments','houses','admin_terms','members','months','payments','expenses','notices',

                           'complaints','work_requests','votes','vendors','reviews','transfers','audit_log']

  loop

    execute format('alter table public.%I enable row level security', t);

  end loop;

end $$;


 

-- Everyone in the apartment can read everything (transparency).

create policy apartments_select on public.apartments for select to authenticated using (id = public.my_apartment_id());

do $$

declare t text;

begin

  foreach t in array array['houses','admin_terms','members','months','payments','expenses','notices',

                           'complaints','work_requests','votes','vendors','reviews','transfers','audit_log']

  loop

    execute format('create policy %I on public.%I for select to authenticated using (apartment_id = public.my_apartment_id())', t || '_select', t);

  end loop;

end $$;


 

-- Admin-only writes. (admin_terms and months change only through the functions in section 5.)

do $$

declare t text;

begin

  foreach t in array array['houses','members','expenses','notices','work_requests','vendors']

  loop

    execute format('create policy %I on public.%I for insert to authenticated with check (apartment_id = public.my_apartment_id() and public.is_admin())', t || '_admin_insert', t);

    execute format('create policy %I on public.%I for update to authenticated using (apartment_id = public.my_apartment_id() and public.is_admin()) with check (apartment_id = public.my_apartment_id() and public.is_admin())', t || '_admin_update', t);

  end loop;

end $$;


 

-- Payments: a house can submit proof for itself (Awaiting). Only the Admin can confirm.

create policy payments_insert on public.payments for insert to authenticated

  with check (apartment_id = public.my_apartment_id() and (

    public.is_admin() or (house_id = public.my_house_id() and status = 'Awaiting' and state = 'Active')));

create policy payments_admin_update on public.payments for update to authenticated

  using (apartment_id = public.my_apartment_id() and public.is_admin())

  with check (apartment_id = public.my_apartment_id() and public.is_admin());


 

-- Complaints: any member raises one for their own house. Status changes go through add_complaint_event().

create policy complaints_insert on public.complaints for insert to authenticated

  with check (apartment_id = public.my_apartment_id() and house_id = public.my_house_id() and status = 'Open');


 

-- Votes: one per house, your own house only.

create policy votes_insert on public.votes for insert to authenticated

  with check (apartment_id = public.my_apartment_id() and house_id = public.my_house_id());

create policy votes_update on public.votes for update to authenticated

  using (apartment_id = public.my_apartment_id() and house_id = public.my_house_id())

  with check (apartment_id = public.my_apartment_id() and house_id = public.my_house_id());


 

-- Reviews: your own house only.

create policy reviews_insert on public.reviews for insert to authenticated

  with check (apartment_id = public.my_apartment_id() and house_id = public.my_house_id());


 

-- Audit log: members may append. Nobody may update or delete (no policy + trigger above).

create policy audit_insert on public.audit_log for insert to authenticated

  with check (apartment_id = public.my_apartment_id());


 

-- No delete policy exists on any table, so hard deletes are impossible through the API.

revoke all on all tables in schema public from anon;

revoke delete on all tables in schema public from authenticated;

revoke truncate on all tables in schema public from authenticated;


 

-- ---------------------------------------------------------------------

-- 5. Functions the app calls (RPC)

-- ---------------------------------------------------------------------


 

-- Links a signed-in, email-verified user to the member row the Admin created for that email.

create or replace function public.claim_member() returns void

language plpgsql security definer set search_path = public as $$

declare v_email text; v_confirmed timestamptz; v_id uuid;

begin

  if auth.uid() is null then return; end if;

  select email, email_confirmed_at into v_email, v_confirmed from auth.users where id = auth.uid();

  if v_email is null or v_confirmed is null then return; end if;

  if exists (select 1 from public.members where user_id = auth.uid()) then return; end if;

  select id into v_id from public.members

   where user_id is null and state <> 'Archived' and lower(email) = lower(v_email)

   order by created_at limit 1;

  if v_id is not null then update public.members set user_id = auth.uid() where id = v_id; end if;

end $$;


 

-- First-time setup: creates the apartment and its houses, and makes the caller the first Admin

-- for p_my_months months. p_houses = [{"name":"House A","number":"A-101"}, ...]

create or replace function public.create_apartment(

  p_name text, p_city text, p_upi text, p_due numeric, p_opening numeric,

  p_houses jsonb, p_my_house int, p_my_months int, p_my_name text, p_my_mobile text

) returns uuid

language plpgsql security definer set search_path = public as $$

declare

  v_uid uuid := auth.uid(); v_email text; v_apt uuid; v_month text;

  v_n int := coalesce(jsonb_array_length(p_houses), 0);

  v_ids uuid[] := '{}'; v_id uuid; i int; v_my_name text; v_term int := greatest(1, least(coalesce(p_my_months, 1), 24));

begin

  if v_uid is null then raise exception 'Please sign in first'; end if;

  if exists (select 1 from public.members where user_id = v_uid) then raise exception 'You already belong to an apartment'; end if;

  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_my_name), '') = '' then raise exception 'Apartment name and your name are required'; end if;

  if v_n < 2 or v_n > 30 then raise exception 'Add between 2 and 30 houses'; end if;

  if p_my_house < 1 or p_my_house > v_n then raise exception 'Choose which house is yours'; end if;

  if p_due is null or p_due <= 0 then raise exception 'Monthly maintenance must be more than zero'; end if;


 

  select email into v_email from auth.users where id = v_uid;

  v_month := to_char(timezone('Asia/Kolkata', now()), 'YYYY-MM');


 

  insert into public.apartments (name, city, upi, current_month)

  values (trim(p_name), nullif(trim(p_city), ''), nullif(trim(p_upi), ''), v_month)

  returning id into v_apt;


 

  for i in 1..v_n loop

    insert into public.houses (apartment_id, name, number)

    values (v_apt, trim(p_houses -> (i - 1) ->> 'name'),

            coalesce(nullif(trim(p_houses -> (i - 1) ->> 'number'), ''), trim(p_houses -> (i - 1) ->> 'name')))

    returning id into v_id;

    v_ids := v_ids || v_id;

  end loop;


 

  update public.apartments set admin_house_id = v_ids[p_my_house] where id = v_apt;

  insert into public.admin_terms (apartment_id, house_id, start_ym, months) values (v_apt, v_ids[p_my_house], v_month, v_term);

  insert into public.months (apartment_id, ym, opening, due) values (v_apt, v_month, coalesce(p_opening, 0), p_due);

  insert into public.members (apartment_id, house_id, user_id, name, role, mobile, email)

  values (v_apt, v_ids[p_my_house], v_uid, trim(p_my_name), 'Owner', nullif(trim(p_my_mobile), ''), v_email);


 

  select name into v_my_name from public.houses where id = v_ids[p_my_house];

  insert into public.audit_log (apartment_id, kind, message)

  values (v_apt, 'admin', v_my_name || ' became Admin for ' || v_term || ' month(s) from ' || v_month || '. Apartment set up with ' || v_n || ' houses.');

  return v_apt;

end $$;


 

-- Internal: closes the current month, carries the balance forward, and applies the Admin schedule.

-- If p_next_house is given, that house becomes Admin from next month for p_next_months months

-- (this ends the running term early). Not callable from the app directly.

create or replace function public._close_month(p_apt uuid, p_notes text, p_next_house uuid, p_next_months int) returns void

language plpgsql security definer set search_path = public as $$

declare

  a public.apartments%rowtype;

  v_open numeric; v_due numeric; v_coll numeric; v_exp numeric; v_close numeric;

  v_next text; v_new_admin uuid; v_months int; v_term_months int;

  v_from_name text; v_to_name text;

begin

  select * into a from public.apartments where id = p_apt for update;

  if not found then raise exception 'Apartment not found'; end if;


 

  select coalesce(opening, 0), coalesce(due, 0) into v_open, v_due from public.months where apartment_id = p_apt and ym = a.current_month;

  select coalesce(sum(amount), 0) into v_coll from public.payments

   where apartment_id = p_apt and ym = a.current_month and status = 'Confirmed' and state <> 'Archived';

  select coalesce(sum(amount), 0) into v_exp from public.expenses

   where apartment_id = p_apt and to_char(spent_on, 'YYYY-MM') = a.current_month and state <> 'Archived';

  v_close := coalesce(v_open, 0) + v_coll - v_exp;

  v_next := public.ym_add(a.current_month, 1);


 

  if p_next_house is not null then

    if not exists (select 1 from public.houses where id = p_next_house and apartment_id = p_apt and state <> 'Archived') then

      raise exception 'Choose a valid house';

    end if;

    v_months := greatest(1, least(coalesce(p_next_months, 1), 24));

    -- the running term now ends with the month being closed

    update public.admin_terms set months = public.ym_idx(v_next) - public.ym_idx(start_ym)

     where apartment_id = p_apt and state <> 'Archived'

       and public.ym_idx(start_ym) <= public.ym_idx(a.current_month)

       and public.ym_idx(start_ym) + months > public.ym_idx(v_next);

    -- planned terms inside the new window are replaced

    update public.admin_terms set state = 'Archived'

     where apartment_id = p_apt and state <> 'Archived'

       and public.ym_idx(start_ym) >= public.ym_idx(v_next)

       and public.ym_idx(start_ym) < public.ym_idx(v_next) + v_months;

    insert into public.admin_terms (apartment_id, house_id, start_ym, months) values (p_apt, p_next_house, v_next, v_months);

  end if;


 

  select house_id, months into v_new_admin, v_term_months from public.admin_terms

   where apartment_id = p_apt and state <> 'Archived'

     and public.ym_idx(start_ym) <= public.ym_idx(v_next) and public.ym_idx(v_next) < public.ym_idx(start_ym) + months

   order by public.ym_idx(start_ym) desc limit 1;

  v_new_admin := coalesce(v_new_admin, a.admin_house_id);   -- nothing planned: current Admin stays on


 

  select name into v_from_name from public.houses where id = a.admin_house_id;

  select name into v_to_name from public.houses where id = v_new_admin;


 

  insert into public.transfers (apartment_id, from_house, to_house, ym, closing_balance, notes)

  values (p_apt, a.admin_house_id, v_new_admin, a.current_month, v_close, p_notes);

  insert into public.months (apartment_id, ym, opening, due)

  values (p_apt, v_next, v_close, coalesce(v_due, 0)) on conflict (apartment_id, ym) do nothing;

  update public.apartments set admin_house_id = v_new_admin, current_month = v_next where id = p_apt;


 

  insert into public.audit_log (apartment_id, kind, message)

  values (p_apt, 'admin', 'Month closed: ' || a.current_month || '. Closing balance ₹' || to_char(v_close, 'FM99,99,99,999'));

  if v_new_admin is distinct from a.admin_house_id then

    insert into public.audit_log (apartment_id, kind, message)

    values (p_apt, 'admin', 'Admin changed from ' || coalesce(v_from_name, '—') || ' to ' || v_to_name

            || ' from ' || v_next || coalesce(' for ' || v_term_months || ' month(s)', ''));

  else

    insert into public.audit_log (apartment_id, kind, message)

    values (p_apt, 'admin', v_to_name || ' continues as Admin for ' || v_next);

  end if;

end $$;

revoke all on function public._close_month(uuid, text, uuid, int) from public, anon, authenticated;


 

-- Called by the current Admin from the app.

create or replace function public.close_month(p_notes text, p_next_house uuid default null, p_next_months int default null) returns void

language plpgsql security definer set search_path = public as $$

begin

  if not public.is_admin() then raise exception 'Only the current Admin can close the month'; end if;

  if length(trim(coalesce(p_notes, ''))) < 10 then raise exception 'Please write closing notes (at least 10 characters)'; end if;

  perform public._close_month(public.my_apartment_id(), trim(p_notes), p_next_house, p_next_months);

end $$;


 

-- Plan a future Admin term. It cannot overlap another term.

create or replace function public.add_admin_term(p_house uuid, p_start text, p_months int) returns void

language plpgsql security definer set search_path = public as $$

declare v_apt uuid := public.my_apartment_id(); v_cur text; v_name text;

begin

  if not public.is_admin() then raise exception 'Only the current Admin can plan the next Admin'; end if;

  if p_start !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Choose a valid start month'; end if;

  if p_months is null or p_months < 1 or p_months > 24 then raise exception 'A term can be 1 to 24 months'; end if;

  select current_month into v_cur from public.apartments where id = v_apt;

  if public.ym_idx(p_start) <= public.ym_idx(v_cur) then raise exception 'The new term must start after the current month'; end if;

  select name into v_name from public.houses where id = p_house and apartment_id = v_apt and state <> 'Archived';

  if v_name is null then raise exception 'Choose a valid house'; end if;

  if exists (select 1 from public.admin_terms where apartment_id = v_apt and state <> 'Archived'

              and public.ym_idx(start_ym) < public.ym_idx(p_start) + p_months

              and public.ym_idx(p_start) < public.ym_idx(start_ym) + months) then

    raise exception 'This overlaps another Admin term. Remove that term first or choose a later month.';

  end if;

  insert into public.admin_terms (apartment_id, house_id, start_ym, months) values (v_apt, p_house, p_start, p_months);

  insert into public.audit_log (apartment_id, kind, message)

  values (v_apt, 'admin', 'Admin planned: ' || v_name || ' from ' || p_start || ' for ' || p_months || ' month(s)');

end $$;


 

-- Remove a planned (future) term. Removed terms stay in the database as Archived.

create or replace function public.archive_admin_term(p_id uuid) returns void

language plpgsql security definer set search_path = public as $$

declare v_apt uuid := public.my_apartment_id(); v_cur text; t public.admin_terms%rowtype; v_name text;

begin

  if not public.is_admin() then raise exception 'Only the current Admin can change the schedule'; end if;

  select current_month into v_cur from public.apartments where id = v_apt;

  select * into t from public.admin_terms where id = p_id and apartment_id = v_apt and state <> 'Archived';

  if not found then raise exception 'Term not found'; end if;

  if public.ym_idx(t.start_ym) <= public.ym_idx(v_cur) then raise exception 'Only a planned term can be removed'; end if;

  update public.admin_terms set state = 'Archived' where id = p_id;

  select name into v_name from public.houses where id = t.house_id;

  insert into public.audit_log (apartment_id, kind, message)

  values (v_apt, 'admin', 'Planned Admin removed: ' || v_name || ' from ' || t.start_ym);

end $$;


 

-- Complaint timeline. Admin can set any status. The raising house can close a Resolved complaint.

-- Everyone in the apartment can comment without changing the status.

create or replace function public.add_complaint_event(p_id uuid, p_status text, p_note text) returns void

language plpgsql security definer set search_path = public as $$

declare c public.complaints%rowtype; v_admin boolean := public.is_admin(); v_status text; v_by text;

begin

  select * into c from public.complaints where id = p_id and apartment_id = public.my_apartment_id();

  if not found then raise exception 'Complaint not found'; end if;

  if p_status not in ('Open','In Progress','Resolved','Closed') then raise exception 'Unknown status'; end if;

  v_status := c.status;

  if p_status <> c.status then

    if v_admin then v_status := p_status;

    elsif c.house_id = public.my_house_id() and c.status = 'Resolved' and p_status = 'Closed' then v_status := 'Closed';

    else raise exception 'You cannot change the status of this complaint'; end if;

  end if;

  select m.name || ' · ' || h.name || case when v_admin then ' (Admin)' else '' end into v_by

    from public.members m join public.houses h on h.id = m.house_id

   where m.user_id = auth.uid() and m.state <> 'Archived' limit 1;

  update public.complaints set status = v_status,

    events = events || jsonb_build_array(jsonb_build_object(

      'status', v_status, 'date', to_char(timezone('Asia/Kolkata', now()), 'YYYY-MM-DD'),

      'by', v_by, 'note', left(coalesce(p_note, ''), 1000)))

  where id = p_id;

end $$;


 

-- Restore from a JSON backup made by the app (the "tables" object).

-- Re-inserts missing records and returns edited records to the backed-up version.

-- Never touches the audit log history, the current Admin, or who is linked to which login.

create or replace function public.restore_backup(p jsonb) returns void

language plpgsql security definer set search_path = public as $$

declare t text; v_apt uuid := public.my_apartment_id(); cols text; rows jsonb;

begin

  if not public.is_admin() then raise exception 'Only the current Admin can restore a backup'; end if;

  perform set_config('app.restoring', '1', true);

  foreach t in array array['houses','admin_terms','members','months','payments','expenses','notices','complaints',

                           'work_requests','votes','vendors','reviews','transfers','audit_log']

  loop

    select coalesce(jsonb_agg((e.val - 'user_id') || jsonb_build_object('apartment_id', v_apt)), '[]'::jsonb)

      into rows from jsonb_array_elements(coalesce(p -> t, '[]'::jsonb)) as e(val);

    if t = 'audit_log' then

      execute format('insert into public.%I select * from jsonb_populate_recordset(null::public.%I, $1) on conflict (id) do nothing', t, t) using rows;

    else

      select string_agg(format('%I = excluded.%I', column_name, column_name), ', ') into cols

        from information_schema.columns

       where table_schema = 'public' and table_name = t and column_name not in ('id','apartment_id','user_id','created_at');

      execute format('insert into public.%I as t select * from jsonb_populate_recordset(null::public.%I, $1) on conflict (id) do update set %s where t.apartment_id = excluded.apartment_id', t, t, cols) using rows;

    end if;

  end loop;

end $$;


 

-- Only signed-in users may call these.

revoke all on function public.claim_member() from public, anon;

revoke all on function public.create_apartment(text, text, text, numeric, numeric, jsonb, int, int, text, text) from public, anon;

revoke all on function public.close_month(text, uuid, int) from public, anon;

revoke all on function public.add_admin_term(uuid, text, int) from public, anon;

revoke all on function public.archive_admin_term(uuid) from public, anon;

revoke all on function public.add_complaint_event(uuid, text, text) from public, anon;

revoke all on function public.restore_backup(jsonb) from public, anon;

grant execute on function public.claim_member() to authenticated;

grant execute on function public.create_apartment(text, text, text, numeric, numeric, jsonb, int, int, text, text) to authenticated;

grant execute on function public.close_month(text, uuid, int) to authenticated;

grant execute on function public.add_admin_term(uuid, text, int) to authenticated;

grant execute on function public.archive_admin_term(uuid) to authenticated;

grant execute on function public.add_complaint_event(uuid, text, text) to authenticated;

grant execute on function public.restore_backup(jsonb) to authenticated;

grant execute on function public.my_apartment_id() to authenticated;

grant execute on function public.my_house_id() to authenticated;

grant execute on function public.is_admin() to authenticated;


 

-- ---------------------------------------------------------------------

-- 6. Private file storage for bills, receipts, quotations and photos

--    Files live under  <apartment_id>/<file>  and only that apartment can read them.

-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)

values ('receipts', 'receipts', false, 5242880,

        array['image/jpeg','image/png','image/webp','application/pdf'])

on conflict (id) do nothing;


 

create policy receipts_read on storage.objects for select to authenticated

  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = public.my_apartment_id()::text);

create policy receipts_upload on storage.objects for insert to authenticated

  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = public.my_apartment_id()::text);

-- No update or delete policy: uploaded files are permanent.



 

-- =====================================================================

-- 7. OPTIONAL · Close the month automatically at month end

--    To turn on: enable the pg_cron extension (Dashboard -> Database -> Extensions),

--    then remove the leading "-- " from every line below and run just this block.

--    Every night at 00:00 India time it closes any month that has ended, and applies the

--    Admin schedule (a planned Admin starts, or the current Admin stays on if none is planned).

-- =====================================================================

-- create extension if not exists pg_cron;

--

-- create or replace function public.auto_close_all() returns void

-- language plpgsql security definer set search_path = public as $$

-- declare a record;

-- begin

--   for a in

--     select id from public.apartments

--      where current_month < to_char(timezone('Asia/Kolkata', now()), 'YYYY-MM')

--   loop

--     perform public._close_month(a.id, 'Automatic month close.', null, null);

--   end loop;

-- end $$;

-- revoke all on function public.auto_close_all() from public, anon, authenticated;

--

-- -- 18:30 UTC = 00:00 India time. Closes one month per run if more than one is overdue.

-- select cron.schedule('maintaino-auto-close', '30 18 * * *', $$select public.auto_close_all();$$);


 