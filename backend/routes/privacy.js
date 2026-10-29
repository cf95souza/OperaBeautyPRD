import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import {
  createPrivacyRequest,
  getPrivacyRequestStatus
} from '../services/privacyService.js';

const router = express.Router();

const requestSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Nome deve conter pelo menos 3 caracteres.'),
    email: z.string().email('E-mail inválido.'),
    document: z.string().optional().nullable(),
    requester_type: z.enum(['client', 'tenant_admin', 'staff', 'partner', 'visitor']).default('client'),
    request_type: z.enum([
      'access',
      'correction',
      'anonymization',
      'deletion',
      'portability',
      'consent_revocation',
      'information'
    ]),
    tenant_id: z.string().uuid().optional().nullable(),
    details: z.string().min(10, 'Por favor, detalhe sua solicitação com no mínimo 10 caracteres.')
  }),
  query: z.any(),
  params: z.any()
});

/**
 * Informações institucionais públicas do Encarregado de Dados (DPO)
 */
router.get('/dpo-info', (req, res) => {
  return res.json({
    dpo_name: 'Comitê de Privacidade e Segurança OperaBeauty',
    dpo_email: 'privacidade@operabeauty.com.br',
    dpo_role: 'Encarregado pelo Tratamento de Dados Pessoais (DPO)',
    legal_basis: 'Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD)',
    response_deadline_days: 15,
    operator_role: 'A OperaBeauty atua como Operadora dos dados processados pelos salões assinantes (Controladores).'
  });
});

/**
 * Envio de nova solicitação de privacidade / exercício de direitos LGPD
 */
router.post('/request', validate(requestSchema), async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const newRequest = await createPrivacyRequest({
      ...req.body,
      ip_address: typeof ip === 'string' ? ip.split(',')[0].trim() : null,
      user_agent: userAgent
    });

    return res.status(201).json({
      message: 'Sua solicitação foi registrada com sucesso sob a LGPD.',
      protocol: newRequest.protocol,
      status: newRequest.status,
      created_at: newRequest.created_at,
      deadline_info: 'O Encarregado de Dados (DPO) analisará seu pedido e responderá em até 15 dias úteis.'
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error?.(error, 'Erro ao criar requisição de privacidade');
    return res.status(500).json({ error: 'Erro interno ao processar solicitação de privacidade.' });
  }
});

/**
 * Consulta de status de solicitação pelo número de protocolo
 */
router.get('/status/:protocol', async (req, res) => {
  const { protocol } = req.params;
  try {
    const statusData = await getPrivacyRequestStatus(protocol);
    return res.json(statusData);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: 'Erro ao consultar protocolo.' });
  }
});

export default router;
