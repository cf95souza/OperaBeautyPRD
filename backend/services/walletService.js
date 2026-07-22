import pool from '../config/db.js';

// 1. Purgar Saldos Expirados de Cashback
export const purgeExpiredCashback = async (tenantId, clientId) => {
  const expiredCreditsResult = await pool.query(
    `SELECT id, amount 
     FROM public.cap_wallet_transactions 
     WHERE tenant_id = $1 AND client_id = $2 
       AND type = 'credit' 
       AND is_expired = FALSE 
       AND expires_at < NOW()`,
    [tenantId, clientId]
  );

  for (const trans of expiredCreditsResult.rows) {
    // 1. Marca transação como expirada
    await pool.query(
      'UPDATE public.cap_wallet_transactions SET is_expired = TRUE WHERE id = $1',
      [trans.id]
    );

    // 2. Registra a saída da carteira por expiração
    await pool.query(
      `INSERT INTO public.cap_wallet_transactions (tenant_id, client_id, amount, type, description, created_at)
       VALUES ($1, $2, $3, 'debit', 'Expiração de saldo acumulado', NOW())`,
      [tenantId, clientId, -parseFloat(trans.amount)]
    );

    // 3. Deduz do saldo principal
    await pool.query(
      `UPDATE public.cap_client_wallets 
       SET balance = GREATEST(0.00, balance - $1), updated_at = NOW()
       WHERE tenant_id = $2 AND client_id = $3`,
      [parseFloat(trans.amount), tenantId, clientId]
    );
  }
};

// 2. Obter Saldo da Carteira (Limpando expirados primeiro)
export const getWalletBalance = async (tenantId, clientId) => {
  await purgeExpiredCashback(tenantId, clientId);

  const result = await pool.query(
    'SELECT balance FROM public.cap_client_wallets WHERE tenant_id = $1 AND client_id = $2',
    [tenantId, clientId]
  );

  if (result.rows.length === 0) {
    // Inicializa carteira se não existir
    const newWallet = await pool.query(
      `INSERT INTO public.cap_client_wallets (tenant_id, client_id, balance, updated_at)
       VALUES ($1, $2, 0.00, NOW())
       RETURNING balance`,
      [tenantId, clientId]
    );
    return parseFloat(newWallet.rows[0].balance);
  }

  return parseFloat(result.rows[0].balance);
};

// 3. Listar Extrato de Transações
export const listWalletTransactions = async (tenantId, clientId) => {
  await purgeExpiredCashback(tenantId, clientId);

  const result = await pool.query(
    `SELECT id, amount, type, description, expires_at, is_expired, created_at
     FROM public.cap_wallet_transactions
     WHERE tenant_id = $1 AND client_id = $2
     ORDER BY created_at DESC`,
    [tenantId, clientId]
  );

  return result.rows;
};

// 4. Processar Ganho de Cashback (Após conclusão de agendamento)
export const processCashbackEarnings = async (clientConnection, tenantId, clientId, appointmentId, amount) => {
  // 1. Busca configurações de cashback do tenant
  const tenantConfig = await clientConnection.query(
    'SELECT cashback_percentage, cashback_expiration_days FROM public.cap_tenants WHERE id = $1',
    [tenantId]
  );

  if (tenantConfig.rows.length === 0) return;

  const percentage = parseFloat(tenantConfig.rows[0].cashback_percentage || '0');
  const expirationDays = parseInt(tenantConfig.rows[0].cashback_expiration_days || '30');

  if (percentage <= 0) return;

  const cashbackEarned = amount * (percentage / 100);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  // 2. Cria transação de crédito
  await clientConnection.query(
    `INSERT INTO public.cap_wallet_transactions (tenant_id, client_id, amount, type, description, expires_at, created_at)
     VALUES ($1, $2, $3, 'credit', $4, $5, NOW())`,
    [tenantId, clientId, cashbackEarned, `Cashback recebido pelo agendamento #${appointmentId.substring(0, 8)}`, expiresAt]
  );

  // 3. Incrementa na carteira
  await clientConnection.query(
    `INSERT INTO public.cap_client_wallets (tenant_id, client_id, balance, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (tenant_id, client_id)
     DO UPDATE SET balance = cap_client_wallets.balance + EXCLUDED.balance, updated_at = NOW()`,
    [tenantId, clientId, cashbackEarned]
  );
};

// 5. Processar Resgate/Uso de Cashback (Desconto no Checkout)
export const processCashbackRedemption = async (clientConnection, tenantId, clientId, appointmentId, amount) => {
  if (amount <= 0) return;

  // 1. Verifica saldo atual
  const walletResult = await clientConnection.query(
    'SELECT balance FROM public.cap_client_wallets WHERE tenant_id = $1 AND client_id = $2 FOR UPDATE',
    [tenantId, clientId]
  );

  const balance = parseFloat(walletResult.rows[0]?.balance || '0');
  if (balance < amount) {
    const error = new Error('Saldo de cashback insuficiente para resgate.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Cria transação de débito
  await clientConnection.query(
    `INSERT INTO public.cap_wallet_transactions (tenant_id, client_id, amount, type, description, created_at)
     VALUES ($1, $2, $3, 'debit', $4, NOW())`,
    [tenantId, clientId, -amount, `Resgate de cashback no agendamento #${appointmentId.substring(0, 8)}`]
  );

  // 3. Atualiza saldo da carteira
  await clientConnection.query(
    `UPDATE public.cap_client_wallets 
     SET balance = balance - $1, updated_at = NOW()
     WHERE tenant_id = $2 AND client_id = $3`,
    [amount, tenantId, clientId]
  );
};
