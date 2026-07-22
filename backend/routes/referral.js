import express from 'express';
import pool from '../config/db.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';

const router = express.Router();

router.get('/stats', authMiddleware, requireRole(['client']), async (req, res) => {
  try {
    const { id, tenant_id } = req.user;

    // 1. Pegar o referral_code do cliente atual
    const clientRes = await pool.query('SELECT referral_code FROM public.cap_clients WHERE id = $1 AND tenant_id = $2', [id, tenant_id]);
    if (clientRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    const referralCode = clientRes.rows[0].referral_code;

    // 2. Contar quantos amigos ele indicou
    const friendsRes = await pool.query('SELECT COUNT(*) as total FROM public.cap_clients WHERE referred_by = $1 AND tenant_id = $2', [id, tenant_id]);
    const totalFriends = parseInt(friendsRes.rows[0].total, 10);

    // 3. Somar os bônus recebidos na carteira devido a indicações
    // As transações foram inseridas com a descrição 'Bônus por indicação de novo amigo!'
    const bonusRes = await pool.query(`
      SELECT SUM(amount) as total_bonus 
      FROM public.cap_wallet_transactions 
      WHERE client_id = $1 AND tenant_id = $2 AND description = 'Bônus por indicação de novo amigo!'
    `, [id, tenant_id]);
    
    const totalBonus = parseFloat(bonusRes.rows[0].total_bonus || 0);

    return res.json({
      referralCode,
      totalFriends,
      totalBonus
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar estatísticas de indicação.' });
  }
});

export default router;
