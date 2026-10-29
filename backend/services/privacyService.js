import pool from '../config/db.js';
import crypto from 'crypto';

/**
 * Gera um protocolo padronizado e auditável para requisições de titulares de dados LGPD
 * Formato: LGPD-AAAAMMDD-XXXX (onde XXXX são 4 caracteres alfanuméricos aleatórios)
 */
export const generateProtocolNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `LGPD-${dateStr}-${randomHex}`;
};

/**
 * Criação de uma nova requisição de titular de dados (Canal do DPO)
 */
export const createPrivacyRequest = async ({
  name,
  email,
  document,
  requester_type = 'client',
  request_type,
  tenant_id = null,
  details,
  ip_address = null,
  user_agent = null
}) => {
  if (!name || !email || !request_type || !details) {
    const error = new Error('Nome, e-mail, tipo de requisição e detalhes são obrigatórios.');
    error.statusCode = 400;
    throw error;
  }

  const validRequestTypes = [
    'access',               // Confirmação da existência e acesso aos dados
    'correction',           // Correção de dados incompletos, inexatos ou desatualizados
    'anonymization',        // Anonimização, bloqueio ou eliminação de dados desnecessários
    'deletion',             // Eliminação dos dados pessoais tratados com consentimento
    'portability',          // Portabilidade dos dados a outro fornecedor de serviço
    'consent_revocation',   // Revogação do consentimento
    'information'           // Informações sobre compartilhamento ou dúvidas gerais
  ];

  if (!validRequestTypes.includes(request_type)) {
    const error = new Error('Tipo de solicitação LGPD inválido.');
    error.statusCode = 400;
    throw error;
  }

  const protocol = generateProtocolNumber();

  const query = `
    INSERT INTO public.cap_privacy_requests (
      protocol, requester_name, requester_email, requester_document,
      requester_type, request_type, tenant_id, details,
      ip_address, user_agent, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'received')
    RETURNING id, protocol, requester_name, requester_email, request_type, status, created_at
  `;

  const values = [
    protocol,
    name.trim(),
    email.trim().toLowerCase(),
    document ? document.replace(/\\D/g, '') : null,
    requester_type,
    request_type,
    tenant_id || null,
    details.trim(),
    ip_address,
    user_agent
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Consulta pública do status de uma requisição pelo titular via número de protocolo
 */
export const getPrivacyRequestStatus = async (protocol) => {
  if (!protocol) {
    const error = new Error('Protocolo é obrigatório.');
    error.statusCode = 400;
    throw error;
  }

  const query = `
    SELECT protocol, request_type, status, resolution_notes, created_at, resolved_at
    FROM public.cap_privacy_requests
    WHERE UPPER(protocol) = UPPER($1)
    LIMIT 1
  `;

  const result = await pool.query(query, [protocol.trim()]);
  if (result.rows.length === 0) {
    const error = new Error('Protocolo de solicitação de privacidade não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

/**
 * Listagem das requisições de privacidade para o Super Admin / DPO
 */
export const listPrivacyRequests = async (filterStatus = 'all') => {
  let query = `
    SELECT 
      pr.id, pr.protocol, pr.requester_name, pr.requester_email, pr.requester_document,
      pr.requester_type, pr.request_type, pr.details, pr.status,
      pr.resolution_notes, pr.resolved_at, pr.created_at,
      t.name as tenant_name, t.slug as tenant_slug
    FROM public.cap_privacy_requests pr
    LEFT JOIN public.cap_tenants t ON pr.tenant_id = t.id
  `;

  const values = [];
  if (filterStatus && filterStatus !== 'all') {
    query += ` WHERE pr.status = $1`;
    values.push(filterStatus);
  }

  query += ` ORDER BY pr.created_at DESC`;

  const result = await pool.query(query, values);
  return result.rows;
};

/**
 * Moderação/Resolução de solicitação de privacidade pelo DPO / Super Admin
 */
export const updatePrivacyRequestStatus = async (id, { status, resolution_notes, adminId }) => {
  const validStatuses = ['received', 'under_review', 'completed', 'rejected'];
  if (!validStatuses.includes(status)) {
    const error = new Error('Status inválido para solicitação de privacidade.');
    error.statusCode = 400;
    throw error;
  }

  const isResolved = status === 'completed' || status === 'rejected';

  const query = `
    UPDATE public.cap_privacy_requests
    SET 
      status = $1,
      resolution_notes = $2,
      resolved_at = ${isResolved ? 'NOW()' : 'NULL'},
      resolved_by = ${isResolved ? '$3' : 'NULL'},
      updated_at = NOW()
    WHERE id = $4
    RETURNING *
  `;

  const result = await pool.query(query, [status, resolution_notes || null, adminId || null, id]);
  if (result.rows.length === 0) {
    const error = new Error('Solicitação de privacidade não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};
