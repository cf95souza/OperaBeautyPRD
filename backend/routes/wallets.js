import express from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { getWalletBalance, listWalletTransactions } from '../services/walletService.js';

const router = express.Router();

// 1. Obter saldo e extrato da carteira do cliente autenticado
router.get('/my', authMiddleware, requireRole(['client']), async (req, res) => {
  const clientId = req.user.id;
  const tenantId = req.user.tenant_id;

  try {
    const balance = await getWalletBalance(tenantId, clientId);
    const transactions = await listWalletTransactions(tenantId, clientId);
    return res.json({ balance, transactions });
  } catch (error) {
    req.log.error(error, 'Erro ao obter dados da carteira do cliente');
    return res.status(500).json({ error: 'Erro interno ao consultar carteira.' });
  }
});

// 2. Obter saldo da carteira de um cliente (Gerente ou Profissional visualizando no CRM)
router.get('/client/:clientId', authMiddleware, requireRole(['manager', 'professional']), async (req, res) => {
  const { clientId } = req.params;
  const tenantId = req.user.tenant_id;

  try {
    const balance = await getWalletBalance(tenantId, clientId);
    const transactions = await listWalletTransactions(tenantId, clientId);
    return res.json({ balance, transactions });
  } catch (error) {
    req.log.error(error, 'Erro ao obter dados da carteira do cliente pelo CRM');
    return res.status(500).json({ error: 'Erro interno ao consultar carteira do cliente.' });
  }
});

export default router;
