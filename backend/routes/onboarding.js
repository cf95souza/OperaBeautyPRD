import express from 'express';
import { z } from 'zod';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  getOnboardingStatus,
  getCatalogTemplates,
  applyCatalogTemplate,
  toggleDismissOnboarding,
  markQrCodeGenerated
} from '../services/onboardingService.js';

const router = express.Router();

// Schema de validação para aplicação de catálogo modelo
export const applyCatalogTemplateSchema = z.object({
  body: z.object({
    segment: z.enum(['manicure', 'lash_brow', 'facial', 'massage', 'depilation', 'hair'], {
      required_error: 'O segmento do catálogo é obrigatório.'
    }),
    services: z.array(
      z.object({
        name: z.string().min(1, 'O nome do serviço é obrigatório.').max(100),
        short_description: z.string().max(255).optional().nullable(),
        duration_minutes: z.coerce.number().int().min(5, 'A duração mínima é de 5 minutos.').max(720),
        price: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
        category: z.string().optional().nullable()
      })
    ).optional()
  })
});

// Schema para dispensar ou reexibir o onboarding
export const dismissOnboardingSchema = z.object({
  body: z.object({
    dismissed: z.boolean({
      required_error: 'O campo dismissed é obrigatório.'
    })
  })
});

/**
 * GET /api/onboarding/status
 * Retorna o progresso em tempo real do checklist de onboarding do salão
 */
router.get('/status', authMiddleware, requireRole(['manager', 'superadmin']), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID não informado na sessão.' });
    }

    const status = await getOnboardingStatus(tenantId);
    return res.json(status);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log ? req.log.error(error, 'Erro ao obter status de onboarding') : console.error(error);
    return res.status(500).json({ error: 'Erro interno ao consultar status de onboarding do salão.' });
  }
});

/**
 * GET /api/onboarding/catalog-templates
 * Lista os modelos prontos de catálogo por segmento
 */
router.get('/catalog-templates', authMiddleware, requireRole(['manager', 'superadmin']), async (req, res) => {
  try {
    const templates = getCatalogTemplates();
    return res.json({ templates });
  } catch (error) {
    req.log ? req.log.error(error, 'Erro ao listar templates de catálogo') : console.error(error);
    return res.status(500).json({ error: 'Erro interno ao consultar catálogos-modelo.' });
  }
});

/**
 * POST /api/onboarding/apply-catalog-template
 * Importa atomicamente os serviços do catálogo modelo selecionado
 */
router.post('/apply-catalog-template', authMiddleware, requireRole(['manager']), validate(applyCatalogTemplateSchema), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { segment, services } = req.body;

    const result = await applyCatalogTemplate(tenantId, segment, services, req.user.id);
    return res.status(201).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log ? req.log.error(error, 'Erro ao aplicar catálogo modelo') : console.error(error);
    return res.status(500).json({ error: error.message || 'Erro interno ao aplicar catálogo modelo.' });
  }
});

/**
 * POST /api/onboarding/dismiss
 * Minimiza ou restaura o card de onboarding no dashboard do gestor
 */
router.post('/dismiss', authMiddleware, requireRole(['manager']), validate(dismissOnboardingSchema), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { dismissed } = req.body;

    const updated = await toggleDismissOnboarding(tenantId, dismissed, req.user.id);
    return res.json({ message: 'Preferência de visualização atualizada.', tenant: updated });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log ? req.log.error(error, 'Erro ao atualizar visualização de onboarding') : console.error(error);
    return res.status(500).json({ error: 'Erro interno ao atualizar preferência do onboarding.' });
  }
});

/**
 * POST /api/onboarding/mark-qr-generated
 * Registra a emissão/impressão do Display de Balcão com QR Code
 */
router.post('/mark-qr-generated', authMiddleware, requireRole(['manager']), async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    const updated = await markQrCodeGenerated(tenantId, req.user.id);
    return res.json({ message: 'Geração de Display com QR Code registrada com sucesso.', tenant: updated });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log ? req.log.error(error, 'Erro ao registrar geração de QR Code') : console.error(error);
    return res.status(500).json({ error: 'Erro interno ao registrar geração do QR Code.' });
  }
});

export default router;
