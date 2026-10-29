/**
 * Serviço de Integração com o Gateway Nativo de WhatsApp do OperaBeauty
 * Governança: 01-security-constitution & Fase 44 (D2)
 */

const WA_GATEWAY_URL = process.env.WA_GATEWAY_URL || 'http://wa-gateway:4000';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'operabeauty-m2m-internal-secret-token-32chars';

export const whatsappService = {
  /**
   * Headers de autenticação M2M interna
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Internal-Secret': INTERNAL_SECRET,
    };
  },

  /**
   * Inicia o fluxo de pareamento por Pairing Code (8 dígitos) ou QR Code
   */
  async connectInstance(tenantId, { phoneNumber, method = 'pairing_code' } = {}) {
    try {
      const response = await fetch(`${WA_GATEWAY_URL}/internal/instances/connect`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ tenantId, phoneNumber, method }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Erro do gateway WhatsApp (${response.status}): ${errBody}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[whatsappService] Falha ao conectar instância para o tenant ${tenantId}:`, error.message);
      throw error;
    }
  },

  /**
   * Consulta o status da instância de WhatsApp de um salão
   */
  async getInstanceStatus(tenantId) {
    try {
      const response = await fetch(`${WA_GATEWAY_URL}/internal/instances/${tenantId}/status`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return { status: 'DISCONNECTED', tenantId };
      }

      return await response.json();
    } catch (error) {
      console.warn(`[whatsappService] Gateway offline ou inacessível ao checar tenant ${tenantId}:`, error.message);
      return { status: 'DISCONNECTED', tenantId, error: 'Gateway offline' };
    }
  },

  /**
   * Desconecta e desloga a sessão do WhatsApp
   */
  async disconnectInstance(tenantId) {
    try {
      const response = await fetch(`${WA_GATEWAY_URL}/internal/instances/${tenantId}/disconnect`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Erro ao desconectar (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[whatsappService] Falha ao desconectar tenant ${tenantId}:`, error.message);
      throw error;
    }
  },

  /**
   * Envia lembrete interativo de agendamento com botões (ou fallback)
   */
  async sendReminder(payload) {
    try {
      const response = await fetch(`${WA_GATEWAY_URL}/internal/messages/send-reminder`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Erro ao enviar lembrete via WhatsApp (${response.status}): ${errBody}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[whatsappService] Erro ao enviar lembrete de WhatsApp para agendamento ${payload.appointmentId}:`, error.message);
      throw error;
    }
  },

  /**
   * Envia OTP de uso único para login ou recuperação de senha via WhatsApp do salão
   */
  async sendOtp({ tenantId, recipientPhone, clientName, code, salonName, purpose = 'reset_password' }) {
    try {
      const response = await fetch(`${WA_GATEWAY_URL}/internal/messages/send-otp`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ tenantId, recipientPhone, clientName, code, salonName, purpose }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Erro do gateway WhatsApp (${response.status}): ${errBody}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[whatsappService] Erro ao enviar OTP para ${recipientPhone}:`, error.message);
      throw error;
    }
  },
};

export default whatsappService;
