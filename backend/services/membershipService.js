import pool from '../config/db.js';

// 1. Criar Plano de Assinatura do Salão
export const createSalonMembership = async (tenantId, name, description, price, billingCycle, serviceIds, usageLimit) => {
  const result = await pool.query(
    `INSERT INTO public.cap_salon_memberships (tenant_id, name, description, price, billing_cycle, service_ids, usage_limit, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW())
     RETURNING id, tenant_id, name, description, price, billing_cycle, service_ids, usage_limit, is_active, created_at`,
    [tenantId, name, description, price, billingCycle, JSON.stringify(serviceIds), usageLimit]
  );
  return result.rows[0];
};

// 2. Listar Planos de Assinatura do Salão
export const listSalonMemberships = async (tenantId, onlyActive = true) => {
  let query = `
    SELECT sm.id, sm.tenant_id, sm.name, sm.description, sm.price, sm.billing_cycle, sm.service_ids, sm.usage_limit, sm.is_active, sm.created_at,
           (
             SELECT string_agg(s.name, ', ')
             FROM public.cap_services s
             WHERE s.id::text = ANY(ARRAY(SELECT jsonb_array_elements_text(sm.service_ids)))
           ) as service_name
    FROM public.cap_salon_memberships sm
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
export const updateSalonMembership = async (id, tenantId, name, description, price, billingCycle, serviceIds, usageLimit, isActive) => {
  const result = await pool.query(
    `UPDATE public.cap_salon_memberships 
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         price = COALESCE($3, price),
         billing_cycle = COALESCE($4, billing_cycle),
         service_ids = COALESCE($5, service_ids),
         usage_limit = COALESCE($6, usage_limit),
         is_active = COALESCE($7, is_active)
     WHERE id = $8 AND tenant_id = $9
     RETURNING id, tenant_id, name, description, price, billing_cycle, service_ids, usage_limit, is_active`,
    [name, description, price, billingCycle, serviceIds ? JSON.stringify(serviceIds) : null, usageLimit, isActive, id, tenantId]
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
            (
              SELECT string_agg(s.name, ', ')
              FROM public.cap_services s
              WHERE s.id::text = ANY(ARRAY(SELECT jsonb_array_elements_text(sm.service_ids)))
            ) as service_name
     FROM public.cap_client_memberships cm
     JOIN public.cap_salon_memberships sm ON cm.membership_id = sm.id
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
            (
              SELECT string_agg(s.name, ', ')
              FROM public.cap_services s
              WHERE s.id::text = ANY(ARRAY(SELECT jsonb_array_elements_text(sm.service_ids)))
            ) as service_name
     FROM public.cap_client_memberships cm
     JOIN public.cap_clients c ON cm.client_id = c.id
     JOIN public.cap_salon_memberships sm ON cm.membership_id = sm.id
     WHERE cm.tenant_id = $1
     ORDER BY cm.created_at DESC`,
    [tenantId]
  );
  return result.rows;
};

// 7. Aplicar e decrementar sessão do Clube para um agendamento
export const applyMembershipSession = async (clientId, tenantId, serviceId) => {
  // Buscar se o cliente tem assinatura ativa e com sessões restantes para este serviço
  const result = await pool.query(
    `SELECT cm.id, cm.remaining_sessions 
     FROM public.cap_client_memberships cm
     JOIN public.cap_salon_memberships sm ON cm.membership_id = sm.id
     WHERE cm.client_id = $1 AND cm.tenant_id = $2 
       AND cm.status = 'active' 
       AND sm.service_ids @> jsonb_build_array($3::text)
       AND (cm.remaining_sessions > 0 OR cm.remaining_sessions IS NULL)
       AND cm.current_period_end > NOW()
     LIMIT 1`,
    [clientId, tenantId, serviceId]
  );

  if (result.rows.length === 0) {
    return null; // Não há assinatura válida para este serviço
  }

  const membership = result.rows[0];

  // Se tem número limite de sessões, decrementa
  if (membership.remaining_sessions !== null) {
    await pool.query(
      `UPDATE public.cap_client_memberships
       SET remaining_sessions = GREATEST(0, remaining_sessions - 1)
       WHERE id = $1`,
      [membership.id]
    );
  }

  return membership;
};

// 7.5 Consumir sessão diretamente pelo ID do membership
export const consumeMembershipSession = async (membershipId, tenantId) => {
  await pool.query(
    `UPDATE public.cap_client_memberships
     SET remaining_sessions = GREATEST(0, remaining_sessions - 1)
     WHERE id = $1 AND tenant_id = $2 AND remaining_sessions IS NOT NULL`,
    [membershipId, tenantId]
  );
};

// 8. Reembolsar sessão caso o agendamento seja cancelado
export const refundMembershipSession = async (clientMembershipId) => {
  await pool.query(
    `UPDATE public.cap_client_memberships
     SET remaining_sessions = remaining_sessions + 1
     WHERE id = $1 AND remaining_sessions IS NOT NULL`,
    [clientMembershipId]
  );
};

// 9. Cancelar assinatura do cliente
export const cancelClientSubscription = async (subscriptionId, clientId, tenantId) => {
  const result = await pool.query(
    `UPDATE public.cap_client_memberships
     SET status = 'cancelled'
     WHERE id = $1 AND client_id = $2 AND tenant_id = $3
     RETURNING id, status`,
    [subscriptionId, clientId, tenantId]
  );
  
  if (result.rows.length === 0) {
    const error = new Error('Assinatura não encontrada.');
    error.statusCode = 404;
    throw error;
  }
  
  return result.rows[0];
};

// 7.7 Renovar ciclo da assinatura do cliente
export const renewClientMembership = async (subscriptionId, tenantId) => {
  const getSub = await pool.query(
    `SELECT cm.id, sm.usage_limit, sm.billing_cycle
     FROM public.cap_client_memberships cm
     JOIN public.cap_salon_memberships sm ON cm.membership_id = sm.id
     WHERE cm.id = $1 AND cm.tenant_id = $2`,
    [subscriptionId, tenantId]
  );
  
  if (getSub.rows.length === 0) {
    const error = new Error('Assinatura não encontrada.');
    error.statusCode = 404;
    throw error;
  }
  
  const { usage_limit, billing_cycle } = getSub.rows[0];
  
  const now = new Date();
  const nextPeriodEnd = new Date(now);
  if (billing_cycle === 'yearly') {
    nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
  } else {
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
  }
  
  const result = await pool.query(
    `UPDATE public.cap_client_memberships
     SET current_period_start = $1,
         current_period_end = $2,
         remaining_sessions = $3,
         status = 'active'
     WHERE id = $4 AND tenant_id = $5
     RETURNING *`,
    [now, nextPeriodEnd, usage_limit, subscriptionId, tenantId]
  );
  
  return result.rows[0];
};
