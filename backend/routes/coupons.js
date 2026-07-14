import express from 'express';
import { authMiddleware, requireRole } from '../middlewares/auth.js';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { logAudit } from '../services/auditService.js';
import {
  listCoupons,
  getCouponById,
  createCoupon,
  redeemCoupon,
  updateCoupon,
  deleteCoupon
} from '../services/couponService.js';

const router = express.Router();

const listCouponsSchema = z.object({
  query: z.object({
    tenant_id: z.string().uuid('ID do inquilino inválido.'),
    code: z.string().optional()
  }),
  body: z.any(), params: z.any()
});

const getCouponSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do cupom inválido.')
  }),
  query: z.object({
    tenant_id: z.string().uuid('ID do inquilino inválido.')
  }),
  body: z.any()
});

const createCouponSchema = z.object({
  body: z.object({
    code: z.string().min(1, 'Código é obrigatório.'),
    discount_type: z.enum(['percentage', 'fixed'], { errorMap: () => ({ message: 'Tipo de desconto inválido. Deve ser percentage ou fixed.' }) }),
    discount_value: z.number().positive('Valor do desconto deve ser maior que zero.'),
    max_uses: z.number().int().nonnegative().nullable().optional(),
    expires_at: z.string().nullable().optional(),
    service_id: z.string().uuid('ID do serviço inválido.').nullable().optional()
  }),
  query: z.any(), params: z.any()
});

const redeemCouponSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do cupom inválido.')
  }),
  query: z.object({
    tenant_id: z.string().uuid('ID do inquilino inválido.')
  }),
  body: z.any()
});

const updateCouponSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do cupom inválido.')
  }),
  body: z.object({
    code: z.string().optional(),
    discount_type: z.enum(['percentage', 'fixed']).optional(),
    discount_value: z.number().positive().optional(),
    max_uses: z.number().int().nonnegative().nullable().optional(),
    expires_at: z.string().nullable().optional(),
    service_id: z.string().uuid().nullable().optional()
  }),
  query: z.any()
});

const deleteCouponSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do cupom inválido.')
  }),
  query: z.any(), body: z.any()
});

router.get('/', authMiddleware, validate(listCouponsSchema), async (req, res) => {
  const { tenant_id, code } = req.query;

  try {
    const mapped = await listCoupons(tenant_id, code);
    return res.json(mapped);
  } catch (error) {
    req.log.error(error, 'Erro ao listar cupons');
    return res.status(500).json({ error: 'Erro interno ao consultar cupons.' });
  }
});

router.get('/:id', authMiddleware, validate(getCouponSchema), async (req, res) => {
  const { id } = req.params;
  const { tenant_id } = req.query;

  try {
    const coupon = await getCouponById(id, tenant_id);
    return res.json(coupon);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao buscar cupom por ID');
    return res.status(500).json({ error: 'Erro interno ao buscar cupom.' });
  }
});

router.post('/', authMiddleware, requireRole(['manager']), validate(createCouponSchema), async (req, res) => {
  const { code, discount_type, discount_value, max_uses, expires_at, service_id } = req.body;
  const tenantId = req.user.tenant_id;

  try {
    const newCoupon = await createCoupon(tenantId, code, discount_type, discount_value, max_uses, expires_at, service_id);

    await logAudit({
      req,
      action: 'CREATE_COUPON',
      entityName: 'cap_coupons',
      entityId: newCoupon.id,
      newData: newCoupon
    });

    return res.status(201).json(newCoupon);
  } catch (error) {
    req.log.error(error, 'Erro ao criar cupom');
    return res.status(500).json({ error: 'Erro interno ao salvar cupom.' });
  }
});

router.post('/:id/redeem', authMiddleware, validate(redeemCouponSchema), async (req, res) => {
  const { id } = req.params;
  const { tenant_id } = req.query;
  
  try {
    const { currentCoupon, updatedCoupon } = await redeemCoupon(id, tenant_id);

    await logAudit({
      req,
      action: 'REDEEM_COUPON',
      entityName: 'cap_coupons',
      entityId: id,
      oldData: currentCoupon,
      newData: updatedCoupon
    });

    return res.json(updatedCoupon);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao resgatar cupom');
    return res.status(500).json({ error: 'Erro interno ao resgatar cupom.' });
  }
});

router.put('/:id', authMiddleware, requireRole(['manager']), validate(updateCouponSchema), async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenant_id;
  const { code, discount_type, discount_value, max_uses, expires_at, service_id } = req.body;

  try {
    const { currentCoupon, updatedCoupon } = await updateCoupon(id, tenantId, code, discount_type, discount_value, max_uses, expires_at, service_id);

    await logAudit({
      req,
      action: 'UPDATE_COUPON',
      entityName: 'cap_coupons',
      entityId: id,
      oldData: currentCoupon,
      newData: updatedCoupon
    });

    return res.json(updatedCoupon);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao atualizar cupom');
    return res.status(500).json({ error: 'Erro interno ao atualizar cupom.' });
  }
});

router.delete('/:id', authMiddleware, requireRole(['manager']), validate(deleteCouponSchema), async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenant_id;

  try {
    const deletedCoupon = await deleteCoupon(id, tenantId);

    await logAudit({
      req,
      action: 'DELETE_COUPON',
      entityName: 'cap_coupons',
      entityId: id,
      oldData: deletedCoupon
    });

    return res.json({ message: 'Cupom removido com sucesso.', coupon: deletedCoupon });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    req.log.error(error, 'Erro ao remover cupom');
    return res.status(500).json({ error: 'Erro interno ao excluir cupom.' });
  }
});

export default router;
