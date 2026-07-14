import pool from '../config/db.js';

export const listStaff = async (tenantId) => {
  const result = await pool.query(
    'SELECT id, name, phone, email, role, commission_rate, is_active FROM public.cap_staff WHERE tenant_id = $1 ORDER BY is_active DESC, name ASC',
    [tenantId]
  );
  return result.rows;
};

export const updateSelf = async (staffId, tenantId, name, phone, password) => {
  let updateQuery = `
    UPDATE public.cap_staff 
    SET name = COALESCE($1, name), phone = COALESCE($2, phone)
  `;
  let queryParams = [name, phone, staffId, tenantId];

  if (password) {
    updateQuery += `, password_hash = crypt($5, gen_salt('bf', 10))`;
    queryParams.push(password);
  }

  updateQuery += ` WHERE id = $3 AND tenant_id = $4 RETURNING id, name, phone`;

  const result = await pool.query(updateQuery, queryParams);

  if (result.rows.length === 0) {
    const error = new Error('Profissional não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const createStaff = async (tenantId, name, phone, email, password, role, commission_rate) => {
  // Verificar limite do plano
  const planCheck = await pool.query(
    `SELECT p.max_professionals 
     FROM public.cap_tenants t 
     LEFT JOIN public.cap_plans p ON t.plan_id = p.id 
     WHERE t.id = $1`,
    [tenantId]
  );
  
  const maxProfessionals = planCheck.rows[0]?.max_professionals;
  
  if (maxProfessionals !== null && maxProfessionals !== undefined) {
    const countCheck = await pool.query(
      'SELECT count(*) AS total FROM public.cap_staff WHERE tenant_id = $1 AND is_active = TRUE',
      [tenantId]
    );
    const currentStaffCount = parseInt(countCheck.rows[0].total, 10);
    
    if (currentStaffCount >= maxProfessionals) {
      const error = new Error(`Seu plano permite no máximo ${maxProfessionals} profissionais ativos.`);
      error.statusCode = 403;
      throw error;
    }
  }

  const result = await pool.query(
    'SELECT cap_register_staff($1, $2, $3, $4, $5, $6) AS staff_id',
    [tenantId, name, phone, email, password, role]
  );

  const newStaffId = result.rows[0].staff_id;

  if (commission_rate !== undefined) {
    await pool.query(
      'UPDATE public.cap_staff SET commission_rate = $1 WHERE id = $2 AND tenant_id = $3',
      [parseFloat(commission_rate), newStaffId, tenantId]
    );
  }

  return {
    id: newStaffId,
    name,
    phone,
    email,
    role,
    commission_rate: commission_rate || 0.00,
    is_active: true
  };
};

export const updateStaff = async (id, tenantId, isSelf, isManager, name, phone, email, password, role, commission_rate, is_active) => {
  if (!isSelf && !isManager) {
    const error = new Error('Você não tem permissão para alterar este perfil.');
    error.statusCode = 403;
    throw error;
  }

  const currentStaffResult = await pool.query(
    'SELECT role, is_active, commission_rate FROM public.cap_staff WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (currentStaffResult.rows.length === 0) {
    const error = new Error('Profissional não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const currentStaff = currentStaffResult.rows[0];

  let finalRole = role;
  let finalIsActive = is_active;
  let finalCommissionRate = commission_rate;

  if (!isManager) {
    finalRole = currentStaff.role;
    finalIsActive = currentStaff.is_active;
    finalCommissionRate = currentStaff.commission_rate;
  }

  // Verificar limite do plano se estiver reativando um funcionário
  if (finalIsActive === true && currentStaff.is_active === false) {
    const planCheck = await pool.query(
      `SELECT p.max_professionals 
       FROM public.cap_tenants t 
       LEFT JOIN public.cap_plans p ON t.plan_id = p.id 
       WHERE t.id = $1`,
      [tenantId]
    );
    const maxProfessionals = planCheck.rows[0]?.max_professionals;

    if (maxProfessionals !== null && maxProfessionals !== undefined) {
      const countCheck = await pool.query(
        'SELECT count(*) AS total FROM public.cap_staff WHERE tenant_id = $1 AND is_active = TRUE',
        [tenantId]
      );
      const currentStaffCount = parseInt(countCheck.rows[0].total, 10);
      
      if (currentStaffCount >= maxProfessionals) {
        const error = new Error(`Seu plano permite no máximo ${maxProfessionals} profissionais ativos.`);
        error.statusCode = 403;
        throw error;
      }
    }
  }

  await pool.query(
    'SELECT cap_update_staff($1, $2, $3, $4, $5, $6, $7, $8)',
    [id, tenantId, name, phone, email, password || null, finalRole, finalIsActive !== undefined ? finalIsActive : true]
  );

  if (isManager && finalCommissionRate !== undefined) {
    await pool.query(
      'UPDATE public.cap_staff SET commission_rate = $1 WHERE id = $2 AND tenant_id = $3',
      [parseFloat(finalCommissionRate), id, tenantId]
    );
  }

  return {
    currentStaff,
    updatedStaff: {
      id,
      name,
      phone,
      email,
      role: finalRole,
      commission_rate: finalCommissionRate || 0.00,
      is_active: finalIsActive !== undefined ? finalIsActive : true
    }
  };
};

export const deleteStaff = async (id, tenantId) => {
  const result = await pool.query(
    'UPDATE public.cap_staff SET is_active = FALSE WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, name, phone, email, role, commission_rate, is_active, created_at',
    [id, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Funcionário não encontrado ou acesso negado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};
