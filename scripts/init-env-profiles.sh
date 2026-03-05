#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SOURCE_FILE=".env.local"
if [[ ! -f "$SOURCE_FILE" ]]; then
  SOURCE_FILE=".env.example"
fi

if [[ ! -f "$SOURCE_FILE" ]]; then
  echo "No existe .env.local ni .env.example para inicializar perfiles." >&2
  exit 1
fi

for profile in production staging; do
  target=".env.${profile}.local"
  if [[ -f "$target" ]]; then
    echo "Ya existe $target (sin cambios)."
    continue
  fi
  cp "$SOURCE_FILE" "$target"
  echo "Creado $target desde $SOURCE_FILE"
done

echo "Recordatorio: editar NEXT_PUBLIC_INSFORGE_URL/keys para que staging y production queden separados."
