import pool from '../config/db.js';

export const getTemplate = async (tenantId) => {
  const result = await pool.query(
    'SELECT fields_schema FROM public.cap_anamnesis_templates WHERE tenant_id = $1',
    [tenantId]
  );
  if (result.rows.length === 0) {
    return { fields_schema: [] };
  }
  return result.rows[0];
};

export const updateTemplate = async (tenantId, fieldsSchema) => {
  const result = await pool.query(
    `INSERT INTO public.cap_anamnesis_templates (tenant_id, fields_schema, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (tenant_id)
     DO UPDATE SET fields_schema = $2, updated_at = NOW()
     RETURNING fields_schema`,
    [tenantId, JSON.stringify(fieldsSchema)]
  );
  return result.rows[0];
};

export const getClientAnamnesis = async (tenantId, clientId) => {
  const result = await pool.query(
    `SELECT answers, expires_at, created_at, updated_at 
     FROM public.cap_client_anamnesis 
     WHERE tenant_id = $1 AND client_id = $2`,
    [tenantId, clientId]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
};

export const submitClientAnamnesis = async (tenantId, clientId, answers) => {
  // 4 months from now
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 4);

  const result = await pool.query(
    `INSERT INTO public.cap_client_anamnesis (tenant_id, client_id, answers, expires_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (tenant_id, client_id)
     DO UPDATE SET answers = $3, expires_at = $4, updated_at = NOW()
     RETURNING id, answers, expires_at, updated_at`,
    [tenantId, clientId, JSON.stringify(answers), expiresAt]
  );
  return result.rows[0];
};
