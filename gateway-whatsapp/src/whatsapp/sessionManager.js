import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import pool from '../config/db.js';
import usePostgresAuthState from '../auth/postgresAuthState.js';

/**
 * Gerenciador de Instâncias Multi-Tenant de WhatsApp (Baileys v7)
 * Governança: 01-security-constitution & Fase 44 (D2)
 */

class WhatsAppSessionManager {
  constructor() {
    this.sessions = new Map(); // tenantId -> { sock, status, qr, pairingCode }
    this.reconnectAttempts = new Map(); // tenantId -> count
  }

  /**
   * Limpa formatação de telefone mantendo código de país (ex: 5511999999999)
   */
  cleanPhoneNumber(phone) {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  }

  /**
   * Conecta ou recupera sessão para um determinado tenant
   * @param {string} tenantId 
   * @param {object} [options]
   * @param {string} [options.phoneNumber] 
   * @param {'pairing_code' | 'qr'} [options.method]
   */
  async connect(tenantId, options = {}) {
    if (!tenantId) {
      throw new Error('tenantId é obrigatório para conectar sessão de WhatsApp');
    }

    // Se já estiver conectada e ativa, retorna o estado
    if (this.sessions.has(tenantId)) {
      const existing = this.sessions.get(tenantId);
      if (existing.status === 'CONNECTED' && existing.sock?.user) {
        return {
          status: 'CONNECTED',
          phoneNumber: existing.sock.user.id.split(':')[0],
          tenantId,
        };
      }
    }

    const { state, saveCreds } = await usePostgresAuthState(tenantId);
    const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3000, 1017531287],
      isLatest: false,
    }));

    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: state,
      browser: ['OperaBeauty SaaS', 'Chrome', '1.0.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      generateHighQualityLinkPreview: false,
    });

    const sessionData = {
      sock,
      status: 'INITIALIZING',
      qr: null,
      pairingCode: null,
      method: options.method || 'pairing_code',
      targetPhone: this.cleanPhoneNumber(options.phoneNumber),
    };

    this.sessions.set(tenantId, sessionData);

    // Salva credenciais sempre que atualizadas
    sock.ev.on('creds.update', saveCreds);

    // Tratamento de Conexão e Atualizações de Status
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        sessionData.qr = qr;
        sessionData.status = 'SCAN_QR';
        await pool.query(
          `UPDATE public.cap_whatsapp_instances 
           SET status = 'SCAN_QR', qr_code = $1, pairing_code = NULL, updated_at = NOW() 
           WHERE tenant_id = $2`,
          [qr, tenantId]
        );
      }

      if (connection === 'open') {
        const phone = sock.user?.id ? sock.user.id.split(':')[0].split('@')[0] : sessionData.targetPhone;
        sessionData.status = 'CONNECTED';
        sessionData.qr = null;
        sessionData.pairingCode = null;
        this.reconnectAttempts.delete(tenantId);

        await pool.query(
          `UPDATE public.cap_whatsapp_instances 
           SET status = 'CONNECTED', phone_number = $1, qr_code = NULL, pairing_code = NULL, connected_at = NOW(), last_activity_at = NOW(), updated_at = NOW() 
           WHERE tenant_id = $2`,
          [phone, tenantId]
        );

        console.log(`[WhatsApp Gateway] Salão ${tenantId} conectado com sucesso no número ${phone}`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.warn(`[WhatsApp Gateway] Conexão encerrada para ${tenantId}. Código: ${statusCode}. Reconectar? ${shouldReconnect}`);

        if (statusCode === DisconnectReason.loggedOut) {
          // Desconectado intencionalmente pelo usuário no celular
          sessionData.status = 'DISCONNECTED';
          this.sessions.delete(tenantId);

          await pool.query(
            `UPDATE public.cap_whatsapp_instances 
             SET status = 'DISCONNECTED', qr_code = NULL, pairing_code = NULL, updated_at = NOW() 
             WHERE tenant_id = $1`,
            [tenantId]
          );

          // Limpa chaves de autenticação do tenant deslogado
          await pool.query(
            'DELETE FROM public.cap_whatsapp_auth_keys WHERE tenant_id = $1',
            [tenantId]
          );
        } else if (shouldReconnect) {
          const attempts = (this.reconnectAttempts.get(tenantId) || 0) + 1;
          this.reconnectAttempts.set(tenantId, attempts);

          if (attempts <= 5) {
            const delay = Math.min(attempts * 3000, 15000);
            setTimeout(() => {
              this.connect(tenantId, options).catch((err) =>
                console.error(`[WhatsApp Gateway] Falha ao reconectar ${tenantId}:`, err.message)
              );
            }, delay);
          } else {
            sessionData.status = 'DISCONNECTED';
            await pool.query(
              `UPDATE public.cap_whatsapp_instances SET status = 'DISCONNECTED', updated_at = NOW() WHERE tenant_id = $1`,
              [tenantId]
            );
          }
        }
      }
    });

    // Escuta de mensagens recebidas (Interatividade e Confirmações em 1 toque)
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        try {
          await this.handleIncomingMessage(tenantId, msg);
        } catch (msgErr) {
          console.error(`[WhatsApp Gateway] Erro ao processar mensagem recebida para ${tenantId}:`, msgErr.message);
        }
      }
    });

    // Se método pairing code e não registrado, gera o código de 8 dígitos
    if (options.method === 'pairing_code' && options.phoneNumber && !sock.authState.creds.registered) {
      try {
        const cleanPhone = this.cleanPhoneNumber(options.phoneNumber);
        // Aguarda 1.5s para o socket estabilizar antes de solicitar o código
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const code = await sock.requestPairingCode(cleanPhone);
        sessionData.pairingCode = code;
        sessionData.status = 'PAIRING_CODE';

        await pool.query(
          `UPDATE public.cap_whatsapp_instances 
           SET status = 'PAIRING_CODE', pairing_code = $1, phone_number = $2, qr_code = NULL, updated_at = NOW() 
           WHERE tenant_id = $3`,
          [code, cleanPhone, tenantId]
        );

        return {
          status: 'PAIRING_CODE',
          pairingCode: code,
          phoneNumber: cleanPhone,
          tenantId,
        };
      } catch (pairErr) {
        console.error(`[WhatsApp Gateway] Falha ao solicitar pairing code para ${tenantId}:`, pairErr.message);
        throw pairErr;
      }
    }

    return {
      status: sessionData.status,
      qr: sessionData.qr,
      pairingCode: sessionData.pairingCode,
      tenantId,
    };
  }

  /**
   * Processa respostas de confirmação ou remarcação e envia webhook interno para o OperaBeauty API
   */
  async handleIncomingMessage(tenantId, msg) {
    const from = msg.key.remoteJid ? msg.key.remoteJid.split('@')[0] : '';
    let selectedButtonId = null;
    let textContent = '';

    // Extrai cliques de botão interativo
    if (msg.message?.buttonsResponseMessage?.selectedButtonId) {
      selectedButtonId = msg.message.buttonsResponseMessage.selectedButtonId;
    } else if (msg.message?.templateButtonReplyMessage?.selectedId) {
      selectedButtonId = msg.message.templateButtonReplyMessage.selectedId;
    } else if (msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
      try {
        const params = JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
        selectedButtonId = params.id;
      } catch (e) {
        // ignore
      }
    }

    // Extrai texto puro de resposta
    textContent = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      ''
    ).trim().toUpperCase();

    let action = null;
    let appointmentId = null;

    if (selectedButtonId) {
      if (selectedButtonId.startsWith('confirm_appointment:')) {
        action = 'CONFIRMED';
        appointmentId = selectedButtonId.split(':')[1];
      } else if (selectedButtonId.startsWith('reschedule_appointment:')) {
        action = 'RESCHEDULE_REQUESTED';
        appointmentId = selectedButtonId.split(':')[1];
      }
    } else if (textContent) {
      // Fallback para respostas em texto ("1", "SIM", "CONFIRMAR" / "2", "REMARCAR")
      if (['1', 'SIM', 'CONFIRMO', 'CONFIRMAR', 'OK'].includes(textContent)) {
        action = 'CONFIRMED';
      } else if (['2', 'REMARCAR', 'REMARQUE', 'NÃO', 'NAO'].includes(textContent)) {
        action = 'RESCHEDULE_REQUESTED';
      }

      if (action) {
        // Localiza o agendamento mais recente vinculado a esse número no salão
        const recentMsg = await pool.query(
          `SELECT appointment_id FROM public.cap_whatsapp_messages 
           WHERE tenant_id = $1 AND recipient_phone LIKE '%' || $2 || '%' 
             AND appointment_id IS NOT NULL 
           ORDER BY created_at DESC LIMIT 1`,
          [tenantId, from.slice(-8)]
        );
        if (recentMsg.rows.length > 0) {
          appointmentId = recentMsg.rows[0].appointment_id;
        }
      }
    }

    if (action && appointmentId) {
      // Despacha webhook interno para o core operabeauty-api
      await this.dispatchInternalWebhook({
        tenantId,
        appointmentId,
        action,
        fromPhone: from,
        rawMessage: textContent || selectedButtonId,
      });

      // Atualiza o registro em cap_whatsapp_messages
      await pool.query(
        `UPDATE public.cap_whatsapp_messages 
         SET status = $1, updated_at = NOW() 
         WHERE tenant_id = $2 AND appointment_id = $3`,
        [action, tenantId, appointmentId]
      ).catch(() => {});
    }
  }

  /**
   * Despacha webhook assinado com token M2M para o backend da API do OperaBeauty
   */
  async dispatchInternalWebhook(payload) {
    const webhookUrl = process.env.API_WEBHOOK_URL || 'http://operabeauty-api:5000/api/whatsapp/webhook';
    const secret = process.env.INTERNAL_SECRET || 'operabeauty-m2m-internal-secret-token-32chars';

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': secret,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn(`[WhatsApp Webhook] Retorno inesperado da API (${response.status}):`, await response.text());
      } else {
        console.log(`[WhatsApp Webhook] Sucesso ao notificar API sobre ação ${payload.action} do agendamento ${payload.appointmentId}`);
      }
    } catch (err) {
      console.error('[WhatsApp Webhook] Falha ao despachar webhook para API interna:', err.message);
    }
  }

  /**
   * Obtém a instância de socket ativa de um salão
   */
  getSocket(tenantId) {
    const session = this.sessions.get(tenantId);
    if (!session || session.status !== 'CONNECTED' || !session.sock) {
      return null;
    }
    return session.sock;
  }

  /**
   * Desconecta e encerra a sessão
   */
  async disconnect(tenantId) {
    const session = this.sessions.get(tenantId);
    if (session?.sock) {
      try {
        await session.sock.logout();
      } catch (e) {
        // ignore
      }
    }
    this.sessions.delete(tenantId);
    await pool.query(
      `UPDATE public.cap_whatsapp_instances 
       SET status = 'DISCONNECTED', qr_code = NULL, pairing_code = NULL, updated_at = NOW() 
       WHERE tenant_id = $1`,
      [tenantId]
    );
    await pool.query(
      'DELETE FROM public.cap_whatsapp_auth_keys WHERE tenant_id = $1',
      [tenantId]
    );
    return { success: true };
  }
}

export const sessionManager = new WhatsAppSessionManager();
export default sessionManager;
