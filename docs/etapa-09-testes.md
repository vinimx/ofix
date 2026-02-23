# Etapa 9: Testes

Este documento define a estrategia de testes: frontend (unitarios), backend (unitarios e integracao), conversor Python (unitarios) e testes E2E.

---

## 9.1 Frontend

- Testes unitarios para componentes de upload (validacao de tipo e tamanho no cliente) e de listagem (exibicao de status e link de download). Ambiente de testes com mocks da API.

---

## 9.2 Backend

- Testes unitarios: validadores (magic bytes, extensao, tamanho, sanitizacao de nome), orquestracao (gravacao em disco, enfileiramento). Mock do conversor Python (arquivo fixo ou stub).
- Testes de integracao: upload real para endpoint, gravacao em disco, insercao na fila; consumo do job com mock do Python e verificacao de status e arquivo OFX gerado.

---

## 9.3 Conversor Python

- Testes unitarios: extracao de texto/dados de PDFs de exemplo (anonimizados) e geracao do OFX. Casos de PDF corrompido ou formato inesperado devem falhar de forma controlada e reportar erro claro.

---

## 9.4 Testes E2E

- Fluxo completo em ambiente de homologacao: upload de PDF valido, aguardar processamento (polling), download do OFX e validacao basica do conteudo. Cenarios de erro: arquivo acima do limite, arquivo que nao e PDF, timeout (se aplicavel).

---

## Fases de desenvolvimento (Etapa 9)

| Fase | Descricao | Entregavel |
|------|-----------|------------|
| 9.1 | Configurar ambiente de testes do frontend (Vitest/Jest, mocks da API) | Config e mocks |
| 9.2 | Escrever testes unitarios dos componentes de upload (tipo, tamanho) e listagem (status, download) | Testes frontend |
| 9.3 | Configurar ambiente de testes do backend; mock do conversor Python | Config e mocks |
| 9.4 | Escrever testes unitarios dos validadores (magic bytes, extensao, tamanho, nome) e orquestracao | Testes backend |
| 9.5 | Escrever testes de integracao: upload, fila, worker com mock Python, status e OFX | Testes integracao |
| 9.6 | Configurar e escrever testes unitarios do conversor Python (PDF exemplo, OFX, corrompido) | Testes Python |
| 9.7 | Implementar testes E2E: fluxo completo e cenarios de erro em homologacao | Testes E2E e doc |
| 9.8 | Revisar esta etapa antes de iniciar a Etapa 10 (Performance e monitoramento) | Checklist de conclusao da Etapa 9 |
