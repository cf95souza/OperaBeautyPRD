-- ==============================================================================
-- FASE 44: D18 (P1) — COBRANÇA AUTOMÁTICA DO SAAS, CARÊNCIA E BLOQUEIO GRADUAL
-- ==============================================================================

-- >>> UP >>>
ALTER TABLE public.cap_invoices 
    ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT,
    ADD COLUMN IF NOT EXISTS pix_qr_code TEXT,
    ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS gateway_invoice_url TEXT,
    ADD COLUMN IF NOT EXISTS grace_period_days INT DEFAULT 5,
    ADD COLUMN IF NOT EXISTS warnings_sent JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.cap_tenants 
    ADD COLUMN IF NOT EXISTS grace_period_days INT DEFAULT 5,
    ADD COLUMN IF NOT EXISTS overdue_since DATE,
    ADD COLUMN IF NOT EXISTS billing_locked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_cap_invoices_status_due ON public.cap_invoices(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_cap_invoices_gateway_tx ON public.cap_invoices(gateway_transaction_id);
CREATE INDEX IF NOT EXISTS idx_cap_tenants_status_billing ON public.cap_tenants(status, overdue_since, billing_locked_at);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        GRANT SELECT, INSERT, UPDATE ON public.cap_invoices TO opera_app;
        GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;
    END IF;
END $$;
-- <<< UP <<<

-- >>> DOWN >>>
ALTER TABLE public.cap_invoices 
    DROP COLUMN IF EXISTS pix_copy_paste,
    DROP COLUMN IF EXISTS pix_qr_code,
    DROP COLUMN IF EXISTS gateway_transaction_id,
    DROP COLUMN IF EXISTS gateway_invoice_url,
    DROP COLUMN IF EXISTS grace_period_days,
    DROP COLUMN IF EXISTS warnings_sent;

ALTER TABLE public.cap_tenants 
    DROP COLUMN IF EXISTS grace_period_days,
    DROP COLUMN IF EXISTS overdue_since,
    DROP COLUMN IF EXISTS billing_locked_at,
    DROP COLUMN IF EXISTS suspension_reason;
-- <<< DOWN <<<
