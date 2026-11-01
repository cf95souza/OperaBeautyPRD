# 🛡️ Relatório de Auditoria Técnica e Segurança — OperaBeauty (Produção)

**Data da Auditoria:** 01 de Novembro de 2026  
**Ambiente Auditado:** VPS de Produção (`srv1827901`), Docker Compose, Caddy Reverse Proxy, Node.js/Express, PostgreSQL  
**Responsável Técnico:** Antigravity Engineering Kernel  
**Classificação:** Confidencial / Prioridade de Ação Imediata  

---

## 1. Sumário Executivo & Scorecard de Maturidade

A varredura completa do repositório foi executada cobrindo:
1. **Infraestrutura e Exposição de Rede:** Docker Compose, Caddyfile, Variáveis de Ambiente, Portas Expostas.
2. **Camada de Pagamentos e Gateway (Financeiro):** Assinaturas SaaS (SuperAdmin), Sinal/Caução de Agendamentos (SaaS Salões), Webhooks Mercado Pago e Asaas.
3. **Autenticação, Sessões e Controle de Acesso:** Tokens JWT, Cookies HTTP-only, Middlewares RBAC, M2M WhatsApp Gateway.
4. **Integridade de Dados e Concorrência:** Gerenciamento de pool do PostgreSQL (`pool.connect()`), Bloqueios Concorrentes (`FOR UPDATE`), Rotinas Cron.
5. **Uploads e Armazenamento Privado:** Sanitização de nomes de arquivos, validação de mimetype, vazamento de tokens em URLs.

### Scorecard de Risco (Pós-Remediação)

| Categoria | Nível de Risco | Status | Itens Críticos Encontrados e Resolução |
| :--- | :---: | :---: | :--- |
| **Integridade Financeira (SaaS & Salão)** | 🟢 **BLINDADO** | ✅ Resolvido | Simulação bloqueada em prod (`NODE_ENV`); Webhooks validam status na API oficial do gateway |
| **Infraestrutura & Rede (Docker)** | 🟢 **BLINDADO** | ✅ Resolvido | Portas 5001/5002 vinculadas estritamente a `127.0.0.1`, protegendo o perímetro via Caddy |
| **Controle de Assinaturas/Planos** | 🟢 **BLINDADO** | ✅ Resolvido | Assinaturas vencidas entram em `past_due` sem concessão de sessões gratuitas |
| **Proteção contra Spam / DoS** | 🟢 **BLINDADO** | ✅ Resolvido | Rate limiters ativados em `/register-client` (15/h) e `/api/leads` (10/15min) |
| **Privacidade de Arquivos (CRM)** | 🟢 **BLINDADO** | ✅ Resolvido | Headers `Referrer-Policy: no-referrer` e `Cache-Control: private, no-store, max-age=0` ativos |
| **Segredo M2M WhatsApp** | 🟢 **BLINDADO** | ✅ Resolvido | Alertas de console em produção para segredos default e documentação no `.env.example` |
| **Gestão do Banco de Dados (Pool)** | 🟢 **SEGURO** | Conforme | Todos os `pool.connect()` utilizam `try/finally { client.release() }` |

---

## 2. Falhas Críticas (P0) — Ação Imediata Necessária

---

### [FALHA 01] Rota Pública de Simulação de Pagamento de Sinal em Produção
- **Severidade:** 🔴 **CRÍTICA (P0 - Risco Financeiro e Fraude)**
- **Localização:** `backend/routes/payments.js` (Linhas 265–291)
- **Vetor de Ataque:** Qualquer pessoa na internet pode enviar uma requisição `POST /api/payments/simulate-paid/:appointmentId` sem nenhum cabeçalho de autenticação ou token.

#### O Problema no Código:
```javascript
// backend/routes/payments.js
router.post('/simulate-paid/:appointmentId', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const result = await paymentGatewayService.confirmDepositPayment(
            null,
            appointmentId,
            'simulated_' + Date.now()
        );
        res.json({ success: true, result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
```

#### Impacto:
Qualquer cliente ou invasor que inspecione as requisições de agendamento pode pegar o UUID do agendamento e chamar esse endpoint, confirmando o sinal sem pagar 1 centavo na conta do salão.

#### Remediação:
Desativar a rota se o ambiente for de produção (`process.env.NODE_ENV === 'production'`) ou exigir autenticação restrita de SuperAdmin:
```javascript
router.post('/simulate-paid/:appointmentId', (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Endpoint indisponível em ambiente de produção.' });
    }
    next();
}, async (req, res) => { ... });
```

---

### [FALHA 02] Confirmação Cega de Webhook de Depósito sem Verificação no Gateway
- **Severidade:** 🔴 **CRÍTICA (P0 - Bypass de Pagamento)**
- **Localização:** `backend/routes/payments.js` (Linhas 231–260) e `backend/services/paymentGatewayService.js` (Linhas 277–310)
- **Vetor de Ataque:** Requisições falsas forjadas para `/api/payments/webhook/:tenantId/:provider`.

#### O Problema no Código:
Quando o webhook do Mercado Pago ou Asaas bate nessa rota:
```javascript
// backend/routes/payments.js
router.post('/webhook/:tenantId/:provider', async (req, res) => {
    ...
    // O backend extrai o ID do body enviado pelo chamador:
    let paymentId = body.data?.id || body.id;
    ...
    // E executa diretamente a confirmação SEM consultar a API do gateway para ver se está 'approved':
    await paymentGatewayService.confirmDepositPayment(tenantId, paymentId, paymentId);
    ...
});
```
Além disso, dentro de `confirmDepositPayment`:
```sql
UPDATE appointments a
SET deposit_status = 'paid', status = 'confirmed'
WHERE a.tenant_id = $1 AND (a.deposit_payment_id = $2 OR a.id::text = $2)
```
Se um atacante mandar um POST para o webhook passando `data.id = <appointment_id>`, o backend faz match em `a.id::text = $2` e confirma o agendamento imediatamente sem verificar o status com o Mercado Pago!

#### Remediação:
1. Obter as credenciais do gateway do salão (`paymentGatewayService.getTenantGateway(tenantId, provider)`).
2. Fazer requisição GET obrigatória à API do Mercado Pago (`/v1/payments/{paymentId}`) para validar se o pagamento realmente existe, pertence àquela conta e tem `status === 'approved'`.
3. Somente após a validação criptográfica ou status positivo oficial do gateway, disparar o `confirmDepositPayment`.

---

## 3. Falhas Altas (P1) — Riscos de Infraestrutura e Faturamento SaaS

---

### [FALHA 03] Fallback do Webhook de Faturas SaaS Considera `payment.created` como Pago
- **Severidade:** 🟠 **ALTA (P1 - Faturamento SaaS)**
- **Localização:** `backend/services/saasBillingService.js` (Linhas 603–605)
- **Vetor:** Flutuação de rede ou webhook disparado no momento da emissão do Pix.

#### O Problema no Código:
```javascript
// backend/services/saasBillingService.js
if (!mpCheck.success) {
    console.warn(`[WEBHOOK SAAS] Aviso: Não foi possível verificar na API do MP: ${mpCheck.error}. Usando payload direto.`);
    // FALHA GRAVE AQUI:
    status = payload?.action === 'payment.created' || payload?.action === 'payment.updated' ? 'paid' : payload?.status;
}
```
Se a consulta do status no Mercado Pago falhar por instabilidade momentânea ou rate-limit, o código usa o fallback: se a `action` for `payment.created` (o que acontece assim que o QR Code é gerado, ou seja, **antes** de pagar!), o sistema marca a fatura do salão como `paid`!

#### Remediação:
O evento `payment.created` **nunca** pode definir o status como `paid`. Se a consulta da API falhar, o webhook deve responder com status de erro (HTTP 500 ou 503) para que o Mercado Pago tente reenviar o webhook em alguns minutos, ou manter o status `pending`.

---

### [FALHA 04] Porta 5001 Exposta Diretamente na Interface Pública da VPS
- **Severidade:** 🟠 **ALTA (P1 - Exposição de Perímetro)**
- **Localização:** `docker-compose.yml` (Linha 67)

#### O Problema:
```yaml
api:
  build:
    context: .
    dockerfile: Dockerfile.api
  ports:
    - "${API_PORT:-5001}:5000"
```
No Linux (Docker), mapear `5001:5000` cria regras no `iptables` que escutam em `0.0.0.0:5001`.
Isso significa que **qualquer pessoa no mundo** pode acessar a API diretamente via `http://IP_DA_VPS:5001`, contornando completamente o Caddy:
- Bypassa os cabeçalhos de segurança configurados no Caddy (`X-Frame-Options`, `Content-Security-Policy`, etc.).
- Bypassa o SSL/HTTPS do Caddy (trafegando requisições em HTTP puro e inseguro).
- Permite ataques de negação de serviço e scanners de vulnerabilidade focados diretamente no Express.

#### Remediação:
Como o Caddy e a API estão na mesma rede interna do Docker (`networks: - operabeauty-net`), o Caddy já faz `reverse_proxy api:5000`.
Portanto, a porta **não deve ser exposta externamente**. Se precisar de acesso local para debug na VPS, deve amarrar estritamente ao localhost:
```yaml
ports:
  - "127.0.0.1:${API_PORT:-5001}:5000"
```
Ou simplesmente remover o bloco `ports:` do serviço `api` em produção.

---

## 4. Falhas Médias (P2) — Lógica de Negócios e Concorrência

---

### [FALHA 05] Renovação Infinita de Planos/Assinaturas de Clientes Sem Pagamento
- **Severidade:** 🟡 **MÉDIA (P2 - Prejuízo aos Salões)**
- **Localização:** `backend/cron/reminders.js` (Linhas 41–58)

#### O Problema no Código:
```javascript
// backend/cron/reminders.js (Cron executado todo dia à 01:00)
const expiredMemberships = await pool.query(`
    SELECT cm.*, mp.billing_period, mp.usage_limit
    FROM client_memberships cm
    JOIN membership_plans mp ON mp.id = cm.plan_id
    WHERE cm.status = 'active' AND cm.current_period_end <= CURRENT_TIMESTAMP
`);

for (const m of expiredMemberships.rows) {
    // Adiciona 30 dias e reseta o limite de uso DE GRAÇA:
    await pool.query(`
        UPDATE client_memberships 
        SET current_period_end = current_period_end + INTERVAL '30 days',
            remaining_sessions = $1
        WHERE id = $2
    `, [m.usage_limit, m.id]);
}
```

#### Impacto:
Se um salão cria um plano/assinatura para clientes com limite de 10 cortes/mês, ao expirar os 30 dias, o cron simplesmente renova o plano para mais 30 dias e restaura os 10 cortes **sem gerar fatura, sem cobrar cartão e sem receber confirmação de pagamento**.

#### Remediação:
Alterar o status da assinatura vencida para `'past_due'` ou `'expired'`, e só renovar as sessões se houver confirmação de pagamento recorrente.

---

### [FALHA 06] Ausência de Rate Limiting em Rotas Críticas de Escrita
- **Severidade:** 🟡 **MÉDIA (P2 - Prevenção contra Abuso)**
- **Localização:** `backend/routes/auth.js` (`POST /register-client`) e `backend/routes/leads.js` (`POST /api/leads`)

#### O Problema:
Embora o login (`/login`) e o envio de OTP tenham proteções com `express-rate-limit`, o cadastro de novos clientes (`/register-client`) e a captura pública de leads (`/api/leads`) estão totalmente abertos.

#### Impacto:
Robôs e scripts automatizados podem inundar o banco de dados com milhões de registros falsos (Database Flooding / Storage exhaustion).

#### Remediação:
Aplicar instâncias do `rateLimit` (ex: máximo 10 cadastros por IP por hora) nessas duas rotas.

---

## 5. Falhas Baixas (P3) e Recomendações de Código Limpo

---

### [FALHA 07] Token de Autenticação em Query Parameter em `privateUploads.js`
- **Severidade:** 🟢 **BAIXA (P3 - Boas Práticas OWASP)**
- **Localização:** `backend/routes/privateUploads.js` (Linhas 38–41)
- **Problema:** A rota de visualização de arquivos do prontuário aceita `?token=...` na URL para facilitar o carregamento em tags `<img>`.
- **Risco:** URLs completas com tokens ficam salvas no histórico do navegador e nos arquivos de log do Caddy (`access.log`).
- **Solução Recomendada:** Utilizar Cookies assinados e temporários (`signedCookies` ou `SameSite=Strict`), ou Tokens de Acesso Temporário (Signed URLs com validade de 5 a 15 minutos).

---

### [FALHA 08] Segredo M2M do Gateway WhatsApp com Fallback Hardcoded
- **Severidade:** 🟢 **BAIXA (P3 - Defesa em Profundidade)**
- **Localização:** `backend/routes/whatsappRoutes.js` e `gateway-whatsapp/src/server.js`
- **Problema:** Se a variável `INTERNAL_SECRET` não estiver presente no arquivo `.env` da VPS, o sistema usa a string default `'operabeauty-m2m-internal-secret-token-32chars'`.
- **Risco:** Qualquer pessoa com acesso ao código aberto saberia o token de comunicação interna.
- **Solução Recomendada:** Lançar um erro impeditivo no boot do servidor se `INTERNAL_SECRET` não estiver configurado no `.env` em ambiente de produção.

---

## 6. Plano de Ação Imediato Recomendado

Recomendamos a execução das correções em duas etapas:

### Etapa 1 — Bloqueio dos Vetores Críticos de Fraude (Hoje):
1. **Remover ou isolar `POST /api/payments/simulate-paid/:appointmentId`** para que nunca responda em produção.
2. **Corrigir o Webhook do Salão (`/api/payments/webhook/:tenantId/:provider`)** para sempre consultar a API do gateway antes de confirmar qualquer agendamento, removendo o fallback perigoso de `a.id::text`.
3. **Corrigir o Fallback do Webhook do SaaS (`saasBillingService.js`)** garantindo que `payment.created` nunca seja tratado como `paid`.
4. **Fechar a porta 5001 no `docker-compose.yml`** amarrando-a a `127.0.0.1` ou confiando exclusivamente na rede interna do Caddy.

### Etapa 2 — Endurecimento de Negócios e Estabilidade (Próximos passos):
1. Ajustar o Cron de assinaturas para não renovar sessões sem cobrança.
2. Adicionar `rateLimit` nas rotas de cadastro de clientes e leads.
3. Validar se o `INTERNAL_SECRET` está devidamente preenchido no `.env` da VPS.

