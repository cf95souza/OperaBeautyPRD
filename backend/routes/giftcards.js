import express from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { 
  listGiftCardsByTenant, 
  listGiftCardsByClient, 
  createGiftCard, 
  validateGiftCardCode, 
  redeemGiftCard,
  getGiftCardRequest,
  confirmGiftCardPayment,
  getTenantPaymentMethods,
  updateTenantPaymentMethod
} from '../services/giftcardService.js';

const router = express.Router();

const createGiftCardSchema = z.object({
  body: z.object({
    service_id: z.string().uuid('ID de serviço inválido.').optional().nullable(),
    recipient_name: z.string().min(2, 'O nome do destinatário é muito curto.').optional().nullable(),
    recipient_phone: z.string().optional().nullable(),
    message: z.string().optional().nullable(),
    original_value: z.number().min(0.01, 'O valor deve ser maior que zero.')
  }),
  query: z.any(), params: z.any()
});

const codeParamSchema = z.object({
  params: z.object({
    code: z.string().min(5, 'Código inválido.')
  }),
  body: z.object({
    amount: z.number().min(0.01, 'O valor de resgate deve ser maior que zero.')
  }), 
  query: z.any()
});

const requestIdParamSchema = z.object({
  params: z.object({
    request_id: z.string().min(5, 'ID da solicitação inválido.')
  }),
  body: z.any(), query: z.any()
});

// GET /api/giftcards/payment-methods - Retorna PIX do salão para compra (Público ou Cliente autenticado)
router.get('/payment-methods', async (req, res) => {
  const tenantId = req.query.tenant_id || (req.user ? req.user.tenant_id : null);
  if (!tenantId) return res.status(400).json({ error: 'tenant_id ausente.' });

  try {
    const methods = await getTenantPaymentMethods(tenantId);
    return res.json(methods);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: 'Erro ao buscar métodos de pagamento.' });
  }
});

// POST /api/giftcards/payment-methods - Atualiza PIX do salão (Admin)
router.post('/payment-methods', authMiddleware, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const newMethod = await updateTenantPaymentMethod(req.user.tenant_id, req.body);
    return res.json(newMethod);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar método de pagamento.' });
  }
});

// Listar todos os Gift Cards do salão (Apenas Gestor/Admin)
router.get('/admin', authMiddleware, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const cards = await listGiftCardsByTenant(req.user.tenant_id);
    return res.json(cards);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: 'Erro ao listar gift cards do painel.' });
  }
});

// Listar Gift Cards comprados pelo cliente autenticado
router.get('/my-gifts', authMiddleware, requireRole(['client']), async (req, res) => {
  try {
    const cards = await listGiftCardsByClient(req.user.tenant_id, req.user.id);
    return res.json(cards);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: 'Erro ao listar seus gift cards.' });
  }
});

// Criar uma solicitação de Gift Card (Cliente)
router.post('/', authMiddleware, requireRole(['client']), validate(createGiftCardSchema), async (req, res) => {
  try {
    const newCard = await createGiftCard(req.user.tenant_id, req.user.id, req.body);
    return res.status(201).json(newCard);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: 'Erro ao comprar gift card.' });
  }
});

// Admin consulta solicitação de pagamento pelo request_id
router.get('/admin/request/:request_id', authMiddleware, requireRole(['manager', 'admin']), validate(requestIdParamSchema), async (req, res) => {
  try {
    const requestInfo = await getGiftCardRequest(req.user.tenant_id, req.params.request_id);
    return res.json(requestInfo);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error);
    return res.status(500).json({ error: 'Erro ao buscar solicitação.' });
  }
});

// Admin confirma pagamento de uma solicitação e gera o código final
router.post('/admin/confirm-payment/:request_id', authMiddleware, requireRole(['manager', 'admin']), validate(requestIdParamSchema), async (req, res) => {
  try {
    const result = await confirmGiftCardPayment(req.user.tenant_id, req.params.request_id);
    return res.json({ 
      message: 'Pagamento confirmado com sucesso.',
      gift_card: result 
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error);
    return res.status(500).json({ error: 'Erro ao confirmar pagamento.' });
  }
});

// Validar código do Gift Card de resgate (Admin/Manager)
router.get('/validate/:code', authMiddleware, requireRole(['manager', 'admin']), async (req, res) => {
  const tenantId = req.user.tenant_id;

  try {
    const gift = await validateGiftCardCode(tenantId, req.params.code);
    return res.json(gift);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error);
    return res.status(500).json({ error: 'Erro ao validar código do vale-presente.' });
  }
});

// Resgatar Gift Card com suporte parcial
router.post('/redeem/:code', authMiddleware, requireRole(['manager', 'admin']), validate(codeParamSchema), async (req, res) => {
  try {
    const result = await redeemGiftCard(req.user.tenant_id, req.params.code, req.body.amount);
    return res.status(200).json({ 
      message: 'Resgate realizado com sucesso.',
      gift_card: result
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error);
    return res.status(500).json({ error: 'Erro ao resgatar vale-presente.' });
  }
});

export default router;
