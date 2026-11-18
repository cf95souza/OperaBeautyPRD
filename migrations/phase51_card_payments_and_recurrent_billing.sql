-- ==============================================================================
-- Migração Fase 51: Suporte a Cartão de Crédito Seguro e Recorrência SaaS (Mercado Pago)
-- Compatibilidade Estrita e Idempotente (Não altera dados existentes)
-- ==============================================================================

-- 1. Colunas de controle na tabela de salões (cap_tenants)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cap_tenants' 
        AND column_name = 'mp_preapproval_id'
    ) THEN
        ALTER TABLE public.cap_tenants ADD COLUMN mp_preapproval_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cap_tenants' 
        AND column_name = 'auto_renew_payment_method'
    ) THEN
        ALTER TABLE public.cap_tenants ADD COLUMN auto_renew_payment_method VARCHAR(20) DEFAULT 'pix';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cap_tenants' 
        AND column_name = 'card_last_four'
    ) THEN
        ALTER TABLE public.cap_tenants ADD COLUMN card_last_four VARCHAR(4);
    END IF;
END $$;

-- 2. Colunas de controle de checkout e parcelamento na tabela de faturas (cap_invoices)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cap_invoices' 
        AND column_name = 'mp_preference_id'
    ) THEN
        ALTER TABLE public.cap_invoices ADD COLUMN mp_preference_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cap_invoices' 
        AND column_name = 'mp_init_point'
    ) THEN
        ALTER TABLE public.cap_invoices ADD COLUMN mp_init_point TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cap_invoices' 
        AND column_name = 'installments'
    ) THEN
        ALTER TABLE public.cap_invoices ADD COLUMN installments INTEGER DEFAULT 1;
    END IF;
END $$;

-- Comentários informativos para catálogo de metadados
COMMENT ON COLUMN public.cap_tenants.mp_preapproval_id IS 'ID da assinatura recorrente mensal ativa no Mercado Pago (Preapproval)';
COMMENT ON COLUMN public.cap_invoices.mp_init_point IS 'URL segura de checkout hospedada no Mercado Pago para pagamento com cartão';
