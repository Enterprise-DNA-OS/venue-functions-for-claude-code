create table customers (
 id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name))>0), email text not null default '', phone text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table rooms (
 id uuid primary key default gen_random_uuid(), name text not null unique, capacity integer not null check(capacity>0), timezone text not null default 'Pacific/Auckland', country text not null check(country in ('NZ','AU')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table events (
 id uuid primary key default gen_random_uuid(), name text not null, customer_id uuid not null references customers(id),
 status text not null default 'enquiry' check(status in ('enquiry','tentative','confirmed','completed','cancelled')),
 guests integer not null check(guests>0), currency text not null check(currency in ('NZD','AUD')), agreed_cents integer not null default 0 check(agreed_cents>=0),
 deposit_cents integer not null default 0 check(deposit_cents>=0 and deposit_cents<=agreed_cents), deposit_due date, balance_due date,
 last_contact_at timestamptz not null default now(), final_numbers_due date, numbers_confirmed boolean not null default false,
 dietary_notes text not null default '', dietary_reviewed boolean not null default false, alcohol boolean not null default false,
 licence_evidence text not null default '', duty_manager text not null default '', host_plan text not null default '',
 food_water_confirmed boolean not null default false, alternatives_confirmed boolean not null default false, transport_confirmed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table sessions (
 id uuid primary key default gen_random_uuid(), name text not null, event_id uuid not null references events(id), room_id uuid not null references rooms(id),
 starts_at timestamptz not null, ends_at timestamptz not null, setup_minutes integer not null default 0 check(setup_minutes>=0), clear_minutes integer not null default 0 check(clear_minutes>=0),
 check(ends_at>starts_at), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index sessions_room_time on sessions(room_id, starts_at, ends_at);
create table items (
 id uuid primary key default gen_random_uuid(), name text not null, event_id uuid not null references events(id),
 kind text not null check(kind in ('food','beverage','room','equipment','other')), quantity integer not null check(quantity>0), unit_cents integer not null check(unit_cents>=0), cost_cents integer not null default 0 check(cost_cents>=0),
 allergens text not null default '', allergen_verified boolean not null default false, service_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table receipts (
 id uuid primary key default gen_random_uuid(), name text not null unique, event_id uuid not null references events(id), amount_cents integer not null check(amount_cents>0), received_at timestamptz not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table staff (
 id uuid primary key default gen_random_uuid(), name text not null, role text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table shifts (
 id uuid primary key default gen_random_uuid(), name text not null, event_id uuid not null references events(id), staff_id uuid not null references staff(id),
 starts_at timestamptz not null, ends_at timestamptz not null, check(ends_at>starts_at),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table tasks (
 id uuid primary key default gen_random_uuid(), name text not null, event_id uuid not null references events(id), owner text not null, due_at timestamptz not null, done boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table notes (
 id uuid primary key default gen_random_uuid(), name text not null, event_id uuid not null references events(id), occurred_at timestamptz not null default now(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table audit (
 id uuid primary key default gen_random_uuid(), entity text not null, record_id uuid not null, operation text not null, before_row jsonb, after_row jsonb, created_at timestamptz not null default now()
);
create table import_rows (
 id uuid primary key default gen_random_uuid(), entity text not null, source_id text not null, record_id uuid not null, raw_row jsonb not null, mapping jsonb not null, fingerprint text not null, created_at timestamptz not null default now(), unique(entity,source_id)
);
create function stamp() returns trigger language plpgsql as $$ begin new.updated_at=clock_timestamp(); return new; end $$;
create function audit_write() returns trigger language plpgsql as $$ begin
 insert into audit(entity,record_id,operation,before_row,after_row) values(TG_TABLE_NAME,coalesce(new.id,old.id),TG_OP,to_jsonb(old),to_jsonb(new)); return coalesce(new,old); end $$;
do $$ declare t text; begin foreach t in array array['customers','rooms','events','sessions','items','receipts','staff','shifts','tasks','notes'] loop
 execute format('create trigger stamp before update on %I for each row execute function stamp()',t);
 execute format('create trigger audit_write after insert or update or delete on %I for each row execute function audit_write()',t);
 end loop; end $$;
create view event_money as
 select e.id,e.name,e.status,e.currency,e.agreed_cents,e.deposit_cents,e.deposit_due,e.balance_due,
 coalesce((select sum(amount_cents) from receipts where event_id=e.id),0)::bigint received_cents,
 (e.agreed_cents-coalesce((select sum(amount_cents) from receipts where event_id=e.id),0))::bigint balance_cents,
 greatest(0,e.deposit_cents-coalesce((select sum(amount_cents) from receipts where event_id=e.id),0))::bigint deposit_outstanding_cents,
 coalesce((select sum(quantity::bigint*unit_cents) from items where event_id=e.id),0)::bigint item_sales_cents,
 coalesce((select sum(quantity::bigint*cost_cents) from items where event_id=e.id),0)::bigint item_cost_cents,
 (e.agreed_cents-coalesce((select sum(quantity::bigint*cost_cents) from items where event_id=e.id),0))::bigint estimated_contribution_cents
 from events e;
create view function_diary as
 select s.id,s.event_id,e.name event,s.name session,r.name room,e.status,e.guests,r.capacity,r.timezone,r.country,
 s.starts_at,s.ends_at,to_char(s.starts_at at time zone r.timezone,'YYYY-MM-DD HH24:MI') local_start,
 to_char(s.ends_at at time zone r.timezone,'YYYY-MM-DD HH24:MI') local_end,
 s.starts_at-make_interval(mins=>s.setup_minutes) occupied_from,s.ends_at+make_interval(mins=>s.clear_minutes) occupied_until,
 s.room_id from sessions s join events e on e.id=s.event_id join rooms r on r.id=s.room_id;
create view room_clashes as
 select a.event,a.session,a.room,a.local_start,b.event other_event,b.session other_session,b.local_start other_start,a.timezone
 from function_diary a join function_diary b on a.room_id=b.room_id and a.id<b.id
 and a.occupied_from<b.occupied_until and b.occupied_from<a.occupied_until
 where a.status in ('tentative','confirmed') and b.status in ('tentative','confirmed');
create view kitchen_handover as
 select e.id event_id,e.name event,e.status,e.guests,e.numbers_confirmed,e.dietary_notes,e.dietary_reviewed,i.name item,i.quantity,i.allergens,i.allergen_verified,i.service_at
 from events e join items i on i.event_id=e.id where i.kind='food' and e.status in ('tentative','confirmed');
create view staff_clashes as
 select st.name staff,a.name shift,e.name event,b.name other_shift,f.name other_event,a.starts_at,a.ends_at
 from shifts a join shifts b on a.staff_id=b.staff_id and a.id<b.id and a.starts_at<b.ends_at and b.starts_at<a.ends_at
 join staff st on st.id=a.staff_id join events e on e.id=a.event_id join events f on f.id=b.event_id
 where e.status in ('tentative','confirmed') and f.status in ('tentative','confirmed');
