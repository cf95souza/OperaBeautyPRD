import pool from '../config/db.js';

// 1. Criar Plano de Assinatura do Salão
export const createSalonMembership = async (tenantId, name, description, price, billingCycle, serviceId, usageLimit) => {
  const result = await pool.query(
    `INSERT INTO public.cap_salon_memberships (tenant_id, name, description, price, billing_cycle, service_id, usage_limit, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW())
     RETURNING id, tenant_id, name, description, price, billing_cycle, service_id, usage_limit, is_active, created_at`,
    [tenantId, name, description, price, billingCycle, serviceId, usageLimit]
  );
  return result.rows[0];
};

// 2. Listar Planos de Assinatura do Salão
export const listSalonMemberships = async (tenantId, onlyActive = true) => {
  let query = `
    SELECT sm.id, sm.tenant_id, sm.name, sm.description, sm.price, sm.billing_cycle, sm.service_id, sm.usage_limit, sm.is_active, sm.created_at,
           s.name as service_name
    FROM public.cap_salon_memberships sm
    JOIN public.cap_services s ON sm.service_id = s.id
    WHERE sm.tenant_id = $1
  `;
  if (onlyActive) {
    query += ' AND sm.is_active = TRUE';
  }
  query += ' ORDER BY sm.name';
  const result = await pool.query(query, [tenantId]);
  return result.rows;
};

// 3. Atualizar Plano de Assinatura
export const updateSalonMembership = async (id, tenantId, name, description, price, billingCycle, serviceId, usageLimit, isActive) => {
  const result = await pool.query(
    `UPDATE public.cap_salon_memberships 
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         price = COALESCE($3, price),
         billing_cycle = COALESCE($4, billing_cycle),
         service_id = COALESCE($5, service_id),
         usage_limit = COALESCE($6, usage_limit),
         is_active = COALESCE($7, is_active)
     WHERE id = $8 AND tenant_id = $9
     RETURNING id, tenant_id, name, description, price, billing_cycle, service_id, usage_limit, is_active`,
    [name, description, price, billingCycle, serviceId, usageLimit, isActive, id, tenantId]
  );
  
  if (result.rows.length === 0) {
    const error = new Error('Plano de assinatura não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  
  return result.rows[0];
};

// 4. Inscrição do Cliente no Plano de Assinatura (Simulado)
export const subscribeClientToMembership = async (tenantId, clientId, membershipId) => {
  // 1. Busca os detalhes do plano para pegar o usage_limit e o billing_cycle
  const planResult = await pool.query(
    'SELECT usage_limit, billing_cycle, name FROM public.cap_salon_memberships WHERE id = $1 AND tenant_id = $2 AND is_active = TRUE',
    [membershipId, tenantId]
  );
  
  if (planResult.rows.length === 0) {
    const error = new Error('Plano de assinatura não encontrado ou inativo.');
    error.statusCode = 404;
    throw error;
  }
  
  const plan = planResult.rows[0];
  const now = new Date();
  const periodEnd = new Date();
  if (plan.billing_cycle === 'monthly') {
    periodEnd.setDate(now.getDate() + 30);
  } else {
    periodEnd.setDate(now.getDate() + 365);
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO public.cap_client_memberships (tenant_id, client_id, membership_id, status, current_period_start, current_period_end, remaining_sessions, created_at)
       VALUES ($1, $2, $3, 'active', NOW(), $4, $5, NOW())
       RETURNING id, tenant_id, client_id, membership_id, status, current_period_start, current_period_end, remaining_sessions`,
      [tenantId, clientId, membershipId, periodEnd, plan.usage_limit]
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') { // unique violation
      const error = new Error('Você já possui uma assinatura ativa para este plano.');
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

// 5. Listar Assinaturas do Cliente Logado
export const listClientSubscriptions = async (clientId, tenantId) => {
  const result = await pool.query(
    `SELECT cm.id, cm.tenant_id, cm.client_id, cm.membership_id, cm.status, cm.current_period_start, cm.current_period_end, cm.remaining_sessions, cm.created_at,
            sm.name as membership_name, sm.description as membership_description, sm.price, sm.billing_cycle, sm.usage_limit,
            s.name as service_name, s.id as service_id
     FROM public.cap_client_memberships cm
     JOIN public.cap_salon_memberships sm ON cm.membership_id = sm.id
     JOIN public.cap_services s ON sm.service_id = s.id
     WHERE cm.client_id = $1 AND cm.tenant_id = $2 AND cm.status = 'active'`,
    [clientId, tenantId]
  );
  return result.rows;
};

// 6. Listar todas as inscrições de um Salão (CRM/Painel do Gerente)
export const listAllSubscriptionsForTenant = async (tenantId) => {
  const result = await pool.query(
    `SELECT cm.id, cm.tenant_id, cm.status, cm.current_period_start, cm.current_period_end, cm.remaining_sessions, cm.created_at,
            c.name as client_name, c.phone as client_phone,
            sm.name as membership_name, sm.price, sm.billing_cycle, sm.usage_limit,
            s.name as service_name
     FROM public.cap_client_memberships cm
     JOIN public.cap_clients c ON cm.client_id = c.id
     JOIN public.cap_salon_memberships sm ON cm.membership_id = sm.id
     JOIN public.cap_services s ON sm.service_id = s.id
     WHERE cm.tenant_id = $1
     ORDER BY cm.created_at DESC`,
    [tenantId]
  );
  return result.rows;
};

// 7. Decrementar sessão consumida
export const consumeMembershipSession = async (clientMembershipId, tenantId) => {
  const result = await pool.query(
    `UPDATE public.cap_client_memberships
     SET remaining_sessions = GREATEST(0, remaining_sessions - 1)
     WHERE id = $1 AND tenant_id = $2
     RETURNING id, remaining_sessions`,
    [clientMembershipId, tenantId]
  );
  return result.rows[0];
};
