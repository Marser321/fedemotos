# Plan De Automatizaciones Asistidas Y Refinamiento UX

## Resumen

- Implementar una cola interna de comunicaciones asistidas: la app detecta eventos, prepara el mensaje de WhatsApp y el admin decide abrir, copiar, marcar enviado u omitir. Sin n8n, sin envio automatico real y sin secretos nuevos.
- Cubrir operacion completa: ordenes de taller, agenda, auxilios/traslados, membresias por vencer y controles post-service.
- Refinar ambas interfaces: admin orientado a accion diaria; cliente orientado a entender estado, proximos pasos y contacto.

```xml
<guardrails>
  <planning_first>
    Este archivo es la primera mutacion de la fase.
    El vibe ya aprobo explicitamente implementar este plan en el mensaje "PLEASE IMPLEMENT THIS PLAN".
  </planning_first>
  <security>
    No escribir tokens, API keys ni credenciales. WhatsApp queda en modo manual por enlaces wa.me/api.whatsapp.com.
  </security>
  <compatibility>
    Mantener Next.js 16, React 19, InsForge SDK actual y Tailwind CSS 3.4.
  </compatibility>
  <insforge>
    Antes de editar integraciones InsForge, intentar obtener documentacion MCP actualizada. Si no existe herramienta disponible, trabajar contra patrones ya existentes del repo y documentar la limitacion.
  </insforge>
</guardrails>
```

## Cambios Clave

- Crear una tabla nueva `comunicaciones_operativas` no destructiva, dejando `recordatorios_operativos` como legado.
- Usar deduplicacion por dia UY: `eventType:sourceType:sourceId:scheduledDate`.
- Generar comunicaciones desde servicios de dominio:
  - Ordenes: `orden_lista`, `orden_espera_repuestos`.
  - Agenda: `turno_creado`, `turno_reprogramado`, `turno_cancelado`.
  - Auxilios/traslados: recibido, en camino y completado.
  - Recordatorios actuales: membresia a 7/3/1 dias y service a 30 dias.
- Mantener `/api/cron/reminders/generate`, escribiendo en la nueva cola.
- Backfill inicial desde `recordatorios_operativos` hacia `comunicaciones_operativas` sin borrar datos previos.

## APIs E Interfaces

- Agregar APIs admin:
  - `GET /api/admin/communications`.
  - `POST /api/admin/communications/[id]/mark-sent`.
  - `POST /api/admin/communications/[id]/skip`.
  - `POST /api/admin/communications/generate`.
- Mantener compatibilidad temporal de `/api/admin/reminders`, usando la nueva cola filtrada a recordatorios.
- Agregar tipos `CommunicationEventType`, `CommunicationStatus`, `CommunicationSourceType`, `CommunicationQueueItem`.
- Admin: reemplazar "Recordatorios" por "Comunicaciones", con bandeja priorizada, botones claros, auditoria y alertas en el panel del dia.
- Cliente: ampliar `GET /api/cliente/me` con ordenes activas, turnos proximos y auxilios activos; actualizar `/mi-cuenta`, `/agendar` y flujo de auxilio para mostrar estado y proximos pasos.

## Test Plan

- Tests de servicios: creacion idempotente de comunicaciones, plantillas por evento, dedupe y normalizacion de telefono.
- Tests API: auth admin, filtros, marcar enviado, omitir, conflictos cuando no esta pendiente y generacion manual/cron.
- Tests de integracion: orden a `listo`, turno creado/reprogramado/cancelado, auxilio creado/en camino/completado y recordatorios cron.
- UI: estados vacio/carga/error en Comunicaciones, Hub admin, Ordenes, Operaciones, Agenda y Mi Cuenta.
- Checks: `pnpm exec eslint`, `pnpm exec vitest run`, `pnpm exec tsc --noEmit`, `pnpm exec next build`, mas revision browser desktop/mobile.

## Supuestos

- Esta fase no envia WhatsApp automaticamente; solo prepara enlaces y deja auditoria manual.
- Las comunicaciones son para clientes; el despacho interno al mecanico se mantiene como accion manual de Operaciones.
- Los eventos operativos se crean al momento; los recordatorios diarios siguen a las 09:00 UY.
- El worktree ya esta sucio y no se revierte nada ajeno.
- No hay herramienta MCP de InsForge visible en esta sesion; se seguira la integracion existente del repo.
