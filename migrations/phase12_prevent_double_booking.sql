-- ==============================================================================
-- Migração Fase 43: Bloqueio Estrito de Agendamento Duplo Concorrente (C2 - P0)
-- ==============================================================================
-- 1. Habilita a extensão btree_gist para suporte a operadores = em índices GiST
-- 2. Limpa conflitos residuais antigos cancelando registros de teste
-- 3. Adiciona a exclusion constraint no_overlapping_appointments na tabela cap_appointments
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Cancela agendamento residual de teste duplicado antigo caso exista
UPDATE public.cap_appointments 
SET status = 'cancelled' 
WHERE id = '87c0de5b-49cb-4349-a4f3-713ee01fd02b' 
  AND status = 'scheduled' 
  AND total_price = 0;

-- Remove constraint anterior se existir para idempotência
ALTER TABLE public.cap_appointments 
DROP CONSTRAINT IF EXISTS no_overlapping_appointments;

-- Cria a restrição de exclusão para impedir sobreposição de horários para o mesmo profissional
ALTER TABLE public.cap_appointments 
ADD CONSTRAINT no_overlapping_appointments 
EXCLUDE USING gist (
  tenant_id WITH =,
  staff_id WITH =,
  tstzrange(start_time, end_time) WITH &&
) 
WHERE (status <> 'cancelled');
