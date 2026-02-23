# Etapa 7: Ambientes (desenvolvimento, homologacao e producao)

Este documento define as configuracoes e praticas para os ambientes de desenvolvimento, homologacao e producao.

---

## 7.1 Desenvolvimento

- Variaveis de ambiente documentadas em `.env.example` (sem segredos reais). Cada desenvolvedor copia para `.env` e preenche valores locais.
- Backend e frontend rodando em maquina local (ou containers). Redis local ou via Docker. Python em venv no projeto do conversor.
- Limite de upload e timeouts podem ser iguais ou menores que producao para facilitar testes. Logs em nivel debug quando necessario.

---

## 7.2 Homologacao

- Ambiente o mais proximo possivel de producao: mesmo limite de upload, timeouts, uso de fila e Redis. Dados de teste; sem dados reais de usuarios.
- Execucao de testes E2E contra a API e o frontend (upload, consulta de status, download). Validar tambem cenarios de erro (arquivo grande, PDF invalido, timeout).

---

## 7.3 Producao

- HTTPS obrigatorio. Variaveis de ambiente carregadas de forma segura (gerenciador de segredos ou env do ambiente).
- Logs estruturados (JSON ou padrao definido), sem dados sensiveis. Health checks para a API (`/health`) e para dependencias (Redis). Limite de upload e timeouts configurados conforme secao 3. Política de limpeza de arquivos temporarios ativa e monitorada.

---

## Fases de desenvolvimento (Etapa 7)

| Fase | Descricao | Entregavel |
|------|-----------|------------|
| 7.1 | Criar e manter .env.example com todas as variaveis necessarias (sem valores reais) | Arquivo .env.example |
| 7.2 | Documentar passos para rodar em desenvolvimento (README): backend, frontend, Redis, Python | README de desenvolvimento |
| 7.3 | Configurar ambiente de homologacao: mesmo limites e timeouts de prod; Redis e fila | Ambiente homolog e doc |
| 7.4 | Executar e documentar testes E2E em homologacao; cenarios de sucesso e erro | Testes E2E e evidencia |
| 7.5 | Documentar requisitos de producao: HTTPS, segredos, logs, health checks, limpeza | Documento de producao |
| 7.6 | Implementar health check (/health) e verificacao de Redis | Codigo e testes |
| 7.7 | Revisar esta etapa antes de iniciar a Etapa 8 (Tratamento de erros) | Checklist de conclusao da Etapa 7 |
