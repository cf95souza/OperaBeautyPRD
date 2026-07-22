import express from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { validate } from '../middlewares/validate.js';
import { authMiddleware } from '../middlewares/auth.js';
import {
  generateAuthData,
  loginStaff,
  loginClient,
  loginSuperadmin,
  checkClientExists,
  registerClient,
  refreshTokenService,
  logoutService,
  getMe
} from '../services/authService.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente mais tarde.' }
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

const checkClientSchema = z.object({
  body: z.object({
    tenant_id: z.string().uuid('Tenant ID inválido.'),
    phone: z.string().min(10, 'Telefone inválido.'),
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

function setAuthCookies(res, authData) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('refresh_token', authData.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: authData.maxAge
  });
}



router.post('/login-staff', loginLimiter, validate(loginStaffSchema), async (req, res) => {
  const { tenant_slug, email, password } = req.body;
  try {
    const userData = await loginStaff(tenant_slug, email, password);
    const payload = { id: userData.id, name: userData.name, tenant_id: userData.tenant_id, role: userData.role, email: email };
    const authData = await generateAuthData(payload, req.ip, req.headers['user-agent']);
    
    setAuthCookies(res, authData);
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
    const payload = { id: userData.id, name: userData.name, tenant_id: userData.tenant_id, role: 'client', phone: phone };
    const authData = await generateAuthData(payload, req.ip, req.headers['user-agent']);
    
    setAuthCookies(res, authData);
    return res.json({ token: authData.token, user: userData });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.post('/login-superadmin', loginLimiter, validate(loginSuperadminSchema), async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await loginSuperadmin(email, password);
    const payload = { id: admin.id, name: admin.name, role: 'superadmin', email: admin.email };
    const authData = await generateAuthData(payload, req.ip, req.headers['user-agent']);
    
    setAuthCookies(res, authData);
    return res.json({ token: authData.token, user: payload });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

router.post('/check-client', loginLimiter, validate(checkClientSchema), async (req, res) => {
  const { tenant_id, phone } = req.body;
  try {
    const result = await checkClientExists(tenant_id, phone);
    return res.json({ action: result.exists ? 'login' : 'register' });
  } catch (error) {
    req.log.error(error, 'Erro ao checar cliente');
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

router.post('/register-client', validate(registerClientSchema), async (req, res) => {
  const { tenant_id, name, phone, password, birth_date, ref } = req.body;
  try {
    const clientId = await registerClient(tenant_id, name, phone, password, birth_date, ref);
    const payload = { id: clientId, name: name, tenant_id: tenant_id, role: 'client', phone: phone };
    const authData = await generateAuthData(payload, req.ip, req.headers['user-agent']);
    
    setAuthCookies(res, authData);
    return res.status(201).json({ token: authData.token, user: payload });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

router.post('/refresh-token', async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return res.status(401).json({ error: 'Nenhum refresh token encontrado.' });

  try {
    const payload = await refreshTokenService(refreshToken, req.ip, req.headers['user-agent']);
    const authData = await generateAuthData(payload, req.ip, req.headers['user-agent'], payload.familyId);
    
    setAuthCookies(res, authData);
    return res.json({ token: authData.token, user: payload });
  } catch (error) {
    res.clearCookie('refresh_token');
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
    res.clearCookie('refresh_token');
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
