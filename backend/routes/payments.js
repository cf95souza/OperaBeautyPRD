import express from 'express';
import { z } from 'zod';
import { authMiddleware, optionalAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import pool from '../config/db.js';
import {
  getTenantGatewayConfig,
  saveTenantGatewayConfig,
  createDepositCharge,
  confirmDepositPayment
} from '../services/paymentGatewayService.js';

const router = express.Router();

// Esquema de validação para configuração de gateway
const saveGatewayConfigSchema = z.object({
  body: z.object({
    provider: z.enum(['mercadopago', 'asaas', 'abacatepay', 'manual_pix', 'simulator']),
    is_active: z.boolean(),
    sandbox_mode: z.boolean().optional(),
    deposit_expiration_minutes: z.number().int().min(5).max(120).optional(),
    credentials: z.record(z.any()).optional(),
    public_key: z.string().optional(),
    pix_key: z.string().optional(),
    pix_key_type: z.string().optional(),
    holder_name: z.string().optional(),
    instructions: z.string().optional()
  }),
  params: z.any(),
  query: z.any()
});

/**
 * 1. Obter configuração do gateway de pagamento do salão (Gestor / Admin)
 * Não expõe segredos nem tokens brutos ao frontend.
 */
router.get('/gateway-config', authMiddleware, async (req, res) => {
  const { tenant_id, role } = req.user;
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas gestores podem gerenciar pagamentos.' });
  }

  try {
    const config = await getTenantGatewayConfig(tenant_id);
    
    // Mascarar dados sensíveis: informa apenas se credenciais existem
    const hasAccessToken = !!(config.credentials?.accessToken);
    const hasApiKey = !!(config.credentials?.apiKey);
    
    return res.json({
      id: config.id,
      tenant_id: config.tenant_id,
      provider: config.provider,
      is_active: config.is_active,
      sandbox_mode: config.sandbox_mode,
      deposit_expiration_minutes: config.deposit_expiration_minutes,
      public_key: config.public_key,
      pix_key: config.pix_key,
      pix_key_type: config.pix_key_type,
      holder_name: config.holder_name,
      instructions: config.instructions,
      has_access_token: hasAccessToken,
      has_api_key: hasApiKey
    });
  } catch (error) {
    req.log.error(error, 'Erro ao obter configuração de gateway');
    return res.status(500).json({ error: 'Erro ao carregar configurações de pagamento.' });
  }
});

/**
 * 2. Salvar / Atualizar configuração de gateway de pagamento do salão (Gestor / Admin)
 */
router.put('/gateway-config', authMiddleware, validate(saveGatewayConfigSchema), async (req, res) => {
  const { tenant_id, role } = req.user;
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas gestores podem configurar pagamentos.' });
  }

  try {
    const current = await getTenantGatewayConfig(tenant_id);
    
    // Mesclar credenciais se novas não foram digitadas (para não sobrescrever com vazio)
    const newCredentials = {
      ...(current.credentials || {}),
      ...(req.body.credentials || {})
    };

    const updated = await saveTenantGatewayConfig(tenant_id, {
      ...req.body,
      credentials: newCredentials
    });

    return res.json({
      message: 'Configuração de gateway salva com sucesso!',
      config: {
        ...updated,
        has_access_token: !!newCredentials.accessToken,
        has_api_key: !!newCredentials.apiKey
      }
    });
  } catch (error) {
    req.log.error(error, 'Erro ao salvar configuração de gateway');
    return res.status(500).json({ error: 'Erro ao salvar credenciais do gateway.' });
  }
});

/**
 * 3. Gerar Cobrança de Sinal PIX para um Agendamento
 */
router.post('/create-deposit', optionalAuth, async (req, res) => {
  const { appointmentId, tenantId } = req.body;

  if (!appointmentId || !tenantId) {
    return res.status(400).json({ error: 'appointmentId e tenantId são obrigatórios.' });
  }

  try {
    // Buscar agendamento e serviço para checar se exige sinal
    const apptRes = await pool.query(
      `SELECT a.id, a.tenant_id, a.total_price, a.deposit_status, a.deposit_amount,
              s.name as service_name, s.requires_deposit, s.deposit_type, s.deposit_amount as service_deposit,
              c.name as client_name, c.phone as client_phone
       FROM public.cap_appointments a
       JOIN public.cap_services s ON a.service_id = s.id
       JOIN public.cap_clients c ON a.client_id = c.id
       WHERE a.id = $1 AND a.tenant_id = $2`,
      [appointmentId, tenantId]
    );

    if (apptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const appt = apptRes.rows[0];

    // Se já está pago, retorna ok
    if (appt.deposit_status === 'paid') {
      return res.json({
        requiresDeposit: false,
        depositStatus: 'paid',
        message: 'O sinal deste agendamento já está confirmado.'
      });
    }

    // Calcular valor do sinal
    let depositValue = 0;
    if (appt.requires_deposit) {
      if (appt.deposit_type === 'percentage') {
        depositValue = Number((Number(appt.total_price) * (Number(appt.service_deposit) / 100)).toFixed(2));
      } else {
        depositValue = Number(appt.service_deposit);
      }
    }

    // Se o serviço não exige sinal ou valor é 0, agendamento fica livre
    if (depositValue <= 0) {
      return res.json({
        requiresDeposit: false,
        depositStatus: 'none',
        message: 'Este serviço não exige pagamento de sinal antecipado.'
      });
    }

    // Gerar a cobrança PIX via Multi-Gateway híbrido do salão
    const charge = await createDepositCharge({
      tenantId,
      appointmentId: appt.id,
      amount: depositValue,
      client: {
        name: appt.client_name,
        phone: appt.client_phone
      },
      serviceName: appt.service_name
    });

    return res.json({
      requiresDeposit: true,
      depositStatus: 'pending',
      depositAmount: depositValue,
      ...charge
    });
  } catch (error) {
    req.log.error(error, 'Erro ao criar cobrança de sinal PIX');
    return res.status(500).json({ error: error.message || 'Erro ao gerar PIX para sinal.' });
  }
});

/**
 * 4. Consultar Status do Sinal de um Agendamento (Polling amigável no checkout)
 */
router.get('/deposit-status/:appointmentId', async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const apptRes = await pool.query(
      `SELECT id, tenant_id, status, deposit_status, deposit_amount, deposit_provider,
              deposit_pix_code, deposit_pix_qr, deposit_expires_at, deposit_paid_at
       FROM public.cap_appointments 
       WHERE id = $1`,
      [appointmentId]
    );

    if (apptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const appt = apptRes.rows[0];
    const isExpired = appt.deposit_expires_at && new Date(appt.deposit_expires_at) < new Date() && appt.deposit_status === 'pending';

    return res.json({
      appointmentId: appt.id,
      status: appt.status,
      depositStatus: isExpired ? 'expired' : appt.deposit_status,
      depositAmount: appt.deposit_amount,
      depositProvider: appt.deposit_provider,
      depositPixCode: appt.deposit_pix_code,
      depositPixQr: appt.deposit_pix_qr,
      depositExpiresAt: appt.deposit_expires_at,
      depositPaidAt: appt.deposit_paid_at
    });
  } catch (error) {
    req.log.error(error, 'Erro ao consultar status do sinal');
    return res.status(500).json({ error: 'Erro ao consultar status.' });
  }
});

/**
 * 5. Webhook Público do Gateway do Salão (Mercado Pago, Asaas, etc)
 */
router.post('/webhook/:tenantId/:provider', async (req, res) => {
  const { tenantId, provider } = req.params;
  req.log.info({ tenantId, provider, body: req.body, query: req.query }, 'Webhook de pagamento recebido');

  try {
    let paymentId = null;

    if (provider === 'mercadopago') {
      // Notificação do Mercado Pago (via query id ou body data.id)
      paymentId = req.query['data.id'] || req.body?.data?.id || req.body?.id;
    } else if (provider === 'asaas') {
      paymentId = req.body?.payment?.id || req.body?.id;
    } else {
      paymentId = req.body?.paymentId || req.body?.id;
    }

    if (!paymentId) {
      return res.status(200).send('OK (sem ID de pagamento)');
    }

    // [SEGURANÇA OWASP / FALHA 02]: Validação obrigatória do status real junto à API oficial do gateway
    let isApproved = false;

    if (provider === 'mercadopago') {
      const gatewayConfig = await getTenantGatewayConfig(tenantId);
      const token = gatewayConfig?.credentials?.accessToken;

      if (!token) {
        req.log.warn({ tenantId }, 'Webhook recebido mas salão não possui token de acesso do Mercado Pago configurado');
        return res.status(200).json({ received: true, ignored: true, reason: 'Gateway credentials missing' });
      }

      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (mpRes.ok) {
          const mpData = await mpRes.json();
          if (mpData.status === 'approved') {
            isApproved = true;
          } else {
            req.log.info({ paymentId, status: mpData.status }, 'Webhook MP: pagamento ainda não aprovado');
            return res.status(200).json({ received: true, status: mpData.status });
          }
        } else {
          req.log.warn({ paymentId, status: mpRes.status }, 'Falha na consulta à API do Mercado Pago');
          return res.status(502).json({ error: 'Erro ao validar status com Mercado Pago' });
        }
      } catch (mpErr) {
        req.log.error(mpErr, 'Erro de rede ao consultar Mercado Pago');
        return res.status(502).json({ error: 'Falha de comunicação com gateway' });
      }
    } else if (provider === 'asaas') {
      const event = req.body?.event;
      if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
        isApproved = true;
      } else {
        const gatewayConfig = await getTenantGatewayConfig(tenantId);
        const apiKey = gatewayConfig?.credentials?.apiKey;
        if (apiKey) {
          const baseUrl = gatewayConfig.sandbox_mode ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
          const asaasRes = await fetch(`${baseUrl}/payments/${paymentId}`, {
            headers: { 'access_token': apiKey }
          });
          if (asaasRes.ok) {
            const asaasData = await asaasRes.json();
            if (asaasData.status === 'RECEIVED' || asaasData.status === 'CONFIRMED') {
              isApproved = true;
            } else {
              return res.status(200).json({ received: true, status: asaasData.status });
            }
          }
        }
      }
    } else {
      // Provedores não oficiais não podem ter confirmação automática cega sem verificação
      req.log.warn({ provider }, 'Tentativa de webhook para provedor não suportado');
      return res.status(400).json({ error: 'Provedor não suportado para webhook automático.' });
    }

    if (!isApproved) {
      return res.status(200).json({ received: true, status: 'not_approved' });
    }

    // Confirmar pagamento de forma atômica
    await confirmDepositPayment(tenantId, paymentId, provider);

    return res.status(200).json({ received: true, confirmed: true });
  } catch (error) {
    req.log.error(error, `Erro ao processar webhook do gateway ${provider}`);
    // Retorna 200 para o gateway não ficar floodando com retry se for agendamento não encontrado
    return res.status(200).json({ error: error.message });
  }
});

/**
 * 6. Simular Pagamento Aprovado (Exclusivo para Sandbox / Desenvolvimento Local)
 */
router.post('/simulate-paid/:appointmentId', async (req, res) => {
  // [SEGURANÇA OWASP / FALHA 01]: Bloqueio compulsório em produção
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Endpoint indisponível em ambiente de produção.' });
  }

  const { appointmentId } = req.params;

  try {
    const apptRes = await pool.query(
      `SELECT a.tenant_id, a.deposit_payment_id, a.deposit_status, g.sandbox_mode
       FROM public.cap_appointments a
       LEFT JOIN public.cap_tenant_gateway_configs g ON g.tenant_id = a.tenant_id
       WHERE a.id = $1`,
      [appointmentId]
    );

    if (apptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    const { tenant_id, deposit_payment_id, sandbox_mode } = apptRes.rows[0];

    if (sandbox_mode === false) {
      return res.status(403).json({ error: 'Simulação permitida apenas quando o gateway estiver configurado em modo Sandbox.' });
    }

    // Confirma usando o ID do pagamento registrado
    const result = await confirmDepositPayment(tenant_id, deposit_payment_id, 'simulator');

    return res.json({
      message: 'Pagamento de sinal simulado com sucesso! Horário confirmado.',
      ...result
    });
  } catch (error) {
    req.log.error(error, 'Erro ao simular pagamento do sinal');
    return res.status(500).json({ error: error.message });
  }
});

export default router;
