import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { generateTotpSecret, verifyTotp, generateOtpAuthUri } from '../utils/totp.js';
import { notifySuperAdminLoginAlert } from './securityAlertService.js';
import redisClient from '../config/redis.js';
import whatsappService from './whatsappService.js';
import { getActiveFlagsForTenant } from './featureFlagService.js';
import { recordReferralOnSignup, generateUniqueReferralCode } from './referralService.js';
import { sendClientPasswordResetOtpEmail } from './emailService.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("FATAL ERROR: JWT_SECRET is not defined.");

export const generateAuthData = async (userPayload, ipAddress, userAgent, existingFamilyId = null, deviceId = null) => {
  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '15m' });
  
  const isClient = userPayload.role === 'client';
  const days = isClient ? 30 : 7;
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  const familyId = existingFamilyId || crypto.randomUUID();

  await pool.query(
    'INSERT INTO public.cap_refresh_tokens (user_id, token, expires_at, ip_address, user_agent, family_id, device_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [userPayload.id, refreshToken, expiresAt, ipAddress || 'unknown', userAgent || 'unknown', familyId, deviceId || null]
  );

  return {
    token,
    refreshToken,
    maxAge: days * 24 * 60 * 60 * 1000,
    familyId,
    deviceId: deviceId || null
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
  const result = await pool.query(
    'SELECT id, name, email, totp_secret, totp_enabled, last_login_ip, last_login_user_agent FROM public.cap_platform_admins WHERE email = $1 AND password_hash = crypt($2, password_hash)', 
    [email, password]
  );
  if (result.rows.length === 0) {
    const error = new Error('E-mail ou senha incorretos.');
    error.statusCode = 401;
    throw error;
  }
  const admin = result.rows[0];
  if (admin.totp_enabled && admin.totp_secret) {
    return {
      require_2fa: true,
      admin_id: admin.id,
      email: admin.email,
      name: admin.name
    };
  }
  return {
    require_2fa: false,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: 'superadmin'
    }
  };
};

export const verifySuperadmin2Fa = async (adminId, code, ip, userAgent) => {
  const result = await pool.query(
    'SELECT id, name, email, totp_secret, totp_enabled, last_login_ip, last_login_user_agent FROM public.cap_platform_admins WHERE id = $1',
    [adminId]
  );
  if (result.rows.length === 0) {
    const error = new Error('Administrador não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  const admin = result.rows[0];
  if (!admin.totp_enabled || !admin.totp_secret) {
    const error = new Error('2FA não está ativado para esta conta.');
    error.statusCode = 400;
    throw error;
  }

  const isValid = verifyTotp(code, admin.totp_secret);
  if (!isValid) {
    const error = new Error('Código de autenticação de dois fatores inválido ou expirado.');
    error.statusCode = 401;
    throw error;
  }

  const isNewDeviceOrIp = Boolean(
    (admin.last_login_ip && admin.last_login_ip !== ip) ||
    (admin.last_login_user_agent && admin.last_login_user_agent !== userAgent)
  );

  await pool.query(
    'UPDATE public.cap_platform_admins SET last_login_at = NOW(), last_login_ip = $1, last_login_user_agent = $2 WHERE id = $3',
    [ip || null, userAgent || null, admin.id]
  );

  notifySuperAdminLoginAlert({
    adminEmail: admin.email,
    adminName: admin.name,
    ip,
    userAgent,
    isNewDeviceOrIp
  }).catch(() => {});

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: 'superadmin'
  };
};

export const setupSuperadmin2Fa = async (adminId) => {
  const result = await pool.query('SELECT id, email, name, totp_enabled FROM public.cap_platform_admins WHERE id = $1', [adminId]);
  if (result.rows.length === 0) {
    const error = new Error('Administrador não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  const admin = result.rows[0];
  const secret = generateTotpSecret();
  await pool.query('UPDATE public.cap_platform_admins SET totp_temp_secret = $1 WHERE id = $2', [secret, adminId]);
  
  const otpAuthUri = generateOtpAuthUri(admin.email, 'OperaBeauty', secret);
  return {
    secret,
    otpauth_url: otpAuthUri,
    totp_enabled: Boolean(admin.totp_enabled)
  };
};

export const enableSuperadmin2Fa = async (adminId, code) => {
  const result = await pool.query('SELECT id, totp_temp_secret FROM public.cap_platform_admins WHERE id = $1', [adminId]);
  if (result.rows.length === 0) {
    const error = new Error('Administrador não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  const admin = result.rows[0];
  if (!admin.totp_temp_secret) {
    const error = new Error('Nenhum setup de 2FA em andamento. Inicie o setup primeiro.');
    error.statusCode = 400;
    throw error;
  }

  const isValid = verifyTotp(code, admin.totp_temp_secret);
  if (!isValid) {
    const error = new Error('Código de confirmação inválido ou expirado.');
    error.statusCode = 400;
    throw error;
  }

  await pool.query(
    'UPDATE public.cap_platform_admins SET totp_secret = totp_temp_secret, totp_enabled = true, totp_temp_secret = NULL WHERE id = $1',
    [adminId]
  );

  return { success: true, message: 'Autenticação em duas etapas ativada com sucesso.' };
};

export const disableSuperadmin2Fa = async (adminId, code) => {
  const result = await pool.query('SELECT id, totp_secret, totp_enabled FROM public.cap_platform_admins WHERE id = $1', [adminId]);
  if (result.rows.length === 0) {
    const error = new Error('Administrador não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  const admin = result.rows[0];
  if (!admin.totp_enabled || !admin.totp_secret) {
    const error = new Error('2FA já está desativado.');
    error.statusCode = 400;
    throw error;
  }

  const isValid = verifyTotp(code, admin.totp_secret);
  if (!isValid) {
    const error = new Error('Código de verificação incorreto.');
    error.statusCode = 400;
    throw error;
  }

  await pool.query(
    'UPDATE public.cap_platform_admins SET totp_secret = NULL, totp_enabled = false, totp_temp_secret = NULL WHERE id = $1',
    [adminId]
  );

  return { success: true, message: 'Autenticação em duas etapas desativada com sucesso.' };
};

export const resolveTenantId = async (tenantId, tenantSlug) => {
  if (tenantId) return tenantId;
  if (!tenantSlug) return null;
  const result = await pool.query('SELECT id FROM public.cap_tenants WHERE slug = $1', [tenantSlug]);
  return result.rows[0]?.id || null;
};

export const checkClientExists = async (tenant_id, phone) => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    const error = new Error('Telefone inválido.');
    error.statusCode = 400;
    throw error;
  }
  const result = await pool.query(
    `SELECT id FROM public.cap_clients 
     WHERE tenant_id = $1 
       AND (phone = $2 OR regexp_replace(phone, '\\D', '', 'g') = $3)
     LIMIT 1`,
    [tenant_id, phone, cleanPhone]
  );
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
  
  // Lógica do Referral & Programa Indique e Ganhe (Item D19 P2)
  if (refCode) {
    try {
      await recordReferralOnSignup(pool, tenant_id, clientId, refCode);
    } catch (e) {
      console.error('Erro não crítico ao aplicar referral:', e);
    }
  }

  // Gera um referral_code único para esse novo cliente se ainda não tiver
  try {
    await generateUniqueReferralCode(pool, tenant_id, name, clientId);
  } catch (e) {
    console.error('Erro não crítico ao gerar referral_code:', e);
  }
  
  return clientId;
};

export const refreshTokenService = async (oldRefreshToken, ipAddress, userAgent, deviceId = null) => {
  const result = await pool.query(
    'SELECT id, user_id, token, expires_at, created_at, is_revoked, family_id, ip_address, user_agent, device_id FROM public.cap_refresh_tokens WHERE token = $1',
    [oldRefreshToken]
  );
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
  const reqDeviceId = deviceId || null;

  // C3 (P0): Validação de dispositivo vs mudança de rede móvel (Wi-Fi <-> 4G/5G)
  // 1. Se ambos possuem device_id registrado e forem diferentes -> Alerta crítico de roubo de token/sessão em outro aparelho
  if (tokenData.device_id && reqDeviceId && tokenData.device_id !== reqDeviceId) {
    console.warn(`[Security Alert] Tentativa de reuso de sessão em outro dispositivo. Salvo: ${tokenData.device_id}, Recebido: ${reqDeviceId}, Família: ${tokenData.family_id}`);
    await pool.query('DELETE FROM public.cap_refresh_tokens WHERE family_id = $1', [tokenData.family_id]);
    const error = new Error('Dispositivo não reconhecido. Faça login novamente.');
    error.statusCode = 401;
    throw error;
  }

  // 2. Se o dispositivo não registrou device_id (tokens antigos) e o User-Agent for drasticamente diferente
  if (!tokenData.device_id && tokenData.user_agent !== reqUa) {
    await pool.query('DELETE FROM public.cap_refresh_tokens WHERE family_id = $1', [tokenData.family_id]);
    const error = new Error('Dispositivo não reconhecido. Faça login novamente.');
    error.statusCode = 401;
    throw error;
  }

  // 3. Auditoria de transição de rede / IP (Permite alternância fluida entre Wi-Fi e 4G/5G sem deslogar o usuário!)
  if (tokenData.ip_address !== reqIp) {
    console.info(`[Audit Session C3] Transição de rede detectada para usuário ${tokenData.user_id}: IP anterior=${tokenData.ip_address}, Novo IP=${reqIp}`);
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
  payload.deviceId = reqDeviceId || tokenData.device_id || null;

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
    queryText = 'SELECT id, name, phone, email, birth_date, tenant_id, vip_tier FROM public.cap_clients WHERE id = $1 AND tenant_id = $2';
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

/**
 * Solicita código OTP para cliente ou retorna canal manual caso o salão não tenha WhatsApp ativo
 * Governança: D7 (P1) & Ecossistema do Salão
 */
export const requestClientOtp = async (tenantSlugOrId, phone, purpose = 'reset_password') => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    const error = new Error('Telefone inválido.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Resolve Tenant com dados de contato e plano
  const tenantResult = await pool.query(
    `SELECT t.id, t.slug, t.name, t.social_whatsapp, t.status, p.features as plan_features
     FROM public.cap_tenants t
     LEFT JOIN public.cap_plans p ON t.plan_id = p.id
     WHERE t.slug = $1 OR t.id::text = $1`,
    [tenantSlugOrId]
  );

  if (tenantResult.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const tenant = tenantResult.rows[0];
  if (tenant.status !== 'active') {
    const error = new Error('Este estabelecimento está temporariamente suspenso.');
    error.statusCode = 403;
    throw error;
  }

  // 2. Localiza o cliente neste salão
  const clientResult = await pool.query(
    `SELECT id, name, phone, email, birth_date 
     FROM public.cap_clients 
     WHERE tenant_id = $1 
       AND (
         phone = $2 
         OR phone = $3 
         OR REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = $3
         OR phone LIKE '%' || $3
       ) 
     LIMIT 1`,
    [tenant.id, phone, cleanPhone]
  );

  if (clientResult.rows.length === 0) {
    const error = new Error('Telefone não encontrado no cadastro deste salão.');
    error.statusCode = 404;
    throw error;
  }

  const client = clientResult.rows[0];

  // 3. Verifica elegibilidade de WhatsApp do salão (Plano com whatsapp_gateway + Instância CONNECTED)
  const planFeatures = tenant.plan_features || [];
  const dbFlags = await getActiveFlagsForTenant(tenant.id);
  const hasWaFeature = planFeatures.some(f => 
    typeof f === 'string' && (f.toLowerCase().includes('whatsapp_gateway') || f.toLowerCase().includes('wa_gateway'))
  ) || Boolean(dbFlags['whatsapp_gateway']);

  const instResult = await pool.query(
    `SELECT status, phone_number FROM public.cap_whatsapp_instances WHERE tenant_id = $1`,
    [tenant.id]
  );
  const isConnected = instResult.rows.length > 0 && instResult.rows[0].status === 'CONNECTED';

  const salonContactPhone = tenant.social_whatsapp || '';

  // CASO BÁSICO: Salão NÃO possui WhatsApp ativo ou não conectou -> Resete manual com a recepção ou E-mail
  if (!hasWaFeature || !isConnected) {
    return {
      method: 'manual',
      automated: false,
      can_use_email: true,
      has_email_saved: Boolean(client.email),
      salon_name: tenant.name,
      salon_phone: salonContactPhone,
      message: 'Este salão realiza a redefinição de acesso diretamente com a recepção ou via e-mail seguro.',
    };
  }

  // CASO PREMIUM: Salão com plano e WhatsApp conectado (automação)
  // Rate limiter por telefone no Redis (3 solicitações por 10 min)
  const rateKey = `ratelimit:otp_req:${tenant.id}:${cleanPhone}`;
  const currentCount = await redisClient.incr(rateKey);
  if (currentCount === 1) {
    await redisClient.expire(rateKey, 600); // 10 min
  } else if (currentCount > 3) {
    const err = new Error('Muitas solicitações de código. Aguarde alguns minutos antes de tentar novamente.');
    err.statusCode = 429;
    throw err;
  }

  // Gera código OTP numérico de 6 dígitos
  const code = crypto.randomInt(100000, 1000000).toString();

  // Salva no Redis com TTL de 5 minutos (300 segundos)
  const otpKey = `otp:client:${tenant.id}:${cleanPhone}`;
  const otpData = {
    code,
    client_id: client.id,
    phone: client.phone,
    purpose,
    attempts: 0,
  };
  await redisClient.setex(otpKey, 300, JSON.stringify(otpData));

  // Dispara pelo gateway de WhatsApp da instância do próprio salão
  try {
    await whatsappService.sendOtp({
      tenantId: tenant.id,
      recipientPhone: cleanPhone,
      clientName: client.name,
      code,
      salonName: tenant.name,
      purpose,
    });
  } catch (waErr) {
    console.error('[authService] Falha no disparo do WhatsApp pelo salão:', waErr.message);
    return {
      method: 'manual',
      automated: false,
      can_use_email: true,
      has_email_saved: Boolean(client.email),
      salon_name: tenant.name,
      salon_phone: salonContactPhone,
      message: 'Não foi possível enviar a mensagem pelo WhatsApp do salão no momento. Utilize a recuperação por e-mail ou fale com a recepção.',
    };
  }

  return {
    method: 'whatsapp',
    automated: true,
    can_use_email: true,
    has_email_saved: Boolean(client.email),
    salon_name: tenant.name,
    expires_in: 300,
    message: 'Código de 6 dígitos enviado para seu WhatsApp pelo salão.',
  };
};

/**
 * Valida o código OTP do cliente e emite token de redefinição ou sessão completa de login
 */
export const verifyClientOtp = async (tenantSlugOrId, phone, code, ip, userAgent, deviceId) => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (!code || code.length !== 6) {
    const error = new Error('O código deve conter 6 dígitos.');
    error.statusCode = 400;
    throw error;
  }

  const tenantResult = await pool.query(
    'SELECT id, slug, name FROM public.cap_tenants WHERE slug = $1 OR id::text = $1',
    [tenantSlugOrId]
  );
  if (tenantResult.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  const tenant = tenantResult.rows[0];

  const otpKey = `otp:client:${tenant.id}:${cleanPhone}`;
  const rawOtp = await redisClient.get(otpKey);

  if (!rawOtp) {
    const error = new Error('Código expirado ou inválido. Solicite um novo código.');
    error.statusCode = 400;
    throw error;
  }

  let otpData;
  try {
    otpData = JSON.parse(rawOtp);
  } catch (e) {
    await redisClient.del(otpKey);
    const error = new Error('Dados do código corrompidos. Solicite um novo código.');
    error.statusCode = 400;
    throw error;
  }

  if (otpData.attempts >= 5) {
    await redisClient.del(otpKey);
    const error = new Error('Número máximo de tentativas excedido. Solicite um novo código.');
    error.statusCode = 429;
    throw error;
  }

  const isMatch = code.length === 6 && crypto.timingSafeEqual(Buffer.from(code), Buffer.from(otpData.code));
  if (!isMatch) {
    otpData.attempts = (otpData.attempts || 0) + 1;
    const ttl = await redisClient.ttl(otpKey);
    if (ttl > 0) {
      await redisClient.setex(otpKey, ttl, JSON.stringify(otpData));
    }
    const remaining = Math.max(0, 5 - otpData.attempts);
    const error = new Error(`Código incorreto. Você tem mais ${remaining} tentativa(s).`);
    error.statusCode = 400;
    throw error;
  }

  // Código validado com sucesso! Exclui do Redis para evitar reutilização
  await redisClient.del(otpKey);

  const clientRes = await pool.query(
    'SELECT id, name, phone, tenant_id FROM public.cap_clients WHERE id = $1 AND tenant_id = $2',
    [otpData.client_id, tenant.id]
  );
  if (clientRes.rows.length === 0) {
    const error = new Error('Cliente não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  const client = clientRes.rows[0];

  if (otpData.purpose === 'reset_password') {
    const resetToken = jwt.sign(
      {
        client_id: client.id,
        tenant_id: tenant.id,
        phone: client.phone,
        purpose: 'client_password_reset',
      },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    return {
      verified: true,
      purpose: 'reset_password',
      reset_token: resetToken,
      client: { id: client.id, name: client.name },
    };
  }

  // Caso login direto por código
  const payload = {
    id: client.id,
    name: client.name,
    tenant_id: tenant.id,
    role: 'client',
    phone: client.phone,
  };
  const authData = await generateAuthData(payload, ip, userAgent, null, deviceId);

  return {
    verified: true,
    purpose: 'login',
    authData,
    user: payload,
  };
};

/**
 * Conclui a redefinição de senha da cliente mediante apresentação de reset_token válido
 */
export const resetClientPasswordWithToken = async (resetToken, newPassword) => {
  let decoded;
  try {
    decoded = jwt.verify(resetToken, JWT_SECRET);
    if (decoded.purpose !== 'client_password_reset' || !decoded.client_id || !decoded.tenant_id) {
      throw new Error('Token inválido');
    }
  } catch (err) {
    const error = new Error('Link ou token de redefinição expirado. Solicite um novo código.');
    error.statusCode = 401;
    throw error;
  }

  if (!newPassword || newPassword.length < 6 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    const error = new Error('A nova senha deve ter no mínimo 6 caracteres, contendo pelo menos 1 letra e 1 número.');
    error.statusCode = 400;
    throw error;
  }

  // Atualiza a senha no banco de dados via RPC seguro
  await pool.query('SELECT cap_update_client_password($1, $2, $3)', [
    decoded.client_id,
    decoded.tenant_id,
    newPassword,
  ]);

  // Revoga todos os refresh tokens anteriores deste cliente
  await pool.query(
    "UPDATE public.cap_refresh_tokens SET is_revoked = true WHERE user_id = $1",
    [decoded.client_id]
  );

  return { success: true, message: 'Senha redefinida com sucesso! Você já pode entrar com a nova senha.' };
};

/**
 * Solicitação de código de 6 dígitos via E-mail (Resend)
 * - Para clientes com e-mail cadastrado: envia diretamente.
 * - Para clientes legados (sem e-mail): exige e valida data de nascimento antes de enviar.
 */
export const requestClientEmailOtp = async (tenantSlugOrId, phone, email = null, birthDate = null) => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    const error = new Error('Telefone inválido.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Resolve Tenant
  const tenantResult = await pool.query(
    `SELECT id, slug, name, status FROM public.cap_tenants WHERE slug = $1 OR id::text = $1`,
    [tenantSlugOrId]
  );
  if (tenantResult.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  const tenant = tenantResult.rows[0];
  if (tenant.status !== 'active') {
    const error = new Error('Este estabelecimento está temporariamente suspenso.');
    error.statusCode = 403;
    throw error;
  }

  // 2. Localiza o cliente
  const clientResult = await pool.query(
    `SELECT id, name, phone, email, birth_date 
     FROM public.cap_clients 
     WHERE tenant_id = $1 
       AND (
         phone = $2 
         OR phone = $3 
         OR REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = $3
         OR phone LIKE '%' || $3
       ) 
     LIMIT 1`,
    [tenant.id, phone, cleanPhone]
  );

  if (clientResult.rows.length === 0) {
    const error = new Error('Telefone não encontrado no cadastro deste salão.');
    error.statusCode = 404;
    throw error;
  }

  const client = clientResult.rows[0];
  let destinationEmail = (client.email || '').trim().toLowerCase();
  let isNewEmail = false;

  // Se o cliente NÃO possui e-mail cadastrado:
  if (!destinationEmail) {
    if (!email || !email.includes('@')) {
      return {
        requires_email_and_birthdate: true,
        client_name: client.name,
        message: 'Para sua segurança, informe seu e-mail e confirme sua data de nascimento cadastrada.'
      };
    }

    if (!birthDate) {
      const error = new Error('Data de nascimento é obrigatória para validar sua identidade.');
      error.statusCode = 400;
      throw error;
    }

    // Compara data de nascimento (suporta YYYY-MM-DD ou DD/MM/YYYY)
    let inputBd = birthDate.trim();
    if (inputBd.includes('/')) {
      const parts = inputBd.split('/');
      if (parts.length === 3) {
        inputBd = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    let clientBd = null;
    if (client.birth_date) {
      if (client.birth_date instanceof Date) {
        clientBd = client.birth_date.toISOString().slice(0, 10);
      } else {
        clientBd = String(client.birth_date).slice(0, 10);
      }
    }

    if (!clientBd || clientBd !== inputBd) {
      const error = new Error('Data de nascimento não confere com o cadastro deste salão. Em caso de dúvidas, contate a recepção.');
      error.statusCode = 400;
      throw error;
    }

    destinationEmail = email.trim().toLowerCase();
    isNewEmail = true;
  }

  // Rate limiter por telefone no Redis (3 solicitações por 10 min)
  const rateKey = `ratelimit:email_otp_req:${tenant.id}:${cleanPhone}`;
  const currentCount = await redisClient.incr(rateKey);
  if (currentCount === 1) {
    await redisClient.expire(rateKey, 600);
  } else if (currentCount > 3) {
    const err = new Error('Muitas solicitações consecutivas. Aguarde alguns minutos antes de tentar novamente.');
    err.statusCode = 429;
    throw err;
  }

  // Gera código OTP numérico de 6 dígitos
  const code = crypto.randomInt(100000, 1000000).toString();

  // Salva no Redis com TTL de 15 minutos (900 segundos)
  const otpKey = `otp:email_client:${tenant.id}:${cleanPhone}`;
  const otpData = {
    code,
    client_id: client.id,
    phone: client.phone,
    email: destinationEmail,
    is_new_email: isNewEmail,
    attempts: 0
  };
  await redisClient.setex(otpKey, 900, JSON.stringify(otpData));

  // Dispara pelo Resend
  await sendClientPasswordResetOtpEmail({
    to: destinationEmail,
    clientName: client.name,
    salonName: tenant.name,
    otpCode: code
  });

  const [userPart, domainPart] = destinationEmail.split('@');
  const maskedEmail = userPart.length <= 2 
    ? `${userPart[0]}***@${domainPart}` 
    : `${userPart.slice(0, 2)}***${userPart.slice(-1)}@${domainPart}`;

  return {
    success: true,
    requires_email_and_birthdate: false,
    destination_email: maskedEmail,
    has_saved_email: !isNewEmail,
    expires_in: 900,
    message: `Código de verificação enviado para ${maskedEmail}.`
  };
};

/**
 * Validação do código OTP de e-mail e redefinição de senha com persistência do e-mail
 */
export const verifyClientEmailOtpAndResetPassword = async (tenantSlugOrId, phone, code, newPassword) => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (!code || code.length !== 6) {
    const error = new Error('O código deve conter 6 dígitos.');
    error.statusCode = 400;
    throw error;
  }

  if (!newPassword || newPassword.length < 6 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    const error = new Error('A nova senha deve ter no mínimo 6 caracteres, contendo pelo menos 1 letra e 1 número.');
    error.statusCode = 400;
    throw error;
  }

  const tenantResult = await pool.query(
    'SELECT id, slug, name FROM public.cap_tenants WHERE slug = $1 OR id::text = $1',
    [tenantSlugOrId]
  );
  if (tenantResult.rows.length === 0) {
    const error = new Error('Salão não encontrado.');
    error.statusCode = 404;
    throw error;
  }
  const tenant = tenantResult.rows[0];

  const otpKey = `otp:email_client:${tenant.id}:${cleanPhone}`;
  const rawOtp = await redisClient.get(otpKey);

  if (!rawOtp) {
    const error = new Error('Código expirado ou inválido. Solicite um novo código.');
    error.statusCode = 400;
    throw error;
  }

  const otpData = JSON.parse(rawOtp);
  if (otpData.code !== code.trim()) {
    otpData.attempts = (otpData.attempts || 0) + 1;
    if (otpData.attempts >= 5) {
      await redisClient.del(otpKey);
      const error = new Error('Limite de tentativas excedido. Solicite um novo código.');
      error.statusCode = 400;
      throw error;
    }
    await redisClient.setex(otpKey, 900, JSON.stringify(otpData));
    const error = new Error('Código incorreto. Verifique seu e-mail e tente novamente.');
    error.statusCode = 400;
    throw error;
  }

  // Sucesso! Atualiza a senha no banco
  await pool.query(
    'SELECT cap_update_client_password($1, $2, $3)',
    [otpData.client_id, tenant.id, newPassword]
  );

  // Se o e-mail foi cadastrado e validado neste fluxo, persiste no cap_clients
  if (otpData.is_new_email && otpData.email) {
    await pool.query(
      'UPDATE public.cap_clients SET email = $1 WHERE id = $2 AND tenant_id = $3',
      [otpData.email, otpData.client_id, tenant.id]
    );
  }

  // Remove a chave do Redis
  await redisClient.del(otpKey);

  return {
    success: true,
    message: 'Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.'
  };
};
