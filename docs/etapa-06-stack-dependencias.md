# Etapa 6: Stack tecnica e dependencias

Este documento lista a stack tecnica e as dependencias do frontend, backend, servico de conversao em Python e infraestrutura.

---

## 6.1 Frontend

- Vue 3, Nuxt 3, TypeScript.
- Bootstrap 5 para layout e componentes (interface simples: upload + listagem/download).
- Cliente HTTP: ofetch (Nuxt) ou axios para chamadas à API.
- Validacao de arquivo no cliente: tipo MIME e tamanho antes do envio.

---

## 6.2 Backend

- Node.js 20 LTS ou superior.
- Framework: Express ou Fastify.
- Upload multipart: multer ou equivalente (Fastify multipart).
- Fila: Bull ou BullMQ com Redis.
- Invocacao do Python: modulo `child_process` (spawn) ou cliente HTTP se o conversor for exposto como API interna.
- Variaveis de ambiente: `MAX_UPLOAD_MB`, `REDIS_URL`, `TEMP_DIR`, `CLEANUP_AGE_HOURS`, etc.

---

## 6.3 Servico de conversao (Python)

- Python 3.11 ou superior.
- Leitura de PDF: pdfplumber ou PyMuPDF (pymupdf).
- Geracao OFX: template manual (strings/arquivo) ou biblioteca OFX disponivel na comunidade.
- Ambiente virtual (venv) e `requirements.txt` com versoes fixas para reprodutibilidade.

---

## 6.4 Infraestrutura

- Redis para a fila de jobs (obrigatorio no modelo assincrono).
- Proxy reverso (Nginx ou similar) opcional: terminar TLS, limitar tamanho do body (`client_max_body_size`) e rotear para a API.
- Armazenamento: disco local ou volume persistente para arquivos temporarios; politica de limpeza obrigatoria.

---

## Fases de desenvolvimento (Etapa 6)

| Fase | Descricao | Entregavel |
|------|-----------|------------|
| 6.1 | Criar projeto frontend (Nuxt 3 + TypeScript + Bootstrap 5); configurar ofetch/axios | Projeto e config |
| 6.2 | Registrar dependencias do frontend (package.json); validacao de arquivo no cliente | Dependencias e codigo |
| 6.3 | Criar projeto backend (Node 20+, Express ou Fastify); multer/multipart, Bull/BullMQ | Projeto e config |
| 6.4 | Registrar dependencias do backend e variaveis de ambiente (.env.example) | Dependencias e doc |
| 6.5 | Criar projeto Python (venv, requirements.txt); pdfplumber ou PyMuPDF; geracao OFX | Projeto e dependencias |
| 6.6 | Configurar Redis (local ou Docker) e documentar REDIS_URL | Config e doc |
| 6.7 | Documentar uso opcional de Nginx (TLS, client_max_body_size) | Documentacao |
| 6.8 | Revisar esta etapa antes de iniciar a Etapa 7 (Ambientes) | Checklist de conclusao da Etapa 6 |
