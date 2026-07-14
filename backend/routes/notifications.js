import express from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import {
  subscribeToPush,
  getMyNotifications,
  markNotificationAsRead,
  clearReadNotifications
} from '../services/notificationService.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Apenas profissionais e gerentes recebem notificações do salão atualmente
router.use(authMiddleware);
router.use(requireRole(['professional', 'manager']));

// Obter a chave pública para o frontend
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Registrar assinatura de um dispositivo
router.post('/subscribe', async (req, res) => {
  const { subscription } = req.body;
  const tenantId = req.user.tenant_id;
  const staffId = req.user.id;

  if (!subscription) {
    return res.status(400).json({ error: 'Assinatura inválida.' });
  }

  try {
    await subscribeToPush(tenantId, staffId, subscription);
    return res.status(201).json({ message: 'Inscrito com sucesso.' });
  } catch (err) {
    req.log.error(err, 'Erro ao salvar assinatura push');
    return res.status(500).json({ error: 'Erro interno ao assinar notificações.' });
  }
});

// Listar histórico de notificações in-app
router.get('/', async (req, res) => {
  try {
    const notifications = await getMyNotifications(req.user.tenant_id, req.user.id);
    return res.json(notifications);
  } catch (err) {
    req.log.error(err, 'Erro ao buscar notificações');
    return res.status(500).json({ error: 'Erro interno ao buscar notificações.' });
  }
});

// Marcar notificação como lida
router.put('/:id/read', async (req, res) => {
  try {
    await markNotificationAsRead(req.user.tenant_id, req.user.id, req.params.id);
    return res.json({ message: 'Marcada como lida.' });
  } catch (err) {
    req.log.error(err, 'Erro ao marcar notificação como lida');
    return res.status(400).json({ error: err.message });
  }
});

// Limpar todas as notificações lidas
router.delete('/read', async (req, res) => {
  try {
    await clearReadNotifications(req.user.tenant_id, req.user.id);
    return res.json({ message: 'Notificações lidas removidas com sucesso.' });
  } catch (err) {
    req.log.error(err, 'Erro ao limpar notificações lidas');
    return res.status(500).json({ error: 'Erro interno ao limpar notificações.' });
  }
});

export default router;
