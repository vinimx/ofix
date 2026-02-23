# Imagem base com Python 3.11 pre-instalado.
# Usamos python:3.11-slim em vez de node:20 porque o projeto precisa de Python
# com pip funcionando sem restricoes de sistema (Debian bookworm).
FROM python:3.11-slim

# --- Instalar Node.js 20 LTS ---
# Adicionamos o repositorio oficial do NodeSource para garantir a versao LTS estavel.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Verificar versoes instaladas (aparece no log do build no Render)
RUN node -v && npm -v && python3 --version

WORKDIR /app

# --- Instalar dependencias Python ---
# Copiamos apenas o requirements.txt primeiro para aproveitar o cache do Docker:
# se o arquivo nao mudar, esta camada nao e reconstruida, acelerando os builds.
COPY conversor-python/requirements.txt ./conversor-python/
RUN pip install --no-cache-dir -r ./conversor-python/requirements.txt

# --- Instalar dependencias Node.js ---
# Copiamos package.json e package-lock.json antes do restante do codigo pelo
# mesmo motivo: aproveitar cache e nao reinstalar tudo quando apenas o codigo mudar.
COPY frontend/ofix/package*.json ./frontend/ofix/
RUN cd frontend/ofix && npm ci

# --- Copiar todo o codigo-fonte ---
COPY . .

# --- Build da aplicacao Nuxt ---
# Gera a pasta .output/ com o servidor Nitro otimizado para producao.
RUN cd frontend/ofix && npm run build

# --- Criar pasta temporaria para uploads e arquivos OFX ---
# O volume do Render sera montado neste caminho (em planos pagos).
# Em planos gratuitos, esta pasta e efemera (sera perdida se o container reiniciar).
RUN mkdir -p /app/frontend/ofix/temp

# --- Copiar e preparar o script de inicializacao ---
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Porta que o Nuxt/Nitro vai escutar (o Render injeta a variavel PORT automaticamente)
EXPOSE 3000

# Ponto de entrada: inicia o servidor Nuxt e o worker juntos
CMD ["/start.sh"]
