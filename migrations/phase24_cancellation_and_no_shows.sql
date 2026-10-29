-- ==============================================================================
-- Migração Fase 44: D8 (P1) - Política de Cancelamento e Controle de Faltas (No-Show)
-- Adiciona configurações de cancelamento no salão, contadores e bloqueios no cliente,
-- e suporte a status 'no_show', data/autor da falta e motivo de cancelamento.
-- ==============================================================================

-- 1. Configurações da Política de Cancelamento e Faltas no Salão (cap_tenants)
ALTER TABLE public.cap_tenants
  ADD COLUMN IF NOT EXISTS min_cancellation_hours INT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS no_show_penalty_action VARCHAR(30) DEFAULT 'warn',
  ADD COLUMN IF NOT EXISTS no_show_tolerance_count INT DEFAULT 2;

-- Comentários descritivos
COMMENT ON COLUMN public.cap_tenants.min_cancellation_hours IS 'Prazo mínimo em horas de antecedência exigido para o cliente cancelar ou remarcar online';
COMMENT ON COLUMN public.cap_tenants.no_show_penalty_action IS 'Ação ao atingir o limite de faltas: warn (apenas alertar), require_deposit (exigir sinal PIX), block (bloquear agendamento online)';
COMMENT ON COLUMN public.cap_tenants.no_show_tolerance_count IS 'Quantidade de faltas toleradas antes de aplicar a penalidade';

-- 2. Controle de Faltas e Bloqueio no Cliente (cap_clients)
ALTER TABLE public.cap_clients
  ADD COLUMN IF NOT EXISTS no_show_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_cap_clients_is_blocked ON public.cap_clients(tenant_id, is_blocked);

-- 3. Detalhes de Falta e Cancelamento no Agendamento (cap_appointments)
ALTER TABLE public.cap_appointments
  ADD COLUMN IF NOT EXISTS no_show_marked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_marked_by UUID REFERENCES public.cap_staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_cap_appointments_status ON public.cap_appointments(tenant_id, status);

-- 4. Concessões de permissão DML para o usuário opera_app (Princípio de Menor Privilégio - C5)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'opera_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_tenants TO opera_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_clients TO opera_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.cap_appointments TO opera_app;
  END IF;
END
$$;
