-- Adiciona colunas ausentes de comissão na tabela cap_appointments
ALTER TABLE public.cap_appointments
ADD COLUMN IF NOT EXISTS commission_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS commission_paid_at TIMESTAMPTZ;
