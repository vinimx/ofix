# Etapa 12: Escalabilidade futura e melhorias

Este documento descreve evolucoes futuras do sistema: conversor como servico HTTP, cache por hash do PDF, multiplos layouts de extrato e auditoria.

---

## 12.1 Conversor como servico HTTP

Expor o conversor Python como API REST interna, permitindo multiplas instancias atras de um balanceador e escalonamento independente. O backend passaria a chamar o conversor via HTTP em vez de child_process.

---

## 12.2 Cache por hash do PDF

Armazenar resultado OFX indexado por hash do PDF (e opcionalmente parametros) para evitar reprocessamento identico. Definir TTL e politica de invalidade (ex.: expiracao em 24h ou apos limpeza).

---

## 12.3 Multiplos layouts de extrato

Suporte a mais de um banco ou formato de PDF via perfis de conversao ou deteccao automatica do layout, com testes por perfil. Requer extensao do conversor Python e possivelmente parametro de perfil no upload.

---

## 12.4 Auditoria

Registro de acessos e conversoes (quem, quando, qual recurso) para conformidade e suporte, sem armazenar conteudo sensivel nos logs. Pode incluir ID de sessao ou usuario, ID do job, timestamp e resultado (sucesso/falha).

---

## Fases de desenvolvimento (Etapa 12)

| Fase | Descricao | Entregavel |
|------|-----------|------------|
| 12.1 | Documentar opcao de conversor como API HTTP e criterios de migracao | Documento de evolucao |
| 12.2 | Especificar design do cache por hash (armazenamento, TTL, invalidade) para implementacao futura | Especificacao de cache |
| 12.3 | Documentar estrategia de multiplos layouts (perfis, deteccao) e impacto no conversor | Documento de layouts |
| 12.4 | Definir modelo de auditoria (campos, retencao, privacidade) para implementacao futura | Especificacao de auditoria |
| 12.5 | Priorizar itens 12.1 a 12.4 conforme roadmap do produto | Backlog priorizado |
| 12.6 | Revisar conclusao de todas as etapas 1 a 12 do plano | Checklist final do plano |
