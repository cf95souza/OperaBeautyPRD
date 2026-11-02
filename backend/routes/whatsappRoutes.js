import express from 'express';
import crypto from 'node:crypto';
import pool from '../config/db.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { requireFeature } from '../middlewares/featureFlagMiddleware.js';
import whatsappService from '../services/whatsappService.js';

const router = express.Router();

if (!process.env.INTERNAL_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ [ALERTA DE SEGURANÇA / FALHA 08] INTERNAL_SECRET não definido no .env em ambiente de produção!');
}
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'operabeauty-m2m-internal-secret-token-32chars';

/**
 * Middleware para validar o segredo M2M interno via timingSafeEqual
 */
function requireInternalSecret(req, res, next) {
  const incoming = req.header('X-Internal-Secret') || '';
  const expected = INTERNAL_SECRET;

  if (incoming.length !== expected.length) {
    return res.status(401).json({ error: 'Acesso não autorizado: token M2M inválido' });
  }

  const incomingBuffer = Buffer.from(incoming);
  const expectedBuffer = Buffer.from(expected);

  if (!crypto.timingSafeEqual(incomingBuffer, expectedBuffer)) {
    return res.status(401).json({ error: 'Acesso não autorizado: token M2M inválido' });
  }

  next();
}

// =========================================================================
// 1. WEBHOOK INTERNO (Chamado pelo operabeauty-wa-gateway)
// =========================================================================
router.post('/webhook', requireInternalSecret, async (req, res) => {
  const { tenantId, appointmentId, action, fromPhone, rawMessage } = req.body;

  if (!tenantId || !appointmentId || !action) {
    return res.status(400).json({ error: 'Payload de webhook incompleto' });
  }

  try {
    // 1. Busca os detalhes do agendamento com isolamento de tenant
    const apptResult = await pool.query(
      `SELECT id, client_id, status FROM public.cap_appointments WHERE id = $1 AND tenant_id = $2`,
      [appointmentId, tenantId]
    );

    if (apptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    const currentStatus = apptResult.rows[0].status;
    const clientId = apptResult.rows[0].client_id;

    // Se já estiver cancelado ou finalizado, não altera
    if (['cancelled', 'completed'].includes(currentStatus)) {
      return res.json({ message: 'Agendamento já encerrado, status mantido', currentStatus });
    }

    if (action === 'CONFIRMED') {
      await pool.query(
        `UPDATE public.cap_appointments SET status = 'confirmed', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [appointmentId, tenantId]
      );

      // Registra nota automática na timeline do CRM
      await pool.query(
        `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, appointment_id, content, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          tenantId,
          clientId,
          appointmentId,
          `✅ Presença confirmada pelo cliente via WhatsApp em 1 toque (Telefone: ${fromPhone}).`,
        ]
      );

      return res.json({ success: true, updatedStatus: 'confirmed' });
    }

    if (action === 'RESCHEDULE_REQUESTED') {
      await pool.query(
        `UPDATE public.cap_appointments SET status = 'reschedule_requested', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [appointmentId, tenantId]
      );

      // Registra nota automática na timeline do CRM
      await pool.query(
        `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, appointment_id, content, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          tenantId,
          clientId,
          appointmentId,
          `📅 Cliente solicitou remarcação pelo WhatsApp em 1 toque (Mensagem: "${rawMessage}"). Entrar em contato para novo horário.`,
        ]
      );

      return res.json({ success: true, updatedStatus: 'reschedule_requested' });
    }

    return res.json({ message: 'Ação não mapeada', action });
  } catch (error) {
    console.error('[WhatsApp Webhook Route] Erro ao processar:', error.message);
    return res.status(500).json({ error: 'Erro interno ao processar webhook' });
  }
});

// =========================================================================
// 2. ROTAS DE GESTÃO DO SALÃO (Protegidas por JWT e Role)
// =========================================================================
router.use(authMiddleware);

/**
 * POST /api/whatsapp/connect
 * Solicita pareamento via Pairing Code ou QR Code
 */
router.post('/connect', requireRole(['manager', 'admin', 'salon_admin', 'superadmin']), requireFeature('whatsapp_gateway'), async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { phoneNumber, method = 'pairing_code' } = req.body;

  try {
    const result = await whatsappService.connectInstance(tenantId, {
      phoneNumber,
      method,
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/whatsapp/status
 * Retorna status da conexão WhatsApp do salão
 */
router.get('/status', requireRole(['manager', 'admin', 'salon_admin', 'superadmin']), async (req, res) => {
  const tenantId = req.user.tenant_id;

  try {
    const status = await whatsappService.getInstanceStatus(tenantId);
    return res.json(status);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/whatsapp/disconnect
 * Desconecta a sessão do salão
 */
router.post('/disconnect', requireRole(['manager', 'admin', 'salon_admin', 'superadmin']), async (req, res) => {
  const tenantId = req.user.tenant_id;

  try {
    const result = await whatsappService.disconnectInstance(tenantId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/whatsapp/test-message
 * Envia uma mensagem de teste imediata para o número indicado
 */
router.post('/test-message', requireRole(['manager', 'admin', 'salon_admin', 'superadmin']), async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { recipientPhone } = req.body;

  if (!recipientPhone) {
    return res.status(400).json({ error: 'Número de telefone do destinatário é obrigatório.' });
  }

  try {
    const result = await whatsappService.sendTestMessage({
      tenantId,
      recipientPhone,
      senderName: req.user.name || 'Gestor'
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/whatsapp/messages
 * Histórico de lembretes e mensagens enviadas pelo WhatsApp no salão
 */
router.get('/messages', requireRole(['manager', 'admin', 'salon_admin', 'superadmin']), async (req, res) => {
  const tenantId = req.user.tenant_id;
  const limit = parseInt(req.query.limit || '50', 10);

  try {
    const history = await pool.query(
      `SELECT m.id, m.appointment_id, m.recipient_phone, m.message_type, m.status, m.sent_at, m.created_at,
              c.name as client_name, s.name as service_name
       FROM public.cap_whatsapp_messages m
       LEFT JOIN public.cap_appointments a ON m.appointment_id = a.id
       LEFT JOIN public.cap_clients c ON a.client_id = c.id
       LEFT JOIN public.cap_services s ON a.service_id = s.id
       WHERE m.tenant_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2`,
      [tenantId, limit]
    );

    return res.json({ messages: history.rows });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
