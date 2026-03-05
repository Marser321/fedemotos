# Vercel Release Checklist - Fede Motos

## 1) Pre-deploy local gates

Run all checks in this order:

```bash
npm run lint
npm run test
npm run build
```

All three must pass before deploy.

## 2) Required environment variables (Vercel)

Set these variables in Vercel Project Settings:

- `NEXT_PUBLIC_INSFORGE_URL`
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`
- `INSFORGE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
- `ADMIN_PIN`
- `CRON_SECRET`
- `SUPPORT_WHATSAPP_NUMBER`
- `NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER`
- `OTP_PROVIDER` (current value: `email`)
- `OTP_EMAIL_FROM`
- `OTP_DEV_ECHO_CODE` (production: `false`)

### 2.1) Sync automático desde `.env.local`

Si querés replicar exactamente las variables locales en Vercel (`production`, `preview`, `development`):

```bash
npm run vercel:env:sync
```

Este script:

- valida claves requeridas en `.env.local`
- hace overwrite en Vercel con `--force`
- fuerza `OTP_DEV_ECHO_CODE=false` en `production` como guardrail de seguridad
- verifica presencia final por entorno (`vercel env ls --format json`)
- advierte si `OTP_PROVIDER != email`

## 3) Deploy

Deploy from Vercel dashboard or CLI after verifying env vars.

## 4) Post-deploy smoke

Run smoke checks against production URL:

```bash
SMOKE_BASE_URL=https://your-vercel-domain.vercel.app npm run test:smoke
```

Smoke script validates:

- Public login page availability.
- Redirect protection on `/admin` without session.
- Session endpoint shape.
- Agenda pública (`/api/agenda/config`) operativa.
- Validación de disponibilidad (`/api/agenda/disponibilidad` sin fecha => 400).
- Admin login hardening (invalid PIN returns `401`).
- Input validation in mutating endpoint (`/api/turnos`).
- Admin lookup endpoint protegido (`/api/admin/clientes/lookup`).
- Recordatorios admin protegidos y con error tipado (`FORBIDDEN`) sin sesión.
- Configuración de agenda admin protegida (`/api/admin/agenda/config` sin sesión => 403).

## 4.1) Cron operativo de recordatorios

- Vercel cron configurado en `vercel.json`: `0 12 * * *` (09:00 UY).
- Endpoint: `/api/cron/reminders/generate`.
- Debe invocarse con header: `Authorization: Bearer ${CRON_SECRET}`.

## 5) Manual critical flows

Validate manually in production:

1. Registro cliente: solicita OTP por email y verifica.
2. Login cliente: solicita OTP y crea sesión.
3. Login admin: PIN correcto permite acceso; PIN incorrecto bloquea.
4. Crear auxilio: persiste y aparece en admin tras refresh.
5. Alta/edición/renovación de membresía: persiste y actualiza stats.
6. Alta operativa admin con lookup por teléfono: autocompleta cliente y permite editar.
7. Captura de origen/destino por click en mapa: persiste coordenadas correctas.
8. Recordatorios: abrir WhatsApp no cambia estado; `Marcar enviado` y `Omitir` aplican una sola vez.

## 6) Security hard checks

- Confirmar que `INSFORGE_SERVICE_ROLE_KEY` no coincide con el anon key público.
- Confirmar que `SESSION_SECRET` es aleatorio y largo.
- Confirmar que `ADMIN_PIN` no usa valor débil.
