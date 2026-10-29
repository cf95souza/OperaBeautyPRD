-- ==============================================================================
-- MIGRAÇÃO: FASE 43 — C5 (P1) USUÁRIO DE BANCO COM PRIVILÉGIO MÍNIMO (opera_app)
-- Objetivo: Criar papel dedicado para a aplicação com permissão estrita de DML
-- (SELECT, INSERT, UPDATE, DELETE), bloqueando DDL destrutivo (DROP/ALTER/CREATE).
-- O usuário 'postgres' é reservado unicamente para migrações DDL e backups.
-- ==============================================================================

-- 1. Criação idempotente do usuário/role opera_app
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'opera_app') THEN
        CREATE ROLE opera_app WITH LOGIN PASSWORD 'opera_app_secure_pass';
    END IF;
END
$$;

-- 2. Restrições estritas de governança (Não é superusuário, não cria bancos, não cria roles)
ALTER ROLE opera_app WITH 
    NOSUPERUSER 
    NOCREATEDB 
    NOCREATEROLE 
    NOREPLICATION 
    NOBYPASSRLS;

-- 3. Blindagem de schemas: revoga permissão de criação em schema public de PUBLIC
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- 4. Concessão exclusiva de conexão e uso
GRANT CONNECT ON DATABASE operabeauty TO opera_app;
GRANT USAGE ON SCHEMA public TO opera_app;

-- 5. Concessão exclusiva de DML nas tabelas atuais
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO opera_app;

-- 6. Concessão de uso e leitura em sequências (IDs auto-incrementados/seriais)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO opera_app;

-- 7. Concessão de execução em funções e procedures da aplicação
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO opera_app;

-- 8. Configuração de privilégios padrão para futuros objetos criados por migrações (superuser)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO opera_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO opera_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON ROUTINES TO opera_app;
