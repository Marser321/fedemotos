#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f ".env.local" ]]; then
  echo "Error: no existe .env.local en $ROOT_DIR" >&2
  exit 1
fi

if [[ ! -f ".vercel/project.json" ]]; then
  echo "Error: proyecto Vercel no vinculado (.vercel/project.json no encontrado)." >&2
  echo "Ejecuta: npx vercel link" >&2
  exit 1
fi

REQUIRED_KEYS=(
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
)

TARGETS=(production preview development)

get_env_value() {
  local key="$1"
  awk -v k="$key" '
    $0 ~ /^[[:space:]]*#/ { next }
    $0 ~ "^[[:space:]]*" k "=" {
      sub(/^[^=]*=/, "", $0)
      print $0
    }
  ' .env.local | tail -n 1
}

missing=()
for key in "${REQUIRED_KEYS[@]}"; do
  value="$(get_env_value "$key")"
  if [[ -z "$value" ]]; then
    missing+=("$key")
  fi
done

if [[ "${#missing[@]}" -gt 0 ]]; then
  echo "Error: faltan variables requeridas en .env.local:" >&2
  for key in "${missing[@]}"; do
    echo " - $key" >&2
  done
  exit 1
fi

echo "Proyecto Vercel: $(node -e "const p=require('./.vercel/project.json'); console.log(p.projectName)")"
echo "Sincronizando variables requeridas en: ${TARGETS[*]}"

for target in "${TARGETS[@]}"; do
  echo "-> Entorno: $target"
  for key in "${REQUIRED_KEYS[@]}"; do
    value="$(get_env_value "$key")"
    if [[ "$target" == "preview" ]]; then
      # Tercer argumento vacío => aplica a todas las ramas de preview.
      npx vercel env add "$key" "$target" "" --value "$value" --force --yes >/dev/null
    else
      npx vercel env add "$key" "$target" --value "$value" --force --yes >/dev/null
    fi
  done
done

echo "Verificando claves en Vercel..."
for target in "${TARGETS[@]}"; do
  env_json="$(npx vercel env ls "$target" --format json)"
  ENV_JSON="$env_json" TARGET="$target" REQUIRED="$(printf '%s\n' "${REQUIRED_KEYS[@]}")" node <<'NODE'
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

otp_provider="$(get_env_value OTP_PROVIDER)"
otp_echo="$(get_env_value OTP_DEV_ECHO_CODE)"
if [[ "$otp_provider" != "email" ]]; then
  echo "Advertencia: OTP_PROVIDER='$otp_provider' (esperado: email)." >&2
fi
if [[ "$otp_echo" != "false" ]]; then
  echo "Advertencia: OTP_DEV_ECHO_CODE='$otp_echo' (recomendado en producción: false)." >&2
fi

echo "Sincronización completada."
