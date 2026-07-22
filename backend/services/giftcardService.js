import pool from '../config/db.js';

// Função auxiliar para gerar um código seguro e legível
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'GIFT-';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code; // Ex: GIFT-A1B2-C3D4
}

export const listGiftCardsByTenant = async (tenantId) => {
  const query = `
    SELECT g.*, 
           c.name as purchaser_name, 
           s.name as service_name, s.price as service_price
    FROM public.cap_giftcards g
    LEFT JOIN public.cap_clients c ON g.purchaser_id = c.id
    LEFT JOIN public.cap_services s ON g.service_id = s.id
    WHERE g.tenant_id = $1
    ORDER BY g.created_at DESC
  `;
  const result = await pool.query(query, [tenantId]);
  return result.rows;
};

export const listGiftCardsByClient = async (tenantId, clientId) => {
  const query = `
    SELECT g.*, s.name as service_name
    FROM public.cap_giftcards g
    LEFT JOIN public.cap_services s ON g.service_id = s.id
    WHERE g.tenant_id = $1 AND g.purchaser_id = $2
    ORDER BY g.created_at DESC
  `;
  const result = await pool.query(query, [tenantId, clientId]);
  return result.rows;
};

export const createGiftCard = async (tenantId, purchaserId, { service_id, recipient_name }) => {
  let isUnique = false;
  let code;
  
  // Garante código único
  while (!isUnique) {
    code = generateCode();
    const check = await pool.query('SELECT id FROM public.cap_giftcards WHERE code = $1', [code]);
    if (check.rows.length === 0) {
      isUnique = true;
    }
  }

  // Validade de 6 meses por padrão
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 6);

  const query = `
    INSERT INTO public.cap_giftcards (tenant_id, purchaser_id, service_id, recipient_name, code, status, expires_at)
    VALUES ($1, $2, $3, $4, $5, 'active', $6)
    RETURNING id, tenant_id, purchaser_id, service_id, recipient_name, code, status, expires_at
  `;
  const result = await pool.query(query, [tenantId, purchaserId, service_id, recipient_name, code, expiresAt]);
  return result.rows[0];
};

export const validateGiftCard = async (tenantId, code) => {
  const query = `
    SELECT g.*, s.name as service_name, s.price as service_price
    FROM public.cap_giftcards g
    LEFT JOIN public.cap_services s ON g.service_id = s.id
    WHERE g.tenant_id = $1 AND g.code = $2
  `;
  const result = await pool.query(query, [tenantId, code.toUpperCase()]);
  
  if (result.rows.length === 0) {
    const err = new Error('Vale-presente inválido ou não encontrado.');
    err.statusCode = 404;
    throw err;
  }
  
  const gift = result.rows[0];
  
  if (gift.status === 'redeemed') {
    const err = new Error('Vale-presente já foi resgatado.');
    err.statusCode = 400;
    throw err;
  }
  
  if (gift.status === 'expired' || (gift.expires_at && new Date(gift.expires_at) < new Date())) {
    const err = new Error('Vale-presente expirado.');
    err.statusCode = 400;
    throw err;
  }

  return gift;
};

export const redeemGiftCard = async (tenantId, code) => {
  // Primeiro, valida
  await validateGiftCard(tenantId, code);
  
  // Em seguida, resgata
  const query = `
    UPDATE public.cap_giftcards
    SET status = 'redeemed'
    WHERE tenant_id = $1 AND code = $2
    RETURNING id
  `;
  const result = await pool.query(query, [tenantId, code.toUpperCase()]);
  return result.rows[0];
};
