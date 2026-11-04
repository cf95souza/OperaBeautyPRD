import crypto from 'crypto';
import pool from '../config/db.js';
import { notifyClient } from './notificationService.js';
import { logAudit } from './auditService.js';

// Modelos padrão de campanhas
const DEFAULT_CAMPAIGNS = [
  {
    type: 'birthday',
    name: 'Aniversariantes do Dia',
    message_template: 'Olá {{cliente}}! 🎂 O {{salao}} deseja um feliz aniversário! Preparamos um presente especial: use o cupom {{cupom}} e garanta {{desconto}} no seu próximo atendimento. Agende aqui: {{link}}',
    discount_type: 'percentage',
    discount_value: 15.00,
    coupon_validity_days: 15,
    min_days_inactive: 60,
    send_channel: 'whatsapp',
    cooldown_days: 360,
    is_active: true
  },
  {
    type: 'maintenance',
    name: 'Retorno por Manutenção do Procedimento',
    message_template: 'Olá {{cliente}}! ✨ Já faz um tempinho desde seu procedimento de {{servico}} no {{salao}}. Que tal agendar sua manutenção para manter seus resultados impecáveis? Agende aqui: {{link}}',
    discount_type: 'percentage',
    discount_value: 0.00,
    coupon_validity_days: 7,
    min_days_inactive: 60,
    send_channel: 'whatsapp',
    cooldown_days: 30,
    is_active: true
  },
  {
    type: 'reactivation_60d',
    name: 'Reativação de Inativas (Sumidas)',
    message_template: 'Olá {{cliente}}! 💌 Estamos com saudades de você no {{salao}}! Preparamos um carinho especial para seu retorno: use o cupom {{cupom}} e garanta {{desconto}} de desconto. Te esperamos: {{link}}',
    discount_type: 'percentage',
    discount_value: 10.00,
    coupon_validity_days: 15,
    min_days_inactive: 60,
    send_channel: 'whatsapp',
    cooldown_days: 60,
    is_active: true
  }
];

/**
 * Garante que as 3 campanhas padrão existam para o tenant e retorna a lista com métricas.
 */
export const getCampaigns = async (tenantId) => {
  // Garantir criação idempotente
  for (const def of DEFAULT_CAMPAIGNS) {
    await pool.query(
      `INSERT INTO public.cap_marketing_campaigns (
         tenant_id, type, name, message_template, discount_type, discount_value,
         coupon_validity_days, min_days_inactive, send_channel, cooldown_days, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (tenant_id, type) DO NOTHING`,
      [
        tenantId,
        def.type,
        def.name,
        def.message_template,
        def.discount_type,
        def.discount_value,
        def.coupon_validity_days,
        def.min_days_inactive,
        def.send_channel,
        def.cooldown_days,
        def.is_active
      ]
    );
  }

  // Buscar campanhas
  const campaignsResult = await pool.query(
    `SELECT * FROM public.cap_marketing_campaigns 
     WHERE tenant_id = $1 
     ORDER BY created_at ASC`,
    [tenantId]
  );

  // Métricas agregadas do mês atual
  const metricsResult = await pool.query(
    `SELECT 
       COUNT(id)::int as total_sent_month,
       COUNT(CASE WHEN campaign_type = 'birthday' THEN 1 END)::int as birthday_sent,
       COUNT(CASE WHEN campaign_type = 'maintenance' THEN 1 END)::int as maintenance_sent,
       COUNT(CASE WHEN campaign_type = 'reactivation_60d' THEN 1 END)::int as reactivation_sent,
       COUNT(DISTINCT coupon_id)::int as coupons_generated
     FROM public.cap_campaign_logs
     WHERE tenant_id = $1 
       AND status = 'sent'
       AND sent_at >= DATE_TRUNC('month', CURRENT_DATE)`,
    [tenantId]
  );

  // Clientes com opt-out
  const optOutResult = await pool.query(
    `SELECT COUNT(id)::int as opt_out_count 
     FROM public.cap_clients 
     WHERE tenant_id = $1 AND marketing_opt_out = true`,
    [tenantId]
  );

  return {
    campaigns: campaignsResult.rows,
    stats: {
      total_sent_month: metricsResult.rows[0]?.total_sent_month || 0,
      birthday_sent: metricsResult.rows[0]?.birthday_sent || 0,
      maintenance_sent: metricsResult.rows[0]?.maintenance_sent || 0,
      reactivation_sent: metricsResult.rows[0]?.reactivation_sent || 0,
      coupons_generated: metricsResult.rows[0]?.coupons_generated || 0,
      opt_out_count: optOutResult.rows[0]?.opt_out_count || 0
    }
  };
};

/**
 * Atualiza configurações de uma campanha.
 */
export const updateCampaign = async (tenantId, type, data) => {
  const result = await pool.query(
    `UPDATE public.cap_marketing_campaigns
     SET 
       name = COALESCE($1, name),
       message_template = COALESCE($2, message_template),
       discount_type = COALESCE($3, discount_type),
       discount_value = COALESCE($4, discount_value),
       coupon_validity_days = COALESCE($5, coupon_validity_days),
       min_days_inactive = COALESCE($6, min_days_inactive),
       send_channel = COALESCE($7, send_channel),
       cooldown_days = COALESCE($8, cooldown_days),
       is_active = COALESCE($9, is_active),
       updated_at = NOW()
     WHERE tenant_id = $10 AND type = $11
     RETURNING *`,
    [
      data.name,
      data.message_template,
      data.discount_type,
      data.discount_value,
      data.coupon_validity_days,
      data.min_days_inactive,
      data.send_channel,
      data.cooldown_days,
      data.is_active,
      tenantId,
      type
    ]
  );

  if (result.rows.length === 0) {
    const error = new Error(`Campanha do tipo "${type}" não encontrada.`);
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

/**
 * Cria um cupom de uso único exclusivo para a campanha.
 */
export const generateCampaignCoupon = async (tenantId, campaignType, discountType, discountValue, validityDays) => {
  if (!discountValue || Number(discountValue) <= 0) return null;

  const prefixMap = {
    birthday: 'NIVER',
    maintenance: 'VOLTA',
    reactivation_60d: 'RETORNO'
  };
  const prefix = prefixMap[campaignType] || 'PROMO';
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const code = `${prefix}${Math.round(discountValue)}-${randomSuffix}`;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (validityDays || 15));

  const result = await pool.query(
    `INSERT INTO public.cap_coupons (tenant_id, code, discount_type, discount_value, max_uses, current_uses, expires_at, created_at)
     VALUES ($1, $2, $3, $4, 1, 0, $5, NOW())
     RETURNING id, code, discount_type, discount_value, expires_at`,
    [tenantId, code, discountType || 'percentage', discountValue, expiresAt]
  );

  return result.rows[0];
};

/**
 * Verifica se a cliente já recebeu mensagem da mesma campanha dentro da janela de carência.
 * Regra de Aceite Principal D15: Nenhuma cliente recebe a mesma campanha duas vezes no período.
 * Suporta sobrecarga síncrona/unitária para testes: isClientInCooldown(lastSentDate, cooldownDays)
 */
export const isClientInCooldown = async (tenantIdOrDate, campaignTypeOrCooldownDays, clientId, cooldownDays) => {
  if (tenantIdOrDate instanceof Date || tenantIdOrDate === null || tenantIdOrDate === undefined) {
    if (!tenantIdOrDate) return false;
    const cooldown = Number(campaignTypeOrCooldownDays) || 30;
    const diffMs = Date.now() - new Date(tenantIdOrDate).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays < cooldown;
  }

  const result = await pool.query(
    `SELECT 1 FROM public.cap_campaign_logs
     WHERE tenant_id = $1 
       AND campaign_type = $2 
       AND client_id = $3 
       AND status = 'sent'
       AND sent_at >= NOW() - ($4 * INTERVAL '1 day')
     LIMIT 1`,
    [tenantIdOrDate, campaignTypeOrCooldownDays, clientId, cooldownDays]
  );
  return result.rows.length > 0;
};

/**
 * Substitui tags dinâmicas no template da mensagem (suporta {{tags}} e {tags}).
 */
export const renderCampaignMessage = (template, variables = {}) => {
  let msg = template || '';
  const rawClient = variables.clientName || variables.cliente || 'Cliente';
  const clientFirstName = typeof rawClient === 'string' ? rawClient.split(' ')[0] : 'Cliente';
  const salao = variables.salonName || variables.salao || 'nosso espaço';
  const servico = variables.serviceName || variables.servico || 'procedimento';
  const cupom = variables.couponCode || variables.cupom || 'PROMO';
  const desconto = variables.discountText || (variables.discountPercent ? `${variables.discountPercent}%` : '') || 'desconto especial';
  const link = variables.bookingLink || variables.link || '';
  const validade = variables.validityDays || variables.dias_validade || '';

  msg = msg.replaceAll('{{cliente}}', clientFirstName);
  msg = msg.replaceAll('{cliente_nome}', clientFirstName);
  msg = msg.replaceAll('{{salao}}', salao);
  msg = msg.replaceAll('{salao_nome}', salao);
  msg = msg.replaceAll('{{servico}}', servico);
  msg = msg.replaceAll('{servico_nome}', servico);
  msg = msg.replaceAll('{{cupom}}', cupom);
  msg = msg.replaceAll('{cupom_codigo}', cupom);
  msg = msg.replaceAll('{{desconto}}', desconto);
  msg = msg.replaceAll('{cupom_desconto}', variables.discountPercent ? `${variables.discountPercent}` : desconto);
  msg = msg.replaceAll('{{link}}', link);
  msg = msg.replaceAll('{link}', link);
  msg = msg.replaceAll('{{dias_validade}}', `${validade}`);
  msg = msg.replaceAll('{dias_validade}', `${validade}`);
  return msg;
};

/**
 * Executa a varredura e envio automatizado de campanhas para um tenant ou para todos os ativos.
 */
export const runCampaignScan = async (specificTenantId = null) => {
  const tenantsQuery = specificTenantId
    ? await pool.query(`SELECT id, name, slug FROM public.cap_tenants WHERE id = $1 AND (status = 'active' OR status IS NULL)`, [specificTenantId])
    : await pool.query(`SELECT id, name, slug FROM public.cap_tenants WHERE (status = 'active' OR status IS NULL)`);

  const results = {
    processed_tenants: tenantsQuery.rows.length,
    birthday_sent: 0,
    maintenance_sent: 0,
    reactivation_sent: 0,
    skipped_cooldown: 0,
    skipped_opt_out: 0
  };

  for (const tenant of tenantsQuery.rows) {
    const tenantId = tenant.id;
    const salonName = tenant.name;
    const bookingLink = `${process.env.APP_URL || 'https://operabeauty.com.br'}/${tenant.slug}/agendamento`;

    // Buscar campanhas ativas do tenant
    const campaignsQuery = await pool.query(
      `SELECT * FROM public.cap_marketing_campaigns WHERE tenant_id = $1 AND is_active = true`,
      [tenantId]
    );

    const activeCampaigns = {};
    campaignsQuery.rows.forEach(c => { activeCampaigns[c.type] = c; });

    // ----------------------------------------------------
    // 1. CAMPANHA DE ANIVERSÁRIO
    // ----------------------------------------------------
    const bdayCamp = activeCampaigns['birthday'];
    if (bdayCamp) {
      const bdays = await pool.query(
        `SELECT id, name, phone, marketing_opt_out 
         FROM public.cap_clients
         WHERE tenant_id = $1
           AND birth_date IS NOT NULL
           AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
           AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE)`,
        [tenantId]
      );

      for (const client of bdays.rows) {
        if (client.marketing_opt_out) {
          results.skipped_opt_out++;
          continue;
        }

        const inCooldown = await isClientInCooldown(tenantId, 'birthday', client.id, bdayCamp.cooldown_days || 360);
        if (inCooldown) {
          results.skipped_cooldown++;
          continue;
        }

        // Gerar cupom se houver desconto
        let coupon = null;
        if (Number(bdayCamp.discount_value) > 0) {
          coupon = await generateCampaignCoupon(
            tenantId,
            'birthday',
            bdayCamp.discount_type,
            bdayCamp.discount_value,
            bdayCamp.coupon_validity_days
          );
        }

        const discountText = bdayCamp.discount_type === 'percentage'
          ? `${Math.round(bdayCamp.discount_value)}%`
          : `R$ ${Number(bdayCamp.discount_value).toFixed(2)}`;

        const message = renderCampaignMessage(bdayCamp.message_template, {
          clientName: client.name.split(' ')[0],
          salonName,
          couponCode: coupon?.code || 'NIVER',
          discountText,
          bookingLink
        });

        // Grava no log
        await pool.query(
          `INSERT INTO public.cap_campaign_logs (
             tenant_id, campaign_id, client_id, campaign_type, phone,
             message_content, coupon_id, coupon_code, status, channel, sent_at
           )
           VALUES ($1, $2, $3, 'birthday', $4, $5, $6, $7, 'sent', $8, NOW())`,
          [
            tenantId,
            bdayCamp.id,
            client.id,
            client.phone,
            message,
            coupon?.id || null,
            coupon?.code || null,
            bdayCamp.send_channel || 'whatsapp'
          ]
        );

        // Notificar via Push / WhatsApp
        await notifyClient(
          tenantId,
          client.id,
          'Feliz Aniversário! 🎂',
          message,
          `/${tenant.slug}/agendamento`
        );

        results.birthday_sent++;
      }
    }

    // ----------------------------------------------------
    // 2. CAMPANHA DE RETORNO POR MANUTENÇÃO
    // ----------------------------------------------------
    const maintCamp = activeCampaigns['maintenance'];
    if (maintCamp) {
      const maintenances = await pool.query(
        `SELECT a.client_id, c.name as client_name, c.phone, c.marketing_opt_out, s.name as service_name, s.maintenance_days
         FROM public.cap_appointments a
         JOIN public.cap_clients c ON a.client_id = c.id
         JOIN public.cap_services s ON a.service_id = s.id
         WHERE a.tenant_id = $1
           AND a.status = 'completed'
           AND s.maintenance_days > 0
           AND (a.start_time AT TIME ZONE 'America/Sao_Paulo')::date = CURRENT_DATE - (s.maintenance_days * INTERVAL '1 day')
           AND NOT EXISTS (
             SELECT 1 FROM public.cap_appointments fut 
             WHERE fut.tenant_id = a.tenant_id 
               AND fut.client_id = a.client_id 
               AND fut.start_time > NOW() 
               AND fut.status IN ('scheduled', 'confirmed')
           )`,
        [tenantId]
      );

      for (const item of maintenances.rows) {
        if (item.marketing_opt_out) {
          results.skipped_opt_out++;
          continue;
        }

        const inCooldown = await isClientInCooldown(tenantId, 'maintenance', item.client_id, maintCamp.cooldown_days || 30);
        if (inCooldown) {
          results.skipped_cooldown++;
          continue;
        }

        let coupon = null;
        if (Number(maintCamp.discount_value) > 0) {
          coupon = await generateCampaignCoupon(
            tenantId,
            'maintenance',
            maintCamp.discount_type,
            maintCamp.discount_value,
            maintCamp.coupon_validity_days
          );
        }

        const discountText = maintCamp.discount_type === 'percentage'
          ? `${Math.round(maintCamp.discount_value)}%`
          : `R$ ${Number(maintCamp.discount_value).toFixed(2)}`;

        const message = renderCampaignMessage(maintCamp.message_template, {
          clientName: item.client_name.split(' ')[0],
          salonName,
          serviceName: item.service_name,
          couponCode: coupon?.code || '',
          discountText,
          bookingLink
        });

        await pool.query(
          `INSERT INTO public.cap_campaign_logs (
             tenant_id, campaign_id, client_id, campaign_type, phone,
             message_content, coupon_id, coupon_code, status, channel, sent_at
           )
           VALUES ($1, $2, $3, 'maintenance', $4, $5, $6, $7, 'sent', $8, NOW())`,
          [
            tenantId,
            maintCamp.id,
            item.client_id,
            item.phone,
            message,
            coupon?.id || null,
            coupon?.code || null,
            maintCamp.send_channel || 'whatsapp'
          ]
        );

        await notifyClient(
          tenantId,
          item.client_id,
          'Hora do seu Retoque! ✨',
          message,
          `/${tenant.slug}/agendamento`
        );

        results.maintenance_sent++;
      }
    }

    // ----------------------------------------------------
    // 3. CAMPANHA DE REATIVAÇÃO (SUMIDAS HÁ 60 DIAS)
    // ----------------------------------------------------
    const reactCamp = activeCampaigns['reactivation_60d'];
    if (reactCamp) {
      const minDays = reactCamp.min_days_inactive || 60;
      const inactives = await pool.query(
        `SELECT c.id, c.name, c.phone, c.marketing_opt_out, MAX(a.start_time) as last_appt
         FROM public.cap_clients c
         JOIN public.cap_appointments a ON c.id = a.client_id
         WHERE c.tenant_id = $1
           AND a.status = 'completed'
         GROUP BY c.id, c.name, c.phone, c.marketing_opt_out
         HAVING MAX(a.start_time) <= CURRENT_DATE - ($2 * INTERVAL '1 day')
           AND NOT EXISTS (
             SELECT 1 FROM public.cap_appointments fut 
             WHERE fut.tenant_id = c.tenant_id 
               AND fut.client_id = c.id 
               AND fut.start_time > NOW() 
               AND fut.status IN ('scheduled', 'confirmed')
           )`,
        [tenantId, minDays]
      );

      for (const client of inactives.rows) {
        if (client.marketing_opt_out) {
          results.skipped_opt_out++;
          continue;
        }

        const inCooldown = await isClientInCooldown(tenantId, 'reactivation_60d', client.id, reactCamp.cooldown_days || 60);
        if (inCooldown) {
          results.skipped_cooldown++;
          continue;
        }

        let coupon = null;
        if (Number(reactCamp.discount_value) > 0) {
          coupon = await generateCampaignCoupon(
            tenantId,
            'reactivation_60d',
            reactCamp.discount_type,
            reactCamp.discount_value,
            reactCamp.coupon_validity_days
          );
        }

        const discountText = reactCamp.discount_type === 'percentage'
          ? `${Math.round(reactCamp.discount_value)}%`
          : `R$ ${Number(reactCamp.discount_value).toFixed(2)}`;

        const message = renderCampaignMessage(reactCamp.message_template, {
          clientName: client.name.split(' ')[0],
          salonName,
          couponCode: coupon?.code || 'VOLTA10',
          discountText,
          bookingLink
        });

        await pool.query(
          `INSERT INTO public.cap_campaign_logs (
             tenant_id, campaign_id, client_id, campaign_type, phone,
             message_content, coupon_id, coupon_code, status, channel, sent_at
           )
           VALUES ($1, $2, $3, 'reactivation_60d', $4, $5, $6, $7, 'sent', $8, NOW())`,
          [
            tenantId,
            reactCamp.id,
            client.id,
            client.phone,
            message,
            coupon?.id || null,
            coupon?.code || null,
            reactCamp.send_channel || 'whatsapp'
          ]
        );

        await notifyClient(
          tenantId,
          client.id,
          'Estamos com saudades de você! 💌',
          message,
          `/${tenant.slug}/agendamento`
        );

        results.reactivation_sent++;
      }
    }
  }

  return results;
};

/**
 * Retorna o histórico de logs de disparos de campanhas do tenant.
 */
export const getCampaignLogs = async (tenantId, { limit = 50, offset = 0, type = null } = {}) => {
  let query = `
    SELECT l.*, c.name as client_name 
    FROM public.cap_campaign_logs l
    JOIN public.cap_clients c ON l.client_id = c.id
    WHERE l.tenant_id = $1
  `;
  const params = [tenantId];

  if (type) {
    params.push(type);
    query += ` AND l.campaign_type = $${params.length}`;
  }

  query += ` ORDER BY l.sent_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Altera status de Opt-Out de marketing da cliente.
 */
export const toggleClientOptOut = async (tenantId, clientId, optOut) => {
  const result = await pool.query(
    `UPDATE public.cap_clients
     SET marketing_opt_out = $1, opt_out_at = CASE WHEN $1 = true THEN NOW() ELSE NULL END
     WHERE id = $2 AND tenant_id = $3
     RETURNING id, name, phone, marketing_opt_out, opt_out_at`,
    [Boolean(optOut), clientId, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Cliente não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};
