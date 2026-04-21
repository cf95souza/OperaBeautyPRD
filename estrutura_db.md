# Estrutura do Banco de Dados - Capelli 👑

Este documento contém o **Script SQL Mestre** para a criação, configuração e segurança de todo o ecossistema de dados do projeto Capelli. 

> [!IMPORTANT]
> **Preservação de Dados**: Os comandos de `DROP` estão comentados por segurança. Para um reset total de tabelas (mantendo os usuários do Auth), descomente as linhas iniciais.

---

```sql
-- ==========================================
-- 1. LIMPEZA DE AMBIENTE (OPCIONAL)
-- ==========================================
-- DROP TABLE IF EXISTS cap_timeline_notes CASCADE;
-- DROP TABLE IF EXISTS cap_appointments CASCADE;
-- DROP TABLE IF EXISTS cap_service_inventory CASCADE;
-- DROP TABLE IF EXISTS cap_inventory CASCADE;
-- DROP TABLE IF EXISTS cap_services CASCADE;
-- DROP TABLE IF EXISTS cap_clients CASCADE;
-- DROP TABLE IF EXISTS cap_vouchers CASCADE;
-- DROP TABLE IF EXISTS cap_business_hours CASCADE;
-- DROP TABLE IF EXISTS cap_blocked_dates CASCADE;
-- DROP TABLE IF EXISTS cap_settings CASCADE;
-- DROP TABLE IF EXISTS cap_profiles CASCADE;

-- ==========================================
-- 2. CRIAÇÃO DE TABELAS CORE
-- ==========================================

-- Extensão necessária para UUIDs e Criptografia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Perfis de Usuários (Suporta Auth Oficial e Login Interno)
CREATE TABLE IF NOT EXISTS cap_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'professional', 'client')) DEFAULT 'professional',
    is_active BOOLEAN DEFAULT true,
    access_email TEXT UNIQUE,
    access_password TEXT, -- Hash pgcrypto
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Clientes do Salão
CREATE TABLE IF NOT EXISTS cap_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    birth_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Catálogo de Serviços
CREATE TABLE IF NOT EXISTS cap_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    maintenance_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Gestão de Estoque (Insumos)
CREATE TABLE IF NOT EXISTS cap_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    quantity NUMERIC(10,2) DEFAULT 0,
    unit TEXT CHECK (unit IN ('ml', 'un', 'g')),
    min_quantity NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true, -- Novo: Controle de inativação
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Relacionamento Serviço x Insumos (O que gasta em cada serviço)
CREATE TABLE IF NOT EXISTS cap_service_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES cap_services(id) ON DELETE CASCADE,
    inventory_id UUID REFERENCES cap_inventory(id) ON DELETE CASCADE,
    quantity_consumed NUMERIC(10,2) NOT NULL
);

-- Vouchers de Desconto
CREATE TABLE IF NOT EXISTS cap_vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Agendamentos
CREATE TABLE IF NOT EXISTS cap_appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES cap_clients(id),
    service_id UUID REFERENCES cap_services(id),
    professional_id UUID REFERENCES cap_profiles(id),
    voucher_id UUID REFERENCES cap_vouchers(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
    total_price NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabela de ligação para múltiplos serviços (Fase 9)
CREATE TABLE IF NOT EXISTS cap_appointment_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES cap_appointments(id) ON DELETE CASCADE,
    service_id UUID REFERENCES cap_services(id),
    price_at_time NUMERIC(10,2),
    duration_at_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Linha do Tempo e Notas CRM
CREATE TABLE IF NOT EXISTS cap_timeline_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES cap_clients(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES cap_profiles(id),
    appointment_id UUID REFERENCES cap_appointments(id),
    content TEXT,
    image_path TEXT, -- Caminho no Storage Bucket cap_timeline_images
    type TEXT DEFAULT 'comment',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 3. CONFIGURAÇÕES E PARÂMETROS
-- ==========================================

-- Branding e Identidade
CREATE TABLE IF NOT EXISTS cap_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_name TEXT DEFAULT 'Capelli Real',
    primary_color TEXT DEFAULT '#be185d',
    instagram_url TEXT,
    whatsapp_number TEXT,
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Horários de Funcionamento
CREATE TABLE IF NOT EXISTS cap_business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_of_week INTEGER NOT NULL, -- 0 (Dom) a 6 (Sáb)
    open_time TIME NOT NULL DEFAULT '09:00',
    close_time TIME NOT NULL DEFAULT '18:00',
    is_closed BOOLEAN DEFAULT false
);

-- Datas Bloqueadas (Feriados/Recessos)
CREATE TABLE IF NOT EXISTS cap_blocked_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocked_date DATE NOT NULL UNIQUE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 4. SEGURANÇA (ROW LEVEL SECURITY)
-- ==========================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE cap_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_timeline_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_appointment_services ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: PROFILES
CREATE POLICY "Leitura pública de profissionais ativos" ON cap_profiles FOR SELECT TO public USING (is_active = true);
-- REMOVIDO: "Permitir inserção de novo perfil no registro" (Auto-cadastro desativado)
CREATE POLICY "Profissionais leem seu próprio perfil pendente" ON cap_profiles FOR SELECT TO public USING (auth.uid() = id);
CREATE POLICY "Profiles: Donos veem tudo" ON cap_profiles FOR ALL TO authenticated USING (true);

-- POLÍTICAS: CLIENTES
CREATE POLICY "Clientes: Inserção anônima" ON cap_clients FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Clientes: Leitura pública por fone" ON cap_clients FOR SELECT TO public USING (true);
CREATE POLICY "Clientes: Gestão autenticada" ON cap_clients FOR ALL TO authenticated USING (true);

-- POLÍTICAS: AGENDAMENTOS
CREATE POLICY "Appointments: Inserção pública" ON cap_appointments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Appointments: Leitura por todos" ON cap_appointments FOR SELECT TO public USING (true);
CREATE POLICY "Appointments: Gestão autenticada" ON cap_appointments FOR ALL TO authenticated USING (true);

-- POLÍTICAS: AGENDAMENTO SERVIÇOS (Combo 1:N)
CREATE POLICY "Appt Services: Leitura pública" ON cap_appointment_services FOR SELECT TO public USING (true);
CREATE POLICY "Appt Services: Gestão autenticada" ON cap_appointment_services FOR ALL TO authenticated USING (true);

-- POLÍTICAS: CONFIGS (Leitura pública para o portal funcionar)
CREATE POLICY "Settings: Leitura pública" ON cap_settings FOR SELECT TO public USING (true);
CREATE POLICY "Settings: Admin edita" ON cap_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Hours: Leitura pública" ON cap_business_hours FOR SELECT TO public USING (true);
CREATE POLICY "Blocked: Leitura pública" ON cap_blocked_dates FOR SELECT TO public USING (true);

-- ==========================================
-- 5. DADOS SEMENTE (SEEDS)
-- ==========================================

-- Inserir Configuração Inicial (1 linha apenas)
INSERT INTO cap_settings (id, salon_name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Capelli Real')
ON CONFLICT (id) DO NOTHING;

-- Inserir Horários Padrão
INSERT INTO cap_business_hours (day_of_week, open_time, close_time, is_closed) VALUES
(0, '00:00', '00:00', true),
(1, '09:00', '18:00', false),
(2, '09:00', '18:00', false),
(3, '09:00', '18:00', false),
(4, '09:00', '18:00', false),
(5, '09:00', '18:00', false),
(6, '09:00', '18:00', false)
ON CONFLICT DO NOTHING;

-- ==========================================
-- 6. AUTOMAÇÕES (TRIGGERS)
-- ==========================================

-- Função para manipular baixa e estorno de estoque
CREATE OR REPLACE FUNCTION cap_handle_stock_on_appointment_change()
RETURNS TRIGGER AS $$
DECLARE
    service_item RECORD;
BEGIN
    -- BAIXA DE ESTOQUE: Agendamento marcado como concluído
    IF (OLD.status != 'completed' OR OLD.status IS NULL) AND NEW.status = 'completed' THEN
        -- Itera sobre todos os serviços vinculados a este agendamento
        FOR service_item IN 
            SELECT ci.id as inventory_id, csi.quantity_consumed 
            FROM cap_appointment_services cas
            JOIN cap_service_inventory csi ON csi.service_id = cas.service_id
            JOIN cap_inventory ci ON ci.id = csi.inventory_id
            WHERE cas.appointment_id = NEW.id
        LOOP
            UPDATE cap_inventory 
            SET quantity = quantity - service_item.quantity_consumed
            WHERE id = service_item.inventory_id;
        END LOOP;
    END IF;

    -- ESTORNO DE ESTOQUE: Agendamento concluído que foi cancelado
    IF OLD.status = 'completed' AND NEW.status = 'cancelled' THEN
        FOR service_item IN 
            SELECT ci.id as inventory_id, csi.quantity_consumed 
            FROM cap_appointment_services cas
            JOIN cap_service_inventory csi ON csi.service_id = cas.service_id
            JOIN cap_inventory ci ON ci.id = csi.inventory_id
            WHERE cas.appointment_id = NEW.id
        LOOP
            UPDATE cap_inventory 
            SET quantity = quantity + service_item.quantity_consumed
            WHERE id = service_item.inventory_id;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gatilho aplicado à tabela de agendamentos
DROP TRIGGER IF EXISTS trig_handle_stock_change ON cap_appointments;
CREATE TRIGGER trig_handle_stock_change
AFTER UPDATE ON cap_appointments
FOR EACH ROW
EXECUTE FUNCTION cap_handle_stock_on_appointment_change();

-- ==========================================
-- 7. FUNÇÕES ADMINISTRATIVAS (RPC)
-- ==========================================

-- Função para Criar Usuário Interno (Admin Only)
CREATE OR REPLACE FUNCTION cap_admin_create_internal_user(
    p_email text,
    p_password text,
    p_full_name text,
    p_role text DEFAULT 'professional'
) RETURNS json AS $$
DECLARE
    new_user_id uuid;
BEGIN
    -- 1. Validação de Permissão
    IF NOT EXISTS (
        SELECT 1 FROM cap_profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso Negado.';
    END IF;

    -- 2. Inserção direta no Perfil com Senha Criptografada
    INSERT INTO cap_profiles (id, full_name, role, is_active, access_email, access_password)
    VALUES (
        gen_random_uuid(), 
        p_full_name, 
        p_role, 
        true, 
        p_email, 
        crypt(p_password, gen_salt('bf'))
    )
    RETURNING id INTO new_user_id;

    RETURN json_build_object('id', new_user_id, 'success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para Resetar Senha (Interna / Admin Only)
CREATE OR REPLACE FUNCTION cap_admin_set_password(
    p_user_id uuid,
    p_new_password text
) RETURNS boolean AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM cap_profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso Negado.';
    END IF;

    UPDATE cap_profiles 
    SET access_password = crypt(p_new_password, gen_salt('bf'))
    WHERE id = p_user_id;

-- Função para o próprio usuário alterar sua senha (Interno)
CREATE OR REPLACE FUNCTION cap_update_self_password(
    p_user_id uuid,
    p_new_password text
) RETURNS boolean AS $$
BEGIN
    -- Permitir apenas se o próprio usuário estiver alterando
    -- No caso interno, o app passará o ID da sessão. No banco validamos apenas a existência.
    UPDATE cap_profiles 
    SET access_password = crypt(p_new_password, gen_salt('bf'))
    WHERE id = p_user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para Verificar Login Interno
CREATE OR REPLACE FUNCTION cap_verify_login(
    p_email text,
    p_password text
) RETURNS TABLE (
    user_id uuid,
    full_name text,
    role text,
    is_active boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT id, cap_profiles.full_name, cap_profiles.role, cap_profiles.is_active
    FROM cap_profiles
    WHERE access_email = p_email 
    AND access_password = crypt(p_password, access_password)
    AND cap_profiles.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
