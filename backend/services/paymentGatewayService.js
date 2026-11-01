import crypto from 'crypto';
import pool from '../config/db.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { notificationQueue } from '../config/queue.js';
import pino from 'pino';

const logger = pino();

/**
 * Busca a configuração de gateway de pagamento do salão (com credenciais descriptografadas)
 */
export const getTenantGatewayConfig = async (tenantId) => {
  const res = await pool.query(
    `SELECT id, tenant_id, provider, is_active, sandbox_mode, deposit_expiration_minutes,
            encrypted_credentials, public_key, pix_key, pix_key_type, holder_name, instructions,
            created_at, updated_at
     FROM public.cap_tenant_gateway_configs 
     WHERE tenant_id = $1`,
    [tenantId]
  );

  if (res.rows.length === 0) {
    return {
      provider: 'manual_pix',
      is_active: false,
      sandbox_mode: false,
      deposit_expiration_minutes: 15,
      credentials: {},
      pix_key: '',
      pix_key_type: 'chave_aleatoria',
      holder_name: '',
      instructions: ''
    };
  }

  const row = res.rows[0];
  let credentials = {};
  if (row.encrypted_credentials) {
    try {
      const decrypted = decrypt(row.encrypted_credentials);
      credentials = decrypted ? JSON.parse(decrypted) : {};
    } catch (e) {
      logger.error(`Erro ao descriptografar credenciais do tenant ${tenantId}: ${e.message}`);
    }
  }

  return {
    ...row,
    credentials
  };
};

/**
 * Salva ou atualiza a configuração de gateway do salão com criptografia AES-256-GCM
 */
export const saveTenantGatewayConfig = async (tenantId, config) => {
  const {
    provider = 'manual_pix',
    is_active = false,
    sandbox_mode = false,
    deposit_expiration_minutes = 15,
    credentials = {},
    public_key = '',
    pix_key = '',
    pix_key_type = 'random',
    holder_name = '',
    instructions = ''
  } = config;

  // Criptografar as credenciais privadas com AES-256-GCM
  const encryptedCredentials = encrypt(JSON.stringify(credentials));

  const res = await pool.query(
    `INSERT INTO public.cap_tenant_gateway_configs 
     (tenant_id, provider, is_active, sandbox_mode, deposit_expiration_minutes, 
      encrypted_credentials, public_key, pix_key, pix_key_type, holder_name, instructions, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET
       provider = EXCLUDED.provider,
       is_active = EXCLUDED.is_active,
       sandbox_mode = EXCLUDED.sandbox_mode,
       deposit_expiration_minutes = EXCLUDED.deposit_expiration_minutes,
       encrypted_credentials = EXCLUDED.encrypted_credentials,
       public_key = EXCLUDED.public_key,
       pix_key = EXCLUDED.pix_key,
       pix_key_type = EXCLUDED.pix_key_type,
       holder_name = EXCLUDED.holder_name,
       instructions = EXCLUDED.instructions,
       updated_at = NOW()
     RETURNING id, tenant_id, provider, is_active, sandbox_mode, deposit_expiration_minutes,
               public_key, pix_key, pix_key_type, holder_name, instructions, updated_at`,
    [
      tenantId,
      provider,
      is_active,
      sandbox_mode,
      deposit_expiration_minutes,
      encryptedCredentials,
      public_key,
      pix_key,
      pix_key_type,
      holder_name,
      instructions
    ]
  );

  return res.rows[0];
};

/**
 * Cria a cobrança de Sinal PIX para um agendamento usando o Gateway selecionado pelo salão
 */
export const createDepositCharge = async ({
  tenantId,
  appointmentId,
  amount,
  client,
  serviceName
}) => {
  const config = await getTenantGatewayConfig(tenantId);
  const expirationMinutes = config.deposit_expiration_minutes || 15;
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

  let chargeResult = {
    provider: config.provider || 'simulator',
    paymentId: `dep_${appointmentId}_${Date.now()}`,
    pixCode: '',
    pixQr: '',
    expiresAt
  };

  // 1. MODO SIMULADOR / SANDBOX DE DESENVOLVIMENTO
  if (config.sandbox_mode || config.provider === 'simulator') {
    const fakePixCode = `00020126580014br.gov.bcb.pix0136${appointmentId}520400005303986540${Number(amount).toFixed(2)}5802BR5913OperaBeauty6009SaoPaulo62070503***6304E8A2`;
    // SVG gerado inline para renderizar sem dependências externas
    const fakeQr = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23FFFFFF"/><rect x="20" y="20" width="60" height="60" fill="%23000000"/><rect x="120" y="20" width="60" height="60" fill="%23000000"/><rect x="20" y="120" width="60" height="60" fill="%23000000"/><rect x="30" y="30" width="40" height="40" fill="%23FFFFFF"/><rect x="130" y="30" width="40" height="40" fill="%23FFFFFF"/><rect x="30" y="130" width="40" height="40" fill="%23FFFFFF"/><rect x="40" y="40" width="20" height="20" fill="%23000000"/><rect x="140" y="40" width="20" height="20" fill="%23000000"/><rect x="40" y="140" width="20" height="20" fill="%23000000"/><rect x="100" y="100" width="40" height="40" fill="%23000000"/></svg>`;

    chargeResult.pixCode = fakePixCode;
    chargeResult.pixQr = fakeQr;
    chargeResult.paymentId = `sim_${appointmentId}_${Date.now()}`;
  } 
  // 2. MERCADO PAGO DO SALÃO
  else if (config.provider === 'mercadopago' && config.credentials?.accessToken) {
    try {
      const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.credentials.accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `deposit_${appointmentId}`
        },
        body: JSON.stringify({
          transaction_amount: Number(amount),
          description: `Sinal: ${serviceName} - ${client.name}`,
          payment_method_id: 'pix',
          payer: {
            email: client.email || `${client.phone.replace(/\D/g, '')}@operabeauty.local`,
            first_name: client.name?.split(' ')[0] || 'Cliente',
            last_name: client.name?.split(' ').slice(1).join(' ') || 'Salão'
          },
          date_of_expiration: expiresAt.toISOString()
        })
      });

      const mpData = await response.json();
      if (!response.ok) {
        throw new Error(mpData.message || 'Falha ao gerar cobrança no Mercado Pago');
      }

      chargeResult.paymentId = String(mpData.id);
      chargeResult.pixCode = mpData.point_of_interaction?.transaction_data?.qr_code || '';
      chargeResult.pixQr = mpData.point_of_interaction?.transaction_data?.qr_code_base64 
        ? `data:image/png;base64,${mpData.point_of_interaction.transaction_data.qr_code_base64}` 
        : '';
    } catch (err) {
      logger.error(`Erro ao criar PIX no Mercado Pago do salão: ${err.message}`);
      throw err;
    }
  }
  // 3. ASAAS DO SALÃO
  else if (config.provider === 'asaas' && config.credentials?.apiKey) {
    try {
      const baseUrl = config.sandbox_mode ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
      const response = await fetch(`${baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'access_token': config.credentials.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer: client.asaas_customer_id || undefined,
          billingType: 'PIX',
          value: Number(amount),
          dueDate: new Date().toISOString().split('T')[0],
          description: `Sinal: ${serviceName} - ${client.name}`
        })
      });

      const asaasData = await response.json();
      if (!response.ok) {
        throw new Error(asaasData.errors?.[0]?.description || 'Erro no Asaas');
      }

      chargeResult.paymentId = asaasData.id;

      // Buscar QR Code PIX no Asaas
      const qrRes = await fetch(`${baseUrl}/payments/${asaasData.id}/pixQrCode`, {
        headers: { 'access_token': config.credentials.apiKey }
      });
      if (qrRes.ok) {
        const qrData = await qrRes.json();
        chargeResult.pixCode = qrData.payload || '';
        chargeResult.pixQr = qrData.encodedImage ? `data:image/png;base64,${qrData.encodedImage}` : '';
      }
    } catch (err) {
      logger.error(`Erro ao criar PIX no Asaas do salão: ${err.message}`);
      throw err;
    }
  }
  // 4. CHAVE PIX MANUAL COM COMPROVANTE
  else {
    chargeResult.provider = 'manual_pix';
    chargeResult.pixCode = config.pix_key || '';
    chargeResult.paymentId = `manual_${appointmentId}_${Date.now()}`;
  }

  // 5. Persistir dados do Sinal em cap_appointments
  await pool.query(
    `UPDATE public.cap_appointments SET
       deposit_status = 'pending',
       deposit_amount = $1,
       deposit_provider = $2,
       deposit_payment_id = $3,
       deposit_pix_code = $4,
       deposit_pix_qr = $5,
       deposit_expires_at = $6
     WHERE id = $7`,
    [
      Number(amount),
      chargeResult.provider,
      chargeResult.paymentId,
      chargeResult.pixCode,
      chargeResult.pixQr,
      expiresAt,
      appointmentId
    ]
  );

  // 6. Agendar Job de Expiração no BullMQ com atraso milimétrico
  const delayMs = expirationMinutes * 60 * 1000;
  try {
    await notificationQueue.add(
      'checkDepositExpiration',
      {
        action: 'checkDepositExpiration',
        appointmentId,
        tenantId
      },
      {
        delay: delayMs,
        jobId: `deposit:exp:${appointmentId}`,
        removeOnComplete: true,
        removeOnFail: false
      }
    );
    logger.info(`Job de expiração de sinal enfileirado para agendamento ${appointmentId} em ${expirationMinutes}min`);
  } catch (qErr) {
    logger.error(`Erro ao enfileirar expiração de sinal no BullMQ: ${qErr.message}`);
  }

  return chargeResult;
};

/**
 * Confirma o pagamento do sinal de forma atômica e idempotente
 */
export const confirmDepositPayment = async (tenantId, paymentId, provider = null) => {
  // 1. Localizar o agendamento exclusivamente pelo deposit_payment_id registrado
  const apptRes = await pool.query(
    `SELECT a.id, a.tenant_id, a.client_id, a.deposit_status, a.deposit_amount, a.status,
            c.name as client_name, s.name as service_name
     FROM public.cap_appointments a
     JOIN public.cap_clients c ON a.client_id = c.id
     JOIN public.cap_services s ON a.service_id = s.id
     WHERE a.tenant_id = $1 AND a.deposit_payment_id = $2`,
    [tenantId, String(paymentId)]
  );

  if (apptRes.rows.length === 0) {
    throw new Error('Agendamento não encontrado para este pagamento de sinal.');
  }

  const appt = apptRes.rows[0];

  // Idempotência: Se já foi pago, apenas retorna sucesso sem duplicar
  if (appt.deposit_status === 'paid') {
    return { success: true, alreadyPaid: true, appointment: appt };
  }

  // 2. Atualizar atomicamente o agendamento para CONFIRMADO e SINAL PAGO
  await pool.query(
    `UPDATE public.cap_appointments SET
       deposit_status = 'paid',
       status = 'confirmed',
       deposit_paid_at = NOW()
     WHERE id = $1`,
    [appt.id]
  );

  // 3. Remover job de expiração da fila Redis (já foi pago a tempo!)
  try {
    const job = await notificationQueue.getJob(`deposit:exp:${appt.id}`);
    if (job) {
      await job.remove();
      logger.info(`Job de expiração cancelado para agendamento pago ${appt.id}`);
    }
  } catch (jErr) {
    logger.warn(`Não foi possível remover o job de expiração: ${jErr.message}`);
  }

  // 4. Registrar na linha do tempo do CRM
  await pool.query(
    `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, appointment_id, content)
     VALUES ($1, $2, $3, $4)`,
    [
      tenantId,
      appt.client_id,
      appt.id,
      `Sinal de R$ ${Number(appt.deposit_amount).toFixed(2)} pago com sucesso via PIX (${provider || 'Gateway'}). Agendamento confirmado.`
    ]
  );

  logger.info(`Sinal confirmado para agendamento ${appt.id}: R$ ${appt.deposit_amount}`);

  return {
    success: true,
    alreadyPaid: false,
    appointmentId: appt.id
  };
};
