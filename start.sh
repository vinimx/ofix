#!/bin/sh
# Script de inicializacao do container em producao.
# Responsavel por iniciar dois processos no mesmo container:
#   1. Worker (em segundo plano): consome a fila BullMQ e chama o Python
#   2. Servidor Nuxt/Nitro (em primeiro plano): serve o frontend e a API

set -e

# Garantir que a pasta temporaria exista (relevante quando montada via volume do Render)
mkdir -p /app/frontend/ofix/temp

cd /app/frontend/ofix

echo "[start] Iniciando Worker em segundo plano..."
node_modules/.bin/tsx scripts/worker.ts &
WORKER_PID=$!

# Funcao chamada quando o container recebe sinal de encerramento (SIGTERM/SIGINT).
# Garante que o worker seja encerrado de forma limpa junto com o servidor.
cleanup() {
    echo "[start] Sinal de encerramento recebido. Encerrando worker (PID $WORKER_PID)..."
    kill "$WORKER_PID" 2>/dev/null || true
    wait "$WORKER_PID" 2>/dev/null || true
    echo "[start] Worker encerrado."
}

trap cleanup TERM INT

echo "[start] Iniciando Servidor Nuxt na porta ${PORT:-3000}..."
# exec substitui o processo do shell pelo Node, tornando-o PID 1 do container.
# Isso garante que sinais do sistema operacional cheguem diretamente ao servidor.
exec node .output/server/index.mjs
