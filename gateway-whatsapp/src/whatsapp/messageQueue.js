import pool from '../config/db.js';
import sessionManager from './sessionManager.js';

/**
 * Fila de Mensagens com Jitter Anti-Ban e Botões Interativos
 * Governança: 01-security-constitution & Fase 44 (D2)
 */

class WhatsAppMessageQueue {
  constructor() {
    this.tenantLocks = new Map(); // tenantId -> Promise (para garantir envio sequencial com jitter)
  }

  /**
   * Gera um atraso aleatório (jitter humanizado) entre minMs e maxMs
   */
  async sleepWithJitter(minMs = 2500, maxMs = 5500) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Formata telefone para formato JID padrão do WhatsApp
   */
  formatJid(phoneNumber) {
    let clean = (phoneNumber || '').replace(/\D/g, '');
    if (!clean.startsWith('55') && clean.length <= 11) {
      clean = '55' + clean;
    }
    return `${clean}@s.whatsapp.net`;
  }

  /**
   * Envia um lembrete interativo de agendamento (24h ou 2h)
   * @param {object} params
   * @param {string} params.tenantId
   * @param {string} params.appointmentId
   * @param {string} params.recipientPhone
   * @param {string} params.clientName
   * @param {string} params.salonName
   * @param {string} params.serviceName
   * @param {string} params.professionalName
   * @param {string} params.scheduledTimeFormatted - Ex: "Sexta-feira, 24/10 às 15:30"
   * @param {'REMINDER_24H' | 'REMINDER_2H' | 'OTP'} [params.messageType]
   */
  async sendAppointmentReminder(params) {
    const {
      tenantId,
      appointmentId,
      recipientPhone,
      clientName,
      salonName,
      serviceName,
      professionalName,
      scheduledTimeFormatted,
      messageType = 'REMINDER_24H',
    } = params;

    const jid = this.formatJid(recipientPhone);
    const idempotencyKey = `rem:${appointmentId}:${messageType}`;

    // 1. Valida Idempotência no PostgreSQL
    const existing = await pool.query(
      'SELECT id, status FROM public.cap_whatsapp_messages WHERE tenant_id = $1 AND idempotency_key = $2',
      [tenantId, idempotencyKey]
    );

    if (existing.rows.length > 0 && ['SENT', 'CONFIRMED', 'DELIVERED'].includes(existing.rows[0].status)) {
      console.log(`[WhatsApp Queue] Lembrete ${idempotencyKey} já enviado anteriormente.`);
      return { success: true, messageId: existing.rows[0].id, alreadySent: true };
    }

    // 2. Garante que mensagens para o mesmo salão não sejam disparadas em rajada simultânea
    const previousLock = this.tenantLocks.get(tenantId) || Promise.resolve();

    const currentExecution = previousLock
      .catch(() => {})
      .then(async () => {
        // Aplica o jitter humanizado anti-ban
        await this.sleepWithJitter(2500, 5000);

        const sock = sessionManager.getSocket(tenantId);
        if (!sock) {
          throw new Error(`Salão ${tenantId} não possui sessão de WhatsApp conectada no momento`);
        }

        // 3. Simula digitação humana (presence: composing)
        try {
          await sock.sendPresenceUpdate('composing', jid);
          await new Promise((r) => setTimeout(r, 1500));
          await sock.sendPresenceUpdate('paused', jid);
        } catch (presenceErr) {
          // não fatal se a atualização de presença falhar
        }

        // 4. Monta o corpo amigável e legível
        const introText = messageType === 'REMINDER_2H' ? '⏰ *Lembrete: seu agendamento é daqui a pouco!*' : '🌸 *Lembrete do seu agendamento de amanhã!*';

        const messageBody = 
`${introText}
Olá, *${clientName}*! Tudo bem?

Estamos passando para confirmar o seu horário no *${salonName}*:
📅 *Horário:* ${scheduledTimeFormatted}
💇 *Serviço:* ${serviceName}
👤 *Profissional:* ${professionalName}

Por favor, confirme se você comparecerá:
*1* - ✅ Confirmar Presença
*2* - 📅 Solicitar Remarcação

_Se preferir, clique nos botões abaixo ou responda com o número correspondente._
_(Caso deseje cancelar avisos futuros, responda SAIR)_`;

        // 5. Botões de Ação Rápida nativos
        const buttons = [
          {
            buttonId: `confirm_appointment:${appointmentId}`,
            buttonText: { displayText: '✅ Confirmar Presença' },
            type: 1,
          },
          {
            buttonId: `reschedule_appointment:${appointmentId}`,
            buttonText: { displayText: '📅 Solicitar Remarcação' },
            type: 1,
          },
        ];

        let sentResult;
        try {
          // Tenta envio com botões
          sentResult = await sock.sendMessage(jid, {
            text: messageBody,
            footer: `${salonName} • OperaBeauty`,
            buttons: buttons,
            headerType: 1,
          });
        } catch (btnErr) {
          // Se o client do WhatsApp recusar botões legados, fallback para texto limpo estruturado
          console.warn('[WhatsApp Queue] Fallback para texto plano:', btnErr.message);
          sentResult = await sock.sendMessage(jid, { text: messageBody });
        }

        // 6. Grava trilha de auditoria na tabela cap_whatsapp_messages
        await pool.query(
          `INSERT INTO public.cap_whatsapp_messages 
             (tenant_id, appointment_id, recipient_phone, message_type, content, status, idempotency_key, sent_at)
           VALUES ($1, $2, $3, $4, $5, 'SENT', $6, NOW())
           ON CONFLICT (tenant_id, idempotency_key)
           DO UPDATE SET status = 'SENT', sent_at = NOW(), content = EXCLUDED.content, error_message = NULL`,
          [tenantId, appointmentId, recipientPhone, messageType, messageBody, idempotencyKey]
        );

        return { success: true, messageId: sentResult?.key?.id };
      });

    this.tenantLocks.set(tenantId, currentExecution);
    return currentExecution;
  }

  /**
   * Envia mensagem de texto simples ou OTP (usado futuramente no D7)
   */
  async sendSimpleMessage(tenantId, recipientPhone, text) {
    const jid = this.formatJid(recipientPhone);
    const sock = sessionManager.getSocket(tenantId);
    if (!sock) {
      throw new Error(`Salão ${tenantId} não possui WhatsApp conectado`);
    }

    await this.sleepWithJitter(1500, 3000);
    return await sock.sendMessage(jid, { text });
  }
}

export const messageQueue = new WhatsAppMessageQueue();
export default messageQueue;
