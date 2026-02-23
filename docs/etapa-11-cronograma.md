# Etapa 11: Cronograma sugerido (etapas sequenciais)

Este documento lista as nove etapas sequenciais do cronograma de desenvolvimento, da configuracao do repositorio ate o deploy em producao.

---

## Etapas do cronograma

1. **Configuracao do repositorio e ambientes**: estrutura de pastas (frontend, backend, conversor Python), arquivos de dependencias (package.json, requirements.txt), `.env.example`, e documentacao minima para rodar em desenvolvimento (README).

2. **Definicao da API e contrato**: especificar endpoints (upload, listagem, status, download), formatos de request/response e formato de dados entre backend e Python (caminhos, codigos de saida).

3. **Implementacao do servico de conversao em Python**: leitura de PDF com biblioteca escolhida, extracao de transacoes para um layout piloto, geracao do OFX e testes unitarios com amostras.

4. **Implementacao do backend**: endpoints de upload com validacao e sanitizacao, gravacao em disco temporario, integracao com fila Redis, worker que invoca o Python e atualiza status; endpoints de listagem e download.

5. **Implementacao do frontend**: tela de upload (campo unico, feedback de progresso/erro) e area de listagem com status e download; integracao com a API (ofetch/axios).

6. **Politicas de limpeza e seguranca**: job agendado de limpeza de arquivos temporarios, reforco de limites de tamanho e validacoes, rate limiting e revisao de logs.

7. **Testes de integracao e E2E**: cobertura dos fluxos principais e de erro; ajustes de performance conforme metricas.

8. **Documentacao de deploy e monitoramento**: passos para deploy em homologacao e producao (env, Nginx, Redis, workers), health checks e alertas.

9. **Deploy**: homologacao primeiro; validacao; deploy em producao com rollback planejado.

---

## Fases de desenvolvimento (Etapa 11)

| Fase | Descricao | Entregavel |
|------|-----------|------------|
| 11.1 | Executar Etapa 1 do cronograma: estrutura de pastas, dependencias, .env.example, README | Repositorio configurado |
| 11.2 | Executar Etapa 2: especificacao da API e contrato backend-Python | Documento de API |
| 11.3 | Executar Etapa 3: servico Python (leitura PDF, extracao, OFX) e testes unitarios | Conversor Python |
| 11.4 | Executar Etapa 4: backend (upload, validacao, fila, worker, listagem, download) | Backend implementado |
| 11.5 | Executar Etapa 5: frontend (upload, listagem, download) e integracao com API | Frontend implementado |
| 11.6 | Executar Etapa 6: limpeza, limites, rate limiting, logs | Politicas aplicadas |
| 11.7 | Executar Etapa 7: testes de integracao e E2E; ajustes de performance | Testes e metricas |
| 11.8 | Executar Etapa 8: documentacao de deploy e monitoramento | Documentacao |
| 11.9 | Executar Etapa 9: deploy em homologacao, validacao, deploy em producao, rollback planejado | Deploy concluido |
| 11.10 | Revisar cronograma e marcar conclusao antes da Etapa 12 (Escalabilidade) | Checklist da Etapa 11 |
