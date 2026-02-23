# Etapa 1: Visao geral e escopo

Este documento detalha a primeira etapa do plano: definicao do objetivo do sistema, escopo funcional, premissas e restricoes tecnicas. Use-o como guia para alinhar requisitos antes de iniciar o desenvolvimento.

---

## 1.1 Objetivo do sistema

O sistema tem como objetivo receber extratos bancarios no formato PDF, processa-los e disponibilizar o resultado no formato OFX (Open Financial Exchange), amplamente utilizado por aplicativos de controle financeiro e contabilidade. A conversao deve ser confiavel, segura e oferecer uma experiencia de uso simples e objetiva.

---

## 1.2 Escopo funcional

- **Upload de arquivos PDF**: interface com campo de upload (drag-and-drop ou seletor de arquivos) para um ou mais extratos em PDF.
- **Processamento**: conversao do conteudo do PDF em transacoes estruturadas e geracao do arquivo OFX correspondente.
- **Listagem**: area na interface que exibe os arquivos OFX gerados (por job ou por sessao), com status do processamento (pendente, processando, concluido, erro).
- **Download**: link ou botao para download do arquivo OFX gerado, com validacao de acesso e expiracao.

Fora do escopo inicial: autenticacao de usuarios persistentes, multiplos bancos/layouts no mesmo MVP (pode ser um unico layout piloto), e integracao direta com sistemas contabeis.

---

## 1.3 Premissas

- Interface extremamente simples e objetiva: um campo de upload e uma area de listagem/download, priorizando usabilidade, clareza visual e fluidez.
- Seguranca e requisito nao negociavel: validacao e sanitizacao de entradas, protecao contra uploads maliciosos, limites de tamanho e boas praticas de armazenamento temporario.
- Uso de tecnologias definidas: frontend em TypeScript com Vue/Nuxt e Bootstrap; backend em Node.js; utilizacao de bibliotecas especializadas em Python para o processamento e conversao dos arquivos quando necessario.

---

## 1.4 Restricoes tecnicas

- **Frontend**: Vue 3 com Nuxt 3, TypeScript, Bootstrap 5.
- **Backend**: Node.js (versao LTS, recomendado 20+).
- **Conversao**: Python para leitura de PDF e geracao OFX (pdfplumber, PyMuPDF ou equivalente; geracao OFX via template ou biblioteca dedicada).

---

## Fases de desenvolvimento (Etapa 1)

| Fase | Descricao | Entregavel |
|------|-----------|------------|
| 1.1 | Documentar e validar o objetivo do sistema com stakeholders | Documento de visao aprovado |
| 1.2 | Definir e registrar escopo funcional (upload, processamento, listagem, download) e fora de escopo | Lista de requisitos funcionais e nao funcionais |
| 1.3 | Registrar premissas (interface simples, seguranca, stack) e obter concordancia | Premissas documentadas no plano |
| 1.4 | Fixar restricoes tecnicas (Vue/Nuxt/TS/Bootstrap, Node, Python) e validar viabilidade | Restricoes aprovadas e refletidas no plano |
| 1.5 | Revisar esta etapa antes de iniciar a Etapa 2 (Arquitetura) | Checklist de conclusao da Etapa 1 |
