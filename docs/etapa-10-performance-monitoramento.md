# Etapa 10: Criterios de performance e monitoramento

Este documento define metas de performance (upload e conversao) e praticas de monitoramento (health check, metricas, alertas).

---

## 10.1 Performance

- **Upload**: tempo de resposta da API de upload (ate confirmacao e retorno do jobId) inferior a 2 segundos em condicoes normais, sem incluir o tempo de conversao no request.
- **Conversao**: meta de otimizacao de tempo de processamento por pagina de PDF (ex.: ate 3 segundos por pagina), a ser medida e refinada com amostras reais.

---

## 10.2 Monitoramento

- **Health check**: endpoint `/health` que verifica a API e a conexao com Redis; usado por load balancer e ferramentas de monitoramento.
- **Metricas**: tamanho da fila (pending/active), quantidade de jobs concluidos e falhos por periodo; duracao media dos jobs. Logs de erro e duracao por job para analise.
- **Alertas**: disparar alertas para fila crescendo sem consumo, Redis indisponivel, ou taxa de falha anormal em jobs.

---

## Fases de desenvolvimento (Etapa 10)

| Fase | Descricao | Entregavel |
|------|-----------|------------|
| 10.1 | Medir tempo de resposta do endpoint de upload em condicoes normais; ajustar se > 2 s | Metrica e ajustes |
| 10.2 | Medir tempo de processamento por pagina de PDF no conversor; definir meta (ex.: 3 s/pagina) | Metrica e doc |
| 10.3 | Implementar endpoint /health (API + Redis) e documentar uso | Codigo e doc |
| 10.4 | Expor ou registrar metricas: tamanho da fila, jobs concluidos/falhos, duracao media | Codigo ou integracao |
| 10.5 | Configurar alertas: fila crescendo, Redis down, taxa de falha anormal | Config e doc |
| 10.6 | Revisar esta etapa antes de iniciar a Etapa 11 (Cronograma) | Checklist de conclusao da Etapa 10 |
