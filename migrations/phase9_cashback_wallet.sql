-- Migration Phase 9.5: Cashback & Digital Wallet (Carteira Digital)

-- 1. Adicionar colunas de configuração de cashback à tabela de Tenants
ALTER TABLE public.cap_tenants
ADD COLUMN IF NOT EXISTS cashback_percentage DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cashback_expiration_days INTEGER DEFAULT 30;

-- 2. Adicionar coluna de cashback utilizado ao agendamento
ALTER TABLE public.cap_appointments
ADD COLUMN IF NOT EXISTS cashback_redeemed DECIMAL(10, 2) DEFAULT 0.00;

-- 3. Criar Tabela de Saldos da Carteira Digital do Cliente
CREATE TABLE IF NOT EXISTS public.cap_client_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_tenant_client_wallet UNIQUE (tenant_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_wallets_tenant_client ON public.cap_client_wallets(tenant_id, client_id);

-- 4. Criar Tabela de Transações/Extrato de Cashback
CREATE TABLE IF NOT EXISTS public.cap_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL, -- Positivo para acúmulo, negativo para resgate/expiração
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    description TEXT NOT NULL,
    expires_at TIMESTAMPTZ, -- Vazio se for débito
    is_expired BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_client ON public.cap_wallet_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_tenant_client ON public.cap_wallet_transactions(tenant_id, client_id);
