import pool from '../config/db.js';
import { tenantQuery, tenantTransaction } from '../utils/tenantQuery.js';
import { validateCoupon, redeemCoupon } from './couponService.js';
import { processCashbackRedemption } from './walletService.js';
import { redeemGiftCard } from './giftcardService.js';
import { getCurrentCashRegister } from './cashRegisterService.js';
import { completeReferralOnAppointmentCompleted } from './referralService.js';

/**
 * Gera um número sequencial e amigável para a comanda (ex: CMD-20261027-001)
 */
const generateOrderNumber = async (client, tenantId) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countRes = await client.query(
    `SELECT COUNT(id)::int as count 
     FROM public.cap_orders 
     WHERE tenant_id = $1 AND created_at::date = CURRENT_DATE`,
    [tenantId]
  );
  const nextSeq = (countRes.rows[0].count + 1).toString().padStart(3, '0');
  return `CMD-${dateStr}-${nextSeq}`;
};

/**
 * Cria uma nova Comanda Unificada (Aberta).
 */
export const createOrder = async (tenantId, staffId, data) => {
  return await tenantTransaction(tenantId, async (client) => {
    const {
      client_id,
      appointment_id,
      items = [],
      tip_amount = 0,
      tip_staff_id = null,
      coupon_code = null,
      notes = null
    } = data;

    const orderNumber = await generateOrderNumber(client, tenantId);

    // 1. Se vinculada a um agendamento, valida e busca dados se items estiver vazio
    let finalItems = [...items];
    let resolvedClientId = client_id;

    if (appointment_id) {
      const apptRes = await client.query(
        `SELECT a.*, s.name as service_name, s.price as service_price, s.duration_minutes
         FROM public.cap_appointments a
         LEFT JOIN public.cap_services s ON a.service_id = s.id
         WHERE a.id = $1 AND a.tenant_id = $2`,
        [appointment_id, tenantId]
      );

      if (apptRes.rows.length === 0) {
        const error = new Error('Agendamento vinculado não encontrado.');
        error.statusCode = 404;
        throw error;
      }

      const appt = apptRes.rows[0];
      if (!resolvedClientId && appt.client_id) {
        resolvedClientId = appt.client_id;
      }

      // Se nenhum item foi passado manualmente, preenche com os serviços do agendamento
      if (finalItems.length === 0) {
        // Busca serviços N:M de cap_appointment_services
        const apptServicesRes = await client.query(
          `SELECT asrv.*, s.name as service_name
           FROM public.cap_appointment_services asrv
           JOIN public.cap_services s ON asrv.service_id = s.id
           WHERE asrv.appointment_id = $1 AND asrv.tenant_id = $2
           ORDER BY asrv.order_index ASC`,
          [appointment_id, tenantId]
        );

        if (apptServicesRes.rows.length > 0) {
          finalItems = apptServicesRes.rows.map(s => ({
            item_type: 'service',
            service_id: s.service_id,
            staff_id: appt.staff_id,
            name: s.service_name,
            quantity: 1,
            unit_price: parseFloat(s.price || 0),
            variation_name: s.variation_name || null,
            selected_extras: s.selected_extras || []
          }));
        } else if (appt.service_id) {
          finalItems.push({
            item_type: 'service',
            service_id: appt.service_id,
            staff_id: appt.staff_id,
            name: appt.service_name || 'Procedimento',
            quantity: 1,
            unit_price: parseFloat(appt.total_price || appt.service_price || 0)
          });
        }
      }
    }

    // 2. Calcula Subtotal
    let subtotal = 0;
    for (const it of finalItems) {
      const q = Math.max(1, parseInt(it.quantity) || 1);
      const u = Math.max(0, parseFloat(it.unit_price) || 0);
      subtotal += (q * u);
    }

    // 3. Aplica Cupom se fornecido
    let discountAmount = 0;
    let couponId = null;
    let cleanCouponCode = null;

    if (coupon_code && coupon_code.trim()) {
      cleanCouponCode = coupon_code.trim().toUpperCase();
      try {
        const couponRes = await validateCoupon(tenantId, cleanCouponCode, subtotal);
        if (couponRes && couponRes.discount_amount) {
          discountAmount = parseFloat(couponRes.discount_amount) || 0;
          couponId = couponRes.id;
        }
      } catch (err) {
        // Ignora ou propaga se código inválido
      }
    }

    const tip = Math.max(0, parseFloat(tip_amount) || 0);
    const totalAmount = Math.max(0, subtotal - discountAmount + tip);

    // 4. Cria a Comanda
    const orderRes = await client.query(
      `INSERT INTO public.cap_orders (
         tenant_id, client_id, appointment_id, staff_id, order_number, status,
         subtotal, discount_amount, coupon_id, coupon_code, tip_amount, tip_staff_id,
         total_amount, paid_amount, notes, created_at
       )
       VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, $8, $9, $10, $11, $12, 0.00, $13, NOW())
       RETURNING *`,
      [
        tenantId,
        resolvedClientId || null,
        appointment_id || null,
        staffId,
        orderNumber,
        subtotal,
        discountAmount,
        couponId,
        cleanCouponCode,
        tip,
        tip_staff_id || null,
        totalAmount,
        notes || null
      ]
    );

    const order = orderRes.rows[0];

    // 5. Insere os Itens da Comanda
    const insertedItems = [];
    for (const it of finalItems) {
      const q = Math.max(1, parseInt(it.quantity) || 1);
      const u = Math.max(0, parseFloat(it.unit_price) || 0);
      const totalItem = q * u;

      // Busca taxa de comissão se for serviço com profissional
      let commRate = 0;
      let commAmount = 0;
      if (it.item_type === 'service' && it.staff_id) {
        const staffRes = await client.query(
          'SELECT commission_rate FROM public.cap_staff WHERE id = $1 AND tenant_id = $2',
          [it.staff_id, tenantId]
        );
        if (staffRes.rows.length > 0) {
          commRate = parseFloat(staffRes.rows[0].commission_rate) || 0;
          commAmount = (totalItem * commRate) / 100;
        }
      }

      const itemRes = await client.query(
        `INSERT INTO public.cap_order_items (
           tenant_id, order_id, item_type, service_id, inventory_id, staff_id,
           name, quantity, unit_price, total_price, commission_rate, commission_amount,
           variation_name, selected_extras, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
         RETURNING *`,
        [
          tenantId,
          order.id,
          it.item_type || 'service',
          it.service_id || null,
          it.inventory_id || null,
          it.staff_id || null,
          it.name || 'Item',
          q,
          u,
          totalItem,
          commRate,
          commAmount,
          it.variation_name || null,
          JSON.stringify(it.selected_extras || [])
        ]
      );
      insertedItems.push(itemRes.rows[0]);
    }

    return { ...order, items: insertedItems };
  });
};

/**
 * Adiciona um item (serviço ou produto) a uma comanda aberta.
 */
export const addItemToOrder = async (tenantId, orderId, item) => {
  return await tenantTransaction(tenantId, async (client) => {
    const orderRes = await client.query(
      `SELECT * FROM public.cap_orders WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [orderId, tenantId]
    );

    if (orderRes.rows.length === 0) {
      const error = new Error('Comanda não encontrada.');
      error.statusCode = 404;
      throw error;
    }

    const order = orderRes.rows[0];
    if (order.status !== 'open') {
      const error = new Error('Não é possível adicionar itens a uma comanda já fechada ou cancelada.');
      error.statusCode = 400;
      throw error;
    }

    const q = Math.max(1, parseInt(item.quantity) || 1);
    let u = parseFloat(item.unit_price);
    let name = item.name;

    // Se for produto, valida estoque e obtém preço oficial
    if (item.item_type === 'product' && item.inventory_id) {
      const invRes = await client.query(
        'SELECT name, price, quantity FROM public.cap_inventory WHERE id = $1 AND tenant_id = $2',
        [item.inventory_id, tenantId]
      );
      if (invRes.rows.length === 0) {
        const error = new Error('Produto não encontrado no estoque.');
        error.statusCode = 404;
        throw error;
      }
      const inv = invRes.rows[0];
      if (parseFloat(inv.quantity) < q) {
        const error = new Error(`Estoque insuficiente para o produto "${inv.name}". Disponível: ${inv.quantity}`);
        error.statusCode = 400;
        throw error;
      }
      name = inv.name;
      if (isNaN(u) || u <= 0) u = parseFloat(inv.price) || 0;
    } else if (item.item_type === 'service' && item.service_id) {
      const srvRes = await client.query(
        'SELECT name, price FROM public.cap_services WHERE id = $1 AND tenant_id = $2',
        [item.service_id, tenantId]
      );
      if (srvRes.rows.length > 0) {
        name = srvRes.rows[0].name;
        if (isNaN(u) || u <= 0) u = parseFloat(srvRes.rows[0].price) || 0;
      }
    }

    const totalPrice = q * (u || 0);

    // Calcula comissão
    let commRate = 0;
    let commAmount = 0;
    if (item.staff_id) {
      const staffRes = await client.query(
        'SELECT commission_rate FROM public.cap_staff WHERE id = $1 AND tenant_id = $2',
        [item.staff_id, tenantId]
      );
      if (staffRes.rows.length > 0) {
        commRate = parseFloat(staffRes.rows[0].commission_rate) || 0;
        commAmount = (totalPrice * commRate) / 100;
      }
    }

    const itemRes = await client.query(
      `INSERT INTO public.cap_order_items (
         tenant_id, order_id, item_type, service_id, inventory_id, staff_id,
         name, quantity, unit_price, total_price, commission_rate, commission_amount,
         variation_name, selected_extras, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
       RETURNING *`,
      [
        tenantId,
        orderId,
        item.item_type || 'service',
        item.service_id || null,
        item.inventory_id || null,
        item.staff_id || null,
        name || 'Item',
        q,
        u || 0,
        totalPrice,
        commRate,
        commAmount,
        item.variation_name || null,
        JSON.stringify(item.selected_extras || [])
      ]
    );

    // Recalcula totais da comanda
    await client.query(
      `UPDATE public.cap_orders
       SET subtotal = subtotal + $1,
           total_amount = GREATEST(0, subtotal + $1 - discount_amount + tip_amount)
       WHERE id = $2 AND tenant_id = $3`,
      [totalPrice, orderId, tenantId]
    );

    return itemRes.rows[0];
  });
};

/**
 * Remove um item de uma comanda aberta.
 */
export const removeItemFromOrder = async (tenantId, orderId, itemId) => {
  return await tenantTransaction(tenantId, async (client) => {
    const itemRes = await client.query(
      `SELECT * FROM public.cap_order_items WHERE id = $1 AND order_id = $2 AND tenant_id = $3`,
      [itemId, orderId, tenantId]
    );

    if (itemRes.rows.length === 0) {
      const error = new Error('Item da comanda não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    const item = itemRes.rows[0];

    // Valida status da comanda
    const orderRes = await client.query(
      `SELECT status FROM public.cap_orders WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [orderId, tenantId]
    );
    if (orderRes.rows[0].status !== 'open') {
      const error = new Error('Não é possível remover itens de uma comanda fechada.');
      error.statusCode = 400;
      throw error;
    }

    await client.query(
      'DELETE FROM public.cap_order_items WHERE id = $1 AND tenant_id = $2',
      [itemId, tenantId]
    );

    await client.query(
      `UPDATE public.cap_orders
       SET subtotal = GREATEST(0, subtotal - $1),
           total_amount = GREATEST(0, subtotal - $1 - discount_amount + tip_amount)
       WHERE id = $2 AND tenant_id = $3`,
      [parseFloat(item.total_price), orderId, tenantId]
    );

    return { success: true };
  });
};

/**
 * Realiza o Checkout e Quitação da Comanda com Split Payment e Baixa Atômica de Estoque.
 */
export const checkoutOrder = async (tenantId, orderId, staffId, checkoutData) => {
  return await tenantTransaction(tenantId, async (client) => {
    // 1. Lock da Comanda
    const orderRes = await client.query(
      `SELECT * FROM public.cap_orders WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [orderId, tenantId]
    );

    if (orderRes.rows.length === 0) {
      const error = new Error('Comanda não encontrada.');
      error.statusCode = 404;
      throw error;
    }

    const order = orderRes.rows[0];
    if (order.status === 'paid') {
      const error = new Error('Esta comanda já foi quitada.');
      error.statusCode = 400;
      throw error;
    }
    if (order.status === 'cancelled') {
      const error = new Error('Esta comanda foi cancelada.');
      error.statusCode = 400;
      throw error;
    }

    const {
      payments = [],
      tip_amount = order.tip_amount,
      tip_staff_id = order.tip_staff_id,
      discount_amount = order.discount_amount,
      notes = order.notes
    } = checkoutData;

    if (!Array.isArray(payments) || payments.length === 0) {
      const error = new Error('É necessário informar ao menos uma forma de pagamento.');
      error.statusCode = 400;
      throw error;
    }

    // 2. Busca e valida todos os itens da comanda
    const itemsRes = await client.query(
      `SELECT * FROM public.cap_order_items WHERE order_id = $1 AND tenant_id = $2`,
      [orderId, tenantId]
    );
    const items = itemsRes.rows;

    if (items.length === 0) {
      const error = new Error('A comanda não possui itens para fechamento.');
      error.statusCode = 400;
      throw error;
    }

    // 3. Baixa Atômica no Estoque para Itens do tipo 'product' (com FOR UPDATE ordenado)
    const productItems = items.filter(it => it.item_type === 'product' && it.inventory_id);
    const sortedProductItems = [...productItems].sort((a, b) => String(a.inventory_id).localeCompare(String(b.inventory_id)));

    for (const prod of sortedProductItems) {
      const invLock = await client.query(
        `SELECT id, name, quantity FROM public.cap_inventory 
         WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
        [prod.inventory_id, tenantId]
      );

      if (invLock.rows.length === 0) {
        const error = new Error(`Produto "${prod.name}" não encontrado no inventário.`);
        error.statusCode = 404;
        throw error;
      }

      const availableQty = parseFloat(invLock.rows[0].quantity) || 0;
      if (availableQty < prod.quantity) {
        const error = new Error(`Estoque insuficiente para o produto "${prod.name}". Disponível: ${availableQty}, Solicitado: ${prod.quantity}.`);
        error.statusCode = 400;
        throw error;
      }

      // Baixa atômica
      const updateInv = await client.query(
        `UPDATE public.cap_inventory
         SET quantity = quantity - $1
         WHERE id = $2 AND tenant_id = $3 AND quantity >= $1
         RETURNING id, quantity`,
        [prod.quantity, prod.inventory_id, tenantId]
      );

      if (updateInv.rowCount === 0) {
        const error = new Error(`Falha de concorrência ao baixar estoque de "${prod.name}".`);
        error.statusCode = 400;
        throw error;
      }
    }

    // 4. Recalcula Subtotal, Descontos e Total a Pagar
    const subtotal = items.reduce((acc, it) => acc + (parseFloat(it.total_price) || 0), 0);
    const finalDiscount = Math.max(0, parseFloat(discount_amount) || 0);
    const finalTip = Math.max(0, parseFloat(tip_amount) || 0);
    const netTotal = Math.max(0, subtotal - finalDiscount + finalTip);

    // 5. Validação e Processamento de Cada Pagamento do Split
    let totalPaid = 0;
    let cashPaid = 0;
    const validatedPayments = [];

    for (const p of payments) {
      const pAmount = parseFloat(p.amount);
      if (isNaN(pAmount) || pAmount <= 0) {
        const error = new Error('Valor de pagamento inválido.');
        error.statusCode = 400;
        throw error;
      }

      if (!['cash', 'pix', 'credit_card', 'debit_card', 'wallet', 'giftcard'].includes(p.payment_method)) {
        const error = new Error(`Método de pagamento "${p.payment_method}" não reconhecido.`);
        error.statusCode = 400;
        throw error;
      }

      // 5.1 Resgate de Saldo de Cashback da Carteira Digital
      if (p.payment_method === 'wallet') {
        if (!order.client_id) {
          const error = new Error('O pagamento com saldo da carteira exige um cliente vinculado à comanda.');
          error.statusCode = 400;
          throw error;
        }
        await processCashbackRedemption(
          client,
          tenantId,
          order.client_id,
          order.appointment_id || order.id,
          pAmount,
          `order:wallet:${order.id}`
        );
      }

      // 5.2 Resgate de Vale-Presente (Gift Card)
      if (p.payment_method === 'giftcard') {
        if (!p.giftcard_code || !p.giftcard_code.trim()) {
          const error = new Error('Código do Vale-Presente é obrigatório para pagamento via giftcard.');
          error.statusCode = 400;
          throw error;
        }
        const redemption = await redeemGiftCard(
          tenantId,
          p.giftcard_code.trim(),
          pAmount,
          order.appointment_id,
          `order:giftcard:${order.id}:${p.giftcard_code.trim().toUpperCase()}`
        );
        p.giftcard_id = redemption.id;
      }

      if (p.payment_method === 'cash') {
        cashPaid += pAmount;
      }
      totalPaid += pAmount;

      validatedPayments.push({
        payment_method: p.payment_method,
        amount: pAmount,
        installments: parseInt(p.installments) || 1,
        giftcard_id: p.giftcard_id || null,
        giftcard_code: p.giftcard_code ? p.giftcard_code.trim().toUpperCase() : null,
        details: p.details || {}
      });
    }

    // 6. Verificação de Troco e Cobertura do Total
    let changeAmount = 0;
    if (totalPaid < netTotal) {
      const error = new Error(`Valor pago (R$ ${totalPaid.toFixed(2)}) é inferior ao total da comanda (R$ ${netTotal.toFixed(2)}).`);
      error.statusCode = 400;
      throw error;
    }

    if (totalPaid > netTotal) {
      const excess = totalPaid - netTotal;
      if (cashPaid >= excess) {
        changeAmount = excess;
      } else {
        const error = new Error(`Valor pago excede o total da comanda, mas o excedente não pode ser devolvido como troco pois o pagamento em dinheiro foi inferior ao troco.`);
        error.statusCode = 400;
        throw error;
      }
    }

    // 7. Se houve cupom na comanda e ainda não resgatado, baixa em ponto único
    if (order.coupon_id) {
      try {
        await redeemCoupon(tenantId, order.coupon_id, client);
      } catch (err) {
        // Ignora caso já resgatado
      }
    }

    // 8. Busca sessão de caixa aberta para vincular o recebimento
    let currentCashRegisterId = null;
    const currentReg = await getCurrentCashRegister(tenantId);
    if (currentReg) {
      currentCashRegisterId = currentReg.id;
    }

    // 9. Atualiza a Comanda para 'paid'
    const updatedOrderRes = await client.query(
      `UPDATE public.cap_orders
       SET status = 'paid',
           cash_register_id = $1,
           subtotal = $2,
           discount_amount = $3,
           tip_amount = $4,
           tip_staff_id = $5,
           total_amount = $6,
           paid_amount = $7,
           change_amount = $8,
           notes = $9,
           paid_at = NOW()
       WHERE id = $10 AND tenant_id = $11
       RETURNING *`,
      [
        currentCashRegisterId,
        subtotal,
        finalDiscount,
        finalTip,
        tip_staff_id || null,
        netTotal,
        totalPaid - changeAmount,
        changeAmount,
        notes || null,
        orderId,
        tenantId
      ]
    );

    const paidOrder = updatedOrderRes.rows[0];

    // 10. Grava os Pagamentos em cap_order_payments
    for (const p of validatedPayments) {
      // Ajusta o montante em dinheiro caso tenha havido troco
      let effectiveAmount = p.amount;
      if (p.payment_method === 'cash' && changeAmount > 0) {
        effectiveAmount = p.amount - changeAmount;
      }

      await client.query(
        `INSERT INTO public.cap_order_payments (
           tenant_id, order_id, payment_method, amount, installments, 
           giftcard_id, giftcard_code, details, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          tenantId,
          orderId,
          p.payment_method,
          effectiveAmount,
          p.installments,
          p.giftcard_id,
          p.giftcard_code,
          JSON.stringify(p.details || {})
        ]
      );
    }

    // 11. Se vinculado a um agendamento, marca o agendamento como 'completed'
    if (order.appointment_id) {
      await client.query(
        `UPDATE public.cap_appointments
         SET status = 'completed',
             updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [order.appointment_id, tenantId]
      );

      if (order.client_id) {
        await completeReferralOnAppointmentCompleted(client, tenantId, order.appointment_id, order.client_id);
      }
    }

    return {
      ...paidOrder,
      items,
      payments: validatedPayments,
      change_amount: changeAmount
    };
  });
};

/**
 * Busca uma comanda por ID com todos os detalhes, itens e pagamentos.
 */
export const getOrderById = async (tenantId, orderId) => {
  const orderRes = await tenantQuery(
    tenantId,
    `SELECT o.*, 
            c.name as client_name, c.phone as client_phone, c.email as client_email,
            ts.name as tip_staff_name,
            so.name as operator_name
     FROM public.cap_orders o
     LEFT JOIN public.cap_clients c ON o.client_id = c.id
     LEFT JOIN public.cap_staff ts ON o.tip_staff_id = ts.id
     LEFT JOIN public.cap_staff so ON o.staff_id = so.id
     WHERE o.id = $1 AND o.tenant_id = $2`,
    [orderId, tenantId]
  );

  if (orderRes.rows.length === 0) {
    const error = new Error('Comanda não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  const order = orderRes.rows[0];

  const itemsRes = await tenantQuery(
    tenantId,
    `SELECT i.*, s.name as staff_name
     FROM public.cap_order_items i
     LEFT JOIN public.cap_staff s ON i.staff_id = s.id
     WHERE i.order_id = $1 AND i.tenant_id = $2
     ORDER BY i.created_at ASC`,
    [orderId, tenantId]
  );

  const paymentsRes = await tenantQuery(
    tenantId,
    `SELECT * FROM public.cap_order_payments
     WHERE order_id = $1 AND tenant_id = $2
     ORDER BY created_at ASC`,
    [orderId, tenantId]
  );

  return {
    ...order,
    items: itemsRes.rows,
    payments: paymentsRes.rows
  };
};

/**
 * Lista comandas do salão com filtros e paginação.
 */
export const listOrders = async (tenantId, { status, clientId, date, limit = 20, offset = 0 } = {}) => {
  let whereClause = 'WHERE o.tenant_id = $1';
  const params = [tenantId];
  let paramIndex = 2;

  if (status) {
    whereClause += ` AND o.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (clientId) {
    whereClause += ` AND o.client_id = $${paramIndex}`;
    params.push(clientId);
    paramIndex++;
  }

  if (date) {
    whereClause += ` AND o.created_at::date = $${paramIndex}::date`;
    params.push(date);
    paramIndex++;
  }

  const query = `
    SELECT o.*, 
           c.name as client_name, c.phone as client_phone,
           (SELECT COUNT(id)::int FROM public.cap_order_items WHERE order_id = o.id) as items_count
    FROM public.cap_orders o
    LEFT JOIN public.cap_clients c ON o.client_id = c.id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, offset);
  const result = await tenantQuery(tenantId, query, params);
  return result.rows;
};

/**
 * Cancela uma comanda aberta.
 */
export const cancelOrder = async (tenantId, orderId, staffId, reason = '') => {
  return await tenantTransaction(tenantId, async (client) => {
    const orderRes = await client.query(
      `SELECT * FROM public.cap_orders WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [orderId, tenantId]
    );

    if (orderRes.rows.length === 0) {
      const error = new Error('Comanda não encontrada.');
      error.statusCode = 404;
      throw error;
    }

    const order = orderRes.rows[0];
    if (order.status !== 'open') {
      const error = new Error('Apenas comandas com status aberto podem ser canceladas.');
      error.statusCode = 400;
      throw error;
    }

    const updated = await client.query(
      `UPDATE public.cap_orders
       SET status = 'cancelled',
           notes = CASE WHEN notes IS NOT NULL THEN notes || ' | ' || $1 ELSE $1 END
       WHERE id = $2 AND tenant_id = $3
       RETURNING *`,
      [`Cancelada por colaborador (${reason || 'Sem justificativa'})`, orderId, tenantId]
    );

    return updated.rows[0];
  });
};
