import pool from '../config/db.js';
import { logAudit } from './auditService.js';

/**
 * 1. Lista todos os modelos de pacotes ativos do salão
 */
export const listPackages = async (tenantId) => {
  const query = `
    SELECT 
      p.id,
      p.tenant_id,
      p.name,
      p.description,
      p.service_id,
      p.total_sessions,
      p.price,
      p.validity_days,
      p.min_interval_days,
      p.is_active,
      p.created_at,
      s.name AS service_name,
      s.duration_minutes AS service_duration,
      s.price AS service_unit_price,
      ROUND((s.price * p.total_sessions) - p.price, 2) AS estimated_savings
    FROM public.cap_packages p
    JOIN public.cap_services s ON s.id = p.service_id
    WHERE p.tenant_id = $1 AND p.is_active = TRUE
    ORDER BY p.name ASC
  `;
  const result = await pool.query(query, [tenantId]);
  return result.rows;
};

/**
 * 2. Cria um novo modelo de pacote
 */
export const createPackage = async (tenantId, data) => {
  const {
    name,
    description,
    service_id,
    total_sessions,
    price,
    validity_days = 90,
    min_interval_days = 0
  } = data;

  const query = `
    INSERT INTO public.cap_packages (
      tenant_id,
      name,
      description,
      service_id,
      total_sessions,
      price,
      validity_days,
      min_interval_days,
      is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
    RETURNING *
  `;
  const result = await pool.query(query, [
    tenantId,
    name.trim(),
    description ? description.trim() : null,
    service_id,
    parseInt(total_sessions, 10),
    parseFloat(price),
    parseInt(validity_days, 10),
    parseInt(min_interval_days || 0, 10)
  ]);

  return result.rows[0];
};

/**
 * 3. Atualiza um modelo de pacote
 */
export const updatePackage = async (tenantId, packageId, data) => {
  const {
    name,
    description,
    service_id,
    total_sessions,
    price,
    validity_days,
    min_interval_days,
    is_active
  } = data;

  const query = `
    UPDATE public.cap_packages
    SET 
      name = COALESCE($3, name),
      description = COALESCE($4, description),
      service_id = COALESCE($5, service_id),
      total_sessions = COALESCE($6, total_sessions),
      price = COALESCE($7, price),
      validity_days = COALESCE($8, validity_days),
      min_interval_days = COALESCE($9, min_interval_days),
      is_active = COALESCE($10, is_active)
    WHERE id = $1 AND tenant_id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [
    packageId,
    tenantId,
    name ? name.trim() : null,
    description !== undefined ? description : null,
    service_id || null,
    total_sessions ? parseInt(total_sessions, 10) : null,
    price !== undefined ? parseFloat(price) : null,
    validity_days ? parseInt(validity_days, 10) : null,
    min_interval_days !== undefined ? parseInt(min_interval_days, 10) : null,
    is_active !== undefined ? Boolean(is_active) : null
  ]);

  if (result.rowCount === 0) {
    throw new Error('Pacote não encontrado ou não pertence a este salão.');
  }

  return result.rows[0];
};

/**
 * 4. Desativa um modelo de pacote (soft delete)
 */
export const deletePackage = async (tenantId, packageId) => {
  const query = `
    UPDATE public.cap_packages
    SET is_active = FALSE
    WHERE id = $1 AND tenant_id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [packageId, tenantId]);
  if (result.rowCount === 0) {
    throw new Error('Pacote não encontrado.');
  }
  return result.rows[0];
};

/**
 * 5. Registra a venda de um pacote para uma cliente
 */
export const sellPackageToClient = async (tenantId, {
  clientId,
  packageId,
  paymentMethod = 'pix',
  installments = 1,
  notes = null,
  staffId = null
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_tenant_id = $1', [tenantId]);

    // 1. Busca dados do pacote
    const pkgRes = await client.query(
      `SELECT * FROM public.cap_packages WHERE id = $1 AND tenant_id = $2 AND is_active = TRUE`,
      [packageId, tenantId]
    );
    if (pkgRes.rowCount === 0) {
      throw new Error('Pacote não encontrado ou desativado.');
    }
    const pkg = pkgRes.rows[0];

    // 2. Busca dados da cliente
    const clientRes = await client.query(
      `SELECT id, name, phone FROM public.cap_clients WHERE id = $1 AND tenant_id = $2`,
      [clientId, tenantId]
    );
    if (clientRes.rowCount === 0) {
      throw new Error('Cliente não encontrada.');
    }
    const clientData = clientRes.rows[0];

    // 3. Calcula data de expiração com base em validity_days
    const validityDays = parseInt(pkg.validity_days, 10) || 90;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    // 4. Insere em cap_client_packages
    const insertQuery = `
      INSERT INTO public.cap_client_packages (
        tenant_id,
        client_id,
        package_id,
        service_id,
        total_sessions,
        used_sessions,
        remaining_sessions,
        price_paid,
        payment_method,
        installments,
        status,
        expires_at,
        notes
      ) VALUES ($1, $2, $3, $4, $5, 0, $5, $6, $7, $8, 'active', $9, $10)
      RETURNING *
    `;
    const clientPkgRes = await client.query(insertQuery, [
      tenantId,
      clientId,
      pkg.id,
      pkg.service_id,
      pkg.total_sessions,
      pkg.price,
      paymentMethod,
      parseInt(installments || 1, 10),
      expiresAt.toISOString(),
      notes
    ]);
    const createdClientPkg = clientPkgRes.rows[0];

    // 5. Registra nota na timeline do CRM da cliente
    const noteContent = `Adquiriu o pacote "${pkg.name}" (${pkg.total_sessions} sessões) por R$ ${parseFloat(pkg.price).toFixed(2).replace('.', ',')} via ${paymentMethod.toUpperCase()}${installments > 1 ? ` em ${installments}x` : ''}. Válido até ${expiresAt.toLocaleDateString('pt-BR')}.`;
    await client.query(
      `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, author_id, content) VALUES ($1, $2, $3, $4)`,
      [tenantId, clientId, staffId, noteContent]
    );

    // 6. Registra auditoria
    await logAudit(
      tenantId,
      staffId,
      'SELL_PACKAGE',
      'cap_client_packages',
      createdClientPkg.id,
      {
        package_name: pkg.name,
        client_name: clientData.name,
        total_sessions: pkg.total_sessions,
        price_paid: pkg.price,
        payment_method: paymentMethod
      }
    );

    await client.query('COMMIT');
    return createdClientPkg;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * 6. Lista todos os pacotes adquiridos por uma cliente
 */
export const getClientPackages = async (tenantId, clientId) => {
  const query = `
    SELECT 
      cp.id,
      cp.tenant_id,
      cp.client_id,
      cp.package_id,
      cp.service_id,
      cp.total_sessions,
      cp.used_sessions,
      cp.remaining_sessions,
      cp.price_paid,
      cp.payment_method,
      cp.installments,
      cp.status,
      cp.purchased_at,
      cp.expires_at,
      cp.last_session_at,
      cp.notes,
      p.name AS package_name,
      p.min_interval_days,
      s.name AS service_name,
      s.duration_minutes AS service_duration,
      CASE 
        WHEN cp.status = 'active' AND cp.expires_at < NOW() THEN 'expired'
        WHEN cp.status = 'active' AND cp.remaining_sessions = 0 THEN 'completed'
        ELSE cp.status
      END AS computed_status
    FROM public.cap_client_packages cp
    JOIN public.cap_packages p ON p.id = cp.package_id
    JOIN public.cap_services s ON s.id = cp.service_id
    WHERE cp.tenant_id = $1 AND cp.client_id = $2
    ORDER BY cp.purchased_at DESC
  `;
  const result = await pool.query(query, [tenantId, clientId]);
  return result.rows;
};

/**
 * 7. Busca se o cliente tem um pacote elegível e com saldo ativo para determinado serviço
 */
export const getClientActivePackageForService = async (tenantId, clientId, serviceId) => {
  const query = `
    SELECT 
      cp.id,
      cp.package_id,
      cp.service_id,
      cp.total_sessions,
      cp.used_sessions,
      cp.remaining_sessions,
      cp.expires_at,
      cp.last_session_at,
      p.name AS package_name,
      p.min_interval_days,
      s.name AS service_name
    FROM public.cap_client_packages cp
    JOIN public.cap_packages p ON p.id = cp.package_id
    JOIN public.cap_services s ON s.id = cp.service_id
    WHERE cp.tenant_id = $1 
      AND cp.client_id = $2 
      AND cp.service_id = $3
      AND cp.status = 'active'
      AND cp.remaining_sessions > 0
      AND cp.expires_at >= NOW()
    ORDER BY cp.expires_at ASC
    LIMIT 1
  `;
  const result = await pool.query(query, [tenantId, clientId, serviceId]);
  return result.rows[0] || null;
};

/**
 * 8. Abatimento atômico de uma sessão de pacote (baixa de saldo)
 */
export const consumePackageSession = async ({ clientPackageId, appointmentId, staffId = null, notes = null }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock pessimista para garantir saldo nunca negativo e concorrência segura
    const pkgRes = await client.query(
      `SELECT * FROM public.cap_client_packages WHERE id = $1 FOR UPDATE`,
      [clientPackageId]
    );

    if (pkgRes.rowCount === 0) {
      throw new Error('Pacote do cliente não encontrado.');
    }

    const pkg = pkgRes.rows[0];

    // Validações de integridade
    if (pkg.remaining_sessions <= 0) {
      throw new Error('Saldo de sessões deste pacote está esgotado.');
    }

    if (new Date(pkg.expires_at) < new Date()) {
      throw new Error('Este pacote de sessões já expirou.');
    }

    const nextRemaining = pkg.remaining_sessions - 1;
    const nextUsed = pkg.used_sessions + 1;
    const nextStatus = nextRemaining === 0 ? 'completed' : 'active';
    const sessionNumber = nextUsed;

    // Atualiza saldo e status
    await client.query(
      `UPDATE public.cap_client_packages
       SET remaining_sessions = $1,
           used_sessions = $2,
           status = $3,
           last_session_at = NOW()
       WHERE id = $4`,
      [nextRemaining, nextUsed, nextStatus, clientPackageId]
    );

    // Registra auditoria da sessão em cap_package_usages
    await client.query(
      `INSERT INTO public.cap_package_usages (
         tenant_id,
         client_package_id,
         appointment_id,
         session_number,
         action,
         notes
       ) VALUES ($1, $2, $3, $4, 'consume', $5)`,
      [pkg.tenant_id, clientPackageId, appointmentId, sessionNumber, notes || `Sessão ${sessionNumber} de ${pkg.total_sessions} concluída.`]
    );

    await client.query('COMMIT');
    return {
      success: true,
      remaining_sessions: nextRemaining,
      used_sessions: nextUsed,
      status: nextStatus,
      session_number: sessionNumber
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * 9. Estorno de sessão de pacote (devolve sessão ao saldo em caso de cancelamento)
 */
export const refundPackageSession = async ({ clientPackageId, appointmentId, notes = null }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pkgRes = await client.query(
      `SELECT * FROM public.cap_client_packages WHERE id = $1 FOR UPDATE`,
      [clientPackageId]
    );

    if (pkgRes.rowCount === 0) {
      throw new Error('Pacote do cliente não encontrado para estorno.');
    }

    const pkg = pkgRes.rows[0];

    const nextRemaining = Math.min(pkg.total_sessions, pkg.remaining_sessions + 1);
    const nextUsed = Math.max(0, pkg.used_sessions - 1);
    const nextStatus = 'active'; // Restaura como ativo se estava completed

    await client.query(
      `UPDATE public.cap_client_packages
       SET remaining_sessions = $1,
           used_sessions = $2,
           status = $3
       WHERE id = $4`,
      [nextRemaining, nextUsed, nextStatus, clientPackageId]
    );

    await client.query(
      `INSERT INTO public.cap_package_usages (
         tenant_id,
         client_package_id,
         appointment_id,
         session_number,
         action,
         notes
       ) VALUES ($1, $2, $3, $4, 'refund', $5)`,
      [pkg.tenant_id, clientPackageId, appointmentId, nextUsed + 1, notes || 'Sessão estornada ao saldo por cancelamento do agendamento.']
    );

    await client.query('COMMIT');
    return {
      success: true,
      remaining_sessions: nextRemaining,
      used_sessions: nextUsed,
      status: nextStatus
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * 10. Relatório consolidado de pacotes do salão (Métricas de Gestão)
 */
export const getPackagesReport = async (tenantId) => {
  const query = `
    SELECT 
      COUNT(DISTINCT p.id) AS total_package_models,
      COUNT(cp.id) AS total_sold,
      COALESCE(SUM(cp.price_paid), 0) AS total_revenue,
      COALESCE(SUM(cp.total_sessions), 0) AS total_sessions_sold,
      COALESCE(SUM(cp.used_sessions), 0) AS total_sessions_used,
      COALESCE(SUM(cp.remaining_sessions), 0) AS total_sessions_remaining,
      COUNT(CASE WHEN cp.status = 'active' AND cp.expires_at >= NOW() THEN 1 END) AS active_packages_count,
      COUNT(CASE WHEN cp.status = 'completed' THEN 1 END) AS completed_packages_count,
      COUNT(CASE WHEN cp.status = 'expired' OR (cp.status = 'active' AND cp.expires_at < NOW()) THEN 1 END) AS expired_packages_count
    FROM public.cap_packages p
    LEFT JOIN public.cap_client_packages cp ON cp.package_id = p.id AND cp.tenant_id = p.tenant_id
    WHERE p.tenant_id = $1
  `;
  const result = await pool.query(query, [tenantId]);
  const row = result.rows[0];

  const totalSessionsSold = parseInt(row.total_sessions_sold, 10) || 0;
  const totalSessionsUsed = parseInt(row.total_sessions_used, 10) || 0;
  const usageRate = totalSessionsSold > 0 ? ((totalSessionsUsed / totalSessionsSold) * 100).toFixed(1) : '0.0';

  return {
    total_package_models: parseInt(row.total_package_models, 10) || 0,
    total_sold: parseInt(row.total_sold, 10) || 0,
    total_revenue: parseFloat(row.total_revenue) || 0,
    total_sessions_sold: totalSessionsSold,
    total_sessions_used: totalSessionsUsed,
    total_sessions_remaining: parseInt(row.total_sessions_remaining, 10) || 0,
    active_packages_count: parseInt(row.active_packages_count, 10) || 0,
    completed_packages_count: parseInt(row.completed_packages_count, 10) || 0,
    expired_packages_count: parseInt(row.expired_packages_count, 10) || 0,
    usage_rate_percentage: parseFloat(usageRate)
  };
};
