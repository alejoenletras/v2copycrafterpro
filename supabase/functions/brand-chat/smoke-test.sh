#!/usr/bin/env bash
#
# Smoke test para la Edge Function brand-chat (proyecto ainspdnploxzrujbgcqo).
# Ejecuta 3 llamadas contra la función desplegada en producción y valida
# que el contrato básico siga en pie (status 200 + reply no vacío).
#
# La llamada 3 es IDÉNTICA a la llamada 2 para que, cuando activemos prompt
# caching, podamos verificar cache hit en esa tercera invocación.
#
# Uso:
#   export SUPABASE_ANON_KEY="..."
#   ./supabase/functions/brand-chat/smoke-test.sh
#
# Exit code 0 si todos los asserts pasan, != 0 si alguno falla.

set -euo pipefail

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
BLUE=$'\033[0;34m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

info()  { printf "%s[INFO]%s %s\n" "$BLUE" "$RESET" "$1"; }
ok()    { printf "%s[ OK ]%s %s\n" "$GREEN" "$RESET" "$1"; }
fail()  { printf "%s[FAIL]%s %s\n" "$RED" "$RESET" "$1"; }
warn()  { printf "%s[WARN]%s %s\n" "$YELLOW" "$RESET" "$1"; }

# ─────────────────────────────────────────────────────────────
# Preflight: dependencias y variables de entorno
# ─────────────────────────────────────────────────────────────

if ! command -v curl >/dev/null 2>&1; then
  fail "curl no está instalado. Instálalo y vuelve a ejecutar."
  exit 127
fi

if ! command -v jq >/dev/null 2>&1; then
  fail "jq no está instalado. En macOS: 'brew install jq'. En Debian/Ubuntu: 'sudo apt install jq'."
  exit 127
fi

if [[ -z "${SUPABASE_ANON_KEY:-}" ]]; then
  fail "Falta la variable SUPABASE_ANON_KEY."
  printf "       Exportala así: %sexport SUPABASE_ANON_KEY='...'%s\n" "$BOLD" "$RESET"
  exit 2
fi

FUNCTION_URL="${SUPABASE_FUNCTION_URL:-https://ainspdnploxzrujbgcqo.supabase.co/functions/v1/brand-chat}"

info "Endpoint: $FUNCTION_URL"
info "Arrancando smoke test (3 llamadas)..."
echo

# ─────────────────────────────────────────────────────────────
# Payloads
# ─────────────────────────────────────────────────────────────

PAYLOAD_1='{
  "voice": "saleads",
  "messages": [
    { "role": "user", "content": "Dame una descripción de YouTube para un video corto sobre cmo crear imágenes con IA en SaleADS." }
  ]
}'

# Payload 2 y 3 son IDÉNTICOS a propósito (para verificar cache hit en el futuro).
PAYLOAD_2='{
  "voice": "marco",
  "dnas": {
    "expert": "Marco Lezama, consultor de ventas con 15 años ayudando a PYMES de LATAM a escalar sin depender de agencias externas.",
    "audience": "Dueños de negocio de 35-55 años, facturan entre 50k y 500k USD/año, desconfían del marketing digital porque ya les vendieron humo.",
    "product": "Mentoría 1-a-1 de 90 días enfocada en sistemas de venta propios, no en correr anuncios."
  },
  "messages": [
    { "role": "user", "content": "Dame un título de YouTube para un video donde explico por qué vender más no es ganar más." }
  ]
}'

PAYLOAD_3="$PAYLOAD_2"

# ─────────────────────────────────────────────────────────────
# Runner
# ─────────────────────────────────────────────────────────────

FAILURES=0
PASSED=0

run_call() {
  local label="$1"
  local payload="$2"

  printf "%s── %s ──%s\n" "$BOLD" "$label" "$RESET"

  local tmp_body
  tmp_body="$(mktemp)"
  local http_code
  local start_ts end_ts elapsed_ms

  start_ts=$(date +%s)
  http_code=$(curl -sS -o "$tmp_body" -w "%{http_code}" \
    -X POST "$FUNCTION_URL" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    --data "$payload" || echo "000")
  end_ts=$(date +%s)
  elapsed_ms=$(( (end_ts - start_ts) * 1000 ))

  # Assert 1: status 200
  if [[ "$http_code" != "200" ]]; then
    fail "Status HTTP = $http_code (esperado 200)"
    printf "       Body: "
    cat "$tmp_body"
    echo
    rm -f "$tmp_body"
    FAILURES=$((FAILURES + 1))
    echo
    return
  fi
  ok "Status HTTP = 200 (${elapsed_ms}ms)"

  # Assert 2: body es JSON parseable
  if ! jq empty "$tmp_body" >/dev/null 2>&1; then
    fail "Respuesta no es JSON válido"
    printf "       Body: "
    cat "$tmp_body"
    echo
    rm -f "$tmp_body"
    FAILURES=$((FAILURES + 1))
    echo
    return
  fi
  ok "Body es JSON válido"

  # Assert 3: .reply existe y no está vacío
  if ! jq -e '.reply | type == "string" and length > 0' "$tmp_body" >/dev/null 2>&1; then
    fail "Campo .reply ausente o vacío"
    printf "       Body: "
    jq -c '.' "$tmp_body" || cat "$tmp_body"
    echo
    rm -f "$tmp_body"
    FAILURES=$((FAILURES + 1))
    echo
    return
  fi

  local reply_len preview
  reply_len=$(jq -r '.reply | length' "$tmp_body")
  preview=$(jq -r '.reply' "$tmp_body" | head -c 120 | tr '\n' ' ')
  ok "Campo .reply presente (${reply_len} chars)"
  printf "       Preview: %s%s%s…\n" "$YELLOW" "$preview" "$RESET"

  rm -f "$tmp_body"
  PASSED=$((PASSED + 1))
  echo
}

run_call "Llamada 1 — SaleADS (sin DNA)"        "$PAYLOAD_1"
run_call "Llamada 2 — Marco (con DNAs)"         "$PAYLOAD_2"
run_call "Llamada 3 — Marco (idéntica a #2)"    "$PAYLOAD_3"

# ─────────────────────────────────────────────────────────────
# Resumen
# ─────────────────────────────────────────────────────────────

printf "%s═══════════════════════════════════════%s\n" "$BOLD" "$RESET"
printf "  Pasaron: %s%d%s   Fallaron: %s%d%s\n" \
  "$GREEN" "$PASSED" "$RESET" "$RED" "$FAILURES" "$RESET"
printf "%s═══════════════════════════════════════%s\n" "$BOLD" "$RESET"

if [[ $FAILURES -gt 0 ]]; then
  fail "Smoke test FALLÓ."
  exit 1
fi

ok "Smoke test OK."

# ─────────────────────────────────────────────────────────────
# TODO: después de activar caching en brand-chat/index.ts
# ─────────────────────────────────────────────────────────────
# Cuando agreguemos prompt caching a la llamada a Anthropic:
#
# 1. Modificar la Edge Function para que devuelva los usage tokens
#    de la respuesta de Anthropic (actualmente solo devuelve .reply).
#    Ej: return { reply, usage: data.usage }
#
# 2. Agregar un assert en la Llamada 3 de este script:
#       jq -e '.usage.cache_read_input_tokens > 0' "$tmp_body"
#    La llamada 3 tiene el mismo system prompt que la 2 (voice=marco + mismos DNAs),
#    así que el cache debería pegar en la 3ra invocación si el TTL (5 min por
#    default) no expiró entre llamadas.
#
# 3. Opcionalmente, en la Llamada 2 verificar cache_creation_input_tokens > 0
#    (la primera vez que se ve ese system prompt, Anthropic lo escribe al cache).
