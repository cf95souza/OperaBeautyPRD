import pool from '../config/db.js';

export const getBusinessHours = async (tenantId) => {
  const result = await pool.query(
    'SELECT id, day_of_week, open_time, close_time, is_closed FROM public.cap_business_hours WHERE tenant_id = $1 ORDER BY day_of_week',
    [tenantId]
  );
  return result.rows;
};

export const updateBusinessHours = async (tenantId, hours) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const h of hours) {
      const { day_of_week, open_time, close_time, is_closed } = h;
      
      await client.query(
        `INSERT INTO public.cap_business_hours (tenant_id, day_of_week, open_time, close_time, is_closed)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tenant_id, day_of_week) 
         DO UPDATE SET open_time = EXCLUDED.open_time, 
                       close_time = EXCLUDED.close_time, 
                       is_closed = EXCLUDED.is_closed`,
        [tenantId, day_of_week, open_time, close_time, is_closed !== undefined ? is_closed : false]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getExceptions = async (tenantId) => {
  const result = await pool.query(
    'SELECT id, exception_date, is_closed, open_time, close_time, reason FROM public.cap_date_exceptions WHERE tenant_id = $1 ORDER BY exception_date DESC',
    [tenantId]
  );
  return result.rows;
};

export const createException = async (tenantId, exception_date, is_closed, open_time, close_time, reason) => {
  const result = await pool.query(
    `INSERT INTO public.cap_date_exceptions (tenant_id, exception_date, is_closed, open_time, close_time, reason, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (tenant_id, exception_date)
     DO UPDATE SET is_closed = EXCLUDED.is_closed,
                   open_time = EXCLUDED.open_time,
                   close_time = EXCLUDED.close_time,
                   reason = EXCLUDED.reason
     RETURNING id, tenant_id, exception_date, is_closed, open_time, close_time, reason, created_at`,
    [tenantId, exception_date, is_closed !== undefined ? is_closed : false, open_time || null, close_time || null, reason || '']
  );
  return result.rows[0];
};

export const deleteException = async (id, tenantId) => {
  const result = await pool.query(
    'DELETE FROM public.cap_date_exceptions WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, exception_date, is_closed, open_time, close_time, reason, created_at',
    [id, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Exceção não encontrada ou acesso negado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const getPaymentGateway = async () => {
  const result = await pool.query('SELECT payment_gateway FROM public.cap_platform_settings LIMIT 1');
  if (result.rows.length > 0) {
    return result.rows[0];
  }
  return { payment_gateway: null };
};
