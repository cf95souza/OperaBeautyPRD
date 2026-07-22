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

// Autenticação necessária, mas sem restrição de role (tanto cliente quanto staff podem ter push)
router.use(authMiddleware);

// Obter a chave pública para o frontend
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Registrar assinatura de um dispositivo
router.post('/subscribe', async (req, res) => {
  const { subscription } = req.body;
  const tenantId = req.user.tenant_id;
  const userId = req.user.id;
  const isClient = req.user.role === 'client';

  if (!subscription) {
    return res.status(400).json({ error: 'Assinatura inválida.' });
  }

  try {
    if (isClient) {
      const { subscribeClientToPush } = await import('../services/notificationService.js');
      await subscribeClientToPush(tenantId, userId, subscription);
    } else {
      await subscribeToPush(tenantId, userId, subscription);
    }
    return res.status(201).json({ message: 'Inscrito com sucesso.' });
  } catch (err) {
    req.log.error(err, 'Erro ao salvar assinatura push');
    return res.status(500).json({ error: 'Erro interno ao assinar notificações.' });
  }
});

// Listar histórico de notificações in-app
router.get('/', async (req, res) => {
  try {
    const isClient = req.user.role === 'client';
    const notifications = await getMyNotifications(req.user.tenant_id, req.user.id, isClient);
    return res.json(notifications);
  } catch (err) {
    req.log.error(err, 'Erro ao buscar notificações');
    return res.status(500).json({ error: 'Erro interno ao buscar notificações.' });
  }
});

// Marcar notificação como lida
router.put('/:id/read', async (req, res) => {
  try {
    const isClient = req.user.role === 'client';
    await markNotificationAsRead(req.user.tenant_id, req.user.id, isClient, req.params.id);
    return res.json({ message: 'Marcada como lida.' });
  } catch (err) {
    req.log.error(err, 'Erro ao marcar notificação como lida');
    return res.status(400).json({ error: err.message });
  }
});

// Limpar todas as notificações lidas
router.delete('/read', async (req, res) => {
  try {
    const isClient = req.user.role === 'client';
    await clearReadNotifications(req.user.tenant_id, req.user.id, isClient);
    return res.json({ message: 'Notificações lidas removidas com sucesso.' });
  } catch (err) {
    req.log.error(err, 'Erro ao limpar notificações lidas');
    return res.status(500).json({ error: 'Erro interno ao limpar notificações.' });
  }
});

export default router;
