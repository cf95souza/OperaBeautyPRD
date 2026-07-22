import pool from '../config/db.js';

export const listFeatureFlags = async () => {
  const result = await pool.query('SELECT id, name, description, is_active_global FROM public.cap_feature_flags ORDER BY name ASC');
  return result.rows;
};

export const createFeatureFlag = async (name, description, isActiveGlobal = false) => {
  const result = await pool.query(
    `INSERT INTO public.cap_feature_flags (name, description, is_active_global)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, is_active_global`,
    [name, description, isActiveGlobal]
  );
  return result.rows[0];
};

export const updateFeatureFlag = async (id, name, description, isActiveGlobal) => {
  const result = await pool.query(
    `UPDATE public.cap_feature_flags
     SET name = $2, description = $3, is_active_global = $4
     WHERE id = $1
     RETURNING id, name, description, is_active_global`,
    [id, name, description, isActiveGlobal]
  );
  if (result.rows.length === 0) {
    const err = new Error('Feature Flag não encontrada.');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

export const deleteFeatureFlag = async (id) => {
  const result = await pool.query(
    'DELETE FROM public.cap_feature_flags WHERE id = $1 RETURNING id, name, description, is_active_global',
    [id]
  );
  if (result.rows.length === 0) {
    const err = new Error('Feature Flag não encontrada.');
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
};

export const listTenantFeatureFlags = async (tenantId) => {
  const result = await pool.query(
    `SELECT f.id as feature_flag_id, f.name, f.description, f.is_active_global,
            COALESCE(tf.is_enabled, false) as tenant_enabled,
            (f.is_active_global OR COALESCE(tf.is_enabled, false)) as is_active
     FROM public.cap_feature_flags f
     LEFT JOIN public.cap_tenant_feature_flags tf ON tf.feature_flag_id = f.id AND tf.tenant_id = $1
     ORDER BY f.name ASC`,
    [tenantId]
  );
  return result.rows;
};

export const toggleTenantFeatureFlag = async (tenantId, featureFlagId, isEnabled) => {
  const flagCheck = await pool.query('SELECT id FROM public.cap_feature_flags WHERE id = $1', [featureFlagId]);
  if (flagCheck.rows.length === 0) {
    const err = new Error('Feature Flag não encontrada.');
    err.statusCode = 404;
    throw err;
  }

  const result = await pool.query(
    `INSERT INTO public.cap_tenant_feature_flags (tenant_id, feature_flag_id, is_enabled)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, feature_flag_id)
     DO UPDATE SET is_enabled = EXCLUDED.is_enabled
     RETURNING tenant_id, feature_flag_id, is_enabled`,
    [tenantId, featureFlagId, isEnabled]
  );
  return result.rows[0];
};

export const getActiveFlagsForTenant = async (tenantId) => {
  if (!tenantId) return {};
  const result = await pool.query(
    `SELECT f.name
     FROM public.cap_feature_flags f
     LEFT JOIN public.cap_tenant_feature_flags tf ON tf.feature_flag_id = f.id AND tf.tenant_id = $1
     WHERE f.is_active_global = TRUE OR tf.is_enabled = TRUE`,
    [tenantId]
  );
  
  const flagsMap = {};
  result.rows.forEach(row => {
    flagsMap[row.name] = true;
  });
  return flagsMap;
};
