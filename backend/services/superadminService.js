import pool from '../config/db.js';
import redisClient from '../config/redis.js';
import { logAudit } from './auditService.js';
import { encrypt } from '../utils/crypto.js';

export const getDashboardMetrics = async (period = 'month') => {
  const tenantsCount = await pool.query("SELECT COUNT(*) FROM public.cap_tenants");
  const activeTenantsCount = await pool.query("SELECT COUNT(*) FROM public.cap_tenants WHERE status = 'active'");
  const suspendedTenantsCount = await pool.query("SELECT COUNT(*) FROM public.cap_tenants WHERE status = 'suspended' OR status = 'inactive'");
  const totalStaffCount = await pool.query("SELECT COUNT(*) FROM public.cap_staff WHERE is_active = TRUE");
  const totalClientsCount = await pool.query("SELECT COUNT(*) FROM public.cap_clients");
  const uniqueClientsCount = await pool.query("SELECT COUNT(DISTINCT phone) FROM public.cap_clients");
  
  const invoicesPaid = await pool.query("SELECT SUM(amount) as paid FROM public.cap_invoices WHERE status = 'paid'");
  const invoicesPending = await pool.query("SELECT SUM(amount) as pending FROM public.cap_invoices WHERE status = 'pending' OR status = 'overdue'");
  const mrrQuery = await pool.query("SELECT SUM(plan_price) as mrr FROM public.cap_tenants WHERE status = 'active'");

  // Receita por plano para o painel geral
  const revenueByPlanQuery = await pool.query(`
    SELECT COALESCE(p.name, 'Enterprise') as plan_name,
           COUNT(t.id)::int as subscribers_count,
           COALESCE(SUM(t.plan_price), 0)::float as total_mrr
    FROM public.cap_tenants t
    LEFT JOIN public.cap_plans p ON t.plan_id = p.id
    WHERE t.status = 'active'
    GROUP BY p.name
    ORDER BY total_mrr DESC
  `);

  // Itens de atenção (faturas vencidas ou pendências críticas)
  const attentionItemsQuery = await pool.query(`
    SELECT t.id, t.name, t.slug, t.status,
           COUNT(i.id)::int as overdue_invoices,
           COALESCE(SUM(i.amount), 0)::float as overdue_amount,
           'Fatura em atraso' as issue_description
    FROM public.cap_tenants t
    JOIN public.cap_invoices i ON t.id = i.tenant_id
    WHERE i.status = 'overdue' OR (i.status = 'pending' AND i.due_date < CURRENT_DATE)
    GROUP BY t.id, t.name, t.slug, t.status
    ORDER BY overdue_amount DESC
  `);

  const activeCount = parseInt(activeTenantsCount.rows[0].count) || 0;
  const suspendedCount = parseInt(suspendedTenantsCount.rows[0].count) || 0;
  const totalCount = parseInt(tenantsCount.rows[0].count) || 0;
  const churnPercentage = totalCount > 0 ? ((suspendedCount / totalCount) * 100).toFixed(0) : '0';

  return {
    total_tenants: totalCount,
    active_tenants: activeCount,
    suspended_tenants: suspendedCount,
    total_staff: parseInt(totalStaffCount.rows[0].count) || 0,
    total_clients: parseInt(totalClientsCount.rows[0].count) || 0,
    unique_clients: parseInt(uniqueClientsCount.rows[0].count) || 0,
    earnings_paid: parseFloat(invoicesPaid.rows[0].paid || '0'),
    earnings_pending: parseFloat(invoicesPending.rows[0].pending || '0'),
    mrr: parseFloat(mrrQuery.rows[0].mrr || '0'),
    churn_rate: `${churnPercentage}%`,
    revenue_by_plan: revenueByPlanQuery.rows,
    attention_items: attentionItemsQuery.rows
  };
};

export const getOverdueTenants = async () => {
  const result = await pool.query(`
    SELECT t.id, t.name, t.slug, t.status, t.primary_color, 
           SUM(i.amount) as overdue_amount, 
           COUNT(i.id) as overdue_invoices
    FROM public.cap_tenants t
    JOIN public.cap_invoices i ON t.id = i.tenant_id
    WHERE i.status = 'overdue' OR (i.status = 'pending' AND i.due_date < CURRENT_DATE)
    GROUP BY t.id, t.name, t.slug, t.status, t.primary_color
    ORDER BY overdue_amount DESC
  `);
  return result.rows;
};

export const listTenantsWithStats = async () => {
  const result = await pool.query(`
    SELECT t.id, t.slug, t.name, t.status, t.plan_price, t.plan_id, t.primary_color, t.secondary_color, t.created_at,
           COALESCE(p.name, 'Enterprise') as plan_name,
           (SELECT COUNT(*) FROM public.cap_staff s WHERE s.tenant_id = t.id AND s.is_active = TRUE) as staff_count,
           (SELECT COUNT(*) FROM public.cap_clients c WHERE c.tenant_id = t.id) as client_count,
           (SELECT i.status FROM public.cap_invoices i WHERE i.tenant_id = t.id ORDER BY i.due_date DESC LIMIT 1) as latest_invoice_status,
           (SELECT COUNT(*) FROM public.cap_invoices i WHERE i.tenant_id = t.id AND (i.status = 'overdue' OR (i.status = 'pending' AND i.due_date < CURRENT_DATE))) as overdue_invoices_count
    FROM public.cap_tenants t
    LEFT JOIN public.cap_plans p ON t.plan_id = p.id
    ORDER BY t.created_at DESC
  `);
  return result.rows;
};

export const getTenantById = async (id) => {
  const result = await pool.query('SELECT id, slug, name, status, plan_price, plan_id, logo_url, primary_color, secondary_color, tertiary_color, banners, banner_url, banner_title, banner_subtitle, welcome_message, address, social_instagram, social_facebook, social_whatsapp, created_at FROM public.cap_tenants WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
};

export const createTenant = async (
  name, 
  slug, 
  plan_price, 
  plan_id, 
  welcome_message, 
  primary_color, 
  secondary_color,
  theme_id = 'rose',
  brand_hex = null,
  tertiary_color = null
) => {
  const existCheck = await pool.query('SELECT id FROM public.cap_tenants WHERE slug = $1', [slug]);
  if (existCheck.rows.length > 0) {
    const error = new Error('Este link único (slug) já está sendo utilizado por outro salão.');
    error.statusCode = 409;
    throw error;
  }

  const finalThemeId = theme_id || 'rose';
  const finalBrandHex = brand_hex || primary_color || '#8E3B4E';
  const finalPrimary = primary_color || finalBrandHex;
  const finalSecondary = secondary_color || '#F6E4E4';
  const finalTertiary = tertiary_color || '#FBF7F5';

  const result = await pool.query(
    `INSERT INTO public.cap_tenants (
       name, slug, status, plan_price, plan_id, welcome_message, 
       primary_color, secondary_color, tertiary_color, theme_id, brand_hex, created_at
     )
     VALUES ($1, $2, 'active', $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     RETURNING id, slug, name, status, plan_price, plan_id, logo_url, 
               primary_color, secondary_color, tertiary_color, theme_id, brand_hex, 
               banners, banner_url, banner_title, banner_subtitle, welcome_message, 
               address, social_instagram, social_facebook, social_whatsapp, created_at`,
    [
      name, 
      slug, 
      parseFloat(plan_price || 69.90), 
      plan_id || null, 
      welcome_message || '', 
      finalPrimary, 
      finalSecondary,
      finalTertiary,
      finalThemeId,
      finalBrandHex
    ]
  );

  return result.rows[0];
};

export const updateTenant = async (id, name, slug, status, plan_price, plan_id, primary_color, secondary_color, confirmTenantName, suspensionReason, req) => {
  // Se houver tentativa de suspender via updateTenant direto, exige confirmação segura
  if (status && (status === 'suspended' || status === 'inactive')) {
    return await suspendTenant(id, confirmTenantName, suspensionReason, req);
  }

  // 1. Busca estado anterior para comparação de auditoria
  const currentRes = await pool.query(
    `SELECT t.id, t.name, t.slug, t.status, t.plan_price, t.plan_id, t.primary_color, t.secondary_color,
            p.name as plan_name
     FROM public.cap_tenants t
     LEFT JOIN public.cap_plans p ON t.plan_id = p.id
     WHERE t.id = $1`,
    [id]
  );

  if (currentRes.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const currentTenant = currentRes.rows[0];

  // 2. Executa a atualização
  const result = await pool.query(
    `UPDATE public.cap_tenants 
     SET name = COALESCE($1, name),
         slug = COALESCE($2, slug),
         status = COALESCE($3, status),
         plan_price = COALESCE($4, plan_price),
         plan_id = COALESCE($5, plan_id),
         primary_color = COALESCE($6, primary_color),
         secondary_color = COALESCE($7, secondary_color)
     WHERE id = $8 RETURNING id, slug, name, status, plan_price, plan_id, logo_url, primary_color, secondary_color, tertiary_color, banners, banner_url, banner_title, banner_subtitle, welcome_message, address, social_instagram, social_facebook, social_whatsapp, created_at`,
    [name, slug, status, plan_price !== undefined ? parseFloat(plan_price) : null, plan_id, primary_color, secondary_color, id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const updatedTenant = result.rows[0];

  // Invalida cache Redis se slug ou dados mudaram
  if (redisClient) {
    try {
      if (currentTenant.slug) await redisClient.del(`tenant_slug:${currentTenant.slug}`);
      if (updatedTenant.slug && updatedTenant.slug !== currentTenant.slug) {
        await redisClient.del(`tenant_slug:${updatedTenant.slug}`);
      }
    } catch (e) {
      console.error('Erro ao limpar cache Redis em updateTenant:', e);
    }
  }

  // 3. Auditoria Especializada (§9.5·H9)
  // a) Troca de Plano
  const planChanged = (currentTenant.plan_id !== updatedTenant.plan_id) || 
                      (parseFloat(currentTenant.plan_price || 0) !== parseFloat(updatedTenant.plan_price || 0));
  if (planChanged) {
    let newPlanName = 'Enterprise';
    if (updatedTenant.plan_id) {
      const planRes = await pool.query('SELECT name FROM public.cap_plans WHERE id = $1', [updatedTenant.plan_id]);
      if (planRes.rows.length > 0) newPlanName = planRes.rows[0].name;
    }

    await logAudit({
      req,
      action: 'UPDATE_TENANT_PLAN',
      entityName: 'cap_tenants',
      entityId: id,
      tenantId: id,
      oldData: {
        plan_id: currentTenant.plan_id,
        plan_price: parseFloat(currentTenant.plan_price || 0),
        plan_name: currentTenant.plan_name || 'Enterprise'
      },
      newData: {
        plan_id: updatedTenant.plan_id,
        plan_price: parseFloat(updatedTenant.plan_price || 0),
        plan_name: newPlanName
      }
    });
  }

  // b) Alteração de Slug
  if (currentTenant.slug !== updatedTenant.slug) {
    await logAudit({
      req,
      action: 'UPDATE_TENANT_SLUG',
      entityName: 'cap_tenants',
      entityId: id,
      tenantId: id,
      oldData: { slug: currentTenant.slug },
      newData: { slug: updatedTenant.slug }
    });
  }

  // c) Edição Cadastral Geral (Nome, Cores)
  const infoChanged = (currentTenant.name !== updatedTenant.name) ||
                      (currentTenant.primary_color !== updatedTenant.primary_color) ||
                      (currentTenant.secondary_color !== updatedTenant.secondary_color);
  if (infoChanged && !planChanged && currentTenant.slug === updatedTenant.slug) {
    await logAudit({
      req,
      action: 'UPDATE_TENANT',
      entityName: 'cap_tenants',
      entityId: id,
      tenantId: id,
      oldData: {
        name: currentTenant.name,
        primary_color: currentTenant.primary_color,
        secondary_color: currentTenant.secondary_color
      },
      newData: {
        name: updatedTenant.name,
        primary_color: updatedTenant.primary_color,
        secondary_color: updatedTenant.secondary_color
      }
    });
  }

  return updatedTenant;
};

/**
 * Suspensão Segura de Salão (Item H7 - P1)
 * Exige confirmar digitando o nome exato do salão, motivo com no mínimo 5 chars,
 * registra na auditoria cap_audit_logs, envia aviso aos gestores e invalida cache Redis.
 */
export const suspendTenant = async (id, confirmTenantName, reason, req) => {
  const check = await pool.query('SELECT id, name, slug, status FROM public.cap_tenants WHERE id = $1', [id]);
  if (check.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const tenant = check.rows[0];

  // Validação estrita do nome digitado
  const nomeDigitado = (confirmTenantName || '').trim();
  const nomeReal = (tenant.name || '').trim();
  if (!nomeDigitado || nomeDigitado.toLowerCase() !== nomeReal.toLowerCase()) {
    const error = new Error(`Para suspender a conta, confirme digitando exatamente o nome do salão ("${tenant.name}").`);
    error.statusCode = 400;
    throw error;
  }

  // Validação estrita do motivo
  const motivoLimpo = (reason || '').trim();
  if (!motivoLimpo || motivoLimpo.length < 5) {
    const error = new Error('O motivo da suspensão é obrigatório (mínimo de 5 caracteres).');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `UPDATE public.cap_tenants 
     SET status = 'suspended' 
     WHERE id = $1 
     RETURNING id, slug, name, status, plan_price, plan_id, logo_url, primary_color, secondary_color, tertiary_color, created_at`,
    [id]
  );

  const updatedTenant = result.rows[0];

  // Invalida o cache Redis imediatamente para bloquear o acesso
  if (redisClient) {
    try {
      await redisClient.del(`tenant_slug:${tenant.slug}`);
    } catch (cacheErr) {
      console.error('Erro ao invalidar cache Redis após suspensão:', cacheErr);
    }
  }

  // Registra no Audit Trail com tenantId explícito (§9.5·H9)
  await logAudit({
    req,
    action: 'SUSPEND_TENANT',
    entityName: 'cap_tenants',
    entityId: id,
    tenantId: id,
    oldData: { status: tenant.status },
    newData: { status: 'suspended', reason: motivoLimpo, confirmed_name: nomeDigitado }
  });

  // Notifica os gestores do salão
  try {
    const managers = await pool.query(
      "SELECT id FROM public.cap_staff WHERE tenant_id = $1 AND role = 'manager' AND is_active = true",
      [id]
    );
    for (const m of managers.rows) {
      await pool.query(
        `INSERT INTO public.cap_notifications (tenant_id, staff_id, title, body)
         VALUES ($1, $2, $3, $4)`,
        [id, m.id, 'Conta Suspensa pela Administração', `Sua conta foi temporariamente suspensa pelo Super Admin. Motivo: ${motivoLimpo}`]
      );
    }
  } catch (notifErr) {
    console.error('Erro ao notificar gestores sobre a suspensão:', notifErr);
  }

  return updatedTenant;
};

/**
 * Reativação Segura de Salão em 1 Clique (Item H7 - P1)
 * Restaura o status para 'active', registra auditoria, invalida cache e notifica o gestor.
 */
export const reactivateTenant = async (id, req) => {
  const check = await pool.query('SELECT id, name, slug, status FROM public.cap_tenants WHERE id = $1', [id]);
  if (check.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const tenant = check.rows[0];

  const result = await pool.query(
    `UPDATE public.cap_tenants 
     SET status = 'active' 
     WHERE id = $1 
     RETURNING id, slug, name, status, plan_price, plan_id, logo_url, primary_color, secondary_color, tertiary_color, created_at`,
    [id]
  );

  const updatedTenant = result.rows[0];

  // Invalida o cache Redis imediatamente para restabelecer o acesso
  if (redisClient) {
    try {
      await redisClient.del(`tenant_slug:${tenant.slug}`);
    } catch (cacheErr) {
      console.error('Erro ao invalidar cache Redis após reativação:', cacheErr);
    }
  }

  // Registra no Audit Trail com tenantId explícito (§9.5·H9)
  await logAudit({
    req,
    action: 'REACTIVATE_TENANT',
    entityName: 'cap_tenants',
    entityId: id,
    tenantId: id,
    oldData: { status: tenant.status },
    newData: { status: 'active' }
  });

  // Notifica os gestores do salão
  try {
    const managers = await pool.query(
      "SELECT id FROM public.cap_staff WHERE tenant_id = $1 AND role = 'manager' AND is_active = true",
      [id]
    );
    for (const m of managers.rows) {
      await pool.query(
        `INSERT INTO public.cap_notifications (tenant_id, staff_id, title, body)
         VALUES ($1, $2, $3, $4)`,
        [id, m.id, 'Conta Reativada!', 'Sua conta foi reativada pelo Super Admin. O acesso ao sistema está normalizado.']
      );
    }
  } catch (notifErr) {
    console.error('Erro ao notificar gestores sobre a reativação:', notifErr);
  }

  return updatedTenant;
};

export const deleteTenant = async (id) => {
  const result = await pool.query(
    `DELETE FROM public.cap_tenants WHERE id = $1 RETURNING id, name`,
    [id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const resetStaffPassword = async (id, password) => {
  const result = await pool.query(
    `UPDATE public.cap_staff 
     SET password_hash = crypt($1, gen_salt('bf'))
     WHERE id = $2
     RETURNING id, name`,
    [password, id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Membro da equipe não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const createInitialStaff = async (tenant_id, name, phone, email, password, role) => {
  const result = await pool.query(
    'SELECT cap_register_staff($1, $2, $3, $4, $5, $6) AS staff_id',
    [tenant_id, name, phone, email, password, role]
  );

  return {
    id: result.rows[0].staff_id,
    name,
    phone,
    email,
    role,
    is_active: true
  };
};

export const getPlatformSettings = async () => {
  const result = await pool.query(
    `SELECT id, payment_gateway, gateway_api_key, gateway_public_key, 
            pix_key, pix_key_type, environment, grace_period_days, webhook_secret,
            reseller_program_enabled, reseller_default_commission_rate, updated_at 
     FROM public.cap_platform_settings 
     LIMIT 1`
  );
  if (result.rows.length === 0) {
    return {
      payment_gateway: 'sandbox',
      environment: 'sandbox',
      grace_period_days: 5,
      pix_key_type: 'cnpj',
      reseller_program_enabled: false,
      reseller_default_commission_rate: 20.00
    };
  }
  const settings = result.rows[0];
  if (settings.gateway_api_key) {
    settings.has_api_key = true;
    settings.gateway_api_key = '****' + settings.gateway_api_key.slice(-4);
  }
  if (settings.webhook_secret) {
    settings.has_webhook_secret = true;
    settings.webhook_secret = '****' + settings.webhook_secret.slice(-4);
  }
  return settings;
};

export const testGatewayConnection = async ({ payment_gateway, gateway_api_key }) => {
  const targetGateway = payment_gateway || 'mercadopago';

  if (targetGateway === 'mercadopago') {
    let token = gateway_api_key;
    if (!token || token.startsWith('****')) {
      const res = await pool.query('SELECT gateway_api_key FROM public.cap_platform_settings LIMIT 1');
      token = res.rows[0]?.gateway_api_key;
    }
    if (token) {
      try {
        const decrypted = decrypt(token);
        if (decrypted) token = decrypted;
      } catch (_) {}
      if (typeof token === 'string') token = token.trim();
    }

    if (!token) {
      return {
        success: false,
        message: 'Nenhum Access Token foi informado ou configurado para o Mercado Pago.'
      };
    }

    // Validação de formato básico
    if (!token.startsWith('APP_USR-') && !token.startsWith('TEST-')) {
      return {
        success: false,
        message: 'Formato de Access Token inválido. O token do Mercado Pago deve iniciar com "APP_USR-" (Produção) ou "TEST-" (Sandbox).'
      };
    }

    try {
      const mpRes = await fetch('https://api.mercadopago.com/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await mpRes.json();

      if (mpRes.ok) {
        const isSandbox = token.startsWith('TEST-');
        return {
          success: true,
          provider: 'mercadopago',
          collector_id: data.id,
          nickname: data.nickname || data.first_name || 'Conta Mercado Pago',
          email: data.email,
          country: data.site_id,
          is_sandbox: isSandbox,
          message: isSandbox
            ? 'Conectado com sucesso em modo SANDBOX. ATENÇÃO: Bancos reais (Nubank, Itaú, etc.) rejeitam Pix de teste com "QR code inválido/expirado". Para cobranças reais, utilize o Access Token de Produção (APP_USR-).'
            : 'Conectado com sucesso ao Mercado Pago em PRODUÇÃO! Sua conta está autenticada e apta a gerar cobranças Pix reais.'
        };
      } else {
        return {
          success: false,
          status: mpRes.status,
          message: data.message === 'Unauthorized' || mpRes.status === 401
            ? 'Token não autorizado (401). Certifique-se de que copiou o "Access Token" (e não a "Public Key") nas credenciais da sua aplicação do Mercado Pago.'
            : (data.message || 'Falha ao autenticar no Mercado Pago.')
        };
      }
    } catch (err) {
      return {
        success: false,
        message: `Falha de rede ao conectar com a API do Mercado Pago: ${err.message}`
      };
    }
  }

  if (targetGateway === 'sandbox') {
    return {
      success: true,
      provider: 'sandbox',
      is_sandbox: true,
      message: 'Simulador nativo OperaBeauty ativo para testes locais.'
    };
  }

  return {
    success: false,
    message: `Teste automatizado não disponível para o gateway "${targetGateway}".`
  };
};

export const savePlatformSettings = async ({
  payment_gateway,
  gateway_api_key,
  gateway_public_key,
  pix_key,
  pix_key_type = 'cnpj',
  environment = 'sandbox',
  grace_period_days = 5,
  webhook_secret
}) => {
  const check = await pool.query('SELECT id, gateway_api_key, webhook_secret FROM public.cap_platform_settings LIMIT 1');
  
  // Tratar preservação de chave de API caso venha mascarada ou vazia
  let finalApiKey = null;
  if (gateway_api_key && !gateway_api_key.startsWith('****')) {
    finalApiKey = encrypt(gateway_api_key);
  } else if (check.rows.length > 0) {
    finalApiKey = check.rows[0].gateway_api_key;
  }

  // Tratar segredo do webhook
  let finalWebhookSecret = null;
  if (webhook_secret && !webhook_secret.startsWith('****')) {
    finalWebhookSecret = encrypt(webhook_secret);
  } else if (check.rows.length > 0) {
    finalWebhookSecret = check.rows[0].webhook_secret;
  }

  const safeGracePeriod = Number(grace_period_days) || 5;

  let result;
  if (check.rows.length > 0) {
    result = await pool.query(
      `UPDATE public.cap_platform_settings 
       SET payment_gateway = $1, 
           gateway_api_key = $2, 
           gateway_public_key = $3, 
           pix_key = $4,
           pix_key_type = $5,
           environment = $6,
           grace_period_days = $7,
           webhook_secret = $8,
           updated_at = NOW() 
       WHERE id = $9 
       RETURNING id, payment_gateway, gateway_api_key, gateway_public_key, pix_key, pix_key_type, environment, grace_period_days, webhook_secret, updated_at`,
      [
        payment_gateway,
        finalApiKey,
        gateway_public_key || null,
        pix_key || null,
        pix_key_type || 'cnpj',
        environment || 'sandbox',
        safeGracePeriod,
        finalWebhookSecret,
        check.rows[0].id
      ]
    );
  } else {
    result = await pool.query(
      `INSERT INTO public.cap_platform_settings (
         payment_gateway, gateway_api_key, gateway_public_key, 
         pix_key, pix_key_type, environment, grace_period_days, webhook_secret, updated_at
       ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
       RETURNING id, payment_gateway, gateway_api_key, gateway_public_key, pix_key, pix_key_type, environment, grace_period_days, webhook_secret, updated_at`,
      [
        payment_gateway,
        finalApiKey,
        gateway_public_key || null,
        pix_key || null,
        pix_key_type || 'cnpj',
        environment || 'sandbox',
        safeGracePeriod,
        finalWebhookSecret
      ]
    );
  }

  const settings = result.rows[0];
  if (settings.gateway_api_key) {
    settings.has_api_key = true;
    settings.gateway_api_key = '****' + settings.gateway_api_key.slice(-4);
  }
  if (settings.webhook_secret) {
    settings.has_webhook_secret = true;
    settings.webhook_secret = '****' + settings.webhook_secret.slice(-4);
  }
  return settings;
};

export const listPlatformAdmins = async () => {
  const result = await pool.query('SELECT id, name, email, created_at FROM public.cap_platform_admins ORDER BY created_at DESC');
  return result.rows;
};

export const createPlatformAdmin = async (name, email, password) => {
  const existCheck = await pool.query('SELECT id FROM public.cap_platform_admins WHERE email = $1', [email]);
  if (existCheck.rows.length > 0) {
    const error = new Error('Já existe um administrador com este e-mail.');
    error.statusCode = 409;
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO public.cap_platform_admins (name, email, password_hash) 
     VALUES ($1, $2, crypt($3, gen_salt('bf'))) 
     RETURNING id, name, email, created_at`,
    [name, email, password]
  );
  return result.rows[0];
};

export const updatePlatformAdmin = async (id, name, email, password) => {
  let result;
  if (password) {
    result = await pool.query(
      `UPDATE public.cap_platform_admins 
       SET name = $1, email = $2, password_hash = crypt($3, gen_salt('bf'))
       WHERE id = $4 RETURNING id, name, email, created_at`,
      [name, email, password, id]
    );
  } else {
    result = await pool.query(
      `UPDATE public.cap_platform_admins 
       SET name = $1, email = $2
       WHERE id = $3 RETURNING id, name, email, created_at`,
      [name, email, id]
    );
  }

  if (result.rows.length === 0) {
    const error = new Error('Administrador não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
};

export const deletePlatformAdmin = async (id) => {
  const countCheck = await pool.query('SELECT COUNT(*) FROM public.cap_platform_admins');
  if (parseInt(countCheck.rows[0].count) <= 1) {
    const error = new Error('Não é possível excluir o único administrador da plataforma.');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query('DELETE FROM public.cap_platform_admins WHERE id = $1 RETURNING id', [id]);
  
  if (result.rows.length === 0) {
    const error = new Error('Administrador não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  
  return { success: true };
};

// ==========================================
// AVISOS DA PLATAFORMA (BROADCAST SYSTEM)
// ==========================================

export const listAnnouncements = async () => {
  const result = await pool.query('SELECT id, title, content, type, is_active, expires_at, created_at FROM public.cap_platform_announcements ORDER BY created_at DESC');
  return result.rows;
};

export const createAnnouncement = async (title, content, type, is_active, expires_at) => {
  const result = await pool.query(
    `INSERT INTO public.cap_platform_announcements (title, content, type, is_active, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, title, content, type, is_active, expires_at, created_at`,
    [title, content, type, is_active, expires_at || null]
  );
  return result.rows[0];
};

export const updateAnnouncement = async (id, title, content, type, is_active, expires_at) => {
  const result = await pool.query(
    `UPDATE public.cap_platform_announcements 
     SET title = $1, content = $2, type = $3, is_active = $4, expires_at = $5
     WHERE id = $6 RETURNING id, title, content, type, is_active, expires_at, created_at`,
    [title, content, type, is_active, expires_at || null, id]
  );
  
  if (result.rows.length === 0) {
    const error = new Error('Aviso não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  return result.rows[0];
};

export const deleteAnnouncement = async (id) => {
  const result = await pool.query('DELETE FROM public.cap_platform_announcements WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    const error = new Error('Aviso não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  return { success: true };
};

export const getActiveAnnouncements = async () => {
  const result = await pool.query(
    `SELECT id, title, content, type, is_active, expires_at, created_at FROM public.cap_platform_announcements 
     WHERE is_active = true 
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC`
  );
  return result.rows;
};

// =========================================================================
// GESTÃO DO PROGRAMA DE PARCEIROS E REVENDA SAAS (SUPER ADMIN)
// =========================================================================

export const getResellerProgramSettings = async () => {
  const result = await pool.query(
    `SELECT reseller_program_enabled, reseller_default_commission_rate 
     FROM public.cap_platform_settings LIMIT 1`
  );
  if (result.rows.length === 0) {
    return { enabled: false, default_commission: 20.00 };
  }
  return {
    enabled: Boolean(result.rows[0].reseller_program_enabled),
    default_commission: Number(result.rows[0].reseller_default_commission_rate || 20.00)
  };
};

export const updateResellerProgramSettings = async ({ enabled, default_commission }) => {
  const check = await pool.query('SELECT id FROM public.cap_platform_settings LIMIT 1');
  const rateNum = Number(default_commission) || 20.00;
  const isEnabled = Boolean(enabled);

  if (check.rows.length === 0) {
    await pool.query(
      `INSERT INTO public.cap_platform_settings (reseller_program_enabled, reseller_default_commission_rate)
       VALUES ($1, $2)`,
      [isEnabled, rateNum]
    );
  } else {
    await pool.query(
      `UPDATE public.cap_platform_settings 
       SET reseller_program_enabled = $1, 
           reseller_default_commission_rate = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [isEnabled, rateNum, check.rows[0].id]
    );
  }

  return { enabled: isEnabled, default_commission: rateNum };
};

export const listSuperAdminResellers = async () => {
  const result = await pool.query(
    `SELECT r.id, r.name, r.email, r.phone, r.referral_code, r.commission_rate,
            r.pix_key_type, r.pix_key, r.status, r.tenant_id, r.notes, r.created_at,
            COUNT(DISTINCT ref.tenant_id) as total_referrals,
            COUNT(DISTINCT CASE WHEN t.status = 'active' THEN ref.tenant_id END) as active_salons,
            COALESCE(SUM(c.commission_amount), 0.00) as total_commissions_earned,
            COALESCE(SUM(CASE WHEN c.status = 'available' THEN c.commission_amount ELSE 0 END), 0.00) as balance_available,
            COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.commission_amount ELSE 0 END), 0.00) as balance_paid
     FROM public.cap_saas_resellers r
     LEFT JOIN public.cap_saas_referrals ref ON ref.reseller_id = r.id
     LEFT JOIN public.cap_tenants t ON t.id = ref.tenant_id
     LEFT JOIN public.cap_saas_commissions c ON c.reseller_id = r.id
     GROUP BY r.id
     ORDER BY r.created_at DESC`
  );

  return result.rows.map(row => ({
    ...row,
    commission_rate: Number(row.commission_rate),
    total_referrals: Number(row.total_referrals),
    active_salons: Number(row.active_salons),
    total_commissions_earned: Number(row.total_commissions_earned),
    balance_available: Number(row.balance_available),
    balance_paid: Number(row.balance_paid)
  }));
};

export const updateResellerStatus = async (resellerId, status) => {
  if (!['active', 'suspended', 'pending'].includes(status)) {
    const error = new Error('Status inválido. Escolha entre active, suspended ou pending.');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `UPDATE public.cap_saas_resellers 
     SET status = $1, updated_at = NOW() 
     WHERE id = $2 
     RETURNING id, name, referral_code, status`,
    [status, resellerId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Parceiro não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const updateResellerCommission = async (resellerId, commissionRate) => {
  const rateNum = Number(commissionRate);
  if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
    const error = new Error('A taxa de comissão deve estar entre 0% e 100%.');
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `UPDATE public.cap_saas_resellers 
     SET commission_rate = $1, updated_at = NOW() 
     WHERE id = $2 
     RETURNING id, name, referral_code, commission_rate`,
    [rateNum, resellerId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Parceiro não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const listSuperAdminPayouts = async (statusFilter = null) => {
  let query = `
    SELECT p.id, p.reseller_id, p.amount, p.pix_key_type, p.pix_key, p.status,
           p.receipt_url, p.notes, p.requested_at, p.processed_at,
           r.name as reseller_name, r.email as reseller_email, r.phone as reseller_phone, r.referral_code
    FROM public.cap_saas_payouts p
    JOIN public.cap_saas_resellers r ON r.id = p.reseller_id
  `;
  const params = [];
  if (statusFilter && statusFilter !== 'all') {
    query += ` WHERE p.status = $1`;
    params.push(statusFilter);
  }
  query += ` ORDER BY p.requested_at DESC`;

  const result = await pool.query(query, params);
  return result.rows.map(row => ({
    ...row,
    amount: Number(row.amount)
  }));
};

export const processSuperAdminPayout = async (payoutId, { action, receipt_url, notes, adminId }) => {
  if (!['paid', 'rejected'].includes(action)) {
    const error = new Error('Ação inválida. Escolha entre paid ou rejected.');
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const payoutRes = await client.query(
      `SELECT id, reseller_id, amount, status FROM public.cap_saas_payouts 
       WHERE id = $1 FOR UPDATE`,
      [payoutId]
    );

    if (payoutRes.rows.length === 0) {
      const error = new Error('Solicitação de saque não encontrada.');
      error.statusCode = 404;
      throw error;
    }

    const payout = payoutRes.rows[0];
    if (payout.status !== 'pending') {
      const error = new Error(`Este saque já foi processado anteriormente (status atual: ${payout.status}).`);
      error.statusCode = 400;
      throw error;
    }

    if (action === 'paid') {
      await client.query(
        `UPDATE public.cap_saas_payouts 
         SET status = 'paid', 
             receipt_url = $1, 
             notes = $2, 
             processed_at = NOW(), 
             processed_by = $3
         WHERE id = $4`,
        [receipt_url || null, notes || 'Comprovante PIX processado pelo Super Admin', adminId || null, payoutId]
      );
    } else if (action === 'rejected') {
      // Reverte as comissões bloqueadas para 'available'
      await client.query(
        `UPDATE public.cap_saas_commissions 
         SET status = 'available', payout_id = NULL 
         WHERE payout_id = $1`,
        [payoutId]
      );

      await client.query(
        `UPDATE public.cap_saas_payouts 
         SET status = 'rejected', 
             notes = $1, 
             processed_at = NOW(), 
             processed_by = $2
         WHERE id = $3`,
        [notes || 'Saque recusado pelo Super Admin', adminId || null, payoutId]
      );
    }

    await client.query('COMMIT');
    return { success: true, payoutId, status: action };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

