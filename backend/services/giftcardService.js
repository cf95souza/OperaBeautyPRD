import pool from '../config/db.js';
import crypto from 'crypto';

// Gera ID de solicitação: VP-XXXXXXXX
function generateRequestId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'VP-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(crypto.randomInt(chars.length));
  }
  return code;
}

// Gera código de resgate seguro: VG-XXXX-XXXX-XXXX
function generateRedemptionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'VG-';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(crypto.randomInt(chars.length));
  }
  return code;
}

// Retorna os métodos de pagamento (PIX) do salão para exibir na compra
export const getTenantPaymentMethods = async (tenantId) => {
  const query = `
    SELECT id, type, pix_key, pix_key_type, holder_name, holder_document
    FROM public.cap_tenant_payment_methods
    WHERE tenant_id = $1 AND is_active = true
  `;
  const result = await pool.query(query, [tenantId]);
  return result.rows;
};

// Atualiza ou insere o PIX do salão
export const updateTenantPaymentMethod = async (tenantId, { pix_key, pix_key_type, holder_name, holder_document }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Inativa anteriores
    await client.query('UPDATE public.cap_tenant_payment_methods SET is_active = false WHERE tenant_id = $1', [tenantId]);
    
    // Insere novo
    const insertQuery = `
      INSERT INTO public.cap_tenant_payment_methods (tenant_id, type, pix_key, pix_key_type, holder_name, holder_document, is_active)
      VALUES ($1, 'PIX', $2, $3, $4, $5, true)
      RETURNING id, type, pix_key, pix_key_type, holder_name, holder_document
    `;
    const result = await client.query(insertQuery, [tenantId, pix_key, pix_key_type, holder_name, holder_document]);
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Lista Vales-Presente do Salão (Admin)
export const listGiftCardsByTenant = async (tenantId) => {
  const query = `
    SELECT g.*, 
           c.name as purchaser_name, 
           s.name as service_name
    FROM public.cap_giftcards g
    LEFT JOIN public.cap_clients c ON g.purchaser_id = c.id
    LEFT JOIN public.cap_services s ON g.service_id = s.id
    WHERE g.tenant_id = $1
    ORDER BY g.created_at DESC
  `;
  const result = await pool.query(query, [tenantId]);
  return result.rows;
};

// Lista Vales-Presente comprados pelo cliente
export const listGiftCardsByClient = async (tenantId, clientId) => {
  const query = `
    SELECT g.id, g.request_id, g.redemption_code, g.recipient_name, g.status, g.payment_status, g.original_value, g.available_balance, g.created_at, g.expires_at, s.name as service_name
    FROM public.cap_giftcards g
    LEFT JOIN public.cap_services s ON g.service_id = s.id
    WHERE g.tenant_id = $1 AND g.purchaser_id = $2
    ORDER BY g.created_at DESC
  `;
  const result = await pool.query(query, [tenantId, clientId]);
  return result.rows;
};

// Cria uma solicitação de Vale-Presente (Cliente)
export const createGiftCard = async (tenantId, purchaserId, data) => {
  const { service_id, recipient_name, recipient_phone, message, original_value } = data;
  
  let isUnique = false;
  let requestId;
  
  // Garante ID de solicitação único
  while (!isUnique) {
    requestId = generateRequestId();
    const check = await pool.query('SELECT id FROM public.cap_giftcards WHERE request_id = $1', [requestId]);
    if (check.rows.length === 0) {
      isUnique = true;
    }
  }

  // Validade de 6 meses por padrão
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 6);

  const query = `
    INSERT INTO public.cap_giftcards (
      tenant_id, purchaser_id, service_id, request_id, redemption_code, 
      recipient_name, recipient_phone, message, original_value, available_balance, 
      payment_status, status, expires_at
    )
    VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $8, 'PENDING', 'PENDING_PAYMENT', $9)
    RETURNING id, request_id, status, payment_status, original_value, created_at
  `;
  
  const result = await pool.query(query, [
    tenantId, purchaserId, service_id || null, requestId, 
    recipient_name || null, recipient_phone || null, message || null, original_value, expiresAt
  ]);
  
  return result.rows[0];
};

// Admin busca a solicitação para validar pagamento
export const getGiftCardRequest = async (tenantId, requestId) => {
  const query = `
    SELECT g.id, g.request_id, g.status, g.payment_status, g.original_value, g.recipient_name, g.recipient_phone, g.created_at, c.name as purchaser_name
    FROM public.cap_giftcards g
    LEFT JOIN public.cap_clients c ON g.purchaser_id = c.id
    WHERE g.tenant_id = $1 AND g.request_id = $2
  `;
  const result = await pool.query(query, [tenantId, requestId.toUpperCase()]);
  if (result.rows.length === 0) {
    const err = new Error('Solicitação de Vale-Presente não encontrada.');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

// Admin confirma o pagamento e gera o código final
export const confirmGiftCardPayment = async (tenantId, requestId) => {
  // Lock row to prevent race conditions during generation
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const checkQuery = `SELECT id, payment_status FROM public.cap_giftcards WHERE tenant_id = $1 AND request_id = $2 FOR UPDATE`;
    const checkRes = await client.query(checkQuery, [tenantId, requestId.toUpperCase()]);
    
    if (checkRes.rows.length === 0) {
      throw new Error('Solicitação não encontrada.');
    }
    
    if (checkRes.rows[0].payment_status === 'CONFIRMED') {
      throw new Error('Pagamento já foi confirmado para esta solicitação.');
    }
    
    let isUnique = false;
    let redemptionCode;
    
    // Garante código de resgate único
    while (!isUnique) {
      redemptionCode = generateRedemptionCode();
      const codeCheck = await client.query('SELECT id FROM public.cap_giftcards WHERE redemption_code = $1', [redemptionCode]);
      if (codeCheck.rows.length === 0) {
        isUnique = true;
      }
    }
    
    const updateQuery = `
      UPDATE public.cap_giftcards
      SET payment_status = 'CONFIRMED', status = 'ACTIVE', redemption_code = $3
      WHERE tenant_id = $1 AND request_id = $2
      RETURNING id, request_id, redemption_code, original_value, recipient_name, recipient_phone, expires_at
    `;
    const result = await client.query(updateQuery, [tenantId, requestId.toUpperCase(), redemptionCode]);
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    error.statusCode = 400;
    throw error;
  } finally {
    client.release();
  }
};

// Valida código do Gift Card (Para resgate)
export const validateGiftCardCode = async (tenantId, redemptionCode) => {
  if (redemptionCode && redemptionCode.toUpperCase().startsWith('VP-')) {
    const err = new Error('Você inseriu um ID de Solicitação (VP-). Para resgatar, utilize o Código de Resgate (VG-).');
    err.statusCode = 400;
    throw err;
  }

  const query = `
    SELECT g.id, g.redemption_code, g.status, g.payment_status, g.original_value, g.available_balance, g.recipient_name, g.expires_at, s.name as service_name
    FROM public.cap_giftcards g
    LEFT JOIN public.cap_services s ON g.service_id = s.id
    WHERE g.tenant_id = $1 AND g.redemption_code = $2
  `;
  const result = await pool.query(query, [tenantId, redemptionCode.toUpperCase()]);
  
  if (result.rows.length === 0) {
    const err = new Error('Código de Vale-Presente inválido ou não encontrado.');
    err.statusCode = 404;
    throw err;
  }
  
  const gift = result.rows[0];
  
  if (gift.payment_status !== 'CONFIRMED') {
    const err = new Error('O pagamento deste Vale-Presente ainda não foi confirmado.');
    err.statusCode = 400;
    throw err;
  }
  
  if (gift.status === 'REDEEMED' || gift.available_balance <= 0) {
    const err = new Error('Este Vale-Presente já teve todo seu saldo resgatado.');
    err.statusCode = 400;
    throw err;
  }
  
  if (gift.status === 'CANCELLED') {
    const err = new Error('Vale-Presente cancelado.');
    err.statusCode = 400;
    throw err;
  }
  
  if (gift.status === 'EXPIRED' || (gift.expires_at && new Date(gift.expires_at) < new Date())) {
    const err = new Error('Vale-Presente expirado.');
    err.statusCode = 400;
    throw err;
  }

  return gift;
};

// Resgatar Gift Card (Com concorrência controlada e resgate parcial)
export const redeemGiftCard = async (tenantId, redemptionCode, amountToRedeem) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Select FOR UPDATE trava a linha até o final da transação
    const query = `
      SELECT id, status, payment_status, available_balance, expires_at
      FROM public.cap_giftcards
      WHERE tenant_id = $1 AND redemption_code = $2
      FOR UPDATE
    `;
    const result = await client.query(query, [tenantId, redemptionCode.toUpperCase()]);
    
    if (result.rows.length === 0) {
      throw new Error('Código de Vale-Presente inválido ou não encontrado.');
    }
    
    const gift = result.rows[0];
    
    if (gift.payment_status !== 'CONFIRMED') throw new Error('Pagamento não confirmado.');
    if (gift.status === 'REDEEMED') throw new Error('Vale-Presente já totalmente resgatado.');
    if (gift.status === 'CANCELLED') throw new Error('Vale-Presente cancelado.');
    if (gift.status === 'EXPIRED' || (gift.expires_at && new Date(gift.expires_at) < new Date())) throw new Error('Vale-Presente expirado.');
    
    const balance = parseFloat(gift.available_balance);
    const amount = parseFloat(amountToRedeem);
    
    if (amount <= 0) throw new Error('O valor de resgate deve ser maior que zero.');
    if (amount > balance) throw new Error(`Saldo insuficiente. Saldo disponível: R$ ${balance.toFixed(2)}`);
    
    const newBalance = balance - amount;
    const newStatus = newBalance === 0 ? 'REDEEMED' : 'PARTIALLY_REDEEMED';
    
    const updateQuery = `
      UPDATE public.cap_giftcards
      SET available_balance = $2, status = $3
      WHERE id = $1
      RETURNING id, available_balance, status
    `;
    const updateResult = await client.query(updateQuery, [gift.id, newBalance, newStatus]);
    
    await client.query('COMMIT');
    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    error.statusCode = 400;
    throw error;
  } finally {
    client.release();
  }
};

