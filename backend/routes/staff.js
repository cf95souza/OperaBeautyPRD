import express from 'express';
import { authMiddleware, optionalAuth, requireRole } from '../middlewares/auth.js';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { logAudit } from '../services/auditService.js';
import { listStaff, updateSelf, createStaff, updateStaff, deleteStaff } from '../services/staffService.js';

const router = express.Router();

const listStaffSchema = z.object({
  query: z.object({
    tenant_id: z.string().uuid('ID do inquilino inválido.').optional()
  }),
  body: z.any(), params: z.any()
});

const updateSelfSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome não pode ser vazio.').optional(),
    phone: z.string().optional(),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres.').regex(/[A-Z]/, 'Precisa ter 1 maiúscula.').regex(/[a-z]/, 'Precisa ter 1 minúscula.').regex(/[\W_]/, 'Precisa ter 1 caractere especial.').optional()
  }),
  query: z.any(), params: z.any()
});

const createStaffSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório.'),
    phone: z.string().min(1, 'Telefone é obrigatório.'),
    email: z.string().email('E-mail inválido.'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres.').regex(/[A-Z]/, 'Precisa ter 1 maiúscula.').regex(/[a-z]/, 'Precisa ter 1 minúscula.').regex(/[\W_]/, 'Precisa ter 1 caractere especial.'),
    role: z.enum(['professional', 'manager', 'admin'], { errorMap: () => ({ message: 'Cargo inválido. Deve ser professional, manager ou admin.' }) }),
    commission_rate: z.number().min(0).max(100).optional()
  }),
  query: z.any(), params: z.any()
});

const updateStaffSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do funcionário inválido.')
  }),
  body: z.object({
    name: z.string().min(1, 'Nome é obrigatório.'),
    phone: z.string().min(1, 'Telefone é obrigatório.'),
    email: z.string().email('E-mail inválido.'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres.').regex(/[A-Z]/, 'Precisa ter 1 maiúscula.').regex(/[a-z]/, 'Precisa ter 1 minúscula.').regex(/[\W_]/, 'Precisa ter 1 caractere especial.').nullable().optional(),
    role: z.enum(['professional', 'manager', 'admin']).optional(),
    commission_rate: z.number().min(0).max(100).optional(),
    is_active: z.boolean().optional()
  }),
  query: z.any()
});

const deleteStaffSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do funcionário inválido.')
  }),
  query: z.any(), body: z.any()
});


router.get('/', authMiddleware, validate(listStaffSchema), async (req, res) => {
  const tenantId = req.user.role === 'superadmin' ? req.query.tenant_id : req.user.tenant_id;

  if (req.user.role === 'superadmin' && !tenantId) {
    return res.status(400).json({ error: 'tenant_id é obrigatório para superadmin.' });
  }

  try {
    const staffList = await listStaff(tenantId);
    return res.json(staffList);
  } catch (error) {
    req.log.error(error, 'Erro ao listar equipe');
    return res.status(500).json({ error: 'Erro interno ao obter profissionais.' });
  }
});

router.put('/me', authMiddleware, requireRole(['manager', 'professional']), validate(updateSelfSchema), async (req, res) => {
  const { name, phone, password } = req.body;
  const staffId = req.user.id;
  const tenantId = req.user.tenant_id;

  try {
    const updatedUser = await updateSelf(staffId, tenantId, name, phone, password);
    return res.json(updatedUser);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao atualizar perfil do staff');
    return res.status(500).json({ error: 'Erro interno ao atualizar perfil.' });
  }
});

router.post('/', authMiddleware, requireRole(['manager']), validate(createStaffSchema), async (req, res) => {
  const { name, phone, email, password, role, commission_rate } = req.body;
  const tenantId = req.user.tenant_id;

  try {
    const newStaff = await createStaff(tenantId, name, phone, email, password, role, commission_rate);

    await logAudit({
      req,
      action: 'CREATE_STAFF',
      entityName: 'cap_staff',
      entityId: newStaff.id,
      newData: newStaff
    });

    return res.status(201).json(newStaff);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao criar funcionário');
    return res.status(500).json({ error: 'Erro interno ao cadastrar funcionário.' });
  }
});

router.put('/:id', authMiddleware, validate(updateStaffSchema), async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, password, role, commission_rate, is_active } = req.body;
  const tenantId = req.user.tenant_id;
  const isSelf = req.user.id === id;
  const isManager = req.user.role === 'manager' || req.user.role === 'admin';

  try {
    const { currentStaff, updatedStaff } = await updateStaff(id, tenantId, isSelf, isManager, name, phone, email, password, role, commission_rate, is_active);

    await logAudit({
      req,
      action: 'UPDATE_STAFF',
      entityName: 'cap_staff',
      entityId: id,
      oldData: currentStaff,
      newData: updatedStaff
    });

    return res.json(updatedStaff);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao atualizar funcionário');
    return res.status(500).json({ error: 'Erro interno ao salvar funcionário.' });
  }
});

router.delete('/:id', authMiddleware, requireRole(['manager']), validate(deleteStaffSchema), async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenant_id;

  try {
    const deletedStaff = await deleteStaff(id, tenantId);

    await logAudit({
      req,
      action: 'DELETE_STAFF',
      entityName: 'cap_staff',
      entityId: id,
      oldData: deletedStaff,
      newData: { is_active: false }
    });

    return res.json({ message: 'Funcionário desativado com sucesso.', staff: deletedStaff });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao desativar funcionário');
    return res.status(500).json({ error: 'Erro interno ao remover funcionário.' });
  }
});

export default router;
