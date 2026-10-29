import express from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { requireFeature } from '../middlewares/featureFlagMiddleware.js';
import * as packageService from '../services/packageService.js';

const router = express.Router();

// Schemas Zod de Validação
const createPackageSchema = z.object({
  name: z.string().min(2, 'Nome do pacote deve ter no mínimo 2 caracteres.').max(120),
  description: z.string().max(500).optional().nullable(),
  service_id: z.string().uuid('ID do serviço inválido.'),
  total_sessions: z.number().int().min(1, 'Pacote deve ter pelo menos 1 sessão.'),
  price: z.number().min(0, 'Preço do pacote não pode ser negativo.'),
  validity_days: z.number().int().min(1, 'Validade mínima de 1 dia.').default(90),
  min_interval_days: z.number().int().min(0, 'Intervalo não pode ser negativo.').default(0)
});

const updatePackageSchema = createPackageSchema.partial().extend({
  is_active: z.boolean().optional()
});

const sellPackageSchema = z.object({
  client_id: z.string().uuid('ID do cliente inválido.'),
  package_id: z.string().uuid('ID do pacote inválido.'),
  payment_method: z.enum(['pix', 'credit_card', 'debit_card', 'cash']).default('pix'),
  installments: z.number().int().min(1).max(12).default(1),
  notes: z.string().max(500).optional().nullable()
});

/**
 * GET /api/packages
 * Lista modelos de pacotes ativos do salão
 */
router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.query.tenant_id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID é obrigatório.' });
    }
    const packages = await packageService.listPackages(tenantId);
    res.json(packages);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/packages
 * Cria modelo de pacote (Gestor / SuperAdmin)
 */
router.post(
  '/',
  authMiddleware,
  requireRole(['manager', 'superadmin']),
  requireFeature('packages'),
  async (req, res, next) => {
    try {
      const parsed = createPackageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Dados inválidos para o pacote.',
          details: parsed.error.issues
        });
      }

      const tenantId = req.user.tenant_id;
      const created = await packageService.createPackage(tenantId, parsed.data);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/packages/:id
 * Atualiza modelo de pacote
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole(['manager', 'superadmin']),
  async (req, res, next) => {
    try {
      const parsed = updatePackageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Dados inválidos.',
          details: parsed.error.issues
        });
      }

      const tenantId = req.user.tenant_id;
      const updated = await packageService.updatePackage(tenantId, req.params.id, parsed.data);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/packages/:id
 * Desativa modelo de pacote
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(['manager', 'superadmin']),
  async (req, res, next) => {
    try {
      const tenantId = req.user.tenant_id;
      const deleted = await packageService.deletePackage(tenantId, req.params.id);
      res.json({ message: 'Pacote desativado com sucesso.', package: deleted });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/packages/sell
 * Registra a venda de um pacote a uma cliente
 */
router.post(
  '/sell',
  authMiddleware,
  requireRole(['manager', 'staff', 'superadmin']),
  async (req, res, next) => {
    try {
      const parsed = sellPackageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Dados inválidos para venda.',
          details: parsed.error.issues
        });
      }

      const tenantId = req.user.tenant_id;
      const sold = await packageService.sellPackageToClient(tenantId, {
        clientId: parsed.data.client_id,
        packageId: parsed.data.package_id,
        paymentMethod: parsed.data.payment_method,
        installments: parsed.data.installments,
        notes: parsed.data.notes,
        staffId: req.user.id
      });

      res.status(201).json(sold);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/packages/client/:clientId
 * Retorna o histórico e saldo de pacotes de uma cliente
 */
router.get(
  '/client/:clientId',
  authMiddleware,
  async (req, res, next) => {
    try {
      const tenantId = req.user.tenant_id;
      const { clientId } = req.params;

      // Se for cliente, só pode visualizar os próprios pacotes
      if (req.user.role === 'client' && req.user.id !== clientId) {
        return res.status(403).json({ error: 'Acesso negado aos pacotes de outro cliente.' });
      }

      const packages = await packageService.getClientPackages(tenantId, clientId);
      res.json(packages);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/packages/check-eligible
 * Verifica se o cliente tem um pacote elegível para o serviço selecionado no agendamento
 */
router.get(
  '/check-eligible',
  authMiddleware,
  async (req, res, next) => {
    try {
      const tenantId = req.user.tenant_id || req.query.tenant_id;
      const clientId = req.user.role === 'client' ? req.user.id : req.query.client_id;
      const { service_id } = req.query;

      if (!clientId || !service_id) {
        return res.status(400).json({ error: 'client_id e service_id são obrigatórios.' });
      }

      const eligiblePackage = await packageService.getClientActivePackageForService(
        tenantId,
        clientId,
        service_id
      );

      res.json({ eligible: Boolean(eligiblePackage), package: eligiblePackage });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/packages/report
 * Retorna relatório executivo de pacotes do salão
 */
router.get(
  '/report',
  authMiddleware,
  requireRole(['manager', 'superadmin']),
  async (req, res, next) => {
    try {
      const tenantId = req.user.tenant_id;
      const report = await packageService.getPackagesReport(tenantId);
      res.json(report);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
