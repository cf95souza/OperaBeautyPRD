import crypto from 'crypto';
import pool from '../config/db.js';
import { tenantQuery, tenantTransaction } from '../utils/tenantQuery.js';

/**
 * Gera um código de indicação único e sem ambiguidades visuais.
 */
export const generateUniqueReferralCode = async (clientDb, tenantId, clientName, clientId) => {
  const cleanPrefix = (clientName || 'AMIG')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, 'X');

  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let isUnique = false;
  let finalCode = '';
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    let suffix = '';
    const randomBytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) {
      suffix += charset[randomBytes[i] % charset.length];
    }
    finalCode = `${cleanPrefix}${suffix}`;

    const check = await clientDb.query(
      'SELECT id FROM public.cap_clients WHERE tenant_id = $1 AND referral_code = $2 LIMIT 1',
      [tenantId, finalCode]
    );

    if (check.rows.length === 0) {
      isUnique = true;
    }
  }

  // Se por acaso houve colisão persistente, usa os 6 dígitos hex do client_id
  if (!isUnique) {
    finalCode = `${cleanPrefix}${clientId.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
  }

  await clientDb.query(
    'UPDATE public.cap_clients SET referral_code = $1 WHERE id = $2 AND tenant_id = $3',
    [finalCode, clientId, tenantId]
  );

  return finalCode;
};

/**
 * Concede bônus na carteira digital com livro-razão imutável e idempotência estrita (C10).
 */
export const processReferralBonuses = async (clientDb, tenantId, referral) => {
  const { id: referralId, referrer_id, referee_id, referrer_reward_amount, referee_reward_amount } = referral;

  const referrerBonus = parseFloat(referrer_reward_amount || 0);
  const refereeBonus = parseFloat(referee_reward_amount || 0);

  // 1. Busca nomes dos envolvidos para as descrições
  const clientsRes = await clientDb.query(
    'SELECT id, name FROM public.cap_clients WHERE id IN ($1, $2) AND tenant_id = $3',
    [referrer_id, referee_id, tenantId]
  );

  const referrerName = clientsRes.rows.find(c => c.id === referrer_id)?.name || 'sua amiga';
  const refereeName = clientsRes.rows.find(c => c.id === referee_id)?.name || 'nova cliente';

  // 2. Concessão ao Referrer (quem indicou)
  if (referrerBonus > 0) {
    const referrerIdempotency = `referral:referrer:${referralId}`;
    const txReferrer = await clientDb.query(
      `INSERT INTO public.cap_wallet_transactions (tenant_id, client_id, amount, type, description, idempotency_key, created_at)
       VALUES ($1, $2, $3, 'credit', $4, $5, NOW())
       ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
       RETURNING id`,
      [
        tenantId,
        referrer_id,
        referrerBonus,
        `Bônus Indique e Ganhe: sua amiga ${refereeName.split(' ')[0]} agendou no salão!`,
        referrerIdempotency
      ]
    );

    if (txReferrer.rowCount > 0) {
      await clientDb.query(
        `INSERT INTO public.cap_client_wallets (tenant_id, client_id, balance, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (tenant_id, client_id)
         DO UPDATE SET balance = cap_client_wallets.balance + EXCLUDED.balance, updated_at = NOW()`,
        [tenantId, referrer_id, referrerBonus]
      );

      // Nota no CRM
      await clientDb.query(
        `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, content, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [tenantId, referrer_id, `🎁 Indique e Ganhe: Recebeu R$ ${referrerBonus.toFixed(2)} na carteira pela indicação de ${refereeName}.`]
      );
    }
  }

  // 3. Concessão à Referee (amiga indicada)
  if (refereeBonus > 0) {
    const refereeIdempotency = `referral:referee:${referralId}`;
    const txReferee = await clientDb.query(
      `INSERT INTO public.cap_wallet_transactions (tenant_id, client_id, amount, type, description, idempotency_key, created_at)
       VALUES ($1, $2, $3, 'credit', $4, $5, NOW())
       ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
       RETURNING id`,
      [
        tenantId,
        referee_id,
        refereeBonus,
        `Bônus de Boas-Vindas Indique e Ganhe: presente especial de ${referrerName.split(' ')[0]}!`,
        refereeIdempotency
      ]
    );

    if (txReferee.rowCount > 0) {
      await clientDb.query(
        `INSERT INTO public.cap_client_wallets (tenant_id, client_id, balance, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (tenant_id, client_id)
         DO UPDATE SET balance = cap_client_wallets.balance + EXCLUDED.balance, updated_at = NOW()`,
        [tenantId, referee_id, refereeBonus]
      );

      // Nota no CRM
      await clientDb.query(
        `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, content, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [tenantId, referee_id, `🎉 Boas-Vindas Indique e Ganhe: Recebeu R$ ${refereeBonus.toFixed(2)} de bônus na carteira (indicada por ${referrerName}).`]
      );
    }
  }
};

/**
 * Obtém o perfil de indicação da cliente (código, métricas, link de compartilhamento e regras).
 */
export const getClientReferralProfile = async (tenantId, clientId, baseUrl = '') => {
  return await tenantTransaction(tenantId, async (client) => {
    // 1. Busca dados do cliente
    const clientRes = await client.query(
      'SELECT id, name, referral_code FROM public.cap_clients WHERE id = $1 AND tenant_id = $2',
      [clientId, tenantId]
    );

    if (clientRes.rows.length === 0) {
      const error = new Error('Cliente não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    let referralCode = clientRes.rows[0].referral_code;
    if (!referralCode || referralCode.trim() === '') {
      referralCode = await generateUniqueReferralCode(
        client,
        tenantId,
        clientRes.rows[0].name,
        clientId
      );
    }

    // 2. Busca configurações do salão
    const tenantRes = await client.query(
      `SELECT name, slug, referral_program_active, referral_reward_type, 
              referral_referrer_reward, referral_referee_reward, referral_trigger, 
              referral_custom_message
       FROM public.cap_tenants 
       WHERE id = $1`,
      [tenantId]
    );

    const tenantConfig = tenantRes.rows[0] || {};
    const programActive = tenantConfig.referral_program_active !== false;
    const rewardType = tenantConfig.referral_reward_type || 'wallet';
    const referrerReward = parseFloat(tenantConfig.referral_referrer_reward || 15.0);
    const refereeReward = parseFloat(tenantConfig.referral_referee_reward || 15.0);
    const trigger = tenantConfig.referral_trigger || 'on_first_completed_appointment';
    const salonName = tenantConfig.name || 'nosso salão';
    const salonSlug = tenantConfig.slug || '';

    // 3. Contabiliza métricas na tabela cap_referrals
    const statsRes = await client.query(
      `SELECT 
         COUNT(*) as total_friends,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_friends,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_friends,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN referrer_reward_amount ELSE 0 END), 0) as total_bonus_earned
       FROM public.cap_referrals
       WHERE tenant_id = $1 AND referrer_id = $2`,
      [tenantId, clientId]
    );

    const stats = {
      totalFriends: parseInt(statsRes.rows[0].total_friends || 0, 10),
      completedFriends: parseInt(statsRes.rows[0].completed_friends || 0, 10),
      pendingFriends: parseInt(statsRes.rows[0].pending_friends || 0, 10),
      totalBonusEarned: parseFloat(statsRes.rows[0].total_bonus_earned || 0)
    };

    const host = baseUrl ? baseUrl.replace(/\/$/, '') : '';
    const shareUrl = `${host}/${salonSlug}?ref=${referralCode}`;

    let defaultMsg = `Olá! Estou usando o aplicativo do ${salonName} para agendar meus procedimentos. Acesse pelo meu link exclusivo e ganhe R$ ${refereeReward.toFixed(2).replace('.', ',')} de presente de boas-vindas: ${shareUrl}`;
    if (tenantConfig.referral_custom_message && tenantConfig.referral_custom_message.trim() !== '') {
      defaultMsg = tenantConfig.referral_custom_message
        .replace('{salao}', salonName)
        .replace('{bonus}', `R$ ${refereeReward.toFixed(2).replace('.', ',')}`)
        .replace('{link}', shareUrl);
    }

    return {
      referralCode,
      programActive,
      rewardType,
      referrerReward,
      refereeReward,
      trigger,
      stats,
      shareUrl,
      whatsappMessage: defaultMsg
    };
  });
};

/**
 * Validação pública de código de indicação antes do cadastro.
 */
export const validateReferralCode = async (tenantId, code) => {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'Código de indicação não fornecido.' };
  }

  const cleanCode = code.trim().toUpperCase();

  // Verifica se o programa está ativo no salão
  const tenantRes = await tenantQuery(
    tenantId,
    `SELECT referral_program_active, referral_reward_type, referral_referee_reward, referral_trigger 
     FROM public.cap_tenants WHERE id = $1`,
    [tenantId]
  );

  if (tenantRes.rows.length === 0 || tenantRes.rows[0].referral_program_active === false) {
    return { valid: false, message: 'O programa de indicações não está ativo neste salão no momento.' };
  }

  const tenantConfig = tenantRes.rows[0];

  // Busca cliente dono do código
  const clientRes = await tenantQuery(
    tenantId,
    'SELECT id, name FROM public.cap_clients WHERE tenant_id = $1 AND referral_code = $2 LIMIT 1',
    [tenantId, cleanCode]
  );

  if (clientRes.rows.length === 0) {
    return { valid: false, message: 'Código de indicação não encontrado.' };
  }

  const referrer = clientRes.rows[0];
  const firstName = referrer.name ? referrer.name.split(' ')[0] : 'Uma amiga';

  return {
    valid: true,
    referrerId: referrer.id,
    referrerName: firstName,
    rewardAmount: parseFloat(tenantConfig.referral_referee_reward || 15.0),
    rewardType: tenantConfig.referral_reward_type || 'wallet',
    trigger: tenantConfig.referral_trigger || 'on_first_completed_appointment'
  };
};

/**
 * Registra a indicação no momento do cadastro do novo cliente.
 */
export const recordReferralOnSignup = async (clientDb, tenantId, newClientId, refCode) => {
  if (!refCode || typeof refCode !== 'string' || refCode.trim() === '') {
    return null;
  }

  const cleanCode = refCode.trim().toUpperCase();

  // 1. Busca configurações do salão
  const tenantRes = await clientDb.query(
    `SELECT referral_program_active, referral_reward_type, 
            referral_referrer_reward, referral_referee_reward, referral_trigger 
     FROM public.cap_tenants WHERE id = $1`,
    [tenantId]
  );

  if (tenantRes.rows.length === 0 || tenantRes.rows[0].referral_program_active === false) {
    return null;
  }

  const config = tenantRes.rows[0];
  const referrerReward = parseFloat(config.referral_referrer_reward || 15.0);
  const refereeReward = parseFloat(config.referral_referee_reward || 15.0);
  const trigger = config.referral_trigger || 'on_first_completed_appointment';

  // 2. Busca referrer dono do código
  const referrerRes = await clientDb.query(
    'SELECT id, name FROM public.cap_clients WHERE tenant_id = $1 AND referral_code = $2 LIMIT 1',
    [tenantId, cleanCode]
  );

  if (referrerRes.rows.length === 0) {
    return null;
  }

  const referrerId = referrerRes.rows[0].id;

  // 3. Proteções anti-fraude
  if (referrerId === newClientId) {
    // Tentativa de auto-indicação
    return null;
  }

  // Já foi indicada anteriormente no salão?
  const existingReferral = await clientDb.query(
    'SELECT id FROM public.cap_referrals WHERE tenant_id = $1 AND referee_id = $2 LIMIT 1',
    [tenantId, newClientId]
  );

  if (existingReferral.rows.length > 0) {
    return null;
  }

  // 4. Atualiza cap_clients.referred_by
  await clientDb.query(
    'UPDATE public.cap_clients SET referred_by = $1 WHERE id = $2 AND tenant_id = $3',
    [referrerId, newClientId, tenantId]
  );

  // 5. Insere em cap_referrals
  const isImmediate = trigger === 'on_signup';
  const initialStatus = isImmediate ? 'completed' : 'pending';

  const insertRes = await clientDb.query(
    `INSERT INTO public.cap_referrals (
       tenant_id, referrer_id, referee_id, referral_code, status,
       trigger_type, referrer_reward_amount, referee_reward_amount,
       created_at, completed_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
     RETURNING *`,
    [
      tenantId,
      referrerId,
      newClientId,
      cleanCode,
      initialStatus,
      trigger,
      referrerReward,
      refereeReward,
      isImmediate ? new Date() : null
    ]
  );

  const referralRecord = insertRes.rows[0];

  // Se o gatilho for no cadastro imediato, já credita os bônus
  if (isImmediate) {
    await processReferralBonuses(clientDb, tenantId, referralRecord);
  }

  return referralRecord;
};

/**
 * Conclui a indicação pendente quando a nova cliente realiza o primeiro agendamento.
 */
export const completeReferralOnAppointmentCompleted = async (clientDb, tenantId, appointmentId, clientId) => {
  // Procura se o cliente tem indicação com status 'pending'
  const pendingRes = await clientDb.query(
    `SELECT * FROM public.cap_referrals 
     WHERE tenant_id = $1 AND referee_id = $2 AND status = 'pending' 
     LIMIT 1 FOR UPDATE`,
    [tenantId, clientId]
  );

  if (pendingRes.rows.length === 0) {
    return null;
  }

  const referral = pendingRes.rows[0];

  // Atualiza para 'completed'
  const updateRes = await clientDb.query(
    `UPDATE public.cap_referrals 
     SET status = 'completed',
         appointment_id = $1,
         completed_at = NOW()
     WHERE id = $2 AND tenant_id = $3
     RETURNING *`,
    [appointmentId, referral.id, tenantId]
  );

  const completedReferral = updateRes.rows[0];

  // Dispara a concessão dos bônus na carteira digital
  await processReferralBonuses(clientDb, tenantId, completedReferral);

  return completedReferral;
};

/**
 * Dashboard Administrativo de Gestão do Programa de Indicação.
 */
export const getAdminReferralDashboard = async (tenantId, { page = 1, limit = 20, search = '' } = {}) => {
  return await tenantTransaction(tenantId, async (client) => {
    // 1. Configuração do salão
    const tenantRes = await client.query(
      `SELECT referral_program_active, referral_reward_type, 
              referral_referrer_reward, referral_referee_reward, referral_trigger, 
              referral_custom_message
       FROM public.cap_tenants WHERE id = $1`,
      [tenantId]
    );
    const settings = tenantRes.rows[0] || {};

    // 2. KPIs Consolidados
    const kpiRes = await client.query(
      `SELECT 
         COUNT(*) as total_referrals,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as converted_referrals,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_referrals,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN referrer_reward_amount + referee_reward_amount ELSE 0 END), 0) as total_rewards_distributed
       FROM public.cap_referrals
       WHERE tenant_id = $1`,
      [tenantId]
    );

    const totalReferrals = parseInt(kpiRes.rows[0].total_referrals || 0, 10);
    const convertedReferrals = parseInt(kpiRes.rows[0].converted_referrals || 0, 10);
    const pendingReferrals = parseInt(kpiRes.rows[0].pending_referrals || 0, 10);
    const totalRewardsDistributed = parseFloat(kpiRes.rows[0].total_rewards_distributed || 0);
    const conversionRate = totalReferrals > 0 ? ((convertedReferrals / totalReferrals) * 100).toFixed(1) : '0.0';

    // 3. Top Embaixadoras (Clientes que mais indicaram)
    const topRes = await client.query(
      `SELECT 
         c.id, c.name, c.phone, c.referral_code,
         COUNT(r.id) as total_referred,
         COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as total_converted,
         COALESCE(SUM(CASE WHEN r.status = 'completed' THEN r.referrer_reward_amount ELSE 0 END), 0) as total_earned
       FROM public.cap_clients c
       JOIN public.cap_referrals r ON r.referrer_id = c.id AND r.tenant_id = c.tenant_id
       WHERE c.tenant_id = $1
       GROUP BY c.id, c.name, c.phone, c.referral_code
       ORDER BY total_converted DESC, total_referred DESC
       LIMIT 5`,
      [tenantId]
    );

    // 4. Lista Paginada de Indicações Recentes com Busca
    const p = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (p - 1) * lim;

    let searchClause = '';
    const queryParams = [tenantId];

    if (search && search.trim() !== '') {
      queryParams.push(`%${search.trim()}%`);
      searchClause = `AND (
        referrer.name ILIKE $2 OR 
        referrer.phone ILIKE $2 OR 
        referee.name ILIKE $2 OR 
        referee.phone ILIKE $2 OR 
        r.referral_code ILIKE $2
      )`;
    }

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM public.cap_referrals r
      JOIN public.cap_clients referrer ON r.referrer_id = referrer.id
      JOIN public.cap_clients referee ON r.referee_id = referee.id
      WHERE r.tenant_id = $1 ${searchClause}
    `;

    const countRes = await client.query(countQuery, queryParams);
    const totalItems = parseInt(countRes.rows[0].total || 0, 10);

    const listParams = [...queryParams, lim, offset];
    const listQuery = `
      SELECT 
        r.id, r.referral_code, r.status, r.trigger_type,
        r.referrer_reward_amount, r.referee_reward_amount,
        r.created_at, r.completed_at,
        referrer.id as referrer_id, referrer.name as referrer_name, referrer.phone as referrer_phone,
        referee.id as referee_id, referee.name as referee_name, referee.phone as referee_phone,
        a.start_time as appointment_date
      FROM public.cap_referrals r
      JOIN public.cap_clients referrer ON r.referrer_id = referrer.id
      JOIN public.cap_clients referee ON r.referee_id = referee.id
      LEFT JOIN public.cap_appointments a ON r.appointment_id = a.id
      WHERE r.tenant_id = $1 ${searchClause}
      ORDER BY r.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const listRes = await client.query(listQuery, listParams);

    return {
      settings: {
        active: settings.referral_program_active !== false,
        rewardType: settings.referral_reward_type || 'wallet',
        referrerReward: parseFloat(settings.referral_referrer_reward || 15.0),
        refereeReward: parseFloat(settings.referral_referee_reward || 15.0),
        trigger: settings.referral_trigger || 'on_first_completed_appointment',
        customMessage: settings.referral_custom_message || ''
      },
      kpis: {
        totalReferrals,
        convertedReferrals,
        pendingReferrals,
        conversionRate: parseFloat(conversionRate),
        totalRewardsDistributed
      },
      topReferrers: topRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        referralCode: r.referral_code,
        totalReferred: parseInt(r.total_referred, 10),
        totalConverted: parseInt(r.total_converted, 10),
        totalEarned: parseFloat(r.total_earned)
      })),
      referrals: listRes.rows.map(r => ({
        id: r.id,
        referralCode: r.referral_code,
        status: r.status,
        triggerType: r.trigger_type,
        referrerReward: parseFloat(r.referrer_reward_amount),
        refereeReward: parseFloat(r.referee_reward_amount),
        createdAt: r.created_at,
        completedAt: r.completed_at,
        referrer: { id: r.referrer_id, name: r.referrer_name, phone: r.referrer_phone },
        referee: { id: r.referee_id, name: r.referee_name, phone: r.referee_phone },
        appointmentDate: r.appointment_date
      })),
      pagination: {
        total: totalItems,
        page: p,
        limit: lim,
        pages: Math.ceil(totalItems / lim) || 1
      }
    };
  });
};

/**
 * Atualiza configurações do programa de indicação pelo gestor.
 */
export const updateReferralSettings = async (tenantId, settingsData) => {
  const {
    active,
    rewardType,
    referrerReward,
    refereeReward,
    trigger,
    customMessage
  } = settingsData;

  const validRewardType = rewardType === 'coupon' ? 'coupon' : 'wallet';
  const validTrigger = trigger === 'on_signup' ? 'on_signup' : 'on_first_completed_appointment';
  const validReferrerReward = Math.max(0, parseFloat(referrerReward) || 0);
  const validRefereeReward = Math.max(0, parseFloat(refereeReward) || 0);

  const res = await tenantQuery(
    tenantId,
    `UPDATE public.cap_tenants 
     SET referral_program_active = $1,
         referral_reward_type = $2,
         referral_referrer_reward = $3,
         referral_referee_reward = $4,
         referral_trigger = $5,
         referral_custom_message = $6
     WHERE id = $7
     RETURNING referral_program_active, referral_reward_type, referral_referrer_reward, referral_referee_reward, referral_trigger, referral_custom_message`,
    [
      active !== false,
      validRewardType,
      validReferrerReward,
      validRefereeReward,
      validTrigger,
      customMessage || null,
      tenantId
    ]
  );

  return res.rows[0];
};

// Aliases para compatibilidade retroativa
export const getReferralStats = async (tenantId, clientId) => {
  const profile = await getClientReferralProfile(tenantId, clientId);
  return {
    referralCode: profile.referralCode,
    totalFriends: profile.stats.totalFriends,
    totalBonus: profile.stats.totalBonusEarned
  };
};
