import pool from '../config/db.js';

export const listCoupons = async (tenantId, code) => {
  let queryText = `
    SELECT c.*, s.name as service_name
    FROM public.cap_coupons c
    LEFT JOIN public.cap_services s ON c.service_id = s.id
    WHERE c.tenant_id = $1
  `;
  const queryParams = [tenantId];

  if (code) {
    queryText += ' AND c.code = $2';
    queryParams.push(code.toUpperCase().trim());
  }

  queryText += ' ORDER BY c.created_at DESC';

  const result = await pool.query(queryText, queryParams);
  
  return result.rows.map(row => ({
    id: row.id,
    tenant_id: row.tenant_id,
    code: row.code,
    discount_type: row.discount_type,
    discount_value: parseFloat(row.discount_value),
    max_uses: row.max_uses,
    current_uses: row.current_uses || 0,
    expires_at: row.expires_at,
    service_id: row.service_id,
    created_at: row.created_at,
    cap_services: row.service_id ? { name: row.service_name } : null
  }));
};

export const getCouponById = async (id, tenantId) => {
  const result = await pool.query(
    `SELECT c.*, s.name as service_name
     FROM public.cap_coupons c
     LEFT JOIN public.cap_services s ON c.service_id = s.id
     WHERE c.id = $1 AND c.tenant_id = $2`,
    [id, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Cupom não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    code: row.code,
    discount_type: row.discount_type,
    discount_value: parseFloat(row.discount_value),
    max_uses: row.max_uses,
    current_uses: row.current_uses || 0,
    expires_at: row.expires_at,
    service_id: row.service_id,
    created_at: row.created_at,
    cap_services: row.service_id ? { name: row.service_name } : null
  };
};

export const createCoupon = async (tenantId, code, discount_type, discount_value, max_uses, expires_at, service_id) => {
  const formattedCode = code.toUpperCase().replace(/\s+/g, '');
  const valueNum = parseFloat(discount_value);

  const result = await pool.query(
    `INSERT INTO public.cap_coupons (tenant_id, code, discount_type, discount_value, max_uses, expires_at, service_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (tenant_id, code)
     DO UPDATE SET discount_type = EXCLUDED.discount_type,
                   discount_value = EXCLUDED.discount_value,
                   max_uses = EXCLUDED.max_uses,
                   expires_at = EXCLUDED.expires_at,
                   service_id = EXCLUDED.service_id
     RETURNING id, tenant_id, code, discount_type, discount_value, max_uses, current_uses, expires_at, service_id, created_at`,
    [tenantId, formattedCode, discount_type, valueNum, max_uses !== undefined ? max_uses : null, expires_at || null, service_id || null]
  );

  return result.rows[0];
};

export const redeemCoupon = async (id, tenantId) => {
  const existCheck = await pool.query('SELECT id, tenant_id, code, discount_type, discount_value, max_uses, current_uses, expires_at, service_id, created_at FROM public.cap_coupons WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  if (existCheck.rows.length === 0) {
    const error = new Error('Cupom não encontrado para este salão.');
    error.statusCode = 404;
    throw error;
  }

  const currentCoupon = existCheck.rows[0];

  if (currentCoupon.max_uses !== null && currentCoupon.current_uses >= currentCoupon.max_uses) {
    const error = new Error('Este cupom já atingiu o limite máximo de utilizações.');
    error.statusCode = 400;
    throw error;
  }

  if (currentCoupon.expires_at && new Date(currentCoupon.expires_at) < new Date()) {
    const error = new Error('Este cupom já expirou.');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `UPDATE public.cap_coupons
     SET current_uses = current_uses + 1
     WHERE id = $1 AND tenant_id = $2
     RETURNING id, tenant_id, code, discount_type, discount_value, max_uses, current_uses, expires_at, service_id, created_at`,
    [id, tenantId]
  );

  return { currentCoupon, updatedCoupon: result.rows[0] };
};

export const updateCoupon = async (id, tenantId, code, discount_type, discount_value, max_uses, expires_at, service_id) => {
  const existCheck = await pool.query('SELECT id, tenant_id, code, discount_type, discount_value, max_uses, current_uses, expires_at, service_id, created_at FROM public.cap_coupons WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  if (existCheck.rows.length === 0) {
    const error = new Error('Cupom não encontrado ou acesso negado.');
    error.statusCode = 404;
    throw error;
  }

  const currentCoupon = existCheck.rows[0];

  const result = await pool.query(
    `UPDATE public.cap_coupons
     SET code = $1,
         discount_type = $2,
         discount_value = $3,
         max_uses = $4,
         expires_at = $5,
         service_id = $6
     WHERE id = $7 AND tenant_id = $8
     RETURNING id, tenant_id, code, discount_type, discount_value, max_uses, current_uses, expires_at, service_id, created_at`,
    [
      code !== undefined ? code.toUpperCase().replace(/\s+/g, '') : currentCoupon.code,
      discount_type !== undefined ? discount_type : currentCoupon.discount_type,
      discount_value !== undefined ? parseFloat(discount_value) : parseFloat(currentCoupon.discount_value),
      max_uses !== undefined ? max_uses : currentCoupon.max_uses,
      expires_at !== undefined ? expires_at : currentCoupon.expires_at,
      service_id !== undefined ? service_id : currentCoupon.service_id,
      id,
      tenantId
    ]
  );

  return { currentCoupon, updatedCoupon: result.rows[0] };
};

export const deleteCoupon = async (id, tenantId) => {
  const result = await pool.query(
    'DELETE FROM public.cap_coupons WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, code, discount_type, discount_value, max_uses, current_uses, expires_at, service_id, created_at',
    [id, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Cupom não encontrado ou acesso negado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};
