import pool from '../config/db.js';

// Middleware para validar se o salão possui o recurso contratado ou ativo
export const requireFeature = (featureName) => {
  return async (req, res, next) => {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      return res.status(401).json({ error: 'Sessão inválida. tenant_id não identificado.' });
    }

    try {
      // 1. Busca as features do plano e se a flag está ativa
      const result = await pool.query(
        `SELECT p.features as plan_features,
                (f.is_active_global OR COALESCE(tf.is_enabled, false)) as flag_active
         FROM public.cap_tenants t
         LEFT JOIN public.cap_plans p ON t.plan_id = p.id
         LEFT JOIN public.cap_feature_flags f ON f.name = $2
         LEFT JOIN public.cap_tenant_feature_flags tf ON tf.feature_flag_id = f.id AND tf.tenant_id = t.id
         WHERE t.id = $1`,
        [tenantId, featureName]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado. Estabelecimento não identificado.' });
      }

      const { plan_features, flag_active } = result.rows[0];
      const hasPlanFeature = plan_features && Array.isArray(plan_features) && plan_features.includes(featureName);
      
      if (!hasPlanFeature && !flag_active) {
        return res.status(403).json({ error: `Este recurso (${featureName}) não está disponível para o plano contratado do seu estabelecimento.` });
      }

      next();
    } catch (err) {
      console.error('Erro no middleware requireFeature:', err);
      return res.status(500).json({ error: 'Erro interno ao validar recursos contratados.' });
    }
  };
};
