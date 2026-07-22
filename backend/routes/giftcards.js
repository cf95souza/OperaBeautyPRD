import express from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { 
  listGiftCardsByTenant, 
  listGiftCardsByClient, 
  createGiftCard, 
  validateGiftCard, 
  redeemGiftCard 
} from '../services/giftcardService.js';

const router = express.Router();

const createGiftCardSchema = z.object({
  body: z.object({
    service_id: z.string().uuid('ID de serviço inválido.'),
    recipient_name: z.string().min(2, 'O nome do destinatário é muito curto.').optional().nullable()
  }),
  query: z.any(), params: z.any()
});

const codeParamSchema = z.object({
  params: z.object({
    code: z.string().min(5, 'Código inválido.')
  }),
  body: z.any(), query: z.any()
});

// Listar todos os Gift Cards do salão (Apenas Gestor/Admin)
router.get('/admin', authMiddleware, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const cards = await listGiftCardsByTenant(req.user.tenant_id);
    return res.json(cards);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao listar gift cards do painel.' });
  }
});

// Listar Gift Cards comprados pelo cliente autenticado
router.get('/my-gifts', authMiddleware, requireRole(['client']), async (req, res) => {
  try {
    const cards = await listGiftCardsByClient(req.user.tenant_id, req.user.id);
    return res.json(cards);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao listar seus gift cards.' });
  }
});

// Criar (Comprar) um Gift Card (Cliente)
router.post('/', authMiddleware, requireRole(['client']), validate(createGiftCardSchema), async (req, res) => {
  try {
    // Simula pagamento sendo aprovado imediatamente
    const newCard = await createGiftCard(req.user.tenant_id, req.user.id, req.body);
    return res.status(201).json(newCard);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao comprar gift card.' });
  }
});

// Validar código do Gift Card (Qualquer um, apenas para checar o que é)
router.get('/validate/:code', async (req, res) => {
  // Pega tenant_id do header ou query (pois pode ser chamado antes de login)
  const tenantId = req.query.tenant_id || (req.user ? req.user.tenant_id : null);
  if (!tenantId) return res.status(400).json({ error: 'tenant_id ausente.' });

  try {
    const gift = await validateGiftCard(tenantId, req.params.code);
    return res.json(gift);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error(error);
    return res.status(500).json({ error: 'Erro ao validar gift card.' });
  }
});

// Resgatar Gift Card (Gestor marca como usado no painel)
router.post('/redeem/:code', authMiddleware, requireRole(['manager', 'admin']), validate(codeParamSchema), async (req, res) => {
  try {
    await redeemGiftCard(req.user.tenant_id, req.params.code);
    return res.status(200).json({ message: 'Gift card resgatado com sucesso.' });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error(error);
    return res.status(500).json({ error: 'Erro ao resgatar gift card.' });
  }
});

export default router;
