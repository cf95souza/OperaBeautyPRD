import express from 'express';
import { authMiddleware, optionalAuth, requireRole } from '../middlewares/auth.js';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { logAudit } from '../services/auditService.js';
import { listServices, getServiceInputs, createService, updateService, deleteService } from '../services/catalogService.js';

const router = express.Router();

const listServicesSchema = z.object({
  query: z.object({
    tenant_id: z.string().uuid('ID do inquilino inválido.').optional()
  }),
  body: z.any(), params: z.any()
});

const getServiceInputsSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do serviço inválido.')
  }),
  query: z.any(), body: z.any()
});

const createServiceSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome do serviço é obrigatório.'),
    duration_minutes: z.number().int().positive('A duração deve ser maior que zero.'),
    price: z.number().positive('O preço deve ser maior que zero.'),
    reduces_stock: z.boolean().optional(),
    maintenance_days: z.number().int().nonnegative().optional(),
    inputs: z.array(z.object({
      inventory_id: z.string().uuid('ID do produto em estoque inválido.'),
      quantity_consumed: z.number().positive('A quantidade consumida deve ser maior que zero.')
    })).optional()
  }),
  query: z.any(), params: z.any()
});

const updateServiceSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do serviço inválido.')
  }),
  body: z.object({
    name: z.string().min(1, 'Nome do serviço é obrigatório.'),
    duration_minutes: z.number().int().positive('A duração deve ser maior que zero.'),
    price: z.number().positive('O preço deve ser maior que zero.'),
    reduces_stock: z.boolean().optional(),
    maintenance_days: z.number().int().nonnegative().optional(),
    is_active: z.boolean().optional(),
    inputs: z.array(z.object({
      inventory_id: z.string().uuid('ID do produto em estoque inválido.'),
      quantity_consumed: z.number().positive('A quantidade consumida deve ser maior que zero.')
    })).optional()
  }),
  query: z.any()
});

const deleteServiceSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do serviço inválido.')
  }),
  query: z.any(), body: z.any()
});


router.get('/', optionalAuth, validate(listServicesSchema), async (req, res) => {
  let tenantId = req.query.tenant_id;
  if (!tenantId && req.user) {
    tenantId = req.user.tenant_id;
  }
  if (!tenantId) {
    return res.status(400).json({ error: 'É necessário fornecer o tenant_id para obter os serviços.' });
  }
  try {
    const services = await listServices(tenantId);
    return res.json(services);
  } catch (error) {
    req.log.error(error, 'Erro ao listar serviços');
    return res.status(500).json({ error: 'Erro interno ao listar serviços.' });
  }
});

router.get('/:id/inputs', authMiddleware, validate(getServiceInputsSchema), async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenant_id;
  try {
    const inputs = await getServiceInputs(id, tenantId);
    return res.json(inputs);
  } catch (error) {
    req.log.error(error, 'Erro ao buscar insumos do serviço');
    return res.status(500).json({ error: 'Erro interno ao obter insumos.' });
  }
});

router.post('/', authMiddleware, requireRole(['manager']), validate(createServiceSchema), async (req, res) => {
  const { name, duration_minutes, price, reduces_stock, maintenance_days, inputs } = req.body;
  const tenantId = req.user.tenant_id;

  try {
    const { newService, inputs: savedInputs } = await createService(tenantId, name, duration_minutes, price, reduces_stock, maintenance_days, inputs);

    await logAudit({
      req,
      action: 'CREATE_SERVICE',
      entityName: 'cap_services',
      entityId: newService.id,
      newData: { ...newService, inputs: savedInputs }
    });

    return res.status(201).json(newService);
  } catch (error) {
    req.log.error(error, 'Erro ao criar serviço');
    return res.status(500).json({ error: 'Erro interno ao cadastrar serviço.' });
  }
});

router.put('/:id', authMiddleware, requireRole(['manager']), validate(updateServiceSchema), async (req, res) => {
  const { id } = req.params;
  const { name, duration_minutes, price, reduces_stock, maintenance_days, is_active, inputs } = req.body;
  const tenantId = req.user.tenant_id;

  try {
    const { oldService, updatedService, inputs: savedInputs } = await updateService(id, tenantId, name, duration_minutes, price, reduces_stock, maintenance_days, is_active, inputs);

    await logAudit({
      req,
      action: 'UPDATE_SERVICE',
      entityName: 'cap_services',
      entityId: id,
      oldData: oldService,
      newData: { ...updatedService, inputs: savedInputs }
    });

    return res.json(updatedService);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao atualizar serviço');
    return res.status(500).json({ error: 'Erro interno ao salvar alterações do serviço.' });
  }
});

router.delete('/:id', authMiddleware, requireRole(['manager']), validate(deleteServiceSchema), async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenant_id;

  try {
    const deletedService = await deleteService(id, tenantId);

    await logAudit({
      req,
      action: 'DELETE_SERVICE',
      entityName: 'cap_services',
      entityId: id,
      oldData: deletedService,
      newData: { is_active: false }
    });

    return res.json({ message: 'Serviço desativado com sucesso.', service: deletedService });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao desativar serviço');
    return res.status(500).json({ error: 'Erro interno ao remover serviço.' });
  }
});

export default router;
