#!/bin/bash
# Script de inicializacao do container em producao.

echo "=== OFIX Container Iniciando ==="
echo "[check] PORT=${PORT:-NAO DEFINIDA}"
echo "[check] NUXT_REDIS_URL=${NUXT_REDIS_URL:-NAO DEFINIDA}"
echo "[check] NUXT_WORKER_SECRET=${NUXT_WORKER_SECRET:+DEFINIDA}"
echo "[check] NUXT_CONVERTER_SCRIPT_PATH=${NUXT_CONVERTER_SCRIPT_PATH:-NAO DEFINIDA}"
echo "[check] NUXT_API_URL antes do override=${NUXT_API_URL:-NAO DEFINIDA}"

# Verificar Python e dependencias
echo "[check] Versao do Python: $(python3 --version 2>&1)"
python3 -c "import pdfplumber; print('[check] pdfplumber: OK')" 2>&1 || echo "[check] ERRO: pdfplumber nao encontrado"

# Verificar se o script Python existe no caminho configurado
if [ -n "${NUXT_CONVERTER_SCRIPT_PATH}" ] && [ -f "${NUXT_CONVERTER_SCRIPT_PATH}" ]; then
  echo "[check] Script Python: OK em ${NUXT_CONVERTER_SCRIPT_PATH}"
else
  echo "[check] ERRO: Script Python NAO encontrado em '${NUXT_CONVERTER_SCRIPT_PATH}'"
fi

# Verificar tsx
if [ -f "/app/frontend/ofix/node_modules/.bin/tsx" ]; then
  echo "[check] tsx: OK"
else
  echo "[check] ERRO: tsx nao encontrado em node_modules/.bin/tsx"
fi

mkdir -p /app/frontend/ofix/temp
cd /app/frontend/ofix

# CRITICO: sobrescrever NUXT_API_URL com a porta real injetada pelo Render.
# O Render usa PORT=10000 por padrao, nao 3000.
# O worker precisa desta URL correta para atualizar o status dos jobs.
export NUXT_API_URL="http://localhost:${PORT:-3000}"
echo "[start] NUXT_API_URL definida como: ${NUXT_API_URL}"

# Iniciar o servidor Nuxt PRIMEIRO (em segundo plano) para que o worker
# consiga chamar a API de status assim que processar um job
echo "[start] Iniciando servidor Nuxt..."
node .output/server/index.mjs &
SERVER_PID=$!

# Aguardar o servidor estar respondendo (ate 30 tentativas de 1s cada)
echo "[start] Aguardando servidor ficar pronto na porta ${PORT:-3000}..."
SERVER_READY=0
for i in $(seq 1 30); do
  sleep 1
  if curl -sf "http://localhost:${PORT:-3000}/api/health" > /dev/null 2>&1; then
    SERVER_READY=1
    echo "[start] Servidor pronto apos ${i}s"
    break
  fi
done

if [ $SERVER_READY -eq 0 ]; then
  echo "[start] AVISO: servidor nao respondeu em 30s. Iniciando worker mesmo assim."
fi

# Iniciar o worker somente apos o servidor estar no ar
echo "[start] Iniciando Worker..."
node_modules/.bin/tsx scripts/worker.ts &
WORKER_PID=$!
echo "[start] Worker iniciado (PID: ${WORKER_PID})"
echo "=== Todos os processos iniciados ==="

# Encerramento limpo ao receber SIGTERM/SIGINT do Render
cleanup() {
  echo "[start] Sinal de encerramento recebido."
  kill "$WORKER_PID" 2>/dev/null || true
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$WORKER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup TERM INT

# Manter o container ativo enquanto o servidor estiver rodando.
# Se o servidor sair por qualquer motivo, encerra o worker tambem.
wait "$SERVER_PID"
EXIT_CODE=$?
echo "[start] Servidor encerrou com codigo: ${EXIT_CODE}"
kill "$WORKER_PID" 2>/dev/null || true
exit $EXIT_CODE
