import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("FATAL ERROR: JWT_SECRET is not defined.");

export const generateAuthData = async (userPayload, ipAddress, userAgent, existingFamilyId = null) => {
  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '15m' });
  
  const isClient = userPayload.role === 'client';
  const days = isClient ? 30 : 7;
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  const familyId = existingFamilyId || crypto.randomUUID();

  await pool.query(
    'INSERT INTO public.cap_refresh_tokens (user_id, token, expires_at, ip_address, user_agent, family_id) VALUES ($1, $2, $3, $4, $5, $6)',
    [userPayload.id, refreshToken, expiresAt, ipAddress || 'unknown', userAgent || 'unknown', familyId]
  );

  return {
    token,
    refreshToken,
    maxAge: days * 24 * 60 * 60 * 1000,
    familyId
  };
};



export const loginStaff = async (tenant_slug, email, password) => {
  const result = await pool.query('SELECT cap_login_staff($1, $2, $3) AS user_data', [tenant_slug, email, password]);
  const userData = result.rows[0].user_data;
  if (!userData) {
    const error = new Error('E-mail ou senha incorretos para este estabelecimento.');
    error.statusCode = 401;
    throw error;
  }
  return userData;
};

export const loginClient = async (tenant_slug, phone, password) => {
  const result = await pool.query('SELECT cap_login_client($1, $2, $3) AS user_data', [tenant_slug, phone, password]);
  const userData = result.rows[0].user_data;
  if (!userData) {
    const error = new Error('Telefone ou senha incorretos para este estabelecimento.');
    error.statusCode = 401;
    throw error;
  }
  return userData;
};

export const loginSuperadmin = async (email, password) => {
  const result = await pool.query('SELECT id, name, email FROM public.cap_platform_admins WHERE email = $1 AND password_hash = crypt($2, password_hash)', [email, password]);
  if (result.rows.length === 0) {
    const error = new Error('E-mail ou senha incorretos.');
    error.statusCode = 401;
    throw error;
  }
  return result.rows[0];
};

export const checkClientExists = async (tenant_id, phone) => {
  const result = await pool.query('SELECT id FROM public.cap_clients WHERE tenant_id = $1 AND phone = $2', [tenant_id, phone]);
  return { exists: result.rows.length > 0 };
};

export const registerClient = async (tenant_id, name, phone, password, birth_date, refCode) => {
  const existCheck = await pool.query('SELECT id FROM public.cap_clients WHERE tenant_id = $1 AND phone = $2', [tenant_id, phone]);
  if (existCheck.rows.length > 0) {
    const error = new Error('Já existe um cadastro com este telefone.');
    error.statusCode = 409;
    throw error;
  }

  const result = await pool.query('SELECT cap_register_client($1, $2, $3, $4) AS client_id', [tenant_id, name, phone, password]);
  const clientId = result.rows[0].client_id;

  if (birth_date) {
    await pool.query('UPDATE public.cap_clients SET birth_date = $1 WHERE id = $2 AND tenant_id = $3', [birth_date, clientId, tenant_id]);
  }
  
  // Lógica do Referral
  if (refCode) {
    try {
      // Procura o cliente dono desse código
      const refCheck = await pool.query('SELECT id FROM public.cap_clients WHERE tenant_id = $1 AND referral_code = $2', [tenant_id, refCode.toUpperCase()]);
      if (refCheck.rows.length > 0) {
        const referrerId = refCheck.rows[0].id;
        
        // 1. Atualiza referred_by
        await pool.query('UPDATE public.cap_clients SET referred_by = $1 WHERE id = $2', [referrerId, clientId]);
        
        // 2. Bônus de R$ 20 para quem indicou e para quem foi indicado
        const bonusAmount = 20.00;
        
        // Para quem indicou
        await pool.query(`
          INSERT INTO public.cap_wallet_transactions (tenant_id, client_id, type, amount, description) 
          VALUES ($1, $2, 'credit', $3, 'Bônus por indicação de novo amigo!')
        `, [tenant_id, referrerId, bonusAmount]);
        
        // Para o novo usuário
        await pool.query(`
          INSERT INTO public.cap_wallet_transactions (tenant_id, client_id, type, amount, description) 
          VALUES ($1, $2, 'credit', $3, 'Bônus de boas vindas (Indicação)!')
        `, [tenant_id, clientId, bonusAmount]);
        
        console.log(`Referral aplicado com sucesso: ${referrerId} indicou ${clientId}`);
      }
    } catch (e) {
      console.error('Erro não crítico ao aplicar referral:', e);
    }
  }

  // Gera um referral_code único para esse novo cliente
  try {
    const rawRef = (name.replace(/\s+/g, '').substring(0, 4) + clientId.replace(/-/g, '').substring(0, 4)).toUpperCase();
    await pool.query('UPDATE public.cap_clients SET referral_code = $1 WHERE id = $2', [rawRef, clientId]);
  } catch(e) {
    console.error('Erro não crítico ao gerar referral_code:', e);
  }
  
  return clientId;
};

export const refreshTokenService = async (oldRefreshToken, ipAddress, userAgent) => {
  const result = await pool.query('SELECT id, user_id, token, expires_at, created_at, is_revoked, family_id, ip_address, user_agent FROM public.cap_refresh_tokens WHERE token = $1', [oldRefreshToken]);
  if (result.rows.length === 0) {
    const error = new Error('Refresh token inválido.');
    error.statusCode = 401;
    throw error;
  }

  const tokenData = result.rows[0];

  if (tokenData.is_revoked) {
    await pool.query('DELETE FROM public.cap_refresh_tokens WHERE family_id = $1', [tokenData.family_id]);
    const error = new Error('Reuso de token detectado. Sessão finalizada por segurança.');
    error.statusCode = 401;
    throw error;
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    const error = new Error('Refresh token expirado.');
    error.statusCode = 401;
    throw error;
  }

  const reqIp = ipAddress || 'unknown';
  const reqUa = userAgent || 'unknown';
  if (tokenData.ip_address !== reqIp || tokenData.user_agent !== reqUa) {
    await pool.query('DELETE FROM public.cap_refresh_tokens WHERE family_id = $1', [tokenData.family_id]);
    const error = new Error('Dispositivo não reconhecido. Faça login novamente.');
    error.statusCode = 401;
    throw error;
  }

  const userId = tokenData.user_id;
  let payload = null;

  let userRecord = await pool.query('SELECT id, name, tenant_id, role, email FROM public.cap_staff WHERE id = $1 AND is_active = true', [userId]);
  
  if (userRecord.rows.length > 0) {
    payload = { ...userRecord.rows[0] };
  } else {
    userRecord = await pool.query('SELECT id, name, tenant_id, phone FROM public.cap_clients WHERE id = $1', [userId]);
    if (userRecord.rows.length > 0) {
      payload = { ...userRecord.rows[0], role: 'client' };
    } else {
      userRecord = await pool.query('SELECT id, name, email FROM public.cap_platform_admins WHERE id = $1', [userId]);
      if (userRecord.rows.length > 0) {
        payload = { ...userRecord.rows[0], role: 'superadmin' };
      }
    }
  }

  if (!payload) {
    const error = new Error('Usuário não encontrado ou inativo.');
    error.statusCode = 401;
    throw error;
  }

  payload.familyId = tokenData.family_id;

  await pool.query('UPDATE public.cap_refresh_tokens SET is_revoked = true WHERE id = $1', [tokenData.id]);

  return payload;
};

export const logoutService = async (oldRefreshToken) => {
  if (oldRefreshToken) {
    const result = await pool.query('SELECT family_id FROM public.cap_refresh_tokens WHERE token = $1', [oldRefreshToken]);
    if (result.rows.length > 0) {
      await pool.query('DELETE FROM public.cap_refresh_tokens WHERE family_id = $1', [result.rows[0].family_id]);
    }
  }
};

export const getMe = async (id, role, tenant_id) => {
  let queryText = '';
  if (role === 'client') {
    queryText = 'SELECT id, name, phone, birth_date, tenant_id, vip_tier FROM public.cap_clients WHERE id = $1 AND tenant_id = $2';
  } else if (role === 'superadmin') {
    queryText = 'SELECT id, name, email FROM public.cap_platform_admins WHERE id = $1';
  } else {
    queryText = 'SELECT id, name, phone, email, role, tenant_id, is_active FROM public.cap_staff WHERE id = $1 AND tenant_id = $2';
  }

  const queryParams = role === 'superadmin' ? [id] : [id, tenant_id || null];
  const result = await pool.query(queryText, queryParams);
  
  if (result.rows.length === 0) {
    const error = new Error('Usuário não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const user = result.rows[0];
  if (role !== 'client' && role !== 'superadmin' && !user.is_active) {
    const error = new Error('Sua conta de funcionário está inativa.');
    error.statusCode = 403;
    throw error;
  }

  return { ...user, role: role };
};
