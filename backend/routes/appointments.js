import express from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { authMiddleware } from '../middlewares/auth.js';
import { getClientById } from '../services/clientService.js';
import {
  listAppointments,
  getOccupiedSlots,
  getNextAvailableSlot,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  rescheduleAppointment,
  markAppointmentNoShow,
  undoAppointmentNoShow,
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

const serviceExtraItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  duration_minutes: z.coerce.number().int().nonnegative().optional()
});

const serviceItemSchema = z.object({
  service_id: z.string().uuid('ID do serviço inválido.'),
  variation_id: z.string().uuid('ID da variação inválido.').nullable().optional(),
  variation_name: z.string().nullable().optional(),
  extras: z.array(z.union([z.string().uuid(), serviceExtraItemSchema])).optional(),
  price: z.coerce.number().min(0, 'Preço inválido.').optional(),
  duration_minutes: z.coerce.number().int().positive().optional()
});

const createAppointmentSchema = z.object({
  body: z.object({
    client_id: z.string().uuid('ID do cliente inválido.').optional(),
    staff_id: z.union([z.string().uuid(), z.literal('any')]).nullable().optional(),
    service_id: z.string().uuid('ID do serviço inválido.').optional(),
    services: z.array(z.union([z.string().uuid(), serviceItemSchema])).optional(),
    start_time: z.string().datetime({ message: 'Data/hora de início inválida.' }),
    total_price: z.coerce.number().min(0, 'Preço total inválido.').optional(),
    client_membership_id: z.string().uuid('ID do plano inválido.').nullable().optional(),
    client_package_id: z.string().uuid('ID do pacote inválido.').nullable().optional(),
    use_package: z.boolean().optional(),
    cashback_redeemed: z.coerce.number().min(0, 'Valor de cashback inválido.').optional(),
    gift_card_code: z.string().optional()
  }).refine((data) => data.service_id || (data.services && data.services.length > 0), {
    message: 'É obrigatório selecionar ao menos um serviço para o agendamento.',
    path: ['service_id']
  }),
  params: z.any(), query: z.any()
});

const updateAppointmentSchema = z.object({
  body: z.object({
    staff_id: z.string().uuid('ID do funcionário inválido.').optional(),
    service_id: z.string().uuid('ID do serviço inválido.').optional(),
    services: z.array(z.union([z.string().uuid(), serviceItemSchema])).optional(),
    start_time: z.string().datetime({ message: 'Data/hora de início inválida.' }).optional(),
    total_price: z.number().min(0, 'Preço total inválido.').optional(),
    discount_applied: z.coerce.number().min(0).optional(),
    client_membership_id: z.string().uuid('ID do plano inválido.').nullable().optional(),
    cashback_redeemed: z.coerce.number().min(0, 'Valor de cashback inválido.').optional(),
    status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled', 'no_show']).optional(),
    checkin_status: z.enum(['pending', 'checked_in']).optional(),
    checkin_request: z.string().optional(),
    cancellation_reason: z.string().max(500).optional()
  }),
  params: z.object({
    id: z.string().uuid('ID de agendamento inválido.')
  }), query: z.any()
});

const rescheduleAppointmentSchema = z.object({
  body: z.object({
    start_time: z.string().datetime({ message: 'Data/hora de início inválida.' }),
    staff_id: z.union([z.string().uuid(), z.literal('any')]).nullable().optional()
  }),
  params: z.object({
    id: z.string().uuid('ID de agendamento inválido.')
  }),
  query: z.any()
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

  // Reforço de Segurança e Isolamento: Se o usuário for profissional, forçar filtro pelo próprio ID
  const effectiveStaffId = role === 'professional' ? id : staff_id;

  try {
    const appointments = await listAppointments({
      role, id, userTenantId, targetTenantId, start_date, end_date, staff_id: effectiveStaffId, client_id, limit, offset
    });
    return res.json(appointments);
  } catch (error) {
    req.log.error(error, 'Erro ao listar agendamentos');
    return res.status(500).json({ error: 'Erro interno ao obter agendamentos.' });
  }
});

// Listar Slots Ocupados (D5 P1: suporta filtro de múltiplos serviços e qualquer profissional)
router.get('/occupied-slots', async (req, res) => {
  const { tenant_id, date, staff_id, service_id, service_ids } = req.query;

  if (!tenant_id || !date) {
    return res.status(400).json({ error: 'Parâmetros tenant_id e date são obrigatórios.' });
  }

  try {
    let parsedServiceIds = service_ids;
    if (typeof service_ids === 'string') {
      try {
        parsedServiceIds = JSON.parse(service_ids);
      } catch (e) {
        parsedServiceIds = service_ids.split(',').filter(Boolean);
      }
    }

    const slots = await getOccupiedSlots({
      tenant_id,
      date,
      staff_id,
      service_id,
      service_ids: parsedServiceIds
    });
    return res.json(slots);
  } catch (error) {
    req.log.error(error, 'Erro ao buscar slots ocupados');
    return res.status(500).json({ error: 'Erro interno ao consultar horários ocupados.' });
  }
});

// Obter Próximo Horário Livre (D5 P1)
router.get('/next-available-slot', async (req, res) => {
  const { tenant_id, date, staff_id, service_id, services } = req.query;

  if (!tenant_id) {
    return res.status(400).json({ error: 'Parâmetro tenant_id é obrigatório.' });
  }

  try {
    let parsedServices = services;
    if (typeof services === 'string') {
      try {
        parsedServices = JSON.parse(services);
      } catch (e) {
        parsedServices = services.split(',').filter(Boolean);
      }
    }

    const nextSlot = await getNextAvailableSlot({
      tenant_id,
      date,
      staff_id,
      service_id,
      services: parsedServices
    });

    return res.json(nextSlot);
  } catch (error) {
    req.log.error(error, 'Erro ao buscar próximo horário livre');
    return res.status(500).json({ error: 'Erro interno ao consultar próximo horário livre.' });
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

// Criar Agendamento (Suporte a múltiplos serviços por visita - D4)
router.post('/', authMiddleware, validate(createAppointmentSchema), async (req, res) => {
  const { client_id, staff_id, service_id, services, start_time, total_price, client_membership_id, client_package_id, use_package, cashback_redeemed, gift_card_code } = req.body;
  const tenantId = req.user.tenant_id;
  const userId = req.user.id;
  const userRole = req.user.role;

  const finalClientId = userRole === 'client' ? userId : client_id;

  if (!finalClientId || !staff_id || (!service_id && (!services || services.length === 0)) || !start_time) {
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
      finalClientId, staff_id, service_id, services, start_time, total_price, tenantId, client_membership_id, client_package_id, use_package, cashback_redeemed, gift_card_code
    });
    return res.status(201).json(appointment);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    if (error.code === '23P01' || error.constraint === 'no_overlapping_appointments') {
      return res.status(409).json({ error: 'Esse horário acabou de ser ocupado. Por favor, escolha outro horário.' });
    }
    req.log.error(error, 'Erro ao criar agendamento');
    return res.status(500).json({ error: 'Erro interno ao salvar agendamento.' });
  }
});

// Atualizar Agendamento
router.put('/:id', authMiddleware, validate(updateAppointmentSchema), async (req, res) => {
  const { id } = req.params;
  const { staff_id, service_id, start_time, status, total_price, discount_applied, client_membership_id, cashback_redeemed, checkin_status, checkin_request, cancellation_reason } = req.body;
  const tenantId = req.user.tenant_id;
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    const updatedAppointment = await updateAppointment({
      id, tenantId, userRole, userId, staff_id, service_id, start_time, status, total_price, discount_applied, client_membership_id, cashback_redeemed, checkin_status, checkin_request, cancellation_reason
    });
    return res.json(updatedAppointment);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ 
        error: error.message,
        code: error.code,
        min_cancellation_hours: error.min_cancellation_hours,
        salon_phone: error.salon_phone
      });
    }
    if (error.code === '23P01' || error.constraint === 'no_overlapping_appointments') {
      return res.status(409).json({ error: 'Esse horário acabou de ser ocupado. Por favor, escolha outro horário.' });
    }
    req.log.error(error, 'Erro ao atualizar agendamento');
    if (error.constraint === 'check_quantity_min') {
      return res.status(400).json({ error: 'Estoque insuficiente para realizar a baixa dos produtos deste serviço.' });
    }
    return res.status(500).json({ error: 'Erro interno ao salvar alterações.' });
  }
});

// Remarcar Agendamento em 1 toque (D6 P1)
router.post('/:id/reschedule', authMiddleware, validate(rescheduleAppointmentSchema), async (req, res) => {
  const { id } = req.params;
  const { start_time, staff_id } = req.body;
  const tenantId = req.user.tenant_id;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const updated = await rescheduleAppointment({
      id,
      tenantId,
      userId,
      userRole,
      newStartTime: start_time,
      newStaffId: staff_id
    });
    return res.json(updated);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ 
        error: error.message,
        code: error.code,
        min_cancellation_hours: error.min_cancellation_hours,
        salon_phone: error.salon_phone
      });
    }
    if (error.code === '23P01' || error.constraint === 'no_overlapping_appointments') {
      return res.status(409).json({ error: 'Esse horário acabou de ser ocupado. Por favor, escolha outro horário.' });
    }
    req.log.error(error, 'Erro ao remarcar agendamento');
    return res.status(500).json({ error: 'Erro interno ao remarcar agendamento.' });
  }
});

// Marcar Falta / No-Show (D8 P1 - Gestores e Profissionais)
router.post('/:id/no-show', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenant_id;
  const staffId = req.user.id;
  const userRole = req.user.role;

  try {
    const result = await markAppointmentNoShow({ id, tenantId, staffId, userRole });
    return res.json({
      message: 'Falta registrada com sucesso.',
      ...result
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao registrar falta no agendamento');
    return res.status(500).json({ error: 'Erro interno ao registrar falta.' });
  }
});

// Desfazer Falta / Reverter No-Show (D8 P1 - Gestores e Profissionais)
router.post('/:id/undo-no-show', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenant_id;
  const staffId = req.user.id;
  const userRole = req.user.role;

  try {
    const result = await undoAppointmentNoShow({ id, tenantId, staffId, userRole });
    return res.json({
      message: 'Falta revertida com sucesso.',
      ...result
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    req.log.error(error, 'Erro ao desfazer falta no agendamento');
    return res.status(500).json({ error: 'Erro interno ao desfazer falta.' });
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
  const cancellation_reason = req.body?.cancellation_reason || req.query?.reason || null;

  try {
    const appointment = await deleteAppointment({ id, tenantId, userId, userRole, cancellation_reason });
    return res.json({ message: 'Agendamento cancelado com sucesso.', appointment });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ 
        error: error.message,
        code: error.code,
        min_cancellation_hours: error.min_cancellation_hours,
        salon_phone: error.salon_phone
      });
    }
    req.log.error(error, 'Erro ao cancelar agendamento');
    return res.status(500).json({ error: 'Erro interno ao cancelar agendamento.' });
  }
});

export default router;
