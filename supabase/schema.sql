-- Workspace: схема базы данных для Supabase.
-- Запустите целиком в Supabase → SQL Editor → New query → Run.

create extension if not exists "pgcrypto";

-- Сотрудники
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  email text,
  phone text,
  group_name text,                -- отдел / команда
  color text default '#9aa0ab',
  created_at timestamptz default now()
);

-- Мероприятия
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'planned'
    check (status in ('planned','confirmed','done','cancelled')),
  group_name text,                -- тип / клиент / направление
  color text default '#c9ccd2',
  created_at timestamptz default now()
);

-- Тайминг мероприятия: отрезки времени со структурой
create table if not exists event_timing (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  start_time time not null,
  end_time time,
  title text not null,
  structure text,                 -- пункты, каждый с новой строки
  employee_id uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);

-- Задействованные сотрудники
create table if not exists event_employees (
  event_id uuid not null references events(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  role text,
  primary key (event_id, employee_id)
);

-- Оборудование
create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_name text,                -- категория
  description text,
  serial text,
  quantity int not null default 1 check (quantity > 0),
  status text not null default 'ok' check (status in ('ok','repair')),
  created_at timestamptz default now()
);

-- Оборудование на мероприятии
create table if not exists event_equipment (
  event_id uuid not null references events(id) on delete cascade,
  equipment_id uuid not null references equipment(id) on delete cascade,
  qty int not null default 1 check (qty > 0),
  primary key (event_id, equipment_id)
);

-- Ручные блокировки оборудования (ремонт, аренда, личное использование)
create table if not exists equipment_blocks (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references equipment(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz default now()
);

-- Задачи
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  employee_id uuid references employees(id) on delete set null,
  event_id uuid references events(id) on delete cascade,
  status text not null default 'todo' check (status in ('todo','doing','done')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  due_date date,
  group_name text,
  created_at timestamptz default now()
);

create index if not exists idx_tasks_employee on tasks(employee_id);
create index if not exists idx_tasks_event on tasks(event_id);
create index if not exists idx_timing_event on event_timing(event_id);
create index if not exists idx_event_equipment_eq on event_equipment(equipment_id);
create index if not exists idx_blocks_eq on equipment_blocks(equipment_id);

-- Row Level Security: доступ только у вошедших пользователей
do $$
declare t text;
begin
  foreach t in array array[
    'employees','events','event_timing','event_employees',
    'equipment','event_equipment','equipment_blocks','tasks'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth full access" on %I', t);
    execute format(
      'create policy "auth full access" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Realtime: изменения одного сотрудника сразу видны остальным
do $$
declare t text;
begin
  foreach t in array array[
    'employees','events','event_timing','event_employees',
    'equipment','event_equipment','equipment_blocks','tasks'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ===== Обновление 2 (для новых установок; на существующей базе запускайте migration_002.sql) =====
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
