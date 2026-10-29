-- Adiciona a coluna vip_tier na tabela cap_clients caso não exista
ALTER TABLE public.cap_clients 
ADD COLUMN IF NOT EXISTS vip_tier TEXT DEFAULT 'Prata' CHECK (vip_tier IN ('Prata', 'Ouro', 'VIP', 'Black'));
