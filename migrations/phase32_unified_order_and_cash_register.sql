-- ==============================================================================
-- FASE 44 - ITEM D17 (P2): COMANDA UNIFICADA E FECHAMENTO DE CAIXA
-- Regras de Aceite: Vários serviços + produtos + gorjeta; pagamento dividido 
-- (PIX + cartão + dinheiro); aplicar cupom / vale-presente / cashback;
-- Abertura, movimentações (sangria/suprimento) e fechamento diário de caixa.
-- Totais do caixa batem milimetricamente com o financeiro e o estoque.
-- ==============================================================================

-- 1. Sessões Diárias de Caixa do Salão
CREATE TABLE IF NOT EXISTS public.cap_cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL REFERENCES public.cap_staff(id) ON DELETE RESTRICT,
    closed_by UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    initial_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (initial_balance >= 0),
    expected_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_pix NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_credit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_debit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_wallet NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_giftcard NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    actual_cash NUMERIC(10, 2),
    actual_pix NUMERIC(10, 2),
    actual_credit NUMERIC(10, 2),
    actual_debit NUMERIC(10, 2),
    actual_total NUMERIC(10, 2),
    cash_difference NUMERIC(10, 2) DEFAULT 0.00,
    total_difference NUMERIC(10, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant_status 
    ON public.cap_cash_registers (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_cash_registers_opened_at 
    ON public.cap_cash_registers (tenant_id, opened_at DESC);

-- 2. Movimentações Avulsas de Caixa (Sangrias e Suprimentos)
CREATE TABLE IF NOT EXISTS public.cap_cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    cash_register_id UUID NOT NULL REFERENCES public.cap_cash_registers(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.cap_staff(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('supply', 'bleed')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_register 
    ON public.cap_cash_movements (cash_register_id);

-- 3. Comandas Unificadas (Checkout de Serviços, Produtos e Gorjetas)
CREATE TABLE IF NOT EXISTS public.cap_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    cash_register_id UUID REFERENCES public.cap_cash_registers(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.cap_clients(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.cap_appointments(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    order_number VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'cancelled')),
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    coupon_id UUID REFERENCES public.cap_coupons(id) ON DELETE SET NULL,
    coupon_code TEXT,
    tip_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (tip_amount >= 0),
    tip_staff_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    change_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (change_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_status 
    ON public.cap_orders (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_appointment 
    ON public.cap_orders (appointment_id);

CREATE INDEX IF NOT EXISTS idx_orders_client 
    ON public.cap_orders (client_id);

-- 4. Itens da Comanda (Serviços e Produtos com Comissões)
CREATE TABLE IF NOT EXISTS public.cap_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.cap_orders(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('service', 'product')),
    service_id UUID REFERENCES public.cap_services(id) ON DELETE SET NULL,
    inventory_id UUID REFERENCES public.cap_inventory(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    commission_rate NUMERIC(5, 2) DEFAULT 0.00,
    commission_amount NUMERIC(10, 2) DEFAULT 0.00,
    variation_name TEXT,
    selected_extras JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order 
    ON public.cap_order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_staff 
    ON public.cap_order_items (staff_id);

-- 5. Pagamentos da Comanda (Split Payment / Múltiplas Formas)
CREATE TABLE IF NOT EXISTS public.cap_order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.cap_orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'pix', 'credit_card', 'debit_card', 'wallet', 'giftcard')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    installments INT DEFAULT 1 CHECK (installments >= 1),
    giftcard_id UUID REFERENCES public.cap_giftcards(id) ON DELETE SET NULL,
    giftcard_code TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order 
    ON public.cap_order_payments (order_id);

-- 6. Ativação de RLS (Row Level Security) Multi-Tenant
ALTER TABLE public.cap_cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_order_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_cash_registers ON public.cap_cash_registers;
CREATE POLICY tenant_isolation_cash_registers ON public.cap_cash_registers
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

DROP POLICY IF EXISTS tenant_isolation_cash_movements ON public.cap_cash_movements;
CREATE POLICY tenant_isolation_cash_movements ON public.cap_cash_movements
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

DROP POLICY IF EXISTS tenant_isolation_orders ON public.cap_orders;
CREATE POLICY tenant_isolation_orders ON public.cap_orders
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

DROP POLICY IF EXISTS tenant_isolation_order_items ON public.cap_order_items;
CREATE POLICY tenant_isolation_order_items ON public.cap_order_items
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

DROP POLICY IF EXISTS tenant_isolation_order_payments ON public.cap_order_payments;
CREATE POLICY tenant_isolation_order_payments ON public.cap_order_payments
    FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::UUID);

-- 7. Concessões de Menor Privilégio ao Usuário da Aplicação (Princípio C5)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_cash_registers TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_cash_movements TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_orders TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_order_items TO opera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_order_payments TO opera_app;
