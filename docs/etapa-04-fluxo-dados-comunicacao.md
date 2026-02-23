# Etapa 4: Fluxo de dados e comunicacao

Este documento descreve o fluxo passo a passo do upload ate o download e o contrato da API (endpoints, metodos, respostas).

---

## 4.1 Passo a passo do fluxo

1. **Usuario seleciona o PDF no frontend.** O cliente valida tipo (PDF) e tamanho (ate o limite em MB configurado) no navegador e exibe feedback imediato em caso de erro.
2. **Frontend envia o arquivo** via `POST` multipart para o endpoint do backend (ex.: `POST /api/upload`). Incluir nome original do arquivo apenas para exibicao; o backend nao confia nesse valor para decisões de seguranca.
3. **Backend valida** Content-Type, extensao (.pdf), tamanho e assinatura (magic bytes `%PDF-`). Rejeita com 400/422 se invalido. Sanitiza o nome do arquivo (sem path traversal, caracteres especiais).
4. **Backend grava** o arquivo em disco temporario com nome unico (UUID) e enfileira um job (ou inicia processamento sincrono se politicas assim definirem).
5. **Worker** (processo Node que consome a fila) obtem o job, invoca o conversor Python passando o caminho do PDF. O Python le o PDF, extrai transacoes, gera o OFX e grava em arquivo. O worker atualiza o status do job e associa o caminho do OFX (ou move para local padrao com ID do job).
6. **Backend expoe** o download (ex.: `GET /api/files/:id/download` ou `/api/jobs/:id/download`) com verificacao de existencia do arquivo e, se necessario, token efemero ou sessao. Nao expor caminhos internos.
7. **Frontend** lista jobs/arquivos (ex.: `GET /api/jobs` ou `/api/files`) e exibe link de download para jobs com status concluido. Apos expiracao ou politica de limpeza, arquivos sao removidos.

---

## 4.2 Contrato da API (resumo)

| Endpoint | Metodo | Descricao | Respostas principais |
|----------|--------|------------|----------------------|
| `/api/upload` | POST | Upload de PDF (multipart) | 200/201 (jobId), 400 (invalido), 413 (tamanho), 422 (validacao) |
| `/api/jobs` | GET | Listagem de jobs do usuario/sessao | 200 (lista de jobs com status e links) |
| `/api/jobs/:id` | GET | Status e detalhes de um job | 200 (status, progresso, link download se concluido), 404 |
| `/api/jobs/:id/download` | GET | Download do arquivo OFX | 200 (attachment), 404, 410 (expirado) |

Respostas de erro em JSON com codigo e mensagem generica; detalhes tecnicos apenas em logs. Autenticacao e autorizacao (se aplicavel) via header ou cookie, documentados separadamente.

---

## Fases de desenvolvimento (Etapa 4)

| Fase | Descricao | Entregavel |
|------|-----------|------------|
| 4.1 | Documentar fluxo completo (7 passos) e validar com frontend e backend | Documento de fluxo aprovado |
| 4.2 | Especificar contrato da API: payloads de request/response para upload, listagem, status, download | Especificacao OpenAPI ou equivalente |
| 4.3 | Implementar no frontend: validacao tipo/tamanho, envio multipart, listagem e download | Codigo frontend |
| 4.4 | Implementar no backend: validacao, gravacao UUID, enfileiramento, endpoints de listagem e download | Codigo backend |
| 4.5 | Implementar worker: consumo da fila, invocacao Python, atualizacao de status e associacao do OFX | Codigo worker |
| 4.6 | Testar fluxo ponta a ponta (upload, status, download) e cenarios de erro | Testes E2E e evidencia |
| 4.7 | Revisar esta etapa antes de iniciar a Etapa 5 (Seguranca) | Checklist de conclusao da Etapa 4 |
