import pool from '../config/db.js';

/**
 * Registra uma ação no Audit Trail
 * @param {Object} params
 * @param {Object} params.req - O objeto de request do Express (para extrair user, tenant e IP)
 * @param {String} params.action - Ação realizada (ex: 'UPDATE_SERVICE', 'DELETE_STAFF')
 * @param {String} params.entityName - Tabela ou entidade afetada (ex: 'cap_services')
 * @param {String} params.entityId - ID do registro afetado (opcional)
 * @param {Object} params.oldData - Objeto JSON com o estado anterior (opcional)
 * @param {Object} params.newData - Objeto JSON com o novo estado (opcional)
 */
export const logAudit = async ({
  req,
  action,
  entityName,
  entityId = null,
  oldData = null,
  newData = null
}) => {
  try {
    const tenant_id = req?.user?.tenant_id || null;
    const user_id = req?.user?.id || null;
    const user_role = req?.user?.role || 'unknown';
    
    const ip_address = req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || null;

    pool.query(
      `INSERT INTO public.cap_audit_logs (tenant_id, user_id, user_role, action, entity_name, entity_id, old_data, new_data, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        tenant_id,
        user_id,
        user_role,
        action,
        entityName,
        entityId,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        ip_address
      ]
    ).catch(err => {
      if (req?.log) {
        req.log.error(err, 'Falha silenciosa ao gravar no Audit Trail');
      } else {
        console.error('Falha silenciosa ao gravar no Audit Trail:', err);
      }
    });
  } catch (error) {
    if (req?.log) req.log.error(error, 'Erro não tratado no auditService');
  }
};

/**
 * Retorna os logs de auditoria do Super Admin
 */
export const getSuperAdminLogs = async (limit = 100) => {
  const result = await pool.query(
    `SELECT id, action, entity_name, ip_address, created_at 
     FROM public.cap_audit_logs 
     WHERE user_role = 'superadmin' 
     ORDER BY created_at DESC 
     LIMIT $1`,
    [limit]
  );
  return result.rows;
};
