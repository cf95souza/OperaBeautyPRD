# Fase 40: Novo Fluxo de Vale-Presente (Segurança & SaaS) — Detalhamento

Este documento detalha todas as etapas da reestruturação do módulo de Vale-Presente, o status atual de cada uma e o que resta para conclusão.

---

## Contexto

O sistema anterior permitia que o código de resgate fosse gerado imediatamente na compra, sem qualquer confirmação de pagamento. Isso representava um risco grave em ambiente SaaS (multi-tenant) onde o sistema **não processa pagamentos**.

O novo fluxo separa a operação em dois momentos:
1. **Solicitação** → cliente solicita o vale, recebe um ID de acompanhamento (VP-XXXX) e faz o PIX por fora.
2. **Confirmação** → o salão confirma o recebimento do PIX, e só então o código de resgate (VG-XXXX-XXXX-XXXX) é gerado.

---

## Etapas

### ✅ ETAPA 1 — Banco de Dados (Migração)

**O que faz:**
Altera a tabela `cap_giftcards` para suportar o novo fluxo com dois identificadores (request_id e redemption_code), campos de valor/saldo, status de pagamento, e cria a tabela `cap_tenant_payment_methods` para armazenar a chave PIX do salão.

**Arquivos envolvidos:**
- `backend/scripts/20_giftcards_v2.sql` — Script de migração SQL
- `backend/scripts/run_20_giftcards_v2.js` — Runner Node.js para executar a migração

**Status:** ✅ Concluído e aplicado na VPS de produção.

---

### ✅ ETAPA 2 — Backend: Rotas e Service Layer

**O que faz:**
Reestrutura toda a lógica de negócio dos vales-presente no backend, incluindo:

- **`createGiftCard()`** — Cria uma solicitação com status `PENDING_PAYMENT` e `redemption_code = NULL`.
- **`getGiftCardRequest()`** — Admin consulta uma solicitação pelo ID (VP-XXXX).
- **`confirmGiftCardPayment()`** — Admin confirma o pagamento, gera o código de resgate (VG-XXXX-XXXX-XXXX) e ativa o vale.
- **`validateGiftCardCode()`** — Admin valida um código de resgate apresentado pelo presenteado.
- **`redeemGiftCard()`** — Admin realiza resgate parcial ou total do saldo.
- **`getTenantPaymentMethods()`** / **`updateTenantPaymentMethod()`** — CRUD da chave PIX do salão.

**Arquivos envolvidos:**
- `backend/services/giftcardService.js` — Toda a lógica de negócio
- `backend/routes/giftcards.js` — Rotas REST

**Status:** ✅ Concluído e em produção.

---

### ✅ ETAPA 3 — Frontend: Tela do Cliente (Compra & Meus Vales)

**O que faz:**
Reformula a tela `ComprarGiftCard.jsx` para o novo fluxo unificado:

1. **Aba Comprar:** Cliente seleciona serviço, preenche nome/WhatsApp do presenteado (opcionais) e gera a solicitação.
2. Após gerar, recebe o **ID da Solicitação (VP-XXXX)** — que NÃO é o código de resgate.
3. Exibe os dados do PIX do salão para o cliente copiar e pagar.
4. Botão "Copiar Mensagem" para o cliente enviar ao WhatsApp do salão com o comprovante.
5. **Aba Meus Vales:** Cliente pode visualizar os Vales-Presentes comprados. Caso o PIX ainda não tenha sido aprovado, vê o status pendente e o PIX do salão. Caso o salão já tenha aprovado e o código de resgate (VG-XXXX) tenha sido gerado, o cliente pode enviar a mensagem do vale presenteado via WhatsApp. **(Isso corrige a regra de que é o comprador que envia o vale, e não o salão)**.

**Arquivos envolvidos:**
- `src/pages/ComprarGiftCard.jsx`

**Status:** ✅ Concluído e em produção.

---

### ✅ ETAPA 4 — Frontend: Painel do Gestor (Admin)

**O que faz:**
Reformula a tela `GestaoGiftCards.jsx` com 3 abas:

#### Aba 1: Validar Pagamento
- Gestor digita o ID da solicitação (VP-XXXX) e consulta os dados.
- Verifica comprador, presenteado, valor e status de pagamento.
- Ao clicar "Confirmar Pagamento", o sistema gera o código de resgate (VG-XXXX-XXXX-XXXX).
- **O salão copia o código e informa ao COMPRADOR** — quem envia ao presenteado é o comprador, não o salão.

#### Aba 2: Validar Código (Resgate)
- Quando o presenteado chega ao salão e apresenta o código, o gestor digita o código (VG-XXXX-XXXX-XXXX).
- O sistema exibe nome, serviço, valor original e **saldo disponível**.
- O gestor escolhe quanto resgatar (resgate parcial é permitido).

#### Aba 3: Todos os Vales
- Listagem completa de todos os vales-presente do salão.
- Versão desktop (tabela) e mobile (cards).

**Arquivos envolvidos:**
- `src/pages/admin/GestaoGiftCards.jsx`

**Status:** ✅ Concluído e em produção.

---

### ✅ ETAPA 5 — Frontend: Configuração PIX do Salão

**O que faz:**
Adiciona uma seção na tela `ConfiguracoesOperacionais.jsx` onde o gestor cadastra a chave PIX do salão (CPF, CNPJ, E-mail, Telefone ou Chave Aleatória), o nome do titular e documento.

**Arquivos envolvidos:**
- `src/pages/admin/ConfiguracoesOperacionais.jsx`

**Status:** ✅ Concluído e em produção.

---

### ⏳ ETAPA 6 — Testes Funcionais Completos (PENDENTE)

**O que precisa ser testado:**

| # | Cenário | Status |
|---|---------|--------|
| 1 | Gestor cadastra chave PIX nas Configurações Operacionais | ✅ Testado |
| 2 | Cliente gera solicitação de vale-presente e vê ID (VP-XXXX) | ✅ Testado |
| 3 | Cliente vê dados do PIX e copia mensagem para WhatsApp | ⏳ Pendente |
| 4 | Gestor consulta solicitação pelo ID (VP-XXXX) | ✅ Testado |
| 5 | Gestor confirma pagamento e recebe código de resgate (VG-XXXX) | ✅ Testado |
| 6 | Gestor copia mensagem com código para enviar ao comprador | ⏳ Pendente |
| 7 | Gestor valida código de resgate (VG-XXXX) na aba "Validar Código" | ⏳ Pendente |
| 8 | Gestor realiza resgate parcial (valor menor que o saldo) | ⏳ Pendente |
| 9 | Gestor realiza resgate total | ⏳ Pendente |
| 10 | Listagem completa na aba "Todos os Vales" (desktop e mobile) | ⏳ Pendente |
| 11 | Responsividade geral em celular | ⏳ Pendente |

---

### ⏳ ETAPA 7 — Atualização Documental (PENDENTE)

Após os testes e homologação:

- [ ] Atualizar `documentacao.md` com as regras de negócio do novo fluxo.
- [ ] Atualizar `database.md` com a estrutura final das tabelas alteradas.
- [ ] Marcar Fase 40 como `[x]` no `fase.md`.

---

## Resumo de Status

| Etapa | Descrição | Status |
|-------|-----------|--------|
| 1 | Banco de Dados (Migração) | ✅ Concluído |
| 2 | Backend: Rotas e Services | ✅ Concluído |
| 3 | Frontend: Tela do Cliente | ✅ Concluído |
| 4 | Frontend: Painel do Gestor | ✅ Concluído |
| 5 | Configuração PIX do Salão | ✅ Concluído |
| 6 | Testes Funcionais Completos | ⏳ Pendente |
| 7 | Atualização Documental | ⏳ Pendente |

---

## Bugs Corrigidos Durante o Deploy

| Bug | Causa | Correção |
|-----|-------|----------|
| Container em loop (restart) | Escape inválido (`\$`) no `giftcardService.js` quebrava a sintaxe | Limpeza de caracteres de escape |
| Scripts não enviados ao Git | Pasta `scripts/` estava no `.gitignore` | `git add -f` forçando inclusão |
| Constraint de status violada | Status antigos em minúscula vs nova constraint em maiúscula | DROP constraint → UPDATE dados → ADD constraint nova |
| Erro 500 ao criar vale | `redemption_code` com NOT NULL herdado da coluna antiga `code` | `ALTER COLUMN redemption_code DROP NOT NULL` |
| Erro 500 parâmetros undefined | Campos opcionais chegavam como `undefined` no INSERT | Conversão para `null` com fallback |
| Erro 400 ao validar código | Rota `/validate/:code` exigia `tenant_id` na query | Adicionado `authMiddleware` usando `req.user.tenant_id` |
| Erro ao carregar PIX | Faltava `tenant_id` na chamada de `payment-methods` | Adicionado `?tenant_id=${tenant.id}` na URL |
| Gestor enviando msg WhatsApp | O painel do gestor tinha botão para enviar msg ao presenteado, mas a regra é que o comprador quem envia | Removido botão de WhatsApp do painel do gestor (Aba 1) |
| Erro 400 ao resgatar (redeem) | Query SQL omitia o parâmetro $2 (redemption_code) causando falha do Postgres e o backend convertia para erro 400 | Corrigida a query `UPDATE` do resgate para alinhar com o array de parâmetros |
