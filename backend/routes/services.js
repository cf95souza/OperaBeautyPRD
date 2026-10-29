import express from 'express';
import { authMiddleware, optionalAuth, requireRole } from '../middlewares/auth.js';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { logAudit } from '../services/auditService.js';
import { listServices, getServiceInputs, createService, updateService, deleteService, importServices } from '../services/catalogService.js';

const router = express.Router();

const importServicesSchema = z.object({
  body: z.object({
    services: z.array(z.object({
      name: z.string().min(1, 'Nome do serviço é obrigatório.'),
      short_description: z.string().max(255).nullable().optional(),
      duration_minutes: z.number().int().positive().optional().default(30),
      price: z.number().positive('O preço deve ser maior que zero.'),
      is_starting_price: z.boolean().optional().default(false),
      maintenance_days: z.number().int().nonnegative().optional().default(0),
      is_active: z.boolean().optional().default(true)
    })).min(1, 'A lista deve conter ao menos 1 serviço.').max(500, 'Limite máximo de 500 serviços por lote.'),
    options: z.object({
      all_or_nothing: z.boolean().optional().default(true),
      on_duplicate: z.enum(['skip', 'update']).optional().default('skip')
    }).optional()
  }),
  query: z.any(), params: z.any()
});

const listServicesSchema = z.object({
  query: z.object({
    tenant_id: z.string().optional().transform(val => {
      if (!val || val === 'undefined' || val === 'null' || val.trim() === '') return undefined;
      return val;
    }).pipe(z.string().uuid('ID do inquilino inválido.').optional())
  }),
  body: z.any(), params: z.any()
});

const getServiceInputsSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do serviço inválido.')
  }),
  query: z.any(), body: z.any()
});

const serviceVariationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Nome da variação é obrigatório.'),
  price: z.coerce.number().positive('O preço da variação deve ser maior que zero.'),
  duration_minutes: z.coerce.number().int().positive('A duração da variação deve ser maior que zero.'),
  is_active: z.boolean().optional().default(true),
  order_index: z.coerce.number().int().nonnegative().optional().default(0)
});

const serviceExtraSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Nome do adicional é obrigatório.'),
  price: z.coerce.number().min(0, 'O preço do adicional não pode ser negativo.').default(0),
  duration_minutes: z.coerce.number().int().nonnegative().optional().default(0),
  is_active: z.boolean().optional().default(true),
  order_index: z.coerce.number().int().nonnegative().optional().default(0)
});

const createServiceSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome do serviço é obrigatório.'),
    short_description: z.string().max(255).nullable().optional(),
    duration_minutes: z.number().int().positive('A duração deve ser maior que zero.'),
    price: z.number().positive('O preço deve ser maior que zero.'),
    is_starting_price: z.boolean().optional(),
    reduces_stock: z.boolean().optional(),
    maintenance_days: z.number().int().nonnegative().optional(),
    requires_deposit: z.boolean().optional(),
    deposit_type: z.enum(['percentage', 'fixed']).optional(),
    deposit_amount: z.number().nonnegative().optional(),
    variations: z.array(serviceVariationSchema).optional(),
    extras: z.array(serviceExtraSchema).optional(),
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
    short_description: z.string().max(255).nullable().optional(),
    duration_minutes: z.number().int().positive('A duração deve ser maior que zero.'),
    price: z.number().positive('O preço deve ser maior que zero.'),
    is_starting_price: z.boolean().optional(),
    reduces_stock: z.boolean().optional(),
    maintenance_days: z.number().int().nonnegative().optional(),
    is_active: z.boolean().optional(),
    requires_deposit: z.boolean().optional(),
    deposit_type: z.enum(['percentage', 'fixed']).optional(),
    deposit_amount: z.number().nonnegative().optional(),
    variations: z.array(serviceVariationSchema).optional(),
    extras: z.array(serviceExtraSchema).optional(),
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

router.post('/import', authMiddleware, requireRole(['manager']), validate(importServicesSchema), async (req, res) => {
  const { services, options } = req.body;
  const tenantId = req.user.tenant_id;
  const userId = req.user.id;

  try {
    const result = await importServices(tenantId, services, options || {}, userId);
    return res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao importar serviços');
    return res.status(500).json({ error: 'Erro interno ao importar serviços.' });
  }
});

router.post('/', authMiddleware, requireRole(['manager']), validate(createServiceSchema), async (req, res) => {
  const { name, short_description, duration_minutes, price, is_starting_price, reduces_stock, maintenance_days, inputs, requires_deposit, deposit_type, deposit_amount, variations, extras } = req.body;
  const tenantId = req.user.tenant_id;

  try {
    const { newService, inputs: savedInputs, variations: savedVariations, extras: savedExtras } = await createService(
      tenantId, name, duration_minutes, price, is_starting_price, reduces_stock, maintenance_days, inputs, requires_deposit, deposit_type, deposit_amount, short_description, variations, extras
    );

    await logAudit({
      req,
      action: 'CREATE_SERVICE',
      entityName: 'cap_services',
      entityId: newService.id,
      newData: { ...newService, inputs: savedInputs, variations: savedVariations, extras: savedExtras }
    });

    return res.status(201).json({ ...newService, variations: savedVariations, extras: savedExtras });
  } catch (error) {
    req.log.error(error, 'Erro ao criar serviço');
    return res.status(500).json({ error: 'Erro interno ao cadastrar serviço.' });
  }
});

router.put('/:id', authMiddleware, requireRole(['manager']), validate(updateServiceSchema), async (req, res) => {
  const { id } = req.params;
  const { name, short_description, duration_minutes, price, is_starting_price, reduces_stock, maintenance_days, is_active, inputs, requires_deposit, deposit_type, deposit_amount, variations, extras } = req.body;
  const tenantId = req.user.tenant_id;

  try {
    const { oldService, updatedService, inputs: savedInputs, variations: savedVariations, extras: savedExtras } = await updateService(
      id, tenantId, name, duration_minutes, price, is_starting_price, reduces_stock, maintenance_days, is_active, inputs, requires_deposit, deposit_type, deposit_amount, short_description, variations, extras
    );

    await logAudit({
      req,
      action: 'UPDATE_SERVICE',
      entityName: 'cap_services',
      entityId: id,
      oldData: oldService,
      newData: { ...updatedService, inputs: savedInputs, variations: savedVariations, extras: savedExtras }
    });

    return res.json({ ...updatedService, variations: savedVariations, extras: savedExtras });
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
