/**
 * OperaBeauty SaaS - Serviço de E-mails Transacionais (Resend)
 * Envio seguro de tokens OTP para recuperação de senha de clientes e avisos da plataforma.
 */

const RESEND_API_URL = 'https://api.resend.com/emails';
const SENDER_EMAIL = 'recuperacao@operabeauty.tech';
const SENDER_NAME = 'OperaBeauty';

/**
 * Disparo genérico de e-mail via API REST do Resend
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Chave de API do Resend não configurada (RESEND_API_KEY ausente).');
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || ''
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data?.message || data?.error || response.statusText;
    throw new Error(`Falha no envio de e-mail via Resend: ${errorMsg}`);
  }

  return data;
};

/**
 * Disparo de OTP de 6 dígitos para recuperação de senha do cliente
 */
export const sendClientPasswordResetOtpEmail = async ({ to, clientName, salonName, otpCode }) => {
  const subject = `Código de Recuperação: ${otpCode} - ${salonName || 'OperaBeauty'}`;
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperação de Senha</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAFAF9; margin: 0; padding: 24px; color: #1C1917;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; border: 1px solid #E7E5E4; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="background-color: #7C3A4D; padding: 32px 24px; text-align: center;">
          <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">${salonName || 'OperaBeauty'}</h1>
          <p style="color: rgba(255,255,255,0.85); font-size: 13px; margin: 6px 0 0 0;">Recuperação de Senha de Acesso</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="font-size: 15px; margin: 0 0 16px 0;">Olá, <strong>${clientName || 'Cliente'}</strong>!</p>
          <p style="font-size: 14px; color: #57534E; line-height: 1.5; margin: 0 0 24px 0;">
            Recebemos uma solicitação para redefinir a sua senha no <strong>${salonName}</strong>. Utilize o código de 6 dígitos abaixo para confirmar sua identidade:
          </p>
          
          <div style="background-color: #FDF4F6; border: 1px dashed #E0A2B1; border-radius: 16px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #7C3A4D; font-weight: 600; display: block; margin-bottom: 6px;">Seu Código de Confirmação</span>
            <span style="font-family: monospace; font-size: 34px; font-weight: 700; color: #7C3A4D; letter-spacing: 8px;">${otpCode}</span>
          </div>

          <p style="font-size: 12px; color: #78716C; margin: 0 0 16px 0; line-height: 1.4;">
            ⏰ Este código é válido por <strong>15 minutos</strong>. Não compartilhe com ninguém.
          </p>
          <p style="font-size: 12px; color: #A8A29E; margin: 0; border-top: 1px solid #F5F5F4; padding-top: 16px;">
            Se você não solicitou a redefinição de senha, desconsidere este e-mail. Seus dados continuam protegidos.
          </p>
        </div>
        <div style="background-color: #FAFAF9; padding: 16px 24px; text-align: center; border-top: 1px solid #E7E5E4;">
          <p style="font-size: 11px; color: #A8A29E; margin: 0;">Plataforma OperaBeauty &bull; Gestão Inteligente para Salões de Beleza</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Olá ${clientName}! Seu código de verificação para o ${salonName} é: ${otpCode}. Válido por 15 minutos.`
  });
};
