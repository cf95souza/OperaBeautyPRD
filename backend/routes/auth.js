import express from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import pool from '../config/db.js';
import { validate } from '../middlewares/validate.js';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import {
  generateAuthData,
  loginStaff,
  loginClient,
  loginSuperadmin,
  verifySuperadmin2Fa,
  setupSuperadmin2Fa,
  enableSuperadmin2Fa,
  disableSuperadmin2Fa,
  checkClientExists,
  resolveTenantId,
  registerClient,
  refreshTokenService,
  logoutService,
  getMe,
  requestClientOtp,
  verifyClientOtp,
  resetClientPasswordWithToken,
  requestClientEmailOtp,
  verifyClientEmailOtpAndResetPassword
} from '../services/authService.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas tentativas de login. Tente novamente mais tarde.' }
});

export const clientOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas solicitações de autenticação. Por favor, aguarde alguns minutos.' },
  statusCode: 429
});

// [SEGURANÇA OWASP / FALHA 06]: Rate limiter contra flood de novos cadastros de clientes
export const registerClientLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 15, // max 15 cadastros por IP por hora
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de cadastros excedido para este endereço IP. Tente novamente mais tarde.' },
  statusCode: 429
});

// C12 (P1): Rate limiter por IP para impedir varredura em massa (30 req / 15 min)
export const checkPhoneIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de verificação originadas deste IP. Por favor, aguarde alguns minutos.' },
  statusCode: 429
});

// C12 (P1): Rate limiter por número de telefone para impedir ataques distribuídos de força bruta (5 req / 10 min)
export const checkPhonePhoneLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const rawPhone = (req.query?.phone || req.body?.phone || '').toString();
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const tenant = (req.query?.tenant_id || req.body?.tenant_id || req.query?.tenant_slug || req.body?.tenant_slug || 'global').toString();
    return `phone_limit:${tenant}:${cleanPhone || req.ip}`;
  },
  validate: { keyGeneratorIpFallback: false },
  message: { error: 'Muitas tentativas para este número de telefone. Por favor, aguarde alguns minutos.' },
  statusCode: 429
});

const loginStaffSchema = z.object({
  body: z.object({
    tenant_slug: z.string().min(1, 'Tenant slug é obrigatório.'),
    email: z.string().email('E-mail inválido.'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres.').regex(/[A-Z]/, 'Precisa ter 1 maiúscula.').regex(/[a-z]/, 'Precisa ter 1 minúscula.').regex(/[\W_]/, 'Precisa ter 1 caractere especial.'),
  }),
  query: z.any(), params: z.any()
});

const loginClientSchema = z.object({
  body: z.object({
    tenant_slug: z.string().min(1, 'Tenant slug é obrigatório.'),
    phone: z.string().min(10, 'Telefone inválido.'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.').regex(/[a-zA-Z]/, 'Precisa ter 1 letra.').regex(/[0-9]/, 'Precisa ter 1 número.'),
  }),
  query: z.any(), params: z.any()
});

const loginSuperadminSchema = z.object({
  body: z.object({
    email: z.string().email('E-mail inválido.'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres.').regex(/[A-Z]/, 'Precisa ter 1 maiúscula.').regex(/[a-z]/, 'Precisa ter 1 minúscula.').regex(/[\W_]/, 'Precisa ter 1 caractere especial.'),
  }),
  query: z.any(), params: z.any()
});

export const verify2faLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de verificação 2FA. Por favor, aguarde alguns minutos.' },
  statusCode: 429
});

const verify2faSchema = z.object({
  body: z.object({
    temp_token: z.string().min(10, 'Token temporário de 2FA inválido.'),
    code: z.string().length(6, 'O código de autenticação deve conter 6 dígitos.')
  }),
  query: z.any(), params: z.any()
});

const codeOnlySchema = z.object({
  body: z.object({
    code: z.string().length(6, 'O código de autenticação deve conter 6 dígitos.')
  }),
  query: z.any(), params: z.any()
});

const checkPhoneQuerySchema = z.object({
  query: z.object({
    tenant_id: z.string().uuid('Tenant ID inválido.').optional(),
    tenant_slug: z.string().min(1, 'Tenant slug inválido.').optional(),
    phone: z.string().min(10, 'Telefone inválido.'),
  }).refine((data) => data.tenant_id || data.tenant_slug, {
    message: 'É necessário informar tenant_id ou tenant_slug.'
  }),
  body: z.any(), params: z.any()
});

const checkClientSchema = z.object({
  body: z.object({
    tenant_id: z.string().uuid('Tenant ID inválido.').optional(),
    tenant_slug: z.string().min(1, 'Tenant slug inválido.').optional(),
    phone: z.string().min(10, 'Telefone inválido.'),
  }).refine((data) => data.tenant_id || data.tenant_slug, {
    message: 'É necessário informar tenant_id ou tenant_slug.'
  }),
  query: z.any(), params: z.any()
});

const registerClientSchema = z.object({
  body: z.object({
    tenant_id: z.string().uuid('Tenant ID inválido.'),
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres.'),
    phone: z.string().min(10, 'Telefone inválido.'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.').regex(/[a-zA-Z]/, 'Precisa ter 1 letra.').regex(/[0-9]/, 'Precisa ter 1 número.'),
    birth_date: z.string().optional().nullable(),
    ref: z.string().optional().nullable(),
  }),
  query: z.any(), params: z.any()
});

const requestClientCodeSchema = z.object({
  body: z.object({
    tenant_slug: z.string().min(1, 'Tenant slug é obrigatório.'),
    phone: z.string().min(10, 'Telefone inválido.'),
    purpose: z.enum(['reset_password', 'login']).default('reset_password'),
  }),
  query: z.any(), params: z.any()
});

const verifyClientCodeSchema = z.object({
  body: z.object({
    tenant_slug: z.string().min(1, 'Tenant slug é obrigatório.'),
    phone: z.string().min(10, 'Telefone inválido.'),
    code: z.string().length(6, 'O código de autenticação deve conter 6 dígitos.'),
  }),
  query: z.any(), params: z.any()
});

const resetClientPasswordSchema = z.object({
  body: z.object({
    reset_token: z.string().min(10, 'Token de redefinição inválido.'),
    new_password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.').regex(/[a-zA-Z]/, 'Precisa ter 1 letra.').regex(/[0-9]/, 'Precisa ter 1 número.'),
  }),
  query: z.any(), params: z.any()
});

function getRequestDeviceId(req) {
  return req.headers['x-device-id'] || req.cookies?.device_id || null;
}

function setAuthCookies(res, authData, deviceId = null) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refresh_token', authData.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: authData.maxAge
  });
  if (deviceId) {
    res.cookie('device_id', deviceId, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60 * 1000 // 1 ano
    });
  }
}

router.post('/login-staff', loginLimiter, validate(loginStaffSchema), async (req, res) => {
  const { tenant_slug, email, password } = req.body;
  try {
    const userData = await loginStaff(tenant_slug, email, password);
    const payload = { id: userData.id, name: userData.name, tenant_id: userData.tenant_id, role: userData.role, email: email };
    const deviceId = getRequestDeviceId(req);
    const authData = await generateAuthData(payload, req.ip, req.headers['user-agent'], null, deviceId);
    
    setAuthCookies(res, authData, deviceId);
    return res.json({ token: authData.token, user: userData });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.post('/login-client', loginLimiter, validate(loginClientSchema), async (req, res) => {
  const { tenant_slug, phone, password } = req.body;
  try {
    const userData = await loginClient(tenant_slug, phone, password);
    const clientExtra = await pool.query('SELECT email, birth_date FROM public.cap_clients WHERE id = $1', [userData.id]);
    if (clientExtra.rows.length > 0) {
      userData.email = clientExtra.rows[0].email || null;
      userData.birth_date = clientExtra.rows[0].birth_date || null;
    }
    const payload = { id: userData.id, name: userData.name, tenant_id: userData.tenant_id, role: 'client', phone: phone };
    const deviceId = getRequestDeviceId(req);
    const authData = await generateAuthData(payload, req.ip, req.headers['user-agent'], null, deviceId);
    
    setAuthCookies(res, authData, deviceId);
    return res.json({ token: authData.token, user: userData });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// D7 (P1): Solicitação de código de uso único (OTP) ou canal de redefinição pelo salão
router.post('/client/request-code', clientOtpLimiter, validate(requestClientCodeSchema), async (req, res) => {
  const { tenant_slug, phone, purpose } = req.body;
  try {
    const result = await requestClientOtp(tenant_slug, phone, purpose);
    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao solicitar código para cliente');
    return res.status(500).json({ error: 'Erro ao processar solicitação de código.' });
  }
});

// D7 (P1): Verificação de código OTP e emissão de reset_token ou sessão de login direto
router.post('/client/verify-code', clientOtpLimiter, validate(verifyClientCodeSchema), async (req, res) => {
  const { tenant_slug, phone, code } = req.body;
  try {
    const deviceId = getRequestDeviceId(req);
    const result = await verifyClientOtp(tenant_slug, phone, code, req.ip, req.headers['user-agent'], deviceId);

    if (result.purpose === 'login' && result.authData) {
      setAuthCookies(res, result.authData, deviceId);
      return res.json({ token: result.authData.token, user: result.user, verified: true });
    }

    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao validar código do cliente');
    return res.status(500).json({ error: 'Erro ao validar código.' });
  }
});

// D7 (P1): Redefinição de senha mediante token temporário assinado
router.post('/client/reset-password', clientOtpLimiter, validate(resetClientPasswordSchema), async (req, res) => {
  const { reset_token, new_password } = req.body;
  try {
    const result = await resetClientPasswordWithToken(reset_token, new_password);
    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao redefinir senha do cliente');
    return res.status(500).json({ error: 'Erro ao redefinir senha.' });
  }
});

const requestResetEmailSchema = z.object({
  body: z.object({
    tenant_slug: z.string().min(1, 'Identificador do salão é obrigatório.'),
    phone: z.string().min(1, 'Telefone é obrigatório.'),
    email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
    birth_date: z.string().optional().or(z.literal('')),
    purpose: z.enum(['login', 'reset_password']).optional().default('reset_password')
  }),
  query: z.any(), params: z.any()
});

const verifyResetEmailSchema = z.object({
  body: z.object({
    tenant_slug: z.string().min(1, 'Identificador do salão é obrigatório.'),
    phone: z.string().min(1, 'Telefone é obrigatório.'),
    code: z.string().length(6, 'O código deve conter 6 dígitos.'),
    purpose: z.enum(['login', 'reset_password']).optional().default('reset_password'),
    new_password: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres.').regex(/[a-zA-Z]/, 'Precisa ter 1 letra.').regex(/[0-9]/, 'Precisa ter 1 número.').optional()
  }),
  query: z.any(), params: z.any()
});

// Recuperação de senha ou Login por E-mail via Resend (gratuito e sem dependência de WhatsApp)
router.post('/client/request-reset-email', clientOtpLimiter, validate(requestResetEmailSchema), async (req, res) => {
  const { tenant_slug, phone, email, birth_date, purpose } = req.body;
  try {
    const result = await requestClientEmailOtp(tenant_slug, phone, email, birth_date, purpose);
    return res.json(result);
  } catch (error) {
    req.log.error(error, 'Erro ao solicitar código por e-mail');
    return res.status(error.statusCode || 500).json({ 
      error: error.message || 'Erro ao processar solicitação de e-mail.' 
    });
  }
});

router.post('/client/verify-reset-email', clientOtpLimiter, validate(verifyResetEmailSchema), async (req, res) => {
  const { tenant_slug, phone, code, new_password, purpose } = req.body;
  const deviceId = getRequestDeviceId(req);

  try {
    const result = await verifyClientEmailOtpAndResetPassword(
      tenant_slug, 
      phone, 
      code, 
      new_password, 
      purpose, 
      req.ip, 
      req.headers['user-agent'], 
      deviceId
    );

    if (result.purpose === 'login' && result.authData) {
      setAuthCookies(res, result.authData, deviceId);
    }

    return res.json(result);
  } catch (error) {
    req.log.error(error, 'Erro ao verificar código de e-mail e processar autenticação');
    return res.status(error.statusCode || 500).json({ 
      error: error.message || 'Erro ao validar código ou autenticar cliente.' 
    });
  }
});

// C13 (P2): Login do Super Admin com suporte a 2FA TOTP (RFC 6238)
router.post('/login-superadmin', loginLimiter, validate(loginSuperadminSchema), async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await loginSuperadmin(email, password);

    // Se 2FA estiver ativado, retorna desafio com token temporário assinado de 5 minutos
    if (result.require_2fa) {
      const tempToken = jwt.sign(
        { admin_id: result.admin_id, email: result.email, purpose: '2fa_login' },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({
        require_2fa: true,
        temp_token: tempToken,
        email: result.email,
        message: 'Código de autenticação em duas etapas obrigatório.'
      });
    }

    // Login direto (caso 2FA não esteja ativado ainda)
    const payload = result.admin;
    const deviceId = getRequestDeviceId(req);
    const authData = await generateAuthData(payload, req.ip, req.headers['user-agent'], null, deviceId);
    
    setAuthCookies(res, authData, deviceId);
    return res.json({ token: authData.token, user: payload });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao realizar login do superadmin');
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// C13 (P2): Segundo fator do Super Admin - validação de código TOTP de 6 dígitos
router.post('/login-superadmin/verify-2fa', verify2faLimiter, validate(verify2faSchema), async (req, res) => {
  const { temp_token, code } = req.body;
  try {
    let decoded;
    try {
      decoded = jwt.verify(temp_token, process.env.JWT_SECRET);
      if (decoded.purpose !== '2fa_login' || !decoded.admin_id) {
        throw new Error('Token inválido.');
      }
    } catch (err) {
      return res.status(401).json({ error: 'Sessão temporária de 2FA expirada ou inválida. Faça login novamente.' });
    }

    const payload = await verifySuperadmin2Fa(decoded.admin_id, code, req.ip, req.headers['user-agent']);
    const deviceId = getRequestDeviceId(req);
    const authData = await generateAuthData(payload, req.ip, req.headers['user-agent'], null, deviceId);

    setAuthCookies(res, authData, deviceId);
    return res.json({ token: authData.token, user: payload });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao validar 2FA do Super Admin');
    return res.status(500).json({ error: 'Erro ao validar segundo fator.' });
  }
});

// C13 (P2): Inicia configuração de 2FA para Super Admin autenticado
router.post('/superadmin/2fa/setup', authMiddleware, requireRole(['superadmin']), async (req, res) => {
  try {
    const setupData = await setupSuperadmin2Fa(req.user.id);
    return res.json(setupData);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error);
    return res.status(500).json({ error: 'Erro ao iniciar setup de 2FA.' });
  }
});

// C13 (P2): Ativa 2FA confirmando o primeiro código do autenticador
router.post('/superadmin/2fa/enable', authMiddleware, requireRole(['superadmin']), validate(codeOnlySchema), async (req, res) => {
  try {
    const result = await enableSuperadmin2Fa(req.user.id, req.body.code);
    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error);
    return res.status(500).json({ error: 'Erro ao ativar 2FA.' });
  }
});

// C13 (P2): Desativa 2FA mediante confirmação com código atual
router.post('/superadmin/2fa/disable', authMiddleware, requireRole(['superadmin']), validate(codeOnlySchema), async (req, res) => {
  try {
    const result = await disableSuperadmin2Fa(req.user.id, req.body.code);
    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error);
    return res.status(500).json({ error: 'Erro ao desativar 2FA.' });
  }
});

// C12 (P1): Rota pública de verificação de telefone com rate limit duplo (IP + Telefone) e proteção contra enumeração
router.get(
  '/check-phone',
  checkPhoneIpLimiter,
  checkPhonePhoneLimiter,
  validate(checkPhoneQuerySchema),
  async (req, res) => {
    let { tenant_id, tenant_slug, phone } = req.query;
    try {
      const resolvedTenantId = await resolveTenantId(tenant_id, tenant_slug);
      if (!resolvedTenantId) {
        return res.status(404).json({ error: 'Salão não encontrado.' });
      }

      const result = await checkClientExists(resolvedTenantId, phone);
      return res.json({ action: result.exists ? 'login' : 'register' });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: 'Dados de verificação inválidos.' });
      req.log.error(error, 'Erro ao verificar telefone');
      return res.status(500).json({ error: 'Erro ao processar verificação.' });
    }
  }
);

// POST /auth/check-client (Compatibilidade): Protegida pelos mesmos rate limits e resposta uniforme
router.post(
  '/check-client',
  checkPhoneIpLimiter,
  checkPhonePhoneLimiter,
  validate(checkClientSchema),
  async (req, res) => {
    let { tenant_id, tenant_slug, phone } = req.body;
    try {
      const resolvedTenantId = await resolveTenantId(tenant_id, tenant_slug);
      if (!resolvedTenantId) {
        return res.status(404).json({ error: 'Salão não encontrado.' });
      }

      const result = await checkClientExists(resolvedTenantId, phone);
      return res.json({ action: result.exists ? 'login' : 'register' });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: 'Dados de verificação inválidos.' });
      req.log.error(error, 'Erro ao checar cliente');
      return res.status(500).json({ error: 'Erro ao processar verificação.' });
    }
  }
);

router.post('/register-client', registerClientLimiter, validate(registerClientSchema), async (req, res) => {
  const { tenant_id, name, phone, password, birth_date, ref } = req.body;
  try {
    const clientId = await registerClient(tenant_id, name, phone, password, birth_date, ref);
    const payload = { id: clientId, name: name, tenant_id: tenant_id, role: 'client', phone: phone };
    const deviceId = getRequestDeviceId(req);
    const authData = await generateAuthData(payload, req.ip, req.headers['user-agent'], null, deviceId);
    
    setAuthCookies(res, authData, deviceId);
    return res.status(201).json({ token: authData.token, user: payload });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

router.post('/refresh-token', async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return res.status(401).json({ error: 'Nenhum refresh token encontrado.' });

  const deviceId = getRequestDeviceId(req);

  try {
    const payload = await refreshTokenService(refreshToken, req.ip, req.headers['user-agent'], deviceId);
    const authData = await generateAuthData(payload, req.ip, req.headers['user-agent'], payload.familyId, payload.deviceId);
    
    setAuthCookies(res, authData, payload.deviceId);
    return res.json({ token: authData.token, user: payload });
  } catch (error) {
    res.clearCookie('refresh_token', { path: '/', sameSite: 'lax' });
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: 'Erro ao renovar token.' });
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  try {
    await logoutService(refreshToken);
  } catch (e) {
    req.log.error(e, 'Erro não crítico ao fazer logout');
  } finally {
    res.clearCookie('refresh_token', { path: '/', sameSite: 'lax' });
    return res.json({ message: 'Logout realizado com sucesso.' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { id, role, tenant_id } = req.user;
    const user = await getMe(id, role, tenant_id);
    return res.json(user);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: 'Erro interno ao verificar sessão.' });
  }
});

export default router;
