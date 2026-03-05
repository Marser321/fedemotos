#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROFILE="${1:-}"
if [[ -z "$PROFILE" ]]; then
  echo "Uso: bash scripts/vercel-sync-env.sh <production|staging>" >&2
  exit 1
fi

if [[ "$PROFILE" != "production" && "$PROFILE" != "staging" ]]; then
  echo "Perfil invalido: $PROFILE (usar production o staging)" >&2
  exit 1
fi

if [[ ! -f ".vercel/project.json" ]]; then
  echo "Error: proyecto Vercel no vinculado (.vercel/project.json no encontrado)." >&2
  echo "Ejecuta: npx vercel link" >&2
  exit 1
fi

PROD_ENV_FILE=".env.production.local"
STAGING_ENV_FILE=".env.staging.local"

if [[ ! -f "$PROD_ENV_FILE" ]]; then
  echo "Error: falta $PROD_ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$STAGING_ENV_FILE" ]]; then
  echo "Error: falta $STAGING_ENV_FILE" >&2
  exit 1
fi

ENV_FILE="$PROD_ENV_FILE"
TARGETS=(production)
if [[ "$PROFILE" == "staging" ]]; then
  ENV_FILE="$STAGING_ENV_FILE"
  TARGETS=(preview development)
fi

COMMON_REQUIRED_KEYS=(
  NEXT_PUBLIC_INSFORGE_URL
  NEXT_PUBLIC_INSFORGE_ANON_KEY
  INSFORGE_SERVICE_ROLE_KEY
  SESSION_SECRET
  ADMIN_PIN
  CRON_SECRET
  OTP_PROVIDER
  OTP_EMAIL_FROM
  OTP_DEV_ECHO_CODE
  SUPPORT_WHATSAPP_NUMBER
  NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER
  NEXT_PUBLIC_RECEIPT_ISSUER_NAME
  NEXT_PUBLIC_RECEIPT_ISSUER_PHONE
  NEXT_PUBLIC_RECEIPT_ISSUER_ADDRESS
)

STAGING_EXTRA_KEYS=(
  E2E_STAGING_BASE_URL
  E2E_STAGING_ADMIN_PIN
  E2E_STAGING_SERVICE_ROLE_KEY
)

get_env_value() {
  local file="$1"
  local key="$2"
  awk -v k="$key" '
    $0 ~ /^[[:space:]]*#/ { next }
    $0 ~ "^[[:space:]]*" k "=" {
      sub(/^[^=]*=/, "", $0)
      print $0
    }
  ' "$file" | tail -n 1
}

prod_url="$(get_env_value "$PROD_ENV_FILE" NEXT_PUBLIC_INSFORGE_URL)"
staging_url="$(get_env_value "$STAGING_ENV_FILE" NEXT_PUBLIC_INSFORGE_URL)"

if [[ -z "$prod_url" || -z "$staging_url" ]]; then
  echo "Error: NEXT_PUBLIC_INSFORGE_URL debe existir en ambos env files" >&2
  exit 1
fi

if [[ "$prod_url" == "$staging_url" ]]; then
  echo "Error: production y staging apuntan al mismo NEXT_PUBLIC_INSFORGE_URL" >&2
  exit 1
fi

if [[ "$PROFILE" == "staging" && "$staging_url" == "$prod_url" ]]; then
  echo "Error: staging no puede apuntar al backend productivo" >&2
  exit 1
fi

required_keys=("${COMMON_REQUIRED_KEYS[@]}")
if [[ "$PROFILE" == "staging" ]]; then
  required_keys+=("${STAGING_EXTRA_KEYS[@]}")
fi

missing=()
for key in "${required_keys[@]}"; do
  value="$(get_env_value "$ENV_FILE" "$key")"
  if [[ -z "$value" ]]; then
    missing+=("$key")
  fi
done

if [[ "${#missing[@]}" -gt 0 ]]; then
  echo "Error: faltan variables requeridas en $ENV_FILE:" >&2
  for key in "${missing[@]}"; do
    echo " - $key" >&2
  done
  exit 1
fi

project_name="$(node -e "const p=require('./.vercel/project.json'); console.log(p.projectName)")"
echo "Proyecto Vercel: $project_name"
echo "Perfil: $PROFILE"
echo "Fuente de variables: $ENV_FILE"
echo "Targets: ${TARGETS[*]}"

for target in "${TARGETS[@]}"; do
  echo "-> Entorno: $target"
  for key in "${required_keys[@]}"; do
    value="$(get_env_value "$ENV_FILE" "$key")"

    if [[ "$target" == "production" && "$key" == "OTP_DEV_ECHO_CODE" ]]; then
      value="false"
    fi

    if [[ "$target" == "preview" ]]; then
      npx vercel env add "$key" "$target" "" --value "$value" --force --yes >/dev/null
    else
      npx vercel env add "$key" "$target" --value "$value" --force --yes >/dev/null
    fi
  done
done

echo "Verificando claves en Vercel..."
for target in "${TARGETS[@]}"; do
  env_json="$(npx vercel env ls "$target" --format json)"
  ENV_JSON="$env_json" TARGET="$target" REQUIRED="$(printf '%s\n' "${required_keys[@]}")" node <<'NODE'
const payload = JSON.parse(process.env.ENV_JSON);
const target = process.env.TARGET;
const required = process.env.REQUIRED.split('\n').filter(Boolean);
const present = new Set((payload.envs || []).map((item) => item.key));
const missing = required.filter((k) => !present.has(k));
if (missing.length > 0) {
  console.error(`Error: faltan claves en ${target}: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`OK ${target}: ${required.length} claves`);
NODE
done

otp_provider="$(get_env_value "$ENV_FILE" OTP_PROVIDER)"
if [[ "$otp_provider" != "email" ]]; then
  echo "Advertencia: OTP_PROVIDER='$otp_provider' (esperado: email)." >&2
fi

echo "Sync completado sin mezcla de entornos."
