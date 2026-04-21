-- SQL Script para Configuração do Banco de Dados Capelli (Supabase)
-- Todas as tabelas prefixadas com 'cap_' para evitar conflitos em ambiente compartilhado.

-- 1. Tabela de Profiles (Administradores e Profissionais)
CREATE TABLE IF NOT EXISTS public.cap_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'professional',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.cap_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    birth_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Serviços
CREATE TABLE IF NOT EXISTS public.cap_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Horários de Funcionamento
CREATE TABLE IF NOT EXISTS public.cap_business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INTEGER NOT NULL, -- 0 (domingo) a 6 (sábado)
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    UNIQUE(day_of_week)
);

-- 5. Tabela de Vouchers
CREATE TABLE IF NOT EXISTS public.cap_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' ou 'fixed'
    discount_value NUMERIC(10, 2) NOT NULL,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS public.cap_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.cap_services(id),
    professional_id UUID REFERENCES public.cap_profiles(id),
    voucher_id UUID REFERENCES public.cap_vouchers(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'cancelled', 'rescheduled', 'completed'
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Notas da Timeline
CREATE TABLE IF NOT EXISTS public.cap_timeline_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.cap_clients(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.cap_profiles(id),
    appointment_id UUID REFERENCES public.cap_appointments(id),
    content TEXT NOT NULL,
    type TEXT DEFAULT 'comment',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela de Estoque (Produtos)
CREATE TABLE IF NOT EXISTS public.cap_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    quantity NUMERIC(10, 2) DEFAULT 0,
    unit TEXT,
    min_quantity NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabela de Consumo de Estoque (Relacionamento Serviço-Produto)
CREATE TABLE IF NOT EXISTS public.cap_service_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES public.cap_services(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES public.cap_inventory(id) ON DELETE CASCADE,
    quantity_consumed NUMERIC(10, 2) NOT NULL
);

-- RLS (Habilitação para as novas tabelas prefixadas)
ALTER TABLE public.cap_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cap_timeline_notes ENABLE ROW LEVEL SECURITY;
