-- Migração: Atualização de Planos de Assinatura (Fidelidade) para múltiplos serviços
-- Data: 2026-08-03

-- 1. Adicionar a nova coluna JSONB
ALTER TABLE public.cap_salon_memberships ADD COLUMN IF NOT EXISTS service_ids JSONB DEFAULT '[]'::jsonb;

-- 2. Migrar os dados antigos (se service_id não for nulo)
-- Isso converte o UUID antigo para um array JSON contendo o UUID como string
UPDATE public.cap_salon_memberships 
SET service_ids = jsonb_build_array(service_id::text) 
WHERE service_id IS NOT NULL;

-- 3. Remover a constraint de foreign key antiga
ALTER TABLE public.cap_salon_memberships DROP CONSTRAINT IF EXISTS cap_salon_memberships_service_id_fkey;

-- 4. Remover a coluna antiga
ALTER TABLE public.cap_salon_memberships DROP COLUMN IF EXISTS service_id;
