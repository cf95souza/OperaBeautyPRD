-- Migration Phase 9.3: Product Sales (PDV / Caixa Rápido)

-- 1. Tabela de Cabeçalho da Venda de Produtos
CREATE TABLE IF NOT EXISTS public.cap_product_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.cap_tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.cap_clients(id) ON DELETE SET NULL, -- Opcional (venda avulsa)
    total_price DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('credit_card', 'debit_card', 'cash', 'pix')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_sales_tenant ON public.cap_product_sales(tenant_id);

-- 2. Tabela de Detalhes dos Itens Vendidos (Produtos)
CREATE TABLE IF NOT EXISTS public.cap_product_sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.cap_product_sales(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.cap_inventory(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_sale_items_sale ON public.cap_product_sale_items(sale_id);
