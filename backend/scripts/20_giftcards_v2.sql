-- 20_giftcards_v2.sql

-- 1. Criar tabela de Métodos de Pagamento do Tenant
CREATE TABLE IF NOT EXISTS public.cap_tenant_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'PIX',
    pix_key TEXT NOT NULL,
    pix_key_type TEXT NOT NULL, -- cpf, cnpj, email, phone, random
    holder_name TEXT NOT NULL,
    holder_document TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cap_tenant_payment_methods_tenant ON public.cap_tenant_payment_methods(tenant_id);

-- 2. Alterar a tabela cap_giftcards
-- Como a regra atual já estava ativa, vou usar ALTER TABLE para evitar quebrar o sistema.

-- Renomear coluna antiga e remover constraint unique temporariamente se possível
-- O código antigo (code) será mapeado para redemption_code
ALTER TABLE public.cap_giftcards RENAME COLUMN code TO redemption_code;

-- Adicionar novas colunas
ALTER TABLE public.cap_giftcards 
ADD COLUMN IF NOT EXISTS request_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS original_value NUMERIC(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS available_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'CONFIRMED';

-- Atualizar dados antigos para bater com a nova estrutura
UPDATE public.cap_giftcards SET request_id = 'VP-LEGACY-' || substring(id::text from 1 for 8) WHERE request_id IS NULL;
UPDATE public.cap_giftcards SET original_value = 0.00, available_balance = 0.00 WHERE original_value = 0.00;

-- Aplicar constraints finais
ALTER TABLE public.cap_giftcards ALTER COLUMN request_id SET NOT NULL;
ALTER TABLE public.cap_giftcards ADD CONSTRAINT cap_giftcards_request_id_key UNIQUE (request_id);

-- Normalizar status legados antes de aplicar a constraint
UPDATE public.cap_giftcards SET status = 'ACTIVE' WHERE LOWER(status) = 'active';
UPDATE public.cap_giftcards SET status = 'REDEEMED' WHERE LOWER(status) IN ('used', 'redeemed');
UPDATE public.cap_giftcards SET status = 'EXPIRED' WHERE LOWER(status) = 'expired';
UPDATE public.cap_giftcards SET status = 'CANCELLED' WHERE LOWER(status) IN ('cancelled', 'canceled');
UPDATE public.cap_giftcards SET status = 'PENDING_PAYMENT' WHERE LOWER(status) = 'pending';
UPDATE public.cap_giftcards SET status = UPPER(status);

-- Modificar a restrição de status
ALTER TABLE public.cap_giftcards DROP CONSTRAINT IF EXISTS cap_giftcards_status_check;
ALTER TABLE public.cap_giftcards ADD CONSTRAINT cap_giftcards_status_check CHECK (status IN ('PENDING_PAYMENT', 'ACTIVE', 'PARTIALLY_REDEEMED', 'REDEEMED', 'EXPIRED', 'CANCELLED'));

-- Modificar a restrição de payment_status
ALTER TABLE public.cap_giftcards ADD CONSTRAINT cap_giftcards_payment_status_check CHECK (payment_status IN ('PENDING', 'CONFIRMED', 'REJECTED'));

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_cap_giftcards_request_id ON public.cap_giftcards(request_id);
CREATE INDEX IF NOT EXISTS idx_cap_giftcards_redemption_code ON public.cap_giftcards(redemption_code);
