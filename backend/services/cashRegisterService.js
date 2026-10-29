import pool from '../config/db.js';
import { tenantQuery, tenantTransaction } from '../utils/tenantQuery.js';

/**
 * Obtém a sessão de caixa atualmente aberta para o salão, com consolidação em tempo real.
 */
export const getCurrentCashRegister = async (tenantId) => {
  const result = await tenantQuery(
    tenantId,
    `SELECT r.*, s.name as opened_by_name
     FROM public.cap_cash_registers r
     JOIN public.cap_staff s ON r.opened_by = s.id
     WHERE r.tenant_id = $1 AND r.status = 'open'
     ORDER BY r.opened_at DESC
     LIMIT 1`,
    [tenantId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const register = result.rows[0];

  // 1. Consolida Movimentações de Caixa (Suprimentos e Sangrias)
  const movRes = await tenantQuery(
    tenantId,
    `SELECT 
       COALESCE(SUM(CASE WHEN type = 'supply' THEN amount ELSE 0 END), 0)::float as total_supplies,
       COALESCE(SUM(CASE WHEN type = 'bleed' THEN amount ELSE 0 END), 0)::float as total_bleeds
     FROM public.cap_cash_movements
     WHERE tenant_id = $1 AND cash_register_id = $2`,
    [tenantId, register.id]
  );
  const { total_supplies, total_bleeds } = movRes.rows[0];

  // 2. Consolida Vendas da Sessão de Caixa por Método de Pagamento
  const payRes = await tenantQuery(
    tenantId,
    `SELECT 
       p.payment_method,
       COALESCE(SUM(p.amount), 0)::float as total_amount
     FROM public.cap_order_payments p
     JOIN public.cap_orders o ON p.order_id = o.id
     WHERE o.tenant_id = $1 
       AND (o.cash_register_id = $2 OR (o.cash_register_id IS NULL AND o.paid_at >= $3))
       AND o.status = 'paid'
     GROUP BY p.payment_method`,
    [tenantId, register.id, register.opened_at]
  );

  let cashSales = 0;
  let pixSales = 0;
  let creditSales = 0;
  let debitSales = 0;
  let walletSales = 0;
  let giftcardSales = 0;

  for (const row of payRes.rows) {
    const val = parseFloat(row.total_amount) || 0;
    if (row.payment_method === 'cash') cashSales = val;
    else if (row.payment_method === 'pix') pixSales = val;
    else if (row.payment_method === 'credit_card') creditSales = val;
    else if (row.payment_method === 'debit_card') debitSales = val;
    else if (row.payment_method === 'wallet') walletSales = val;
    else if (row.payment_method === 'giftcard') giftcardSales = val;
  }

  const initialBalance = parseFloat(register.initial_balance) || 0;
  const currentExpectedCash = initialBalance + total_supplies - total_bleeds + cashSales;
  const currentExpectedTotal = currentExpectedCash + pixSales + creditSales + debitSales + walletSales + giftcardSales;

  return {
    ...register,
    initial_balance: initialBalance,
    total_supplies,
    total_bleeds,
    sales_by_method: {
      cash: cashSales,
      pix: pixSales,
      credit: creditSales,
      debit: debitSales,
      wallet: walletSales,
      giftcard: giftcardSales
    },
    current_cash_in_drawer: currentExpectedCash,
    current_expected_total: currentExpectedTotal
  };
};

/**
 * Abre uma nova sessão de caixa diário.
 */
export const openCashRegister = async (tenantId, staffId, { initial_balance = 0, notes = '' }) => {
  const current = await getCurrentCashRegister(tenantId);
  if (current) {
    const error = new Error('Já existe uma sessão de caixa aberta. Feche o caixa atual antes de abrir outro.');
    error.statusCode = 400;
    throw error;
  }

  const balance = Math.max(0, parseFloat(initial_balance) || 0);

  const result = await tenantQuery(
    tenantId,
    `INSERT INTO public.cap_cash_registers (
       tenant_id, opened_by, initial_balance, notes, status, opened_at
     )
     VALUES ($1, $2, $3, $4, 'open', NOW())
     RETURNING *`,
    [tenantId, staffId, balance, notes || null]
  );

  return result.rows[0];
};

/**
 * Adiciona uma movimentação avulsa de caixa (Suprimento ou Sangria).
 */
export const addCashMovement = async (tenantId, cashRegisterId, staffId, { type, amount, reason }) => {
  if (!['supply', 'bleed'].includes(type)) {
    const error = new Error("Tipo de movimentação inválido. Use 'supply' ou 'bleed'.");
    error.statusCode = 400;
    throw error;
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    const error = new Error('Valor da movimentação deve ser maior que zero.');
    error.statusCode = 400;
    throw error;
  }

  if (!reason || !reason.trim()) {
    const error = new Error('A justificativa da movimentação é obrigatória.');
    error.statusCode = 400;
    throw error;
  }

  const current = await getCurrentCashRegister(tenantId);
  if (!current || current.id !== cashRegisterId) {
    const error = new Error('Sessão de caixa não encontrada ou já finalizada.');
    error.statusCode = 404;
    throw error;
  }

  // Previne sangria maior que o saldo em dinheiro disponível na gaveta
  if (type === 'bleed' && numAmount > current.current_cash_in_drawer) {
    const error = new Error(`Saldo em dinheiro insuficiente na gaveta para sangria. Disponível: R$ ${current.current_cash_in_drawer.toFixed(2)}.`);
    error.statusCode = 400;
    throw error;
  }

  const result = await tenantQuery(
    tenantId,
    `INSERT INTO public.cap_cash_movements (
       tenant_id, cash_register_id, staff_id, type, amount, reason, created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [tenantId, cashRegisterId, staffId, type, numAmount, reason.trim()]
  );

  return result.rows[0];
};

/**
 * Realiza o fechamento diário do caixa com conferência cega e apuração de quebra/sobra.
 */
export const closeCashRegister = async (tenantId, cashRegisterId, staffId, actualAmounts, notes = '') => {
  return await tenantTransaction(tenantId, async (client) => {
    // 1. Lock pessimista da sessão de caixa
    const regRes = await client.query(
      `SELECT * FROM public.cap_cash_registers 
       WHERE id = $1 AND tenant_id = $2 AND status = 'open' 
       FOR UPDATE`,
      [cashRegisterId, tenantId]
    );

    if (regRes.rows.length === 0) {
      const error = new Error('Sessão de caixa não encontrada ou já fechada.');
      error.statusCode = 404;
      throw error;
    }

    const register = regRes.rows[0];

    // 2. Apuração de movimentações (suprimentos / sangrias)
    const movRes = await client.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'supply' THEN amount ELSE 0 END), 0)::float as total_supplies,
         COALESCE(SUM(CASE WHEN type = 'bleed' THEN amount ELSE 0 END), 0)::float as total_bleeds
       FROM public.cap_cash_movements
       WHERE tenant_id = $1 AND cash_register_id = $2`,
      [tenantId, cashRegisterId]
    );
    const { total_supplies, total_bleeds } = movRes.rows[0];

    // 3. Apuração dos pagamentos das comandas da sessão
    const payRes = await client.query(
      `SELECT 
         p.payment_method,
         COALESCE(SUM(p.amount), 0)::float as total_amount
       FROM public.cap_order_payments p
       JOIN public.cap_orders o ON p.order_id = o.id
       WHERE o.tenant_id = $1 
         AND (o.cash_register_id = $2 OR (o.cash_register_id IS NULL AND o.paid_at >= $3))
         AND o.status = 'paid'
       GROUP BY p.payment_method`,
      [tenantId, cashRegisterId, register.opened_at]
    );

    let expectedCashSales = 0;
    let expectedPix = 0;
    let expectedCredit = 0;
    let expectedDebit = 0;
    let expectedWallet = 0;
    let expectedGiftcard = 0;

    for (const row of payRes.rows) {
      const val = parseFloat(row.total_amount) || 0;
      if (row.payment_method === 'cash') expectedCashSales = val;
      else if (row.payment_method === 'pix') expectedPix = val;
      else if (row.payment_method === 'credit_card') expectedCredit = val;
      else if (row.payment_method === 'debit_card') expectedDebit = val;
      else if (row.payment_method === 'wallet') expectedWallet = val;
      else if (row.payment_method === 'giftcard') expectedGiftcard = val;
    }

    const initialBalance = parseFloat(register.initial_balance) || 0;
    const expectedCash = initialBalance + total_supplies - total_bleeds + expectedCashSales;
    const expectedTotal = expectedCash + expectedPix + expectedCredit + expectedDebit + expectedWallet + expectedGiftcard;

    // 4. Valores informados na contagem física do operador
    const actualCash = parseFloat(actualAmounts.actual_cash || 0);
    const actualPix = parseFloat(actualAmounts.actual_pix || 0);
    const actualCredit = parseFloat(actualAmounts.actual_credit || 0);
    const actualDebit = parseFloat(actualAmounts.actual_debit || 0);
    const actualTotal = actualCash + actualPix + actualCredit + actualDebit + expectedWallet + expectedGiftcard;

    const cashDifference = actualCash - expectedCash;
    const totalDifference = actualTotal - expectedTotal;

    // 5. Atualização atômica do caixa
    const updateRes = await client.query(
      `UPDATE public.cap_cash_registers
       SET status = 'closed',
           closed_by = $1,
           closed_at = NOW(),
           expected_cash = $2,
           expected_pix = $3,
           expected_credit = $4,
           expected_debit = $5,
           expected_wallet = $6,
           expected_giftcard = $7,
           expected_total = $8,
           actual_cash = $9,
           actual_pix = $10,
           actual_credit = $11,
           actual_debit = $12,
           actual_total = $13,
           cash_difference = $14,
           total_difference = $15,
           notes = $16
       WHERE id = $17 AND tenant_id = $18
       RETURNING *`,
      [
        staffId,
        expectedCash,
        expectedPix,
        expectedCredit,
        expectedDebit,
        expectedWallet,
        expectedGiftcard,
        expectedTotal,
        actualCash,
        actualPix,
        actualCredit,
        actualDebit,
        actualTotal,
        cashDifference,
        totalDifference,
        notes || null,
        cashRegisterId,
        tenantId
      ]
    );

    // 6. Vincula todas as comandas pendentes à sessão recém-fechada
    await client.query(
      `UPDATE public.cap_orders
       SET cash_register_id = $1
       WHERE tenant_id = $2 
         AND cash_register_id IS NULL 
         AND status = 'paid' 
         AND paid_at >= $3`,
      [cashRegisterId, tenantId, register.opened_at]
    );

    return updateRes.rows[0];
  });
};

/**
 * Lista sessões de caixa anteriores do salão com paginação.
 */
export const listCashRegisters = async (tenantId, { limit = 20, offset = 0 } = {}) => {
  const result = await tenantQuery(
    tenantId,
    `SELECT r.*, 
            so.name as opened_by_name,
            sc.name as closed_by_name
     FROM public.cap_cash_registers r
     JOIN public.cap_staff so ON r.opened_by = so.id
     LEFT JOIN public.cap_staff sc ON r.closed_by = sc.id
     WHERE r.tenant_id = $1
     ORDER BY r.opened_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset]
  );

  return result.rows;
};

/**
 * Obtém detalhes completos de uma sessão de caixa com movimentações e comandas.
 */
export const getCashRegisterDetails = async (tenantId, cashRegisterId) => {
  const regRes = await tenantQuery(
    tenantId,
    `SELECT r.*, 
            so.name as opened_by_name,
            sc.name as closed_by_name
     FROM public.cap_cash_registers r
     JOIN public.cap_staff so ON r.opened_by = so.id
     LEFT JOIN public.cap_staff sc ON r.closed_by = sc.id
     WHERE r.id = $1 AND r.tenant_id = $2`,
    [cashRegisterId, tenantId]
  );

  if (regRes.rows.length === 0) {
    const error = new Error('Sessão de caixa não encontrada.');
    error.statusCode = 404;
    throw error;
  }

  const register = regRes.rows[0];

  // Movimentações
  const movRes = await tenantQuery(
    tenantId,
    `SELECT m.*, s.name as staff_name
     FROM public.cap_cash_movements m
     JOIN public.cap_staff s ON m.staff_id = s.id
     WHERE m.tenant_id = $1 AND m.cash_register_id = $2
     ORDER BY m.created_at ASC`,
    [tenantId, cashRegisterId]
  );

  // Comandas vinculadas
  const ordersRes = await tenantQuery(
    tenantId,
    `SELECT o.id, o.order_number, o.status, o.total_amount, o.paid_amount, o.paid_at,
            c.name as client_name, c.phone as client_phone
     FROM public.cap_orders o
     LEFT JOIN public.cap_clients c ON o.client_id = c.id
     WHERE o.tenant_id = $1 AND o.cash_register_id = $2
     ORDER BY o.paid_at DESC`,
    [tenantId, cashRegisterId]
  );

  return {
    register,
    movements: movRes.rows,
    orders: ordersRes.rows
  };
};
