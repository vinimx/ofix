# Guia de Deploy: OFIX - Conversor PDF para OFX

Este documento descreve, etapa por etapa, como colocar o sistema OFIX em producao para que outros usuarios acessem pela web. Cobre a preparacao do servidor, configuracao do Docker, build da aplicacao Nuxt, configuracao do Nginx como proxy reverso, SSL/HTTPS com Certbot e gerenciamento dos processos.

---

## Visao geral da arquitetura em producao

```
Internet
    |
    v
[Nginx] :443 (HTTPS) / :80 (redirect)
    |
    v
[Nuxt/Nitro] :3000  <--->  [Redis] :6379
    |                            ^
    |                            |
    v                            |
[Worker (tsx)]  -------> [Python convert.py]
    |
    v
[temp/ volume compartilhado]
```

Componentes:

| Componente     | Tecnologia              | Funcao                                              |
|----------------|-------------------------|-----------------------------------------------------|
| Frontend/API   | Nuxt 4 (Nitro)          | Serve o frontend e expoe a API REST                 |
| Worker         | Node.js + tsx           | Consome a fila BullMQ e invoca o Python             |
| Fila           | Redis (Docker)          | Fila de jobs entre a API e o Worker                 |
| Conversor      | Python 3.11+            | Le o PDF e gera o arquivo OFX                       |
| Proxy reverso  | Nginx                   | Termina TLS, faz redirect HTTP->HTTPS, encaminha    |

---

## Limitacao importante: armazenamento em memoria

O armazenamento de jobs usa um `Map` em memoria no processo Nitro. Isso significa que:

- Se o servidor Nuxt reiniciar, todos os registros de jobs sao perdidos (os arquivos temporarios continuam em disco, mas o historico some da interface).
- Para producao de alta disponibilidade ou com reinicializacoes frequentes, considere migrar `server/services/jobs.ts` para Redis como armazenamento persistente (chave `job:{id}` com JSON).
- Para o MVP, esse comportamento e aceitavel desde que o servidor seja gerenciado com cuidado (reinicializacoes controladas).

---

## Fase 1: Preparar o servidor

### 1.1 Requisitos minimos do servidor (VPS/Cloud)

| Recurso | Minimo recomendado |
|---------|--------------------|
| CPU     | 2 vCPUs            |
| RAM     | 2 GB               |
| Disco   | 20 GB SSD          |
| OS      | Ubuntu 22.04 LTS   |
| Porta   | 80 e 443 abertas   |

Provedores sugeridos: DigitalOcean, Linode/Akamai, Hetzner, AWS EC2 (t3.small), Railway, Render.

### 1.2 Atualizar o sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Instalar dependencias base

```bash
sudo apt install -y curl git unzip build-essential
```

---

## Fase 2: Instalar Node.js, Python e Docker

### 2.1 Node.js 20 LTS (via nvm)

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v   # deve exibir v20.x.x
```

### 2.2 Python 3.11+

```bash
sudo apt install -y python3.11 python3.11-venv python3-pip
python3.11 --version
```

### 2.3 Docker e Docker Compose

```bash
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalacao
docker --version
docker compose version
```

---

## Fase 3: Clonar o repositorio e configurar o projeto

### 3.1 Clonar o repositorio

```bash
cd /opt
sudo git clone https://github.com/SEU_USUARIO/conversor-pdf-ofx.git ofix
sudo chown -R $USER:$USER /opt/ofix
cd /opt/ofix
```

> Substitua o URL pelo repositorio real do projeto.

### 3.2 Estrutura esperada apos o clone

```
/opt/ofix/
  conversor-python/
    convert.py
    requirements.txt
  frontend/ofix/
    app/
    server/
    scripts/
    nuxt.config.ts
    package.json
    .env.example
    temp/
  docs/
  README.md
```

---

## Fase 4: Configurar o ambiente Python (conversor)

### 4.1 Criar o ambiente virtual

```bash
cd /opt/ofix/conversor-python
python3.11 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 4.2 Testar o conversor

```bash
python convert.py --help 2>&1
# Se exibir "Uso: python3 convert.py <caminho_do_pdf>" o ambiente esta correto.
deactivate
```

> Em producao, o caminho do Python a ser usado no `.env` sera o do venv:
> `/opt/ofix/conversor-python/.venv/bin/python`

---

## Fase 5: Configurar o Redis via Docker

O Redis e iniciado de forma isolada via Docker. Nao precisa de configuracao adicional para o MVP.

### 5.1 Criar o arquivo docker-compose.yml para o Redis

```bash
cat > /opt/ofix/docker-compose.yml << 'EOF'
version: '3.9'

services:
  redis:
    image: redis:7-alpine
    container_name: ofix-redis
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis-data:
EOF
```

O Redis fica acessivel apenas localmente (`127.0.0.1`) — nunca exposto diretamente na internet.

### 5.2 Subir o Redis

```bash
cd /opt/ofix
docker compose up -d redis
docker compose ps       # status deve ser "healthy"
docker compose logs redis
```

---

## Fase 6: Configurar as variaveis de ambiente do Nuxt

### 6.1 Criar o arquivo .env de producao

```bash
cd /opt/ofix/frontend/ofix
cp .env.example .env
```

### 6.2 Editar o .env

```bash
nano .env
```

Conteudo do `.env` em producao (ajuste os valores):

```env
# Tamanho maximo do upload em MB
NUXT_MAX_UPLOAD_MB=20

# URL do Redis (Docker local)
NUXT_REDIS_URL=redis://127.0.0.1:6379

# Diretorio temporario para PDFs e OFXs gerados
# Usar caminho absoluto em producao
NUXT_TEMP_DIR=/opt/ofix/frontend/ofix/temp

# Tempo em horas para limpeza de arquivos temporarios
NUXT_CLEANUP_AGE_HOURS=24

# Timeout em ms para o processo Python
NUXT_PYTHON_JOB_TIMEOUT_MS=300000

# Caminho absoluto para o script Python de conversao
# Use o Python do venv para garantir as dependencias
NUXT_CONVERTER_SCRIPT_PATH=/opt/ofix/conversor-python/convert.py

# Segredo compartilhado entre o Worker e a API
# OBRIGATORIO: gere um valor aleatorio forte em producao
# Comando: openssl rand -hex 32
NUXT_WORKER_SECRET=SUBSTITUA_POR_VALOR_ALEATORIO_FORTE

# URL base da API (usada pelo worker para atualizar status)
NUXT_API_URL=http://127.0.0.1:3000
```

**Gerando o WORKER_SECRET seguro:**

```bash
openssl rand -hex 32
# Copie o resultado e cole no valor de NUXT_WORKER_SECRET
```

### 6.3 Proteger o arquivo .env

```bash
chmod 600 /opt/ofix/frontend/ofix/.env
```

---

## Fase 7: Instalar dependencias Node.js e fazer o build

### 7.1 Instalar dependencias

```bash
cd /opt/ofix/frontend/ofix
npm install
```

### 7.2 Build da aplicacao Nuxt

```bash
npm run build
```

O build gera a pasta `.output/` com o servidor Nitro pronto para producao:

```
frontend/ofix/.output/
  server/
    index.mjs      <- ponto de entrada do servidor
  public/
    ...            <- assets estaticos do frontend
```

> O build pode levar de 1 a 3 minutos. Se houver erros, verifique se todas as dependencias estao instaladas com `npm install`.

### 7.3 Verificar o build localmente

```bash
node .output/server/index.mjs &
curl http://localhost:3000/api/health
# Esperado: {"status":"ok",...} ou {"status":"degraded"} se Redis nao estiver conectado
kill %1
```

---

## Fase 8: Configurar o gerenciador de processos (PM2)

O PM2 garante que o servidor Nuxt e o Worker reiniciem automaticamente em caso de falha ou reinicializacao do servidor.

### 8.1 Instalar o PM2

```bash
npm install -g pm2
```

### 8.2 Criar o arquivo de configuracao do PM2

```bash
cat > /opt/ofix/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: 'ofix-server',
      cwd: '/opt/ofix/frontend/ofix',
      script: '.output/server/index.mjs',
      env_file: '.env',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '127.0.0.1',
      },
      error_file: '/var/log/ofix/server-error.log',
      out_file: '/var/log/ofix/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'ofix-worker',
      cwd: '/opt/ofix/frontend/ofix',
      script: 'scripts/worker.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx/esm',
      env_file: '.env',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/ofix/worker-error.log',
      out_file: '/var/log/ofix/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
EOF
```

> **Nota sobre o Worker em producao:** O `scripts/worker.ts` usa TypeScript e precisa do `tsx` para executar. Se preferir uma solucao mais robusta, compile o worker com `npx tsx build scripts/worker.ts` e aponte para o `.js` gerado.

### 8.3 Alternativa: compilar o worker antes de subir

```bash
cd /opt/ofix/frontend/ofix
npx tsx --tsconfig tsconfig.json scripts/worker.ts --outfile .output/worker.mjs 2>/dev/null || true
# Se nao compilar, o PM2 usa tsx diretamente (requer tsx instalado globalmente ou como dependencia)
```

Para garantir que o tsx esteja disponivel globalmente:

```bash
npm install -g tsx
```

### 8.4 Criar diretorio de logs

```bash
sudo mkdir -p /var/log/ofix
sudo chown $USER:$USER /var/log/ofix
```

### 8.5 Iniciar os processos com PM2

```bash
cd /opt/ofix
pm2 start ecosystem.config.cjs
pm2 status
```

Saida esperada:

```
┌─────────────────┬──────┬─────────┬─────┬──────────┐
│ name            │ id   │ status  │ cpu │ memory   │
├─────────────────┼──────┼─────────┼─────┼──────────┤
│ ofix-server     │ 0    │ online  │ 0%  │ 80mb     │
│ ofix-worker     │ 1    │ online  │ 0%  │ 50mb     │
└─────────────────┴──────┴─────────┴─────┴──────────┘
```

### 8.6 Configurar o PM2 para iniciar junto com o sistema

```bash
pm2 startup
# Execute o comando que o PM2 exibir (ex: sudo env PATH=... pm2 startup systemd ...)
pm2 save
```

---

## Fase 9: Configurar o Nginx como proxy reverso

O Nginx recebe as requisicoes HTTPS na porta 443, encaminha para o Nuxt (porta 3000) e serve os arquivos estaticos com eficiencia.

### 9.1 Instalar o Nginx

```bash
sudo apt install -y nginx
```

### 9.2 Criar a configuracao do site

Substitua `SEU_DOMINIO.com` pelo seu dominio real:

```bash
sudo nano /etc/nginx/sites-available/ofix
```

Conteudo do arquivo:

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO.com www.SEU_DOMINIO.com;

    # Redirect HTTP para HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name SEU_DOMINIO.com www.SEU_DOMINIO.com;

    # Certificados SSL (gerados pelo Certbot na Fase 10)
    ssl_certificate     /etc/letsencrypt/live/SEU_DOMINIO.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/SEU_DOMINIO.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Cabecalhos de seguranca
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Limite de tamanho do body (deve ser >= NUXT_MAX_UPLOAD_MB + margem)
    client_max_body_size 25M;

    # Timeout generoso para uploads e conversao
    proxy_read_timeout 360s;
    proxy_send_timeout 60s;
    proxy_connect_timeout 10s;

    # Proxy para o Nuxt/Nitro
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 9.3 Ativar o site e testar a configuracao

```bash
sudo ln -s /etc/nginx/sites-available/ofix /etc/nginx/sites-enabled/
sudo nginx -t
# Esperado: "syntax is ok" e "test is successful"
```

---

## Fase 10: Configurar SSL/HTTPS com Certbot (Let's Encrypt)

### 10.1 Instalar o Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 10.2 Garantir que o dominio aponta para o servidor

Antes de prosseguir, configure o DNS do seu dominio para apontar para o IP do servidor:

```
Tipo A:   SEU_DOMINIO.com       -> IP_DO_SERVIDOR
Tipo A:   www.SEU_DOMINIO.com   -> IP_DO_SERVIDOR
```

Aguarde a propagacao do DNS (pode levar ate 24h, mas geralmente e rapido).

Verificar:

```bash
dig SEU_DOMINIO.com +short
# Deve retornar o IP do servidor
```

### 10.3 Gerar o certificado SSL

```bash
sudo certbot --nginx -d SEU_DOMINIO.com -d www.SEU_DOMINIO.com
```

O Certbot edita automaticamente o arquivo do Nginx com os caminhos dos certificados.

### 10.4 Reiniciar o Nginx

```bash
sudo systemctl reload nginx
```

### 10.5 Verificar renovacao automatica

```bash
sudo certbot renew --dry-run
# Deve exibir "Congratulations, all simulated renewals succeeded"
```

O Certbot cria um cron ou systemd timer para renovar automaticamente antes da expiracao.

---

## Fase 11: Verificar o deploy completo

### 11.1 Checklist de verificacao

Execute cada verificacao antes de considerar o deploy concluido:

```bash
# 1. Redis respondendo
docker compose -f /opt/ofix/docker-compose.yml ps
docker exec ofix-redis redis-cli ping
# Esperado: PONG

# 2. Servidor Nuxt respondendo
curl -s http://127.0.0.1:3000/api/health | python3 -m json.tool
# Esperado: {"status":"ok","redis":"connected",...}

# 3. Nginx respondendo com HTTPS
curl -s https://SEU_DOMINIO.com/api/health | python3 -m json.tool

# 4. Worker rodando
pm2 status
# ofix-worker deve estar "online"

# 5. Logs sem erros criticos
pm2 logs ofix-server --lines 20
pm2 logs ofix-worker --lines 20

# 6. Certificado SSL valido
curl -vI https://SEU_DOMINIO.com 2>&1 | grep "SSL certificate verify"
# Esperado: "SSL certificate verify ok."
```

### 11.2 Teste funcional completo

1. Acesse `https://SEU_DOMINIO.com` no navegador.
2. Selecione um arquivo PDF de extrato bancario e clique em "Enviar PDF".
3. O status deve aparecer como "Aguardando" e depois "Processando".
4. Apos a conversao, o status muda para "Concluido" e o botao de download aparece.
5. Baixe o arquivo OFX e verifique o conteudo.
6. Abra uma aba anonima: a lista de arquivos deve estar vazia (isolamento por sessao).

---

## Fase 12: Atualizacoes e redeploy

Quando houver mudancas no codigo, siga este processo:

```bash
cd /opt/ofix

# 1. Puxar as mudancas
git pull origin main

# 2. Instalar novas dependencias (se houver)
cd frontend/ofix
npm install

# 3. Reconstruir a aplicacao
npm run build

# 4. Atualizar dependencias Python (se houver mudancas em requirements.txt)
cd /opt/ofix/conversor-python
source .venv/bin/activate
pip install -r requirements.txt
deactivate

# 5. Reiniciar os processos com zero-downtime
pm2 reload ofix-server
pm2 restart ofix-worker

# 6. Verificar saude
pm2 status
curl -s https://SEU_DOMINIO.com/api/health
```

---

## Fase 13: Configurar backups e limpeza automatica

### 13.1 A limpeza de arquivos temporarios ja esta configurada

O plugin `server/plugins/cleanup.ts` remove automaticamente arquivos com mais de `NUXT_CLEANUP_AGE_HOURS` horas da pasta `temp/`. Isso e ativado junto com o servidor Nuxt.

### 13.2 Verificar o espaco em disco periodicamente

```bash
# Ver tamanho da pasta temp
du -sh /opt/ofix/frontend/ofix/temp/

# Ver espaco total em disco
df -h /
```

### 13.3 Script de monitoramento de disco (opcional)

Crie um cron para alertar quando o disco estiver cheio:

```bash
crontab -e
```

Adicione:

```cron
0 * * * * df / | awk 'NR==2 {if ($5+0 > 80) print "ALERTA: disco " $5 " usado em " $6}' | mail -s "OFIX Disco" SEU_EMAIL@exemplo.com
```

---

## Fase 14: Monitoramento com PM2 e logs

### 14.1 Comandos uteis do PM2

```bash
# Ver status de todos os processos
pm2 status

# Ver logs em tempo real (todos os processos)
pm2 logs

# Ver logs de um processo especifico
pm2 logs ofix-server
pm2 logs ofix-worker

# Monitorar CPU e memoria em tempo real
pm2 monit

# Reiniciar um processo
pm2 restart ofix-server
pm2 restart ofix-worker

# Ver detalhes de um processo
pm2 show ofix-server
```

### 14.2 Rotacao de logs

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 14.3 Health check automatico (monitoramento externo)

Configure um servico externo para monitorar o health check (gratuitos: UptimeRobot, BetterStack):

- URL para monitorar: `https://SEU_DOMINIO.com/api/health`
- Metodo: GET
- Intervalo: 5 minutos
- Condicao de alerta: status diferente de 200 ou `"status":"ok"` ausente no corpo

---

## Resumo dos comandos mais usados

| Acao                              | Comando                                          |
|-----------------------------------|--------------------------------------------------|
| Iniciar todos os processos        | `pm2 start /opt/ofix/ecosystem.config.cjs`       |
| Ver status dos processos          | `pm2 status`                                     |
| Ver logs ao vivo                  | `pm2 logs`                                       |
| Recarregar servidor (sem downtime)| `pm2 reload ofix-server`                         |
| Reiniciar worker                  | `pm2 restart ofix-worker`                        |
| Ver status do Redis               | `docker compose -f /opt/ofix/docker-compose.yml ps` |
| Reiniciar Redis                   | `docker compose -f /opt/ofix/docker-compose.yml restart redis` |
| Health check da API               | `curl https://SEU_DOMINIO.com/api/health`        |
| Ver espaco em disco               | `df -h /`                                        |
| Tamanho da pasta temp             | `du -sh /opt/ofix/frontend/ofix/temp/`           |
| Renovar SSL manualmente           | `sudo certbot renew`                             |
| Testar configuracao Nginx         | `sudo nginx -t`                                  |
| Recarregar Nginx                  | `sudo systemctl reload nginx`                    |

---

## Variaveis de ambiente de producao (referencia rapida)

| Variavel                      | Valor exemplo em producao                             | Descricao                               |
|-------------------------------|-------------------------------------------------------|-----------------------------------------|
| `NUXT_MAX_UPLOAD_MB`          | `20`                                                  | Limite de upload em MB                  |
| `NUXT_REDIS_URL`              | `redis://127.0.0.1:6379`                              | URL do Redis                            |
| `NUXT_TEMP_DIR`               | `/opt/ofix/frontend/ofix/temp`                        | Caminho absoluto da pasta temporaria    |
| `NUXT_CLEANUP_AGE_HOURS`      | `24`                                                  | Horas para limpeza de arquivos          |
| `NUXT_PYTHON_JOB_TIMEOUT_MS`  | `300000`                                              | Timeout do Python em ms (5 minutos)     |
| `NUXT_CONVERTER_SCRIPT_PATH`  | `/opt/ofix/conversor-python/convert.py`               | Caminho absoluto do script Python       |
| `NUXT_WORKER_SECRET`          | `<valor gerado com openssl rand -hex 32>`             | Segredo do worker (TROCAR em producao)  |
| `NUXT_API_URL`                | `http://127.0.0.1:3000`                               | URL interna da API (worker -> Nitro)    |

---

## Observacoes finais de seguranca para producao

1. **Nunca suba o `.env` no repositorio Git.** O `.gitignore` ja deve excluir esse arquivo.
2. **Troque o `NUXT_WORKER_SECRET`** por um valor gerado com `openssl rand -hex 32` antes do primeiro deploy.
3. **O Redis nao deve ser acessivel pela internet.** A configuracao do `docker-compose.yml` ja o vincula em `127.0.0.1`.
4. **Mantenha o sistema operacional atualizado** com `sudo apt update && sudo apt upgrade -y` regularmente.
5. **Considere um firewall** para bloquear portas desnecessarias:
   ```bash
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```
6. **A pasta `temp/` nao deve ser servida diretamente** pelo Nginx. A configuracao acima ja garante isso, pois tudo passa pelo proxy do Nuxt.
7. **Logs nao devem conter dados sensiveis.** O sistema ja foi projetado para nao logar conteudo de arquivos ou dados pessoais.

---

## Referencias

- Documentacao do projeto: [PLANO_CONVERSAO_PDF_OFX.md](PLANO_CONVERSAO_PDF_OFX.md)
- Backend e API: [BACKEND_ETAPAS.md](BACKEND_ETAPAS.md)
- Nuxt deploy: https://nuxt.com/docs/getting-started/deployment
- PM2 documentacao: https://pm2.keymetrics.io/docs/usage/quick-start/
- Certbot Nginx: https://certbot.eff.org/instructions?os=ubuntufocal&certtype=nginx
- Redis Docker: https://hub.docker.com/_/redis
