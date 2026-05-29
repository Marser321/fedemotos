-- Fede Motos: profundizacion operativa

-- 1) Extensiones de auxilios para soportar traslados operativos
alter table public.auxilios
  add column if not exists tipo text not null default 'auxilio',
  add column if not exists prioridad text not null default 'media',
  add column if not exists origen_referencia text,
  add column if not exists destino_latitud numeric(10, 7),
  add column if not exists destino_longitud numeric(10, 7),
  add column if not exists destino_referencia text,
  add column if not exists notas_internas text,
  add column if not exists creado_desde text not null default 'app_cliente';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'auxilios_tipo_check'
  ) then
    alter table public.auxilios
      add constraint auxilios_tipo_check check (tipo in ('auxilio', 'traslado'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'auxilios_prioridad_check'
  ) then
    alter table public.auxilios
      add constraint auxilios_prioridad_check check (prioridad in ('baja', 'media', 'alta', 'urgente'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'auxilios_creado_desde_check'
  ) then
    alter table public.auxilios
      add constraint auxilios_creado_desde_check check (creado_desde in ('app_cliente', 'admin_manual'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'auxilios_destino_traslado_check'
  ) then
    alter table public.auxilios
      add constraint auxilios_destino_traslado_check check (
        (tipo = 'auxilio')
        or (tipo = 'traslado' and destino_latitud is not null and destino_longitud is not null)
      );
  end if;
end $$;

create index if not exists idx_auxilios_tipo_estado_fecha
  on public.auxilios (tipo, estado, solicitado_en desc);

create index if not exists idx_auxilios_prioridad
  on public.auxilios (prioridad);

-- 2) Membresias con vencimiento operativo a 30 dias
update public.membresias
set fecha_fin = (fecha_inicio + interval '30 day')::date
where fecha_fin is null;

create index if not exists idx_membresias_fecha_fin
  on public.membresias (fecha_fin);

create index if not exists idx_membresias_estado_fecha_fin
  on public.membresias (estado, fecha_fin);

-- 3) Cola de recordatorios operativos (envio manual por WhatsApp)
create table if not exists public.recordatorios_operativos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  vehiculo_id uuid references public.vehiculos(id) on delete set null,
  tipo_evento text not null,
  membresia_id uuid references public.membresias(id) on delete set null,
  turno_id uuid references public.turnos_taller(id) on delete set null,
  scheduled_for timestamptz not null,
  scheduled_date date not null default current_date,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pendiente',
  sent_at timestamptz,
  sent_by text,
  created_at timestamptz not null default now(),
  constraint recordatorios_operativos_tipo_evento_check check (
    tipo_evento in (
      'membresia_vence_7',
      'membresia_vence_3',
      'membresia_vence_1',
      'service_control_30'
    )
  ),
  constraint recordatorios_operativos_status_check check (
    status in ('pendiente', 'enviado_manual', 'omitido', 'error')
  )
);

alter table public.recordatorios_operativos
  add column if not exists scheduled_date date not null default current_date;

update public.recordatorios_operativos
set scheduled_date = (scheduled_for at time zone 'America/Montevideo')::date
where scheduled_date is null;

create unique index if not exists uq_recordatorios_evento_cliente_fecha
  on public.recordatorios_operativos (tipo_evento, cliente_id, scheduled_date);

create index if not exists idx_recordatorios_estado_fecha
  on public.recordatorios_operativos (status, scheduled_for desc);

create index if not exists idx_recordatorios_cliente
  on public.recordatorios_operativos (cliente_id, scheduled_for desc);

alter table public.recordatorios_operativos enable row level security;

-- DEUDA SEGURIDAD: politica abierta a anon (using/with check = true). La anon key
-- es publica, asi que esto habilita lectura/escritura directa via PostgREST saltando
-- los chequeos admin de la app. Cerrar (filtrar por owner/rol o revocar anon) antes
-- de exponer el backend a trafico no confiable.
-- Politica temporal mientras se termina hardening de service role / RLS
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'recordatorios_operativos'
      and policyname = 'recordatorios_anon_all'
  ) then
    create policy recordatorios_anon_all
      on public.recordatorios_operativos
      for all
      to anon
      using (true)
      with check (true);
  end if;
end $$;
