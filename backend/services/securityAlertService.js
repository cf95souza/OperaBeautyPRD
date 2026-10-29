import pino from 'pino';

const logger = pino();

/**
 * Envia alerta de segurança assíncrono para Discord/Webhook corporativo e registra auditoria
 */
export async function notifySuperAdminLoginAlert({ adminEmail, adminName, ip, userAgent, isNewDeviceOrIp }) {
  const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const webhookUrl = process.env.SECURITY_ALERT_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || null;

  logger.warn(
    { adminEmail, adminName, ip, userAgent, isNewDeviceOrIp, timestamp },
    `[Segurança C13] Login de Super Admin realizado com sucesso. ${isNewDeviceOrIp ? '⚠️ NOVO DISPOSITIVO OU IP DETECTADO.' : ''}`
  );

  if (!webhookUrl) {
    return { sent: false, reason: 'Nenhum webhook configurado em SECURITY_ALERT_WEBHOOK_URL' };
  }

  const payload = {
    embeds: [
      {
        title: isNewDeviceOrIp 
          ? '🚨 Alerta de Segurança: Login Super Admin (Novo IP/Aparelho)'
          : '🛡️ Notificação: Login Super Admin',
        color: isNewDeviceOrIp ? 15158332 : 3066993, // Vermelho se novo / Verde se reconhecido
        fields: [
          { name: 'Administrador', value: `${adminName} (${adminEmail})`, inline: true },
          { name: 'Endereço IP', value: ip || 'Desconhecido', inline: true },
          { name: 'Data e Hora (Brasília)', value: timestamp, inline: true },
          { name: 'Segundo Fator (2FA)', value: '✅ Validado via TOTP (RFC 6238)', inline: true },
          { name: 'Navegador / Dispositivo', value: (userAgent || 'N/A').substring(0, 150), inline: false }
        ],
        footer: {
          text: 'OperaBeauty Security Platform'
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      logger.error({ status: response.status }, 'Falha ao despachar webhook de alerta de segurança para Discord');
      return { sent: false, status: response.status };
    }

    return { sent: true };
  } catch (error) {
    logger.error({ error: error.message }, 'Erro ao conectar ao webhook de alerta de segurança');
    return { sent: false, error: error.message };
  }
}
