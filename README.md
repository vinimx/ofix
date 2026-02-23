# OFIX - Conversor de Extratos PDF para OFX

Sistema web para conversao de extratos bancarios em PDF para o formato OFX, compativel com aplicativos de controle financeiro e contabilidade.

## Estrutura do projeto

```
conversor-pdf-ofx/
  frontend/ofix/       # Aplicacao Nuxt 4 (frontend + backend Nitro)
    app/               # Componentes Vue, paginas, assets
    server/            # API Nitro (upload, jobs, health, middlewares, plugins)
    scripts/           # Worker BullMQ (processo separado)
    temp/              # Arquivos temporarios (PDF e OFX gerados)
    .env.example       # Variaveis de ambiente documentadas
  conversor-python/    # Conversor Python (PDF -> OFX)
    convert.py         # Script de conversao
    requirements.txt   # Dependencias Python
  docs/                # Documentacao e planos de desenvolvimento
```

## Requisitos

- Node.js 20 LTS ou superior
- Python 3.11 ou superior
- Redis 7 ou superior
- npm 9+

## Configuracao do ambiente

### 1. Variaveis de ambiente

```bash
cd frontend/ofix
cp .env.example .env
# Edite .env com os valores do seu ambiente
```

### 2. Instalar dependencias Node

```bash
cd frontend/ofix
npm install
```

### 3. Instalar dependencias Python

```bash
cd conversor-python
python3 -m venv venv
source venv/bin/activate      # Linux/Mac
# ou: venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

### 4. Iniciar Redis

```bash
# Via Docker:
docker run -d -p 6379:6379 redis:7-alpine

# Ou instale localmente conforme seu sistema operacional
```

## Executando em desenvolvimento

### Servidor Nuxt (frontend + API)

```bash
cd frontend/ofix
npm run dev
```

Acesse: http://localhost:3000

### Worker de conversao (processo separado)

Em outro terminal:

```bash
cd frontend/ofix
npm run worker
```

O worker consome a fila BullMQ e invoca o conversor Python para cada job.

## Endpoints da API

| Endpoint | Metodo | Descricao |
|---|---|---|
| `/api/upload` | POST | Upload de PDF (multipart, campo `file`) |
| `/api/jobs` | GET | Listagem de todos os jobs |
| `/api/jobs/:id` | GET | Status e detalhes de um job |
| `/api/jobs/:id/download` | GET | Download do OFX gerado |
| `/api/health` | GET | Health check (Redis + API) |

## Limites e configuracoes

| Variavel | Padrao | Descricao |
|---|---|---|
| `NUXT_MAX_UPLOAD_MB` | `20` | Tamanho maximo do PDF em MB |
| `NUXT_REDIS_URL` | `redis://localhost:6379` | URL do Redis |
| `NUXT_TEMP_DIR` | `./temp` | Diretorio de arquivos temporarios |
| `NUXT_CLEANUP_AGE_HOURS` | `24` | Horas para remocao de arquivos antigos |
| `NUXT_PYTHON_JOB_TIMEOUT_MS` | `300000` | Timeout do conversor Python (ms) |
| `NUXT_CONVERTER_SCRIPT_PATH` | _(vazio)_ | Caminho para o `convert.py` |

## Seguranca

- Validacao de tipo (magic bytes `%PDF-`), extensao e tamanho no backend
- Sanitizacao do nome do arquivo (sem path traversal)
- Rate limiting: 10 requisicoes por IP a cada 60 segundos no endpoint de upload
- Arquivos armazenados com nome UUID; caminhos internos nunca expostos ao cliente
- Limpeza automatica de arquivos temporarios com mais de 24 horas

## Conversor Python

O script `conversor-python/convert.py` recebe o caminho do PDF como argumento, extrai transacoes e gera o arquivo OFX no mesmo diretorio. O caminho do OFX gerado e impresso no stdout para o worker capturar.

```bash
python3 conversor-python/convert.py /caminho/para/extrato.pdf
```

O layout de extracao e baseado em linhas com formato `DD/MM/AAAA descricao valor`. Para suportar outros layouts bancarios, edite a funcao `parse_transactions` em `convert.py`.
