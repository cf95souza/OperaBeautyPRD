import crypto from 'crypto';
import { tenantQuery } from '../utils/tenantQuery.js';

export const listPendingConsents = async (tenantId, clientId) => {
  const result = await tenantQuery(
    tenantId,
    `SELECT c.id, c.content_snapshot, c.created_at, t.title 
     FROM public.cap_consents c
     JOIN public.cap_terms_templates t ON c.term_template_id = t.id
     WHERE c.tenant_id = $1 AND c.client_id = $2 AND c.status = 'pending'
     ORDER BY c.created_at DESC`,
    [tenantId, clientId]
  );
  return result.rows;
};

export const signConsent = async (tenantId, consentId, clientId, clientIp, userAgent) => {
  // Verificar se o termo existe e está pendente
  const consentQuery = await tenantQuery(
    tenantId,
    `SELECT id, content_snapshot FROM public.cap_consents WHERE id = $1 AND tenant_id = $2 AND client_id = $3 AND status = 'pending'`,
    [consentId, tenantId, clientId]
  );

  if (consentQuery.rows.length === 0) {
    const error = new Error('Termo não encontrado ou já assinado.');
    error.statusCode = 404;
    throw error;
  }

  const consent = consentQuery.rows[0];
  const signedAt = new Date().toISOString();

  // Gerar Hash Criptográfico
  const rawData = `${consent.content_snapshot}|${clientId}|${clientIp}|${signedAt}`;
  const digitalHash = crypto.createHash('sha256').update(rawData).digest('hex');

  // Atualizar no banco
  await tenantQuery(
    tenantId,
    `UPDATE public.cap_consents 
     SET status = 'signed', client_ip = $1, user_agent = $2, digital_hash = $3, signed_at = $4
     WHERE id = $5 AND tenant_id = $6`,
    [clientIp, userAgent, digitalHash, signedAt, consentId, tenantId]
  );

  return { message: 'Termo assinado com sucesso!', digital_hash: digitalHash };
};

export const requestConsent = async (tenantId, staffId, clientId, termTemplateId) => {
  if (!clientId || !termTemplateId) {
    const error = new Error('Cliente e modelo de termo são obrigatórios.');
    error.statusCode = 400;
    throw error;
  }

  // Buscar conteúdo do modelo de termo
  const templateQuery = await tenantQuery(
    tenantId,
    `SELECT content FROM public.cap_terms_templates WHERE id = $1 AND tenant_id = $2`,
    [termTemplateId, tenantId]
  );

  if (templateQuery.rows.length === 0) {
    const error = new Error('Modelo de termo não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const contentSnapshot = templateQuery.rows[0].content;

  const result = await tenantQuery(
    tenantId,
    `INSERT INTO public.cap_consents (tenant_id, client_id, staff_id, term_template_id, content_snapshot, status)
     VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
    [tenantId, clientId, staffId || null, termTemplateId, contentSnapshot]
  );

  return { message: 'Solicitação de assinatura enviada com sucesso!', id: result.rows[0].id };
};

export const listAllConsents = async (tenantId) => {
  const result = await tenantQuery(
    tenantId,
    `SELECT c.id, c.status, c.signed_at, c.created_at, c.digital_hash,
            cl.name as client_name, t.title as term_title, s.name as staff_name
     FROM public.cap_consents c
     JOIN public.cap_clients cl ON c.client_id = cl.id
     JOIN public.cap_terms_templates t ON c.term_template_id = t.id
     LEFT JOIN public.cap_staff s ON c.staff_id = s.id
     WHERE c.tenant_id = $1
     ORDER BY c.created_at DESC`,
    [tenantId]
  );
  return result.rows;
};

export const getConsentsStats = async (tenantId) => {
  // Contadores gerais
  const countsQuery = await tenantQuery(
    tenantId,
    `SELECT 
       COUNT(id)::int as total,
       COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending,
       COUNT(CASE WHEN status = 'signed' THEN 1 END)::int as signed
     FROM public.cap_consents
     WHERE tenant_id = $1`,
    [tenantId]
  );

  const counts = countsQuery.rows[0] || { total: 0, pending: 0, signed: 0 };

  // Recentes
  const recentQuery = await tenantQuery(
    tenantId,
    `SELECT c.id, c.status, c.signed_at, c.created_at, c.digital_hash,
            cl.name as client_name, t.title as term_title, s.name as staff_name
     FROM public.cap_consents c
     JOIN public.cap_clients cl ON c.client_id = cl.id
     JOIN public.cap_terms_templates t ON c.term_template_id = t.id
     LEFT JOIN public.cap_staff s ON c.staff_id = s.id
     WHERE c.tenant_id = $1
     ORDER BY c.created_at DESC
     LIMIT 10`,
    [tenantId]
  );

  return {
    total: counts.total || 0,
    pending: counts.pending || 0,
    signed: counts.signed || 0,
    recent: recentQuery.rows || []
  };
};
