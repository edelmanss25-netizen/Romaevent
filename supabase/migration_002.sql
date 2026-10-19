-- Обновление 2: несколько сотрудников на отрезок тайминга + раздел «Костюмы».
-- Запустите в Supabase → SQL Editor → New query → Run. Можно запускать повторно.

-- 1. Сотрудники на отрезке тайминга (много-ко-многим)
create table if not exists event_timing_employees (
  timing_id uuid not null references event_timing(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  primary key (timing_id, employee_id)
);

-- переносим ранее назначенных ответственных
insert into event_timing_employees (timing_id, employee_id)
select id, employee_id from event_timing where employee_id is not null
on conflict do nothing;

-- 2. Костюмы
create table if not exists costumes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_name text,                -- категория
  size text,
  description text,
  quantity int not null default 1 check (quantity > 0),
  status text not null default 'ok' check (status in ('ok','cleaning','repair')),
  created_at timestamptz default now()
);

create table if not exists event_costumes (
  event_id uuid not null references events(id) on delete cascade,
  costume_id uuid not null references costumes(id) on delete cascade,
  qty int not null default 1 check (qty > 0),
  note text,                      -- кому / комментарий
  primary key (event_id, costume_id)
);

create table if not exists costume_blocks (
  id uuid primary key default gen_random_uuid(),
  costume_id uuid not null references costumes(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz default now()
);

create index if not exists idx_tte_timing on event_timing_employees(timing_id);
create index if not exists idx_event_costumes_c on event_costumes(costume_id);
create index if not exists idx_costume_blocks_c on costume_blocks(costume_id);

-- 3. Права и realtime
do $$
declare t text;
begin
  foreach t in array array['event_timing_employees','costumes','event_costumes','costume_blocks'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth full access" on %I', t);
    execute format(
      'create policy "auth full access" on %I for all to authenticated using (true) with check (true)', t);
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
