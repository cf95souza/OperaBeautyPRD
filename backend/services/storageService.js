import pool from '../config/db.js';

/**
 * Retorna o consumo de armazenamento por tenant (studio de beleza)
 * Calculado a partir da soma do tamanho das imagens (cap_crm_images)
 */
export const getTenantStorageUsage = async () => {
  const result = await pool.query(
    `SELECT 
       t.id as tenant_id,
       t.name as tenant_name,
       t.slug as tenant_slug,
       COALESCE(SUM(img.size_bytes), 0) as total_bytes
     FROM public.cap_tenants t
     LEFT JOIN public.cap_crm_images img ON t.id = img.tenant_id
     WHERE t.status = 'active'
     GROUP BY t.id, t.name, t.slug
     ORDER BY total_bytes DESC`
  );
  return result.rows;
};
