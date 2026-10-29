import crypto from 'crypto';
import pool from '../config/db.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { logAudit } from './auditService.js';

/**
 * Valida se um profissional (staff) tem permissão de acesso à ficha da cliente.
 * Regra de Aceite D14 (LGPD): O profissional só pode visualizar se possuir
 * ou tiver possuído agendamento vinculado com esta cliente no salão.
 */
export const checkStaffClientAccess = async (tenantId, staffId, clientId) => {
  const result = await pool.query(
    `SELECT 1 FROM public.cap_appointments 
     WHERE tenant_id = $1 AND client_id = $2 AND staff_id = $3 
     LIMIT 1`,
    [tenantId, clientId, staffId]
  );
  return result.rows.length > 0;
};

/**
 * Busca o template de anamnese e termo do salão.
 */
export const getTemplate = async (tenantId) => {
  const result = await pool.query(
    `SELECT fields_schema, terms_text, terms_version, require_terms, require_signature, updated_at 
     FROM public.cap_anamnesis_templates 
     WHERE tenant_id = $1`,
    [tenantId]
  );

  if (result.rows.length === 0) {
    return {
      fields_schema: [],
      terms_text: 'Declaro para os devidos fins que as informações acima prestadas são verdadeiras e completas. Autorizo a realização dos procedimentos estéticos e capilares indicados e estou ciente das orientações e cuidados pós-atendimento.',
      terms_version: 1,
      require_terms: true,
      require_signature: false,
      updated_at: null
    };
  }
  return result.rows[0];
};

/**
 * Atualiza o template de anamnese e termos do salão.
 */
export const updateTemplate = async (tenantId, {
  fields_schema,
  terms_text,
  terms_version,
  require_terms,
  require_signature
}) => {
  // Buscar se já existe para incrementar ou manter terms_version
  const existing = await getTemplate(tenantId);
  const newVersion = terms_version || (existing.terms_version || 1);

  const result = await pool.query(
    `INSERT INTO public.cap_anamnesis_templates (
       tenant_id, fields_schema, terms_text, terms_version, require_terms, require_signature, updated_at
     )
     VALUES ($1, $2, COALESCE($3, $7), $4, COALESCE($5, true), COALESCE($6, false), NOW())
     ON CONFLICT (tenant_id)
     DO UPDATE SET 
       fields_schema = EXCLUDED.fields_schema,
       terms_text = EXCLUDED.terms_text,
       terms_version = EXCLUDED.terms_version,
       require_terms = EXCLUDED.require_terms,
       require_signature = EXCLUDED.require_signature,
       updated_at = NOW()
     RETURNING fields_schema, terms_text, terms_version, require_terms, require_signature, updated_at`,
    [
      tenantId,
      JSON.stringify(fields_schema || []),
      terms_text,
      newVersion,
      require_terms !== undefined ? require_terms : true,
      require_signature !== undefined ? require_signature : false,
      existing.terms_text
    ]
  );
  return result.rows[0];
};

/**
 * Busca a ficha de anamnese da cliente com controle de acesso LGPD estrito,
 * descriptografia transparente em repouso (AES-256) e registro na trilha de auditoria.
 */
export const getClientAnamnesis = async (tenantId, clientId, requestingUser = null, req = null) => {
  // 1. Verificação de Acesso Estrito (D14 Aceite)
  if (requestingUser) {
    const { role, id: userId, staff_id: tokenStaffId } = requestingUser;
    
    // Se for cliente, só pode ver a sua própria
    if (role === 'client' && userId !== clientId) {
      const error = new Error('Acesso negado: Você só pode visualizar a sua própria ficha de saúde.');
      error.statusCode = 403;
      throw error;
    }

    // Se for profissional (staff), deve ter atendimento vinculado à cliente
    if (role === 'staff') {
      const effectiveStaffId = tokenStaffId || userId;
      const hasAccess = await checkStaffClientAccess(tenantId, effectiveStaffId, clientId);
      if (!hasAccess) {
        const error = new Error('Acesso negado: Profissional sem histórico de atendimento vinculado a esta cliente (LGPD Art. 11).');
        error.statusCode = 403;
        throw error;
      }
    }
  }

  // 2. Consulta no banco
  const result = await pool.query(
    `SELECT id, answers, answers_encrypted, terms_accepted, terms_version, consented_at, 
            consent_ip_address, consent_user_agent, consent_hash, signature_data,
            expires_at, created_at, updated_at 
     FROM public.cap_client_anamnesis 
     WHERE tenant_id = $1 AND client_id = $2`,
    [tenantId, clientId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  // 3. Descriptografia transparente dos dados de saúde
  let decryptedAnswers = row.answers || {};
  if (row.answers_encrypted) {
    try {
      const decryptedStr = decrypt(row.answers_encrypted);
      if (decryptedStr) {
        decryptedAnswers = JSON.parse(decryptedStr);
      }
    } catch (err) {
      // Fallback gracioso para answers legadas se houver
      decryptedAnswers = row.answers || {};
    }
  }

  // 4. Trilha de auditoria LGPD (Art. 11 - Acesso a Dados Sensíveis de Saúde)
  if (req && requestingUser) {
    logAudit({
      req,
      action: 'ACCESS_HEALTH_DATA',
      entityName: 'cap_client_anamnesis',
      entityId: clientId,
      tenantId,
      newData: {
        accessed_by_role: requestingUser.role,
        accessed_by_id: requestingUser.id,
        anamnesis_id: row.id,
        terms_version: row.terms_version
      }
    });
  }

  return {
    id: row.id,
    answers: decryptedAnswers,
    terms_accepted: row.terms_accepted,
    terms_version: row.terms_version,
    consented_at: row.consented_at,
    consent_ip_address: row.consent_ip_address,
    consent_user_agent: row.consent_user_agent,
    consent_hash: row.consent_hash,
    signature_data: row.signature_data,
    expires_at: row.expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
};

/**
 * Salva ou atualiza a ficha de anamnese do cliente com criptografia em repouso,
 * termo de consentimento digital e hash SHA-256 de não repúdio.
 */
export const submitClientAnamnesis = async (tenantId, clientId, {
  answers,
  terms_accepted = false,
  terms_version = 1,
  signature_data = null,
  client_ip = null,
  user_agent = null
}) => {
  // Validade de 4 meses
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 4);

  // Criptografar respostas sensíveis com AES-256-GCM
  const answersJson = JSON.stringify(answers || {});
  const answersEncrypted = encrypt(answersJson);

  // Buscar texto do termo vigente para o hash de auditoria
  const template = await getTemplate(tenantId);
  const effectiveTermsText = template.terms_text || '';
  const effectiveTermsVersion = template.terms_version || terms_version;

  // Gerar hash de integridade de consentimento (SHA-256)
  const consentedAt = terms_accepted ? new Date().toISOString() : null;
  let consentHash = null;
  if (terms_accepted) {
    const rawConsentPayload = `${effectiveTermsText}|v${effectiveTermsVersion}|${clientId}|${client_ip || ''}|${consentedAt}`;
    consentHash = crypto.createHash('sha256').update(rawConsentPayload).digest('hex');
  }

  const result = await pool.query(
    `INSERT INTO public.cap_client_anamnesis (
       tenant_id, client_id, answers, answers_encrypted, terms_accepted, terms_version,
       consented_at, consent_ip_address, consent_user_agent, consent_hash, signature_data,
       expires_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
     ON CONFLICT (tenant_id, client_id)
     DO UPDATE SET 
       answers = EXCLUDED.answers,
       answers_encrypted = EXCLUDED.answers_encrypted,
       terms_accepted = EXCLUDED.terms_accepted,
       terms_version = EXCLUDED.terms_version,
       consented_at = EXCLUDED.consented_at,
       consent_ip_address = EXCLUDED.consent_ip_address,
       consent_user_agent = EXCLUDED.consent_user_agent,
       consent_hash = EXCLUDED.consent_hash,
       signature_data = EXCLUDED.signature_data,
       expires_at = EXCLUDED.expires_at,
       updated_at = NOW()
     RETURNING id, answers, terms_accepted, terms_version, consented_at, consent_hash, expires_at, updated_at`,
    [
      tenantId,
      clientId,
      answersJson,
      answersEncrypted,
      Boolean(terms_accepted),
      effectiveTermsVersion,
      consentedAt,
      client_ip,
      user_agent,
      consentHash,
      signature_data,
      expiresAt
    ]
  );

  return result.rows[0];
};
