-- Fede Motos: ordenes operativas de taller
-- Separa la ejecucion del trabajo mecanico de las reservas en turnos_taller.

create table if not exists public.ordenes_taller (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  vehiculo_id uuid references public.vehiculos(id) on delete set null,
  turno_id uuid references public.turnos_taller(id) on delete set null,
  estado text not null default 'ingresado',
  titulo text not null,
  descripcion text,
  diagnostico text,
  notas_internas text,
  costo_estimado numeric(10, 2) not null default 0,
  costo_final numeric(10, 2) not null default 0,
  fecha_ingreso timestamptz not null default now(),
  fecha_prometida date,
  ingresado_at timestamptz not null default now(),
  diagnostico_at timestamptz,
  espera_repuestos_at timestamptz,
  reparacion_at timestamptz,
  listo_at timestamptz,
  entregado_at timestamptz,
  cancelado_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ordenes_taller_estado_check check (
    estado in (
      'ingresado',
      'diagnostico',
      'espera_repuestos',
      'reparacion',
      'listo',
      'entregado',
      'cancelado'
    )
  ),
  constraint ordenes_taller_costo_estimado_check check (costo_estimado >= 0),
  constraint ordenes_taller_costo_final_check check (costo_final >= 0)
);

create index if not exists idx_ordenes_taller_estado_fecha
  on public.ordenes_taller (estado, fecha_ingreso desc);

create index if not exists idx_ordenes_taller_cliente
  on public.ordenes_taller (cliente_id, fecha_ingreso desc);

create index if not exists idx_ordenes_taller_vehiculo
  on public.ordenes_taller (vehiculo_id, fecha_ingreso desc);

create index if not exists idx_ordenes_taller_turno
  on public.ordenes_taller (turno_id);

create table if not exists public.ordenes_taller_eventos (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.ordenes_taller(id) on delete cascade,
  tipo text not null default 'estado',
  estado_desde text,
  estado_hasta text,
  nota text,
  created_by text,
  created_at timestamptz not null default now(),
  constraint ordenes_taller_eventos_tipo_check check (tipo in ('estado', 'nota', 'creacion'))
);

create index if not exists idx_ordenes_taller_eventos_orden
  on public.ordenes_taller_eventos (orden_id, created_at desc);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ordenes_taller'
      and column_name = 'updated_at'
  ) then
    drop trigger if exists trg_ordenes_taller_touch_updated_at on public.ordenes_taller;
    create trigger trg_ordenes_taller_touch_updated_at
    before update on public.ordenes_taller
    for each row execute function public.touch_updated_at();
  end if;
end $$;

alter table public.ordenes_taller enable row level security;
alter table public.ordenes_taller_eventos enable row level security;

-- DEUDA SEGURIDAD: politicas abiertas a anon (using/with check = true). La anon key
-- es publica, asi que esto habilita lectura/escritura directa via PostgREST saltando
-- los chequeos admin de la app. Cerrar (filtrar por owner/rol o revocar anon) antes
-- de exponer el backend a trafico no confiable.
-- Politicas temporales alineadas con el estado actual del proyecto:
-- las rutas de aplicacion protegen acceso admin y usan service role desde servidor.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ordenes_taller'
      and policyname = 'ordenes_taller_anon_all'
  ) then
    create policy ordenes_taller_anon_all
      on public.ordenes_taller
      for all
      to anon
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ordenes_taller_eventos'
      and policyname = 'ordenes_taller_eventos_anon_all'
  ) then
    create policy ordenes_taller_eventos_anon_all
      on public.ordenes_taller_eventos
      for all
      to anon
      using (true)
      with check (true);
  end if;
end $$;
