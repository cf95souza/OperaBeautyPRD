import express from 'express';
import { authMiddleware, optionalAuth, requireRole } from '../middlewares/auth.js';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { logAudit } from '../services/auditService.js';
import { getBusinessHours, updateBusinessHours, getExceptions, createException, deleteException, getPaymentGateway } from '../services/settingsService.js';

const router = express.Router();

const getBusinessHoursSchema = z.object({
  query: z.object({
    tenant_id: z.string().uuid('ID do inquilino inválido.').optional()
  }),
  body: z.any(), params: z.any()
});

const updateBusinessHoursSchema = z.object({
  body: z.object({
    hours: z.array(z.object({
      day_of_week: z.number().int().min(0).max(6, 'Dia da semana deve ser de 0 a 6.'),
      open_time: z.string().nullable().optional(),
      close_time: z.string().nullable().optional(),
      is_closed: z.boolean().optional()
    }), { required_error: 'Array de horários é obrigatório.' })
  }),
  query: z.any(), params: z.any()
});

const getExceptionsSchema = z.object({
  query: z.object({
    tenant_id: z.string().uuid('ID do inquilino inválido.').optional()
  }),
  body: z.any(), params: z.any()
});

const createExceptionSchema = z.object({
  body: z.object({
    exception_date: z.string().min(1, 'Data de exceção é obrigatória.'),
    is_closed: z.boolean().optional(),
    open_time: z.string().nullable().optional(),
    close_time: z.string().nullable().optional(),
    reason: z.string().optional()
  }),
  query: z.any(), params: z.any()
});

const deleteExceptionSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID da exceção inválido.')
  }),
  query: z.any(), body: z.any()
});


router.get('/business-hours', optionalAuth, validate(getBusinessHoursSchema), async (req, res) => {
  let tenantId = req.query.tenant_id;
  if (!tenantId && req.user) {
    tenantId = req.user.tenant_id;
  }
  if (!tenantId) {
    return res.status(400).json({ error: 'É necessário fornecer o tenant_id para obter os horários.' });
  }

  try {
    const hours = await getBusinessHours(tenantId);
    return res.json(hours);
  } catch (error) {
    req.log.error(error, 'Erro ao buscar horários de funcionamento');
    return res.status(500).json({ error: 'Erro interno ao consultar horários de funcionamento.' });
  }
});

router.put('/business-hours', authMiddleware, requireRole(['manager']), validate(updateBusinessHoursSchema), async (req, res) => {
  const { hours } = req.body;
  const tenantId = req.user.tenant_id;

  try {
    await updateBusinessHours(tenantId, hours);

    await logAudit({
      req,
      action: 'UPDATE_BUSINESS_HOURS',
      entityName: 'cap_business_hours',
      newData: hours
    });

    return res.json({ message: 'Horários de funcionamento salvos com sucesso.' });
  } catch (error) {
    req.log.error(error, 'Erro ao atualizar horários padrão');
    return res.status(500).json({ error: 'Erro interno ao salvar configurações de horários.' });
  }
});

router.get('/exceptions', optionalAuth, validate(getExceptionsSchema), async (req, res) => {
  let tenantId = req.query.tenant_id;
  if (!tenantId && req.user) {
    tenantId = req.user.tenant_id;
  }
  if (!tenantId) {
    return res.status(400).json({ error: 'É necessário fornecer o tenant_id para obter exceções.' });
  }

  try {
    const exceptions = await getExceptions(tenantId);
    return res.json(exceptions);
  } catch (error) {
    req.log.error(error, 'Erro ao listar exceções de data');
    return res.status(500).json({ error: 'Erro interno ao consultar exceções.' });
  }
});

router.post('/exceptions', authMiddleware, requireRole(['manager']), validate(createExceptionSchema), async (req, res) => {
  const { exception_date, is_closed, open_time, close_time, reason } = req.body;
  const tenantId = req.user.tenant_id;

  try {
    const newException = await createException(tenantId, exception_date, is_closed, open_time, close_time, reason);

    await logAudit({
      req,
      action: 'CREATE_EXCEPTION',
      entityName: 'cap_date_exceptions',
      entityId: newException.id,
      newData: newException
    });

    return res.status(201).json(newException);
  } catch (error) {
    req.log.error(error, 'Erro ao criar exceção de data');
    return res.status(500).json({ error: 'Erro interno ao salvar exceção de data.' });
  }
});

router.delete('/exceptions/:id', authMiddleware, requireRole(['manager']), validate(deleteExceptionSchema), async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenant_id;

  try {
    const exception = await deleteException(id, tenantId);

    await logAudit({
      req,
      action: 'DELETE_EXCEPTION',
      entityName: 'cap_date_exceptions',
      entityId: id,
      oldData: exception
    });

    return res.json({ message: 'Exceção de data removida com sucesso.', exception });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao remover exceção de data');
    return res.status(500).json({ error: 'Erro interno ao excluir exceção.' });
  }
});

router.get('/payment-gateway', authMiddleware, async (req, res) => {
  try {
    const data = await getPaymentGateway();
    return res.json(data);
  } catch (error) {
    req.log.error(error, 'Erro ao consultar payment_gateway da plataforma');
    return res.status(500).json({ error: 'Erro interno ao consultar meios de pagamento.' });
  }
});

export default router;
