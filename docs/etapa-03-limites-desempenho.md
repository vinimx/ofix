# Etapa 3: Limites de tamanho e desempenho

Este documento define o limite ideal de upload em MB, estrategias complementares (fila, streaming, compressao, limpeza, escalabilidade) e criterios de desempenho para o sistema.

---

## 3.1 Limite ideal de upload (MB)

- **Valor recomendado para producao: 15 a 20 MB por arquivo.** Este valor equilibra extratos bancarios extensos (incluindo anuais, que podem chegar a 10 a 15 MB em PDF) com estabilidade de memoria, tempo de processamento e requisitos de infraestrutura.
- **Configuracao**: definir variavel de ambiente (ex.: `MAX_UPLOAD_MB=20`) e aplicar no backend e, se houver, no proxy reverso (Nginx). Em desenvolvimento e homologacao, pode-se usar o mesmo valor ou um limite menor para testes.
- **Acima do limite**: rejeitar o upload com codigo HTTP 413 (Payload Too Large) e mensagem clara. Opcoes futuras: suporte a compressao do PDF pelo cliente ou divisao em multiplos arquivos (mais de um extrato).

---

## 3.2 Estrategias complementares

- **Fila de processamento**: garantir que o processamento pesado nao ocorra no ciclo do request de upload. Jobs assincronos permitem retry com backoff e limite de tentativas.
- **Streaming**: ao receber o upload, gravar em disco em stream (chunks) quando possivel, evitando carregar o arquivo inteiro em memoria no Node. O Python pode ler o PDF por caminho de arquivo.
- **Compressao**: nao obrigatoria no MVP. Em evolucao, pode-se considerar compressao no transporte (gzip) ou armazenamento temporario comprimido, com custo adicional de implementacao e testes.
- **Limpeza automatica**: job periodico (diario ou a cada N horas) para excluir arquivos temporarios antigos e registros de jobs expirados, mantendo o disco e a base de controle previsiveis.
- **Escalabilidade**: API stateless; fila centralizada em Redis; worker(s) podem ser escalados horizontalmente; no futuro, o conversor Python pode ser um servico HTTP independente com multiplas instancias.

---

## Fases de desenvolvimento (Etapa 3)

| Fase | Descricao | Entregavel |
|------|-----------|------------|
| 3.1 | Definir valor de MAX_UPLOAD_MB por ambiente (dev, homolog, prod) e documentar | Variavel e documentacao |
| 3.2 | Implementar validacao de tamanho no backend e retorno 413 quando exceder | Codigo e testes |
| 3.3 | Configurar limite no proxy (Nginx) se utilizado; documentar client_max_body_size | Configuracao e doc |
| 3.4 | Garantir uso de fila para processamento (nao bloquear upload); configurar retry/backoff | Fila e politicas |
| 3.5 | Implementar gravacao do upload em stream (chunks) no backend | Codigo de upload em stream |
| 3.6 | Implementar job de limpeza automatica (arquivos antigos e jobs expirados) | Job agendado e testes |
| 3.7 | Documentar estrategia de escalabilidade (stateless, Redis, workers) para evolucao | Documento de escalabilidade |
| 3.8 | Revisar esta etapa antes de iniciar a Etapa 4 (Fluxo de dados) | Checklist de conclusao da Etapa 3 |
