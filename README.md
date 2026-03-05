# Fede Motos

Aplicación Next.js 16 + InsForge para gestión de clientes, membresías, auxilios y turnos de taller.

## Requisitos

- Node.js 20+
- Variables de entorno definidas (ver `.env.example`)

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Scripts

- `npm run dev`: entorno local
- `npm run lint`: validación estática
- `npm run test`: unit + integración de rutas (Vitest)
- `npm run build`: build de producción
- `npm run test:smoke`: smoke checks HTTP contra URL desplegada (`SMOKE_BASE_URL`)

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
