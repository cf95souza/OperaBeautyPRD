import { tenantQuery } from '../utils/tenantQuery.js';

export const listTermsTemplates = async (tenantId) => {
  const result = await tenantQuery(
    tenantId,
    `SELECT id, title, content, created_at FROM public.cap_terms_templates WHERE tenant_id = $1 ORDER BY created_at DESC`,
    [tenantId]
  );
  return result.rows;
};

export const createTermsTemplate = async (tenantId, title, content) => {
  if (!title || !content) {
    const error = new Error('Título e conteúdo são obrigatórios.');
    error.statusCode = 400;
    throw error;
  }

  const result = await tenantQuery(
    tenantId,
    `INSERT INTO public.cap_terms_templates (tenant_id, title, content) VALUES ($1, $2, $3) RETURNING id, title`,
    [tenantId, title, content]
  );
  return result.rows[0];
};

export const deleteTermsTemplate = async (tenantId, id) => {
  const result = await tenantQuery(
    tenantId,
    `DELETE FROM public.cap_terms_templates WHERE id = $1 AND tenant_id = $2 RETURNING id`,
    [id, tenantId]
  );
  if (result.rows.length === 0) {
    const error = new Error('Termo não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
};
