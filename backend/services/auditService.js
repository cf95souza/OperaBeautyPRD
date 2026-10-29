import pool from '../config/db.js';

/**
 * Registra uma ação no Audit Trail
 * @param {Object} params
 * @param {Object} params.req - O objeto de request do Express (para extrair user, tenant e IP)
 * @param {String} params.action - Ação realizada (ex: 'UPDATE_SERVICE', 'DELETE_STAFF', 'SUSPEND_TENANT')
 * @param {String} params.entityName - Tabela ou entidade afetada (ex: 'cap_services', 'cap_tenants')
 * @param {String} params.entityId - ID do registro afetado (opcional)
 * @param {String} params.tenantId - ID do tenant associado à ação (opcional)
 * @param {Object} params.oldData - Objeto JSON com o estado anterior (opcional)
 * @param {Object} params.newData - Objeto JSON com o novo estado (opcional)
 */
export const logAudit = async ({
  req,
  action,
  entityName,
  entityId = null,
  tenantId = null,
  oldData = null,
  newData = null
}) => {
  try {
    const tenant_id = tenantId || req?.user?.tenant_id || (entityName === 'cap_tenants' ? entityId : null);
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
 * Retorna os logs de auditoria do Super Admin enriquecidos com dados de tenants e admins
 * Suporta filtros por ação, salão, busca textual e paginação
 */
export const getSuperAdminLogs = async (paramsOrLimit = {}) => {
  const options = typeof paramsOrLimit === 'number' 
    ? { limit: paramsOrLimit } 
    : (paramsOrLimit || {});

  const { action = null, tenant_id = null, search = null, limit = 100 } = options;

  let query = `
    SELECT 
      l.id,
      l.action,
      l.entity_name,
      l.entity_id,
      l.tenant_id,
      l.old_data,
      l.new_data,
      l.ip_address,
      l.created_at,
      l.user_role,
      COALESCE(t.name, (l.new_data->>'confirmed_name'), 'Plataforma Global') as tenant_name,
      t.slug as tenant_slug,
      COALESCE(a.name, 'Super Admin') as admin_name,
      a.email as admin_email
    FROM public.cap_audit_logs l
    LEFT JOIN public.cap_tenants t ON (l.tenant_id = t.id OR (l.entity_name = 'cap_tenants' AND l.entity_id = t.id))
    LEFT JOIN public.cap_platform_admins a ON l.user_id = a.id
    WHERE l.user_role = 'superadmin'
  `;
  const queryParams = [];

  if (action && action !== 'ALL') {
    queryParams.push(action);
    query += ` AND l.action = $${queryParams.length}`;
  }

  if (tenant_id) {
    queryParams.push(tenant_id);
    query += ` AND (l.tenant_id = $${queryParams.length} OR (l.entity_name = 'cap_tenants' AND l.entity_id = $${queryParams.length}))`;
  }

  if (search && search.trim()) {
    queryParams.push(`%${search.trim().toLowerCase()}%`);
    query += ` AND (
      LOWER(l.action) LIKE $${queryParams.length} 
      OR LOWER(COALESCE(t.name, '')) LIKE $${queryParams.length} 
      OR LOWER(COALESCE(t.slug, '')) LIKE $${queryParams.length}
      OR LOWER(COALESCE(l.new_data->>'reason', '')) LIKE $${queryParams.length}
    )`;
  }

  queryParams.push(Math.max(1, Math.min(200, limit || 100)));
  query += ` ORDER BY l.created_at DESC LIMIT $${queryParams.length}`;

  const result = await pool.query(query, queryParams);
  return result.rows;
};
