import pool from '../config/db.js';

export const listInvoices = async (role, userTenantId, queryTenantId) => {
  if (role === 'superadmin') {
    if (queryTenantId) {
      const result = await pool.query(
        `SELECT i.id, i.tenant_id, i.amount, i.status, i.due_date, i.paid_at, i.payment_method, i.reference_month, i.created_at,
                t.name as tenant_name
         FROM public.cap_invoices i
         JOIN public.cap_tenants t ON i.tenant_id = t.id
         WHERE i.tenant_id = $1
         ORDER BY i.due_date DESC`,
        [queryTenantId]
      );
      return result.rows;
    } else {
      const result = await pool.query(
        `SELECT i.id, i.tenant_id, i.amount, i.status, i.due_date, i.paid_at, i.payment_method, i.reference_month, i.created_at,
                t.name as tenant_name
         FROM public.cap_invoices i
         JOIN public.cap_tenants t ON i.tenant_id = t.id
         ORDER BY i.due_date DESC`
      );
      return result.rows;
    }
  } else if (role === 'manager') {
    const result = await pool.query(
      `SELECT id, tenant_id, amount, status, due_date, paid_at, payment_method, reference_month, created_at
       FROM public.cap_invoices
       WHERE tenant_id = $1
       ORDER BY due_date DESC`,
      [userTenantId]
    );
    return result.rows;
  } else {
    const error = new Error('Nível de permissão insuficiente para acessar faturas.');
    error.statusCode = 403;
    throw error;
  }
};

export const createInvoice = async (tenant_id, amount, due_date, reference_month) => {
  const result = await pool.query(
    `INSERT INTO public.cap_invoices (tenant_id, amount, status, due_date, reference_month, created_at)
     VALUES ($1, $2, 'pending', $3, $4, NOW())
     RETURNING id, tenant_id, amount, status, due_date, paid_at, payment_method, reference_month, created_at`,
    [tenant_id, parseFloat(amount), due_date, reference_month]
  );
  return result.rows[0];
};

export const payInvoice = async (id, payment_method) => {
  const result = await pool.query(
    `UPDATE public.cap_invoices
     SET status = 'paid',
         paid_at = NOW(),
         payment_method = $1
     WHERE id = $2
     RETURNING id, tenant_id, amount, status, due_date, paid_at, payment_method, reference_month, created_at`,
    [payment_method || 'manual', id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Fatura não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};
