import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authMiddleware } from '../middlewares/auth.js';
import { getClientById } from '../services/clientService.js';
import {
  listAppointments,
  getOccupiedSlots,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  payCommissions
} from '../services/appointmentService.js';

const router = express.Router();

const listAppointmentsSchema = z.object({
  query: z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    staff_id: z.string().uuid('ID do funcionário inválido.').optional(),
    client_id: z.string().uuid('ID do cliente inválido.').optional(),
    tenant_id: z.string().uuid('ID do inquilino inválido.').optional(),
    limit: z.preprocess((val) => (val ? parseInt(val) : undefined), z.number().int().positive().optional()),
    offset: z.preprocess((val) => (val ? parseInt(val) : undefined), z.number().int().nonnegative().optional())
  }),
  body: z.any(), params: z.any()
});

const createAppointmentSchema = z.object({
  body: z.object({
    client_id: z.string().uuid('ID do cliente inválido.').optional(),
    staff_id: z.string().uuid('ID do funcionário inválido.'),
    service_id: z.string().uuid('ID do serviço inválido.'),
    start_time: z.string().datetime({ message: 'Data/hora de início inválida.' }),
    total_price: z.number().min(0, 'Preço total inválido.')
  }),
  params: z.any(), query: z.any()
});

const updateAppointmentSchema = z.object({
  body: z.object({
    staff_id: z.string().uuid('ID do funcionário inválido.').optional(),
    service_id: z.string().uuid('ID do serviço inválido.').optional(),
    start_time: z.string().datetime({ message: 'Data/hora de início inválida.' }).optional(),
    status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled', 'no_show']).optional(),
    total_price: z.number().min(0, 'Preço total inválido.').optional()
  }),
  params: z.object({
    id: z.string().uuid('ID de agendamento inválido.')
  }), query: z.any()
});

// Listar Agendamentos
router.get('/', authMiddleware, validate(listAppointmentsSchema), async (req, res) => {
  const { id, role } = req.user;
  const userTenantId = req.user.tenant_id;
  const { start_date, end_date, staff_id, client_id, tenant_id } = req.query;
  const limit = parseInt(req.query.limit) || 1000;
  const offset = parseInt(req.query.offset) || 0;

  const targetTenantId = role === 'superadmin' ? tenant_id : userTenantId;

  if (!targetTenantId) {
    return res.status(400).json({ error: 'tenant_id é obrigatório para listar agendamentos.' });
  }

  try {
    const appointments = await listAppointments({
      role, id, userTenantId, targetTenantId, start_date, end_date, staff_id, client_id, limit, offset
    });
    return res.json(appointments);
  } catch (error) {
    req.log.error(error, 'Erro ao listar agendamentos');
    return res.status(500).json({ error: 'Erro interno ao obter agendamentos.' });
  }
});

// Listar Slots Ocupados
router.get('/occupied-slots', async (req, res) => {
  const { tenant_id, date, staff_id } = req.query;

  if (!tenant_id || !date) {
    return res.status(400).json({ error: 'Parâmetros tenant_id e date são obrigatórios.' });
  }

  try {
    const slots = await getOccupiedSlots({ tenant_id, date, staff_id });
    return res.json(slots);
  } catch (error) {
    req.log.error(error, 'Erro ao buscar slots ocupados');
    return res.status(500).json({ error: 'Erro interno ao consultar horários ocupados.' });
  }
});

// Obter detalhes de um agendamento específico
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { role, tenant_id, id: userId } = req.user;

  try {
    const appointment = await getAppointmentById({ id, tenant_id, role, userId });
    return res.json(appointment);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao obter detalhes do agendamento');
    return res.status(500).json({ error: 'Erro interno ao obter detalhes do agendamento.' });
  }
});

// Criar Agendamento
router.post('/', authMiddleware, validate(createAppointmentSchema), async (req, res) => {
  const { client_id, staff_id, service_id, start_time, total_price } = req.body;
  const tenantId = req.user.tenant_id;
  const userId = req.user.id;
  const userRole = req.user.role;

  const finalClientId = userRole === 'client' ? userId : client_id;

  if (!finalClientId || !staff_id || !service_id || !start_time || total_price === undefined) {
    return res.status(400).json({ error: 'Parâmetros insuficientes para criar agendamento.' });
  }

  if (userRole !== 'client') {
    try {
      await getClientById(finalClientId, tenantId, userId, userRole);
    } catch (error) {
      return res.status(403).json({ error: 'Acesso negado ou cliente não pertence a este inquilino.' });
    }
  }

  try {
    const appointment = await createAppointment({
      finalClientId, staff_id, service_id, start_time, total_price, tenantId
    });
    return res.status(201).json(appointment);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao criar agendamento');
    return res.status(500).json({ error: 'Erro interno ao salvar agendamento.' });
  }
});

// Atualizar Agendamento
router.put('/:id', authMiddleware, validate(updateAppointmentSchema), async (req, res) => {
  const { id } = req.params;
  const { staff_id, service_id, start_time, status, total_price } = req.body;
  const tenantId = req.user.tenant_id;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    const updatedAppointment = await updateAppointment({
      id, tenantId, userRole, userId, staff_id, service_id, start_time, status, total_price
    });
    return res.json(updatedAppointment);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao atualizar agendamento');
    if (error.constraint === 'check_quantity_min') {
      return res.status(400).json({ error: 'Estoque insuficiente para realizar a baixa dos produtos deste serviço.' });
    }
    return res.status(500).json({ error: 'Erro interno ao salvar alterações.' });
  }
});

// Pagar comissões (Fechamento)
router.put('/pay-commissions', authMiddleware, async (req, res) => {
  const { staff_id } = req.body;
  const tenantId = req.user.tenant_id;
  const userRole = req.user.role;

  if (!staff_id) {
    return res.status(400).json({ error: 'ID do funcionário é obrigatório.' });
  }

  try {
    const result = await payCommissions({ tenantId, userRole, staff_id });
    return res.json({ message: 'Comissões pagas com sucesso.', ...result });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao pagar comissões');
    return res.status(500).json({ error: 'Erro interno ao processar pagamento de comissões.' });
  }
});

// Deletar / Cancelar Agendamento
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenant_id;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const appointment = await deleteAppointment({ id, tenantId, userId, userRole });
    return res.json({ message: 'Agendamento cancelado com sucesso.', appointment });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao cancelar agendamento');
    return res.status(500).json({ error: 'Erro interno ao cancelar agendamento.' });
  }
});

export default router;
