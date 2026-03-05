-- Fede Motos: esquema base de dominio
-- Ejecutar con rol admin/service role.

create extension if not exists pgcrypto;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  telefono text not null unique,
  email text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clientes_telefono_len check (char_length(telefono) >= 6)
);

create table if not exists public.vehiculos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  marca text not null,
  modelo text not null,
  kilometraje_historico integer not null default 0,
  created_at timestamptz not null default now(),
  constraint vehiculos_km_non_negative check (kilometraje_historico >= 0),
  constraint vehiculos_unique_cliente_moto unique (cliente_id, marca, modelo)
);

create table if not exists public.membresias (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  plan text not null default 'basico',
  estado text not null default 'pendiente',
  auxilios_restantes integer not null default 3,
  fecha_inicio date not null default current_date,
  fecha_fin date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membresias_plan_check check (plan in ('basico', 'premium')),
  constraint membresias_estado_check check (estado in ('activo', 'pendiente', 'inactivo')),
  constraint membresias_auxilios_non_negative check (auxilios_restantes >= 0)
);

create unique index if not exists membresias_cliente_unique
  on public.membresias (cliente_id);

create table if not exists public.auxilios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  vehiculo_id uuid references public.vehiculos(id) on delete set null,
  latitud numeric(10, 7) not null,
  longitud numeric(10, 7) not null,
  descripcion_problema text,
  estado text not null default 'pendiente',
  solicitado_en timestamptz not null default now(),
  completado_en timestamptz,
  constraint auxilios_estado_check check (estado in ('pendiente', 'en_camino', 'completado')),
  constraint auxilios_latitud_range check (latitud between -90 and 90),
  constraint auxilios_longitud_range check (longitud between -180 and 180)
);

create index if not exists auxilios_estado_idx on public.auxilios (estado);
create index if not exists auxilios_solicitado_en_idx on public.auxilios (solicitado_en desc);

create table if not exists public.turnos_taller (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  vehiculo_id uuid references public.vehiculos(id) on delete set null,
  servicio_solicitado text not null,
  fecha_turno timestamptz not null,
  estado text not null default 'pendiente',
  costo numeric(10, 2) not null default 0,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint turnos_estado_check check (estado in ('pendiente', 'en_proceso', 'completado', 'cancelado')),
  constraint turnos_costo_non_negative check (costo >= 0)
);

create index if not exists turnos_fecha_idx on public.turnos_taller (fecha_turno desc);
create index if not exists turnos_estado_idx on public.turnos_taller (estado);

create table if not exists public.auth_otp_codes (
  id uuid primary key default gen_random_uuid(),
  purpose text not null,
  telefono text not null,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  used_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by_ip text,
  created_at timestamptz not null default now(),
  constraint auth_otp_purpose_check check (purpose in ('registro', 'login')),
  constraint auth_otp_attempts_check check (attempts >= 0),
  constraint auth_otp_max_attempts_check check (max_attempts >= 1)
);

create index if not exists auth_otp_lookup_idx
  on public.auth_otp_codes (purpose, telefono, created_at desc)
  where used_at is null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clientes_touch_updated_at on public.clientes;
create trigger trg_clientes_touch_updated_at
before update on public.clientes
for each row execute function public.touch_updated_at();

drop trigger if exists trg_membresias_touch_updated_at on public.membresias;
create trigger trg_membresias_touch_updated_at
before update on public.membresias
for each row execute function public.touch_updated_at();

-- RLS: habilitado por defecto para bloquear anon.
alter table public.clientes enable row level security;
alter table public.vehiculos enable row level security;
alter table public.membresias enable row level security;
alter table public.auxilios enable row level security;
alter table public.turnos_taller enable row level security;
alter table public.auth_otp_codes enable row level security;
