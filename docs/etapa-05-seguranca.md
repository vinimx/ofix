# Etapa 5: Seguranca

Este documento detalha validacao e sanitizacao de entradas, protecao contra uploads maliciosos e boas praticas de seguranca para o sistema de conversao PDF para OFX.

---

## 5.1 Validacao e sanitizacao

- **Backend**: validar Content-Type (esperado para PDF), extensao permitida (.pdf), tamanho maximo em bytes e magic bytes (primeiros bytes do arquivo devem indicar PDF). Rejeitar qualquer arquivo que nao seja PDF valido; nao confiar apenas na extensao ou no nome enviado pelo cliente.
- **Nome do arquivo**: sanitizar para evitar path traversal (../) e caracteres especiais; usar apenas o nome para exibicao e armazenar o arquivo com UUID. Nunca usar entrada do usuario para construir caminhos no sistema de arquivos.

---

## 5.2 Protecao contra uploads maliciosos

- **Limite rigido de tamanho**: aplicar no backend e, se possivel, no proxy (Nginx) para evitar consumo excessivo de rede e disco.
- **Tempo maximo de processamento**: configurar timeout por job (ex.: 5 minutos); encerrar processo Python se exceder.
- **Ambiente controlado**: o conversor Python nao deve executar codigo arbitrario derivado do conteudo do PDF (sem eval/exec de dados do arquivo). Usar apenas bibliotecas seguras de leitura de PDF.
- **PDF bomb**: considerar validacao adicional (ex.: numero maximo de paginas ou de objetos) para detectar arquivos construidos para consumir recursos; rejeitar ou limitar com mensagem adequada.

---

## 5.3 Boas praticas

- Nao expor caminhos internos do servidor em respostas ou logs.
- Download com identificador opaco (ID) e, se necessario, token de uso unico ou de curta expiracao.
- Logs sem dados sensiveis (conteudo do extrato, dados pessoais); registrar apenas IDs, tamanhos, status e duracao.
- Rate limiting no endpoint de upload por IP e, se houver autenticacao, por usuario, para mitigar abuso.

---

## Fases de desenvolvimento (Etapa 5)

| Fase | Descricao | Entregavel |
|------|-----------|------------|
| 5.1 | Implementar validacao no backend: Content-Type, extensao .pdf, tamanho, magic bytes | Codigo de validacao e testes |
| 5.2 | Implementar sanitizacao do nome do arquivo (path traversal, caracteres especiais); uso de UUID no disco | Codigo e testes |
| 5.3 | Configurar limite de tamanho no backend e no Nginx (se utilizado) | Configuracao e doc |
| 5.4 | Configurar timeout por job no worker; encerrar processo Python em caso de exceder | Codigo e config |
| 5.5 | Revisar conversor Python: sem eval/exec de conteudo do PDF; apenas libs seguras | Revisao de codigo |
| 5.6 | Implementar validacao anti-PDF bomb (limite de paginas/objetos) se aplicavel | Codigo e testes |
| 5.7 | Garantir downloads por ID opaco; implementar token efemero se necessario | Codigo e testes |
| 5.8 | Implementar rate limiting no endpoint de upload (por IP e/ou usuario) | Codigo e config |
| 5.9 | Revisar logs: sem caminhos internos e sem dados sensiveis | Revisao e ajustes |
| 5.10 | Revisar esta etapa antes de iniciar a Etapa 6 (Stack e dependencias) | Checklist de conclusao da Etapa 5 |
