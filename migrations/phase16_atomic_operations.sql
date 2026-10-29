-- ====================================================================
-- MIGRAÇÃO PHASE 16: Operações Atômicas, Idempotência e Livro-Razão (C10)
-- ====================================================================

-- 1. Estoque: Constraint impedindo saldo negativo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_quantity_non_negative'
    ) THEN
        ALTER TABLE public.cap_inventory 
        ADD CONSTRAINT chk_inventory_quantity_non_negative CHECK (quantity >= 0);
    END IF;
END $$;

-- 2. Cupons de Desconto: Constraints de limites e não-negatividade
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_coupon_uses'
    ) THEN
        ALTER TABLE public.cap_coupons 
        ADD CONSTRAINT chk_coupon_uses CHECK (max_uses IS NULL OR current_uses <= max_uses);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_coupon_current_uses_non_negative'
    ) THEN
        ALTER TABLE public.cap_coupons 
        ADD CONSTRAINT chk_coupon_current_uses_non_negative CHECK (current_uses >= 0);
    END IF;
END $$;

-- 3. Carteira Digital / Cashback: Livro-razão com chave de idempotência
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cap_wallet_transactions' AND column_name = 'idempotency_key'
    ) THEN
        ALTER TABLE public.cap_wallet_transactions 
        ADD COLUMN idempotency_key VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_wallet_idempotency'
    ) THEN
        ALTER TABLE public.cap_wallet_transactions 
        ADD CONSTRAINT uq_wallet_idempotency UNIQUE (tenant_id, idempotency_key);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_wallet_balance_non_negative'
    ) THEN
        ALTER TABLE public.cap_client_wallets 
        ADD CONSTRAINT chk_wallet_balance_non_negative CHECK (balance >= 0.00);
    END IF;
END $$;

-- 4. Vales-Presente (cap_giftcards): Estrutura completa, saldo não-negativo e idempotência
DO $$
BEGIN
    -- request_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cap_giftcards' AND column_name = 'request_id') THEN
        ALTER TABLE public.cap_giftcards ADD COLUMN request_id VARCHAR(50);
        ALTER TABLE public.cap_giftcards ADD CONSTRAINT uq_giftcard_request_id UNIQUE (request_id);
    END IF;

    -- redemption_code
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cap_giftcards' AND column_name = 'redemption_code') THEN
        ALTER TABLE public.cap_giftcards ADD COLUMN redemption_code VARCHAR(50);
        ALTER TABLE public.cap_giftcards ADD CONSTRAINT uq_giftcard_redemption_code UNIQUE (redemption_code);
    END IF;

    -- recipient_phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cap_giftcards' AND column_name = 'recipient_phone') THEN
        ALTER TABLE public.cap_giftcards ADD COLUMN recipient_phone VARCHAR(50);
    END IF;

    -- message
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cap_giftcards' AND column_name = 'message') THEN
        ALTER TABLE public.cap_giftcards ADD COLUMN message TEXT;
    END IF;

    -- original_value
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cap_giftcards' AND column_name = 'original_value') THEN
        ALTER TABLE public.cap_giftcards ADD COLUMN original_value NUMERIC(10,2) NOT NULL DEFAULT 0.00;
        ALTER TABLE public.cap_giftcards ADD CONSTRAINT chk_giftcard_original_value CHECK (original_value >= 0);
    END IF;

    -- available_balance
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cap_giftcards' AND column_name = 'available_balance') THEN
        ALTER TABLE public.cap_giftcards ADD COLUMN available_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00;
        ALTER TABLE public.cap_giftcards ADD CONSTRAINT chk_giftcard_balance_non_negative CHECK (available_balance >= 0);
    END IF;

    -- payment_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cap_giftcards' AND column_name = 'payment_status') THEN
        ALTER TABLE public.cap_giftcards ADD COLUMN payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING';
    END IF;

    -- idempotency_key
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cap_giftcards' AND column_name = 'idempotency_key') THEN
        ALTER TABLE public.cap_giftcards ADD COLUMN idempotency_key VARCHAR(100);
        ALTER TABLE public.cap_giftcards ADD CONSTRAINT uq_giftcard_idempotency UNIQUE (tenant_id, idempotency_key);
    END IF;
END $$;

-- 5. Livro-Razão Imutável de Resgates de Vale-Presente (cap_giftcard_redemptions)
CREATE TABLE IF NOT EXISTS public.cap_giftcard_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    giftcard_id UUID NOT NULL REFERENCES public.cap_giftcards(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    idempotency_key VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_giftcard_redemption_idempotency UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_giftcard_redemptions_giftcard ON public.cap_giftcard_redemptions(giftcard_id);
CREATE INDEX IF NOT EXISTS idx_giftcard_redemptions_tenant ON public.cap_giftcard_redemptions(tenant_id);

-- Grants para o papel opera_app
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_giftcard_redemptions TO opera_app;

-- RLS para cap_giftcard_redemptions
ALTER TABLE public.cap_giftcard_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON public.cap_giftcard_redemptions;
CREATE POLICY tenant_isolation_policy ON public.cap_giftcard_redemptions
    FOR ALL
    TO opera_app, postgres
    USING (
        current_setting('app.current_tenant_id', true) = tenant_id::text
        OR current_setting('app.is_superadmin', true) = 'true'
        OR current_setting('app.bypass_rls', true) = 'true'
    )
    WITH CHECK (
        current_setting('app.current_tenant_id', true) = tenant_id::text
        OR current_setting('app.is_superadmin', true) = 'true'
        OR current_setting('app.bypass_rls', true) = 'true'
    );
