-- Fede Motos: agenda operativa modular (hibrida)

create table if not exists public.agenda_configuracion (
  id integer primary key default 1,
  status text not null default 'activa',
  pause_reason text,
  pause_until timestamptz,
  slot_duration_minutes integer not null default 60,
  min_days_ahead integer not null default 1,
  max_days_ahead integer not null default 30,
  timezone text not null default 'America/Montevideo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agenda_config_singleton_check check (id = 1),
  constraint agenda_config_status_check check (status in ('activa', 'pausada', 'deshabilitada')),
  constraint agenda_config_slot_check check (slot_duration_minutes in (30, 60, 90, 120)),
  constraint agenda_config_window_check check (
    min_days_ahead >= 0 and max_days_ahead >= min_days_ahead and max_days_ahead <= 120
  )
);

insert into public.agenda_configuracion (
  id,
  status,
  slot_duration_minutes,
  min_days_ahead,
  max_days_ahead,
  timezone
)
values (1, 'activa', 60, 1, 30, 'America/Montevideo')
on conflict (id) do nothing;

create table if not exists public.agenda_franjas_semanales (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null,
  enabled boolean not null default true,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agenda_franjas_day_check check (day_of_week between 1 and 7),
  constraint agenda_franjas_time_check check (start_time < end_time)
);

create index if not exists idx_agenda_franjas_day
  on public.agenda_franjas_semanales (day_of_week, enabled);

create table if not exists public.agenda_excepciones (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  tipo text not null,
  hora_desde time not null,
  hora_hasta time not null,
  motivo text,
  created_by text,
  created_at timestamptz not null default now(),
  constraint agenda_excepciones_tipo_check check (tipo in ('bloqueo', 'habilitacion')),
  constraint agenda_excepciones_time_check check (hora_desde < hora_hasta)
);

create index if not exists idx_agenda_excepciones_fecha
  on public.agenda_excepciones (fecha);

insert into public.agenda_franjas_semanales (day_of_week, enabled, start_time, end_time)
select x.day_of_week, true, '09:00'::time, '18:00'::time
from (
  values
    (1),
    (2),
    (3),
    (4),
    (5)
) as x(day_of_week)
where not exists (
  select 1
  from public.agenda_franjas_semanales existing
  where existing.day_of_week = x.day_of_week
    and existing.start_time = '09:00'::time
    and existing.end_time = '18:00'::time
);

alter table public.turnos_taller
  add column if not exists fecha_slot date,
  add column if not exists hora_slot time;

update public.turnos_taller
set
  fecha_slot = (fecha_turno at time zone 'America/Montevideo')::date,
  hora_slot = date_trunc('hour', (fecha_turno at time zone 'America/Montevideo'))::time
where fecha_slot is null or hora_slot is null;

create unique index if not exists uq_turnos_fecha_hora_activos
  on public.turnos_taller (fecha_slot, hora_slot)
  where estado <> 'cancelado';

create index if not exists idx_turnos_fecha_slot_estado
  on public.turnos_taller (fecha_slot, estado);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'agenda_configuracion'
      and column_name = 'updated_at'
  ) then
    drop trigger if exists trg_agenda_config_touch_updated_at on public.agenda_configuracion;
    create trigger trg_agenda_config_touch_updated_at
    before update on public.agenda_configuracion
    for each row execute function public.touch_updated_at();
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'agenda_franjas_semanales'
      and column_name = 'updated_at'
  ) then
    drop trigger if exists trg_agenda_franjas_touch_updated_at on public.agenda_franjas_semanales;
    create trigger trg_agenda_franjas_touch_updated_at
    before update on public.agenda_franjas_semanales
    for each row execute function public.touch_updated_at();
  end if;
end $$;

alter table public.agenda_configuracion enable row level security;
alter table public.agenda_franjas_semanales enable row level security;
alter table public.agenda_excepciones enable row level security;

-- DEUDA SEGURIDAD: politicas abiertas a anon (using/with check = true) en las 3
-- tablas de agenda. La anon key es publica, asi que esto habilita lectura/escritura
-- directa via PostgREST saltando los chequeos admin de la app. Cerrar (filtrar por
-- owner/rol o revocar anon) antes de exponer el backend a trafico no confiable.
-- Politica temporal mientras se cierra hardening de service role / RLS.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'agenda_configuracion'
      and policyname = 'agenda_config_anon_all'
  ) then
    create policy agenda_config_anon_all
      on public.agenda_configuracion
      for all
      to anon
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'agenda_franjas_semanales'
      and policyname = 'agenda_weekly_anon_all'
  ) then
    create policy agenda_weekly_anon_all
      on public.agenda_franjas_semanales
      for all
      to anon
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'agenda_excepciones'
      and policyname = 'agenda_excepciones_anon_all'
  ) then
    create policy agenda_excepciones_anon_all
      on public.agenda_excepciones
      for all
      to anon
      using (true)
      with check (true);
  end if;
end $$;
