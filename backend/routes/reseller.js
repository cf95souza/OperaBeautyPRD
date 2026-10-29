import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import {
  validateReferralCode,
  registerReseller,
  getResellerDashboard,
  requestPayout
} from '../services/resellerService.js';
import pool from '../config/db.js';

const router = express.Router();

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres.'),
    email: z.string().email('E-mail inválido.'),
    phone: z.string().min(8, 'Telefone inválido.'),
    referral_code: z.string().max(30).optional().nullable(),
    pix_key_type: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random']).default('cpf').optional(),
    pix_key: z.string().optional().nullable(),
    commission_rate: z.number().min(0).max(100).optional(),
    is_superadmin: z.boolean().optional()
  }),
  query: z.any(),
  params: z.any()
});

const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3, 'Informe seu e-mail ou código de parceiro.').optional(),
    email: z.string().email().optional(),
    code: z.string().min(3).optional()
  }),
  query: z.any(),
  params: z.any()
});

const payoutSchema = z.object({
  body: z.object({
    amount: z.number().min(50, 'O valor mínimo para saque via PIX é de R$ 50,00.'),
    pix_key_type: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random']).optional(),
    pix_key: z.string().optional()
  }),
  query: z.any(),
  params: z.any()
});

/**
 * Consulta pública de status do programa de parceiros (para o frontend saber se exibe links e banners)
 */
router.get('/status', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT reseller_program_enabled, reseller_default_commission_rate 
       FROM public.cap_platform_settings LIMIT 1`
    );
    const enabled = result.rows.length > 0 ? Boolean(result.rows[0].reseller_program_enabled) : false;
    const default_commission = result.rows.length > 0 ? Number(result.rows[0].reseller_default_commission_rate || 20) : 20;
    return res.json({ enabled, default_commission });
  } catch (err) {
    return res.json({ enabled: false, default_commission: 20 });
  }
});

/**
 * Validação pública de código de indicação (para LandingPage e Onboarding)
 */
router.get('/validate/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const result = await validateReferralCode(code);
    if (!result || !result.valid) {
      return res.status(404).json(result || { valid: false, message: 'Código de indicação inválido ou expirado.' });
    }
    return res.json(result);
  } catch (error) {
    req.log?.error?.(error, 'Erro ao validar código de parceiro');
    return res.status(500).json({ valid: false, error: 'Erro ao validar código.' });
  }
});

/**
 * Cadastro de novo parceiro revendedor (bloqueado se programa estiver desativado pelo Super Admin)
 */
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    if (!req.body.is_superadmin) {
      const checkStatus = await pool.query('SELECT reseller_program_enabled FROM public.cap_platform_settings LIMIT 1');
      const isEnabled = checkStatus.rows.length > 0 ? Boolean(checkStatus.rows[0].reseller_program_enabled) : false;
      if (!isEnabled) {
        return res.status(403).json({ 
          error: 'O Programa de Parceiros e Revenda está temporariamente fechado para novos cadastros públicos. Em breve abriremos novas vagas.' 
        });
      }
    }

    const reseller = await registerReseller(req.body);
    return res.status(201).json({
      message: 'Cadastro de parceiro realizado com sucesso!',
      reseller,
      referralLink: `https://operabeauty.com.br/?ref=${reseller.referral_code}`
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error?.(error, 'Erro ao cadastrar parceiro revendedor');
    return res.status(500).json({ error: 'Erro interno ao realizar cadastro.' });
  }
});

/**
 * Login flexível do parceiro (via e-mail, código ou identificador unificado)
 */
router.post('/login', validate(loginSchema), async (req, res) => {
  const { identifier, email, code } = req.body;
  const term = identifier || email || code;

  if (!term) {
    return res.status(400).json({ error: 'Informe seu e-mail ou código de parceiro.' });
  }

  try {
    const cleanTerm = term.trim();
    const result = await pool.query(
      `SELECT id, name, email, phone, referral_code, commission_rate, pix_key_type, pix_key, status 
       FROM public.cap_saas_resellers
       WHERE LOWER(email) = LOWER($1) OR UPPER(referral_code) = UPPER($1) LIMIT 1`,
      [cleanTerm]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Nenhum parceiro encontrado com este e-mail ou código.' });
    }

    const reseller = result.rows[0];
    if (reseller.status !== 'active') {
      return res.status(403).json({ error: 'Conta de parceiro temporariamente inativa. Fale com o suporte.' });
    }

    const dashData = await getResellerDashboard(reseller.id);

    return res.json({
      message: 'Login realizado com sucesso!',
      ...dashData
    });
  } catch (error) {
    req.log?.error?.(error, 'Erro ao autenticar parceiro');
    return res.status(500).json({ error: 'Erro ao autenticar.' });
  }
});

/**
 * Consulta de Dashboard e Extrato de Comissões do Parceiro
 */
router.get('/dashboard/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const dashboard = await getResellerDashboard(id);
    return res.json(dashboard);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error?.(error, 'Erro ao carregar dashboard de revendedor');
    return res.status(500).json({ error: 'Erro ao carregar dashboard.' });
  }
});

/**
 * Solicitação de saque PIX
 */
router.post('/payout/:id', validate(payoutSchema), async (req, res) => {
  const { id } = req.params;
  const { amount, pix_key_type, pix_key } = req.body;
  try {
    const payout = await requestPayout(id, { amount, pix_key_type, pix_key });
    return res.status(201).json({
      message: 'Solicitação de saque enviada com sucesso! O processamento ocorre em até 1 dia útil via PIX.',
      payout
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log?.error?.(error, 'Erro ao solicitar saque de comissão');
    return res.status(500).json({ error: 'Erro ao solicitar saque.' });
  }
});

export default router;
