import pool from '../config/db.js';
import { logAudit } from './auditService.js';
import { checkStaffClientAccess } from './anamnesisService.js';

/**
 * Registra uma nova sessão de evolução clínica para a cliente.
 */
export const createEvolution = async ({
  tenantId,
  clientId,
  staffId = null,
  appointmentId = null,
  sessionDate = null,
  procedureName,
  notes = '',
  measurements = {},
  beforePhotos = [],
  afterPhotos = [],
  photoConsentLevel = 'internal_only',
  requestingUser = null,
  req = null
}) => {
  // Verificação de permissão: staff só pode registrar se vinculado
  if (requestingUser?.role === 'staff') {
    const effectiveStaffId = requestingUser.staff_id || requestingUser.id;
    const hasAccess = await checkStaffClientAccess(tenantId, effectiveStaffId, clientId);
    if (!hasAccess) {
      const error = new Error('Acesso negado: Profissional sem agendamento vinculado com a cliente.');
      error.statusCode = 403;
      throw error;
    }
  }

  const result = await pool.query(
    `INSERT INTO public.cap_client_evolutions (
       tenant_id, client_id, staff_id, appointment_id, session_date,
       procedure_name, notes, measurements, before_photos, after_photos,
       photo_consent_level, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7, $8, $9, $10, $11, NOW(), NOW())
     RETURNING *`,
    [
      tenantId,
      clientId,
      staffId || requestingUser?.staff_id || null,
      appointmentId || null,
      sessionDate || null,
      procedureName,
      notes,
      JSON.stringify(measurements || {}),
      JSON.stringify(beforePhotos || []),
      JSON.stringify(afterPhotos || []),
      photoConsentLevel || 'internal_only'
    ]
  );

  const evolution = result.rows[0];

  // Log de auditoria
  if (req) {
    logAudit({
      req,
      action: 'CREATE_CLINICAL_EVOLUTION',
      entityName: 'cap_client_evolutions',
      entityId: evolution.id,
      tenantId,
      newData: {
        client_id: clientId,
        procedure_name: procedureName,
        photos_count: (beforePhotos?.length || 0) + (afterPhotos?.length || 0),
        photo_consent_level: photoConsentLevel
      }
    });
  }

  return evolution;
};

/**
 * Lista as evoluções clínicas de uma cliente com controle estrito de acesso e auditoria LGPD.
 */
export const listClientEvolutions = async (tenantId, clientId, requestingUser = null, req = null) => {
  if (requestingUser) {
    const { role, id: userId, staff_id: tokenStaffId } = requestingUser;
    
    // Cliente só vê a sua
    if (role === 'client' && userId !== clientId) {
      const error = new Error('Acesso negado: Você só pode visualizar o seu próprio prontuário.');
      error.statusCode = 403;
      throw error;
    }

    // Profissional só vê se vinculado
    if (role === 'staff') {
      const effectiveStaffId = tokenStaffId || userId;
      const hasAccess = await checkStaffClientAccess(tenantId, effectiveStaffId, clientId);
      if (!hasAccess) {
        const error = new Error('Acesso negado: Profissional sem histórico de atendimento com esta cliente (LGPD Art. 11).');
        error.statusCode = 403;
        throw error;
      }
    }
  }

  const result = await pool.query(
    `SELECT e.*, s.name as staff_name
     FROM public.cap_client_evolutions e
     LEFT JOIN public.cap_staff s ON e.staff_id = s.id
     WHERE e.tenant_id = $1 AND e.client_id = $2
     ORDER BY e.session_date DESC, e.created_at DESC`,
    [tenantId, clientId]
  );

  // Auditoria LGPD
  if (req && requestingUser) {
    logAudit({
      req,
      action: 'ACCESS_HEALTH_DATA',
      entityName: 'cap_client_evolutions',
      entityId: clientId,
      tenantId,
      newData: {
        accessed_by_role: requestingUser.role,
        accessed_by_id: requestingUser.id,
        records_count: result.rows.length
      }
    });
  }

  return result.rows;
};

/**
 * Atualiza um registro de evolução.
 */
export const updateEvolution = async (tenantId, evolutionId, updates, requestingUser = null, req = null) => {
  const currentQuery = await pool.query(
    `SELECT * FROM public.cap_client_evolutions WHERE id = $1 AND tenant_id = $2`,
    [evolutionId, tenantId]
  );

  if (currentQuery.rows.length === 0) {
    const error = new Error('Evolução clínica não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  const current = currentQuery.rows[0];

  const result = await pool.query(
    `UPDATE public.cap_client_evolutions
     SET 
       procedure_name = COALESCE($1, procedure_name),
       notes = COALESCE($2, notes),
       measurements = COALESCE($3, measurements),
       before_photos = COALESCE($4, before_photos),
       after_photos = COALESCE($5, after_photos),
       photo_consent_level = COALESCE($6, photo_consent_level),
       session_date = COALESCE($7, session_date),
       updated_at = NOW()
     WHERE id = $8 AND tenant_id = $9
     RETURNING *`,
    [
      updates.procedure_name,
      updates.notes,
      updates.measurements ? JSON.stringify(updates.measurements) : null,
      updates.before_photos ? JSON.stringify(updates.before_photos) : null,
      updates.after_photos ? JSON.stringify(updates.after_photos) : null,
      updates.photo_consent_level,
      updates.session_date,
      evolutionId,
      tenantId
    ]
  );

  const updated = result.rows[0];

  if (req) {
    logAudit({
      req,
      action: 'UPDATE_CLINICAL_EVOLUTION',
      entityName: 'cap_client_evolutions',
      entityId: evolutionId,
      tenantId,
      oldData: current,
      newData: updated
    });
  }

  return updated;
};

/**
 * Exclui um registro de evolução (apenas gestores / administradores).
 */
export const deleteEvolution = async (tenantId, evolutionId, requestingUser, req = null) => {
  if (requestingUser.role !== 'admin' && requestingUser.role !== 'manager' && requestingUser.role !== 'superadmin') {
    const error = new Error('Apenas administradores podem excluir registros de prontuário clínico.');
    error.statusCode = 403;
    throw error;
  }

  const currentQuery = await pool.query(
    `SELECT * FROM public.cap_client_evolutions WHERE id = $1 AND tenant_id = $2`,
    [evolutionId, tenantId]
  );

  if (currentQuery.rows.length === 0) {
    const error = new Error('Evolução clínica não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  await pool.query(
    `DELETE FROM public.cap_client_evolutions WHERE id = $1 AND tenant_id = $2`,
    [evolutionId, tenantId]
  );

  if (req) {
    logAudit({
      req,
      action: 'DELETE_CLINICAL_EVOLUTION',
      entityName: 'cap_client_evolutions',
      entityId: evolutionId,
      tenantId,
      oldData: currentQuery.rows[0]
    });
  }

  return { success: true, message: 'Registro de evolução excluído com sucesso.' };
};
