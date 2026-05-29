-- Fede Motos: cola de comunicaciones operativas asistidas
-- Genera mensajes WhatsApp listos para aprobacion humana sin depender de n8n.

create table if not exists public.comunicaciones_operativas (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text not null,
  cliente_id uuid references public.clientes(id) on delete set null,
  event_type text not null,
  status text not null default 'pendiente',
  channel text not null default 'whatsapp',
  recipient_phone text not null,
  message text not null,
  scheduled_for timestamptz not null default now(),
  scheduled_date date not null default current_date,
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  sent_by text,
  skip_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comunicaciones_source_type_check check (
    source_type in (
      'orden',
      'turno',
      'auxilio',
      'traslado',
      'membresia',
      'servicio',
      'legacy_recordatorio'
    )
  ),
  constraint comunicaciones_event_type_check check (
    event_type in (
      'orden_lista',
      'orden_espera_repuestos',
      'turno_creado',
      'turno_reprogramado',
      'turno_cancelado',
      'auxilio_recibido',
      'auxilio_en_camino',
      'auxilio_completado',
      'traslado_recibido',
      'traslado_en_camino',
      'traslado_completado',
      'membresia_vence_7',
      'membresia_vence_3',
      'membresia_vence_1',
      'service_control_30'
    )
  ),
  constraint comunicaciones_status_check check (
    status in ('pendiente', 'enviado_manual', 'omitido', 'error')
  ),
  constraint comunicaciones_channel_check check (channel in ('whatsapp')),
  constraint comunicaciones_phone_not_empty check (char_length(recipient_phone) >= 6),
  constraint comunicaciones_message_not_empty check (char_length(message) >= 2)
);

create unique index if not exists uq_comunicaciones_dedupe
  on public.comunicaciones_operativas (dedupe_key);

create index if not exists idx_comunicaciones_status_fecha
  on public.comunicaciones_operativas (status, scheduled_for desc);

create index if not exists idx_comunicaciones_source
  on public.comunicaciones_operativas (source_type, source_id);

create index if not exists idx_comunicaciones_cliente
  on public.comunicaciones_operativas (cliente_id, scheduled_for desc);

create index if not exists idx_comunicaciones_evento
  on public.comunicaciones_operativas (event_type, scheduled_for desc);

drop trigger if exists trg_comunicaciones_touch_updated_at on public.comunicaciones_operativas;
create trigger trg_comunicaciones_touch_updated_at
before update on public.comunicaciones_operativas
for each row execute function public.touch_updated_at();

alter table public.comunicaciones_operativas enable row level security;

-- Backfill no destructivo desde la cola legacy.
insert into public.comunicaciones_operativas (
  source_type,
  source_id,
  cliente_id,
  event_type,
  status,
  channel,
  recipient_phone,
  message,
  scheduled_for,
  scheduled_date,
  dedupe_key,
  payload,
  sent_at,
  sent_by,
  skip_reason,
  created_at
)
select
  'legacy_recordatorio',
  r.id::text,
  r.cliente_id,
  r.tipo_evento,
  r.status,
  'whatsapp',
  coalesce(nullif(r.payload->>'telefono', ''), c.telefono, '000000'),
  coalesce(
    nullif(r.payload->>'message', ''),
    case
      when r.tipo_evento = 'service_control_30' then
        'Hola ' || coalesce(c.nombre_completo, 'cliente') || ', ya pasaron 30 dias desde tu ultimo service. Te recomendamos coordinar un control.'
      else
        'Hola ' || coalesce(c.nombre_completo, 'cliente') || ', tu membresia esta proxima a vencer. Te ayudamos a renovarla por este medio.'
    end
  ),
  r.scheduled_for,
  r.scheduled_date,
  r.tipo_evento || ':legacy_recordatorio:' || r.id::text || ':' || r.scheduled_date::text,
  coalesce(r.payload, '{}'::jsonb) || jsonb_build_object('legacyReminderId', r.id),
  r.sent_at,
  r.sent_by,
  r.payload->>'skipReason',
  r.created_at
from public.recordatorios_operativos r
left join public.clientes c on c.id = r.cliente_id
on conflict (dedupe_key) do nothing;
