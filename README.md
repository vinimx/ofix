# OFIX - Conversor de Extratos PDF para OFX

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11%2B-blue)](https://www.python.org/)
[![Redis](https://img.shields.io/badge/Redis-7%2B-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3-4FC08D?logo=vue.js)](https://vuejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

**Sistema web moderno para conversão de extratos bancários em PDF para o formato OFX** (Open Financial Exchange), utilizando arquitetura em tempo real com fila assíncrona, validação robusta e segurança de nível production.

---

## 🎯 Características

- ✅ **Upload simplificado** de PDFs com drag-and-drop
- ✅ **Processamento assíncrono** com fila BullMQ + Redis
- ✅ **Conversão PDF → OFX** via Python (pdfplumber)
- ✅ **Validação de segurança**: magic bytes, sanitização, rate limiting
- ✅ **API REST** com health check e endpoints bem definidos
- ✅ **Docker** pronto para deployment (Render.com)
- ✅ **Sessões anônimas** com cookies HttpOnly
- ✅ **TypeScript** em todo o stack

---

## 📋 Requisitos

| Ferramenta | Versão | Link |
|---|---|---|
| **Node.js** | 20 LTS+ | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.11+ | [python.org](https://www.python.org/) |
| **Redis** | 7+ | [redis.io](https://redis.io/) |
| **npm** | 9+ | (incluído com Node.js) |
| **Docker** | Latest | [docker.com](https://www.docker.com/) (opcional) |

---

## 📁 Estrutura do Projeto

```
conversor-pdf-ofx/
├── frontend/ofix/                 # Aplicação Nuxt 4 (frontend + backend Nitro)
│   ├── app/
│   │   ├── components/            # Componentes Vue reutilizáveis
│   │   │   ├── Upload/            # Upload de PDF com validação
│   │   │   ├── JobList/           # Listagem de jobs com status
│   │   │   ├── Hero/              # Landing section
│   │   │   └── Footer/
│   │   ├── pages/                 # Páginas da aplicação
│   │   ├── assets/css/            # Estilos globais (Bootstrap 5)
│   │   └── app.vue                # Root component
│   ├── server/
│   │   ├── api/                   # Endpoints REST (Nitro)
│   │   │   ├── upload.post.ts     # POST /api/upload
│   │   │   ├── health.get.ts      # GET /api/health
│   │   │   └── jobs/              # GET/PATCH /api/jobs/:id
│   │   ├── utils/                 # Validação, sanitização, config
│   │   ├── services/              # Orquestração de jobs e fila
│   │   ├── middleware/            # Rate limiting
│   │   └── plugins/               # Cleanup automático de arquivos
│   ├── scripts/
│   │   └── worker.ts              # Worker BullMQ (processo separado)
│   ├── temp/                      # Arquivos temporários (PDF/OFX)
│   ├── nuxt.config.ts             # Configuração Nuxt + Nitro
│   ├── package.json               # Dependências Node
│   ├── tsconfig.json              # TypeScript config
│   └── .env.example               # Template de variáveis
│
├── conversor-python/              # Módulo de conversão PDF → OFX
│   ├── convert.py                 # Script principal (pdfplumber)
│   ├── requirements.txt           # Dependências Python
│   └── venv/                      # Virtual environment
│
├── Dockerfile                      # Multi-stage build para production
├── render.yaml                    # Infrastructure-as-Code (Render.com)
├── start.sh                       # Entrypoint do container
├── .gitignore                     # Git ignore rules
└── README.md                      # Este arquivo
```

---

## 🛠️ Stack Tecnológico

---

## 🛠️ Stack Tecnológico

### Frontend
- **[Vue.js 3](https://vuejs.org/)** - Reactive UI framework
- **[Nuxt 4](https://nuxt.com/)** - Full-stack Vue framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Bootstrap 5](https://getbootstrap.com/)** - CSS framework
- **[Vite](https://vitejs.dev/)** - Build tool (integrado no Nuxt)

### Backend (Nitro/Node.js)
- **[Nuxt/Nitro](https://nitro.unjs.io/)** - Lightweight server framework
- **[h3](https://h3.unjs.io/)** - HTTP utilities (readMultipartFormData, createError)
- **[BullMQ](https://bullmq.io/)** - Job queue library
- **[ioredis](https://github.com/luin/ioredis)** - Redis client
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety

### Conversor PDF → OFX
- **[Python 3.11+](https://www.python.org/)**
- **[pdfplumber](https://github.com/jamesturk/pdfplumber)** - Leitura de PDF
- **[openpyxl](https://openpyxl.readthedocs.io/)** - Processamento de dados

### Infraestrutura & DevOps
- **[Redis 7+](https://redis.io/)** - In-memory data store (fila e cache)
- **[Docker](https://www.docker.com/)** - Containerização
- **[Render.com](https://render.com/)** - Deploy em produção (suportado)

---

## 🚀 Guia de Instalação

### 1. Variaveis de Ambiente

```bash
cd frontend/ofix
cp .env.example .env
```

Configure o `.env`:

```env
# Node.js
NODE_ENV=development

# Server
NUXT_MAX_UPLOAD_MB=20
NUXT_REDIS_URL=redis://localhost:6379
NUXT_TEMP_DIR=./temp
NUXT_CLEANUP_AGE_HOURS=24

# Python
NUXT_PYTHON_JOB_TIMEOUT_MS=300000
NUXT_CONVERTER_SCRIPT_PATH=../../conversor-python/convert.py

# Security
NUXT_WORKER_SECRET=dev-worker-secret-change-in-prod
NUXT_API_URL=http://localhost:3000
```

### 2. Dependências Node

```bash
cd frontend/ofix
npm install
```

**Dependências principais:**
- `nuxt@^4.x`
- `bullmq@^5.0.0` - Job queue
- `ioredis@^5.4.0` - Redis client
- `uuid@^9.0.0` - Geração de IDs únicos
- `tsx@^4.7.0` - TypeScript executor (dev)

### 3. Dependências Python

```bash
cd conversor-python
python3 -m venv venv

# Linux/Mac:
source venv/bin/activate

# Windows:
venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt
```

**Dependências:**
- `pdfplumber` - Extração de dados de PDFs
- `openpyxl` - Processamento de OFX

### 4. Redis (Local)

**Opção 1: Docker**
```bash
docker run -d \
  --name redis-ofix \
  -p 6379:6379 \
  redis:7-alpine
```

**Opção 2: Sistema operacional**
- macOS: `brew install redis`
- Ubuntu/Debian: `sudo apt install redis-server`
- Windows: [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/)

---

## 💻 Executando Localmente

### Terminal 1: Redis (se não estiver em background)

```bash
redis-server
```

### Terminal 2: Servidor Nuxt (Frontend + API)

```bash
cd frontend/ofix
npm run dev
```

Acesse: **http://localhost:3000**

### Terminal 3: Worker (Processamento de jobs)

```bash
cd frontend/ofix
npm run worker
```

O worker escuta na fila BullMQ e invoca o conversor Python para cada upload.

---

## 📡 Endpoints da API

| Endpoint | Metodo | Descricao | Request | Response |
|---|---|---|---|---|
| `/api/upload` | POST | Upload de PDF (multipart) | `Content-Type: multipart/form-data`<br/>Campo: `file` (PDF) | `{ jobId: string }` |
| `/api/jobs` | GET | Listar jobs da sessão | - | `{ jobs: JobRecord[] }` |
| `/api/jobs/:id` | GET | Status de um job | - | `{ id, status, originalName, downloadAvailable, error? }` |
| `/api/jobs/:id/download` | GET | Download do OFX | - | `File (OFX via attachment)` |
| `/api/jobs/:id/status` | PATCH | Atualizar status (worker) | `{ status, ofxPath?, error? }` | `{ ok: true }` |
| `/api/health` | GET | Health check | - | `{ status, redis, timestamp }` |

### Exemplo: Upload via cURL

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@extrato.pdf"

# Resposta:
# {"jobId":"550e8400-e29b-41d4-a716-446655440000"}
```

### Exemplo: Consultar Status

```bash
curl http://localhost:3000/api/jobs/550e8400-e29b-41d4-a716-446655440000

# Resposta:
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "status": "completed",
#   "originalName": "extrato-janeiro.pdf",
#   "createdAt": "2026-02-23T10:30:00Z",
#   "downloadAvailable": true
# }
```

---

## ⚙️ Variáveis de Ambiente

## ⚙️ Variáveis de Ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `NUXT_MAX_UPLOAD_MB` | `20` | Tamanho máximo de upload (MB) |
| `NUXT_REDIS_URL` | `redis://localhost:6379` | URL de conexão ao Redis |
| `NUXT_TEMP_DIR` | `./temp` | Diretório de arquivos temporários |
| `NUXT_CLEANUP_AGE_HOURS` | `24` | Horas para limpeza automática |
| `NUXT_PYTHON_JOB_TIMEOUT_MS` | `300000` | Timeout do conversor Python (5 min) |
| `NUXT_CONVERTER_SCRIPT_PATH` | _(vazio)_ | Caminho para `convert.py` |
| `NUXT_WORKER_SECRET` | `dev-worker-secret-change-in-prod` | Segredo compartilhado (worker) |
| `NUXT_API_URL` | `http://localhost:3000` | URL interna da API |
| `NODE_ENV` | `development` | Ambiente (development/production) |

---

## 🔒 Segurança

### Validação de Upload
- ✅ **Magic bytes**: Valida assinatura `%PDF-` (primeiros 4 bytes)
- ✅ **Extensão**: Apenas `.pdf` permitido
- ✅ **Tamanho**: Limite configurável (padrão 20 MB)
- ✅ **Rate limiting**: 10 requisições/IP/minuto no endpoint de upload

### Proteção de Dados
- ✅ **Nomes de arquivo**: Sanitizados (sem path traversal)
- ✅ **Armazenamento**: UUID para arquivo local (nomes internos nunca expostos)
- ✅ **Sessões**: Cookies HttpOnly + SameSite=Lax (CSRF protection)
- ✅ **Worker auth**: Segredo compartilhado para endpoints internos
- ✅ **Limpeza**: Arquivos temporários removidos após 24h (configurável)

### Infraestrutura
- ✅ **Sem dados sensíveis em logs**: Apenas IDs, tamanhos, status
- ✅ **Timeout**: Proteção contra PDF bombs (300 segundos padrão)
- ✅ **Sem eval/exec**: Conversor Python usa apenas bibliotecas seguras

---

## 🐳 Docker & Deployment

### Build Local

```bash
docker build -t ofix:latest .
```

### Rodar Localmente

```bash
docker run -d \
  --name ofix \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e NUXT_REDIS_URL=redis://host.docker.internal:6379 \
  -e NUXT_CONVERTER_SCRIPT_PATH=/app/conversor-python/convert.py \
  ofix:latest
```

### Deploy no Render.com

O projeto inclui `render.yaml` pronto para deploy (Infrastructure-as-Code). Apenas:

1. Push para GitHub
2. Conecte o repositório no Render
3. Render detectará `render.yaml` automaticamente
4. Configure variáveis de produção
5. Deploy feito!

**Recursos no Render:**
- Web service (Node.js + Python automático via Dockerfile)
- Redis persistente (25 MB no plano gratuito)
- Volume persistente para `/temp/` (armazena OFXs)

Veja [render.yaml](render.yaml) para detalhes da configuração.

---

## 🔄 Fluxo de Processamento

```
┌─────────────────┐
│  Frontend (Vue) │
│   (Upload PDF)  │
└────────┬────────┘
         │ POST /api/upload
         │ (multipart/form-data)
         ▼
┌─────────────────────────────┐
│ Backend API (Nitro)         │
│ ├─ Validação (magic bytes)  │
│ ├─ Sanitização              │
│ ├─ Gravação em disco (UUID) │
│ └─ Enfileiramento BullMQ    │
└────────┬────────────────────┘
         │ jobId
         ▼
┌─────────────────────┐
│ Fila BullMQ (Redis) │ ◄── Worker polling
└────────┬────────────┘
         │
         ▼
┌──────────────────────┐
│ Worker (Node.js)     │
│ ├─ Consome job      │
│ ├─ Invoca Python    │
│ └─ Atualiza status  │
└────────┬─────────────┘
         │
         ▼
┌─────────────────────────┐
│ Conversor Python        │
│ ├─ pdfplumber (extrai) │
│ ├─ Processa dados      │
│ └─ Gera OFX           │
└────────┬────────────────┘
         │ ofx_path (stdout)
         ▼
┌────────────────────────────┐
│ Frontend (GET /api/jobs/:id)
│├─ Polling status           │
│├─ Download OFX quando ready│
└────────────────────────────┘
```

---

## 📊 Scripts npm

```bash
# Desenvolvimento
npm run dev          # Servidor Nuxt + Nitro em dev
npm run build        # Build para produção
npm run worker       # Worker BullMQ (processo separado)

# Produção
npm run preview      # Pré-visualizar build
```

---

## 📝 Limites e configuracoes

---

## 🎯 Performance & Escalabilidade

| Métrica | Alvo | Nota |
|---|---|---|
| **Upload response** | <2s | Sem processar PDF no request |
| **Job processing** | <5 min | Timeout configurável por PDF |
| **Max upload** | 20 MB | Limite de segurança |
| **Redis queue** | Escalável | Workers podem ser adicionados |
| **Concurrent jobs** | N workers | Ajuste conforme CPU/RAM |

---

## 🧪 Testando a API

### 1. Health Check
```bash
curl http://localhost:3000/api/health
```

### 2. Upload PDF
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@seu-extrato.pdf"
```

### 3. Listar Jobs
```bash
curl http://localhost:3000/api/jobs
```

### 4. Status do Job
```bash
curl http://localhost:3000/api/jobs/{jobId}
```

### 5. Download OFX
```bash
curl -O http://localhost:3000/api/jobs/{jobId}/download
```

---

## 📚 Estrutura de Código

### Frontend (Vue 3)

```
app/components/
├── Upload/          # Campo de upload com validação
├── JobList/         # Lista dinâmica de jobs
├── Hero/            # Landing section
└── Footer/          # Rodapé

pages/
└── index.vue        # Página principal
```

### Backend (Nitro/TypeScript)

```
server/utils/
├── config.ts        # Runtime config derivada
├── errors.ts        # Tratamento de erros padronizado
├── sanitize.ts      # Sanitização de nomes
├── validatePdf.ts   # Validação de magic bytes
└── session.ts       # Gerenciamento de sessão anônima

server/services/
├── jobs.ts          # CRUD de jobs (Map em memória)
└── queue.ts         # Integração BullMQ + Redis

server/api/
├── upload.post.ts   # POST /api/upload
├── health.get.ts    # GET /api/health
├── jobs/index.get.ts    # GET /api/jobs
├── jobs/[id].get.ts     # GET /api/jobs/:id
├── jobs/[id]/download.get.ts   # GET /api/jobs/:id/download
└── jobs/[id]/status.patch.ts   # PATCH /api/jobs/:id/status

server/middleware/
└── rate-limit.ts    # Rate limiting por IP

server/plugins/
└── cleanup.ts       # Limpeza automática de arquivos antigos
```

### Python

```
conversor-python/
├── convert.py       # Script principal
│   ├── read_pdf()       # Lê e extrai dados
│   ├── parse_transactions() # Parser customizável
│   └── generate_ofx()   # Gera arquivo OFX
└── requirements.txt # Dependências
```

---

## 🔧 Troubleshooting

### Redis não conecta
```bash
# Verificar se está rodando
redis-cli ping
# Saída esperada: PONG

# Se não estiver rodando:
redis-server  # Linux/Mac
# ou
docker run -p 6379:6379 redis:7-alpine  # Docker
```

### Worker não processa arquivos
1. Verifique se o worker está rodando: `npm run worker`
2. Confirme `NUXT_CONVERTER_SCRIPT_PATH` apontando para `convert.py`
3. Verifique Python: `python3 --version`
4. Verifique logs do worker: `npm run worker 2>&1 | tee worker.log`

### API retorna 503
- Redis desconectou: Execute health check (`curl http://localhost:3000/api/health`)
- Reinicie Redis e o servidor Nuxt

### Upload falha com 422
- PDF não é válido (corrupção ou não é PDF real)
- Use `file` comando para verificar: `file meu-arquivo.pdf`

---

## 📖 Documentação Adicional

Projetos podem consultar a documentação interna (anteriormente em `docs/`):
- **PLANO_CONVERSAO_PDF_OFX.md** - Planejamento completo do projeto
- **BACKEND_ETAPAS.md** - Guia passo a passo do backend
- Arquivos de cada etapa de desenvolvimento

Para acessar, contate o mantedor do repositório.

---

## 🤝 Contribuindo

Melhorias são bem-vindas! Por favor:

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/sua-feature`)
3. Commit suas mudanças (`git commit -m 'feat: descrição'`)
4. Push para a branch (`git push origin feature/sua-feature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é licenciado sob a [MIT License](LICENSE).

---

## 👨‍💻 Autor

**Vinicius** - [@vinimx](https://github.com/vinimx)

---

## 🙋 Suporte

Para dúvidas ou problemas:
- Abra uma **issue** no GitHub
- Verifique a seção Troubleshooting acima
- Consulte os logs (Redis, Nuxt, Worker)

---

**Última atualização:** Fevereiro de 2026  
**Versão:** 1.0.0

---

## 📝 Limites e configuracoes
