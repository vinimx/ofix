# Etapa 8: Tratamento de erros e resiliencia

Este documento define as categorias de erro, respostas HTTP padronizadas e estrategias de retry e dead-letter para o sistema.

---

## 8.1 Categorias de erro

- **Arquivo invalido**: tipo/conteudo nao PDF, extensao incorreta. Resposta 400 ou 422 com mensagem generica.
- **Tamanho excedido**: 413 Payload Too Large.
- **Falha na conversao**: PDF corrompido ou layout nao suportado. Job marcado como `failed`; resposta na listagem/status com indicacao de erro; mensagem generica ao usuario; detalhes em log.
- **Timeout**: processo Python ou request excede tempo limite. Job pode ser reenfileirado (retry) ou marcado como falha apos N tentativas.
- **Falha de fila/Redis**: API deve retornar 503 ou colocar upload em modo degradado (ex.: apenas sincrono com limite menor). Log e alerta para recuperacao do Redis.

---

## 8.2 Respostas HTTP e mensagens

- Usar codigos consistentes: 400 (requisicao invalida), 413 (tamanho), 422 (validacao), 500 (erro interno), 503 (servico indisponivel). Resposta em JSON com `code` e `message`; mensagem amigavel ao usuario, sem detalhes internos.
- Detalhes tecnicos (stack, caminhos) apenas em logs do servidor.

---

## 8.3 Retry e dead-letter

- Jobs na fila: retry com backoff exponencial e numero maximo de tentativas (ex.: 3). Apos esgotar, marcar como `failed` (ou enviar para fila dead-letter para analise). Opcional: notificacao ou log agregado para falhas recorrentes (alerta operacional).

---

## Fases de desenvolvimento (Etapa 8)

| Fase | Descricao | Entregavel |
|------|-----------|------------|
| 8.1 | Implementar respostas de erro padronizadas (JSON com code e message) em todos os endpoints | Codigo e testes |
| 8.2 | Mapear cada categoria de erro (invalido, tamanho, conversao, timeout, Redis) para codigo HTTP e mensagem | Tabela e codigo |
| 8.3 | Garantir que detalhes tecnicos nao vazem para o cliente; apenas em logs | Revisao e ajustes |
| 8.4 | Configurar retry com backoff exponencial e max tentativas na fila (Bull/BullMQ) | Config e testes |
| 8.5 | Implementar transicao para failed (ou dead-letter) apos esgotar tentativas | Codigo e testes |
| 8.6 | Opcional: log agregado ou alerta para falhas recorrentes | Codigo ou doc |
| 8.7 | Revisar esta etapa antes de iniciar a Etapa 9 (Testes) | Checklist de conclusao da Etapa 8 |
