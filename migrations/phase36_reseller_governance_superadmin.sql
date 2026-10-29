-- =========================================================================
-- Migração: Governança do Programa de Revenda pelo Super Admin (Fase 45 / Governança)
-- Permite ao Super Admin ativar/desativar o programa e acompanhar chaves PIX e saques
-- =========================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cap_platform_settings' AND column_name = 'reseller_program_enabled'
    ) THEN
        ALTER TABLE public.cap_platform_settings 
        ADD COLUMN reseller_program_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cap_platform_settings' AND column_name = 'reseller_default_commission_rate'
    ) THEN
        ALTER TABLE public.cap_platform_settings 
        ADD COLUMN reseller_default_commission_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00;
    END IF;
END $$;

-- Garante que se houver registro de configuração, o programa nasça desligado (false)
UPDATE public.cap_platform_settings 
SET reseller_program_enabled = FALSE 
WHERE reseller_program_enabled IS NULL;
