-- ====================================================================
-- MIGRAÇÃO PHASE 17: Fuso Horário America/Sao_Paulo e Integridade de Datas (C11)
-- ====================================================================

-- 1. Configuração do fuso horário America/Sao_Paulo no banco de dados e nos papéis
ALTER DATABASE operabeauty SET timezone TO 'America/Sao_Paulo';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
        ALTER ROLE postgres SET timezone TO 'America/Sao_Paulo';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
        ALTER ROLE opera_app SET timezone TO 'America/Sao_Paulo';
    END IF;
END $$;

-- 2. Garantir que as colunas de agendamento sejam timestamptz (com fuso horário)
DO $$
BEGIN
    -- start_time em cap_appointments
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cap_appointments' AND column_name = 'start_time' AND data_type <> 'timestamp with time zone'
    ) THEN
        ALTER TABLE public.cap_appointments 
        ALTER COLUMN start_time TYPE TIMESTAMPTZ USING start_time AT TIME ZONE 'America/Sao_Paulo';
    END IF;

    -- end_time em cap_appointments
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cap_appointments' AND column_name = 'end_time' AND data_type <> 'timestamp with time zone'
    ) THEN
        ALTER TABLE public.cap_appointments 
        ALTER COLUMN end_time TYPE TIMESTAMPTZ USING end_time AT TIME ZONE 'America/Sao_Paulo';
    END IF;

    -- created_at em cap_appointments
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cap_appointments' AND column_name = 'created_at' AND data_type <> 'timestamp with time zone'
    ) THEN
        ALTER TABLE public.cap_appointments 
        ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'America/Sao_Paulo';
    END IF;
END $$;

-- 3. Garantir que campos de data calendário permaneçam como DATE estrito
DO $$
BEGIN
    -- birth_date em cap_clients
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cap_clients' AND column_name = 'birth_date' AND data_type <> 'date'
    ) THEN
        ALTER TABLE public.cap_clients ALTER COLUMN birth_date TYPE DATE USING birth_date::date;
    END IF;

    -- exception_date em cap_date_exceptions
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cap_date_exceptions' AND column_name = 'exception_date' AND data_type <> 'date'
    ) THEN
        ALTER TABLE public.cap_date_exceptions ALTER COLUMN exception_date TYPE DATE USING exception_date::date;
    END IF;

    -- due_date em cap_invoices
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cap_invoices' AND column_name = 'due_date' AND data_type <> 'date'
    ) THEN
        ALTER TABLE public.cap_invoices ALTER COLUMN due_date TYPE DATE USING due_date::date;
    END IF;
END $$;
