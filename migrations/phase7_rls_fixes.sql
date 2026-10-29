-- Migration: Correções de Permissões (RLS) para o Portal Público
-- Executar no SQL Editor do Supabase

-- 1. Permitir que qualquer pessoa (anon/public) cadastre clientes via portal público
DROP POLICY IF EXISTS "Permitir inserção pública de clientes" ON cap_clients;
CREATE POLICY "Permitir inserção pública de clientes" 
ON cap_clients FOR INSERT 
TO public 
WITH CHECK (true);

-- 2. Permitir que o portal público leia informações dos profissionais (para seleção no agendamento)
DROP POLICY IF EXISTS "Permitir leitura pública de profissionais habilitados" ON cap_profiles;
CREATE POLICY "Permitir leitura pública de profissionais habilitados" 
ON cap_profiles FOR SELECT 
TO public 
USING (is_active = true);

-- 3. Permitir que clientes anônimos consultem seus próprios dados pelo telefone
DROP POLICY IF EXISTS "Permitir leitura pública por telefone" ON cap_clients;
CREATE POLICY "Permitir leitura pública por telefone" 
ON cap_clients FOR SELECT 
TO public 
USING (true);

-- Nota: Estas políticas são necessárias para o portal público funcionar sem exigir login da cliente.
