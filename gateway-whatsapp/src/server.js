import express from 'express';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import sessionManager from './whatsapp/sessionManager.js';
import messageQueue from './whatsapp/messageQueue.js';
import pool from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'operabeauty-m2m-internal-secret-token-32chars';

app.use(express.json());

// Healthcheck público para Docker
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'operabeauty-wa-gateway',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Middleware de Autenticação M2M em Tempo Constante (Timing-Safe)
 * Governança: 01-security-constitution
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

app.use(requireInternalSecret);

/**
 * POST /internal/instances/connect
 * Inicia conexão do WhatsApp por Pairing Code ou QR Code
 */
app.post('/internal/instances/connect', async (req, res) => {
  const { tenantId, phoneNumber, method = 'pairing_code' } = req.body;

  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId é obrigatório' });
  }

  try {
    const result = await sessionManager.connect(tenantId, {
      phoneNumber,
      method,
    });
    res.json(result);
  } catch (error) {
    console.error(`[Gateway Server] Erro ao conectar ${tenantId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /internal/instances/:tenantId/status
 * Consulta o status atual da instância
 */
app.get('/internal/instances/:tenantId/status', async (req, res) => {
  const { tenantId } = req.params;

  try {
    const dbResult = await pool.query(
      `SELECT status, phone_number, pairing_code, qr_code, connected_at, last_activity_at 
       FROM public.cap_whatsapp_instances 
       WHERE tenant_id = $1`,
      [tenantId]
    );

    if (dbResult.rows.length === 0) {
      return res.json({ status: 'DISCONNECTED', tenantId });
    }

    res.json({
      tenantId,
      ...dbResult.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /internal/instances/:tenantId/disconnect
 * Encerra a conexão e desloga do WhatsApp
 */
app.post('/internal/instances/:tenantId/disconnect', async (req, res) => {
  const { tenantId } = req.params;

  try {
    const result = await sessionManager.disconnect(tenantId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /internal/messages/send-reminder
 * Enfileira e dispara lembrete com botões interativos
 */
app.post('/internal/messages/send-reminder', async (req, res) => {
  const {
    tenantId,
    appointmentId,
    recipientPhone,
    clientName,
    salonName,
    serviceName,
    professionalName,
    scheduledTimeFormatted,
    messageType,
  } = req.body;

  if (!tenantId || !recipientPhone || !clientName) {
    return res.status(400).json({ error: 'Parâmetros incompletos para envio de lembrete' });
  }

  try {
    const result = await messageQueue.sendAppointmentReminder({
      tenantId,
      appointmentId,
      recipientPhone,
      clientName,
      salonName: salonName || 'OperaBeauty',
      serviceName: serviceName || 'Serviço',
      professionalName: professionalName || 'Profissional',
      scheduledTimeFormatted: scheduledTimeFormatted || 'Horário agendado',
      messageType: messageType || 'REMINDER_24H',
    });

    res.json({ success: true, messageId: result?.key?.id });
  } catch (error) {
    console.error('[Gateway Server] Falha ao enviar lembrete:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /internal/messages/send-otp
 * Dispara código de uso único (OTP) para cliente via WhatsApp do salão
 */
app.post('/internal/messages/send-otp', async (req, res) => {
  const { tenantId, recipientPhone, clientName, code, salonName, purpose = 'reset_password' } = req.body;

  if (!tenantId || !recipientPhone || !code) {
    return res.status(400).json({ error: 'tenantId, recipientPhone e code são obrigatórios' });
  }

  try {
    const actionText = purpose === 'login' ? 'acessar sua conta' : 'redefinir sua senha de acesso';
    const messageText = 
`🌸 *${salonName || 'Salão'}*

Olá, *${clientName || 'Cliente'}*! Tudo bem?

Seu código para ${actionText} é:

👉 *${code}* 👈

⏱️ _Este código é de uso único e expira em 5 minutos._
🔒 _Não compartilhe este código com ninguém._`;

    const result = await messageQueue.sendSimpleMessage(tenantId, recipientPhone, messageText);

    // Grava auditoria em cap_whatsapp_messages
    const idempotencyKey = `otp:${tenantId}:${recipientPhone}:${Date.now()}`;
    await pool.query(
      `INSERT INTO public.cap_whatsapp_messages 
         (tenant_id, recipient_phone, message_type, content, status, idempotency_key, sent_at)
       VALUES ($1, $2, 'OTP', $3, 'SENT', $4, NOW())`,
      [tenantId, recipientPhone, messageText, idempotencyKey]
    );

    res.json({ success: true, messageId: result?.key?.id });
  } catch (error) {
    console.error('[Gateway Server] Falha ao enviar OTP:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`[WhatsApp Gateway] Microsserviço ativo na porta interna ${PORT}`);
});
