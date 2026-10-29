-- ==============================================================================
-- MIGRAÇÃO: FASE 43 — C6 (P1) ISOLAMENTO POR TENANT EM PROFUNDIDADE (RLS)
-- Objetivo: Ativar Row Level Security (RLS) no PostgreSQL em todas as tabelas
-- que possuem tenant_id, garantindo isolamento a nível de motor de banco de dados.
-- O papel 'opera_app' (NOBYPASSRLS) é fisicamente contido pelo contexto da sessão.
-- ==============================================================================

DO $$
DECLARE
    tbl_rec RECORD;
BEGIN
    FOR tbl_rec IN 
        SELECT DISTINCT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'tenant_id' 
          AND table_schema = 'public'
        ORDER BY table_name
    LOOP
        -- 1. Habilitar RLS na tabela
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl_rec.table_name);
        
        -- 2. Remover política anterior se existir para garantir idempotência
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public.%I;', tbl_rec.table_name);
        
        -- 3. Criar política de isolamento estrito por tenant_id
        EXECUTE format('
            CREATE POLICY tenant_isolation_policy ON public.%I
            AS PERMISSIVE
            FOR ALL
            TO opera_app, postgres
            USING (
                current_setting(''app.current_tenant_id'', true) = tenant_id::text
                OR current_setting(''app.is_superadmin'', true) = ''true''
                OR current_setting(''app.bypass_rls'', true) = ''true''
            )
            WITH CHECK (
                current_setting(''app.current_tenant_id'', true) = tenant_id::text
                OR current_setting(''app.is_superadmin'', true) = ''true''
                OR current_setting(''app.bypass_rls'', true) = ''true''
            );
        ', tbl_rec.table_name);

        RAISE NOTICE 'RLS ativado e política tenant_isolation_policy configurada para public.%', tbl_rec.table_name;
    END LOOP;
END
$$;
