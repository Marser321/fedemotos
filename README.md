# Fede Motos

Aplicación Next.js 16 + InsForge para gestión de clientes, membresías, auxilios y turnos de taller.

Incluye agenda operativa modular:

- Configuración global (activa/pausada/deshabilitada).
- Franja semanal editable.
- Excepciones por fecha/rango (bloqueo/habilitación).
- Disponibilidad pública real por día (sin horarios hardcodeados).

## Requisitos

- Node.js 20+
- Variables de entorno definidas (ver `.env.example`)

## Setup

```bash
npm install
# crear .env.staging.local y .env.production.local a partir de .env.example
npm run dev
```

## Scripts

- `npm run dev`: entorno local
- `npm run lint`: validación estática
- `npm run test`: unit + integración de rutas (Vitest)
- `npm run build`: build de producción
- `npm run test:smoke`: smoke checks HTTP contra URL desplegada (`SMOKE_BASE_URL`)
- `npm run help:capture:staging`: genera capturas automáticas para centro de ayuda admin
- `npm run test:e2e:staging`: flujo E2E de agenda en staging
- `npm run test:db:staging`: verificación read-after-write contra DB staging real
- `npm run test:release:staging`: agregador de gates (`lint`, `test`, `build`, `capture`, `e2e`, `db`, `smoke`)
- `npm run env:init:profiles`: crea `.env.production.local` y `.env.staging.local` base
- `npm run env:validate:profiles`: valida separación staging/production de InsForge URL
- `npm run vercel:env:sync:production`: sync de `.env.production.local` a Vercel production
- `npm run vercel:env:sync:staging`: sync de `.env.staging.local` a Vercel preview/development

## Cron de recordatorios

- Ruta: `/api/cron/reminders/generate`
- Schedule Vercel: `0 12 * * *` (09:00 UY)
- Header requerido: `Authorization: Bearer ${CRON_SECRET}`

## Seguridad implementada

- Cookie de sesión firmada (HMAC) y validada en proxy.
- Login admin con comparación de PIN en tiempo constante.
- Rate limit básico por IP en login admin.
- Endpoints mutantes con validación Zod y errores tipados.
- Sin fallback silencioso: no se responde éxito si falla persistencia.

## Deploy a Vercel

Checklist completo en: `docs/VERCEL_RELEASE_CHECKLIST.md`.
