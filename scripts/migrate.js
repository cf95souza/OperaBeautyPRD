#!/usr/bin/env node
// ==============================================================================
// OperaBeauty SaaS - Motor de Migrações do PostgreSQL com Rollback (Item G4 - P1)
// ==============================================================================
// - Gerencia migrações versionadas com suporte a UP e DOWN (Rollback)
// - Executa cada migração dentro de transações atômicas BEGIN ... COMMIT / ROLLBACK
// - Rastreia versões na tabela public.cap_schema_migrations com checksum SHA-256
// - Comandos: up, down, status, create <nome>, baseline
// ==============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Carrega dependências priorizando backend/node_modules
const requireBackend = createRequire(path.join(rootDir, 'backend', 'package.json'));
let pg;
try {
  pg = requireBackend('pg');
} catch {
  const requireLocal = createRequire(import.meta.url);
  pg = requireLocal('pg');
}

let dotenv;
try {
  dotenv = requireBackend('dotenv');
} catch {
  const requireLocal = createRequire(import.meta.url);
  dotenv = requireLocal('dotenv');
}

// Carrega .env da raiz ou do backend
const envPath = fs.existsSync(path.join(rootDir, '.env')) 
  ? path.join(rootDir, '.env') 
  : path.join(rootDir, 'backend/.env');

if (dotenv && typeof dotenv.config === 'function') {
  dotenv.config({ path: envPath });
}

const migrationsDir = path.join(rootDir, 'migrations');

const { Pool } = pg;

function getDbPool() {
  return new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'operabeauty',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    connectionTimeoutMillis: 10000,
  });
}

// 1. Garante que a tabela de controle de migrações existe
async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.cap_schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      batch INT NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_cap_schema_migrations_batch ON public.cap_schema_migrations(batch);
  `);
}

// 2. Parser de arquivo de migração (separa UP e DOWN)
export function parseMigrationSql(content) {
  const checksum = crypto.createHash('sha256').update(content).digest('hex');

  const upMatch = content.match(/--\s*(?:>>>\s*UP\s*>>>|UP|Up)\s*([\s\S]*?)(?:--\s*(?:>>>\s*DOWN\s*>>>|DOWN|Down)|$)/i);
  const downMatch = content.match(/--\s*(?:>>>\s*DOWN\s*>>>|DOWN|Down)\s*([\s\S]*)$/i);

  if (upMatch && downMatch) {
    return {
      up: upMatch[1].trim(),
      down: downMatch[1].trim(),
      hasRollback: downMatch[1].trim().length > 0,
      checksum
    };
  }

  // Se não encontrar os delimitadores explícitos, o conteúdo total é tratado como UP
  return {
    up: content.trim(),
    down: '',
    hasRollback: false,
    checksum
  };
}

// 3. Comando: migrate status
export async function getMigrationStatus(pool) {
  const client = await pool.connect();
  try {
    await ensureMigrationTable(client);

    const dbRes = await client.query('SELECT name, batch, executed_at FROM public.cap_schema_migrations ORDER BY id ASC');
    const appliedMap = new Map();
    dbRes.rows.forEach(r => appliedMap.set(r.name, r));

    if (!fs.existsSync(migrationsDir)) {
      return [];
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    const statusList = files.map(file => {
      const applied = appliedMap.get(file);
      return {
        name: file,
        applied: !!applied,
        batch: applied ? applied.batch : null,
        executed_at: applied ? applied.executed_at : null
      };
    });

    return statusList;
  } finally {
    client.release();
  }
}

// 4. Comando: migrate up
export async function runMigrateUp(pool) {
  const client = await pool.connect();
  try {
    await ensureMigrationTable(client);

    const dbRes = await client.query('SELECT name FROM public.cap_schema_migrations');
    const appliedSet = new Set(dbRes.rows.map(r => r.name));

    const batchRes = await client.query('SELECT COALESCE(MAX(batch), 0) + 1 AS next_batch FROM public.cap_schema_migrations');
    const currentBatch = batchRes.rows[0].next_batch;

    if (!fs.existsSync(migrationsDir)) {
      console.log('ℹ️ Diretório de migrações não encontrado.');
      return { appliedCount: 0, appliedFiles: [] };
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    const pending = files.filter(f => !appliedSet.has(f));

    if (pending.length === 0) {
      console.log('✨ Nenhuma migração pendente. O banco de dados já está 100% atualizado.');
      return { appliedCount: 0, appliedFiles: [] };
    }

    console.log(`🚀 Executando ${pending.length} migração(ões) pendente(s) no Batch #${currentBatch}...\n`);
    const appliedFiles = [];

    for (const file of pending) {
      const filePath = path.join(migrationsDir, file);
      const rawContent = fs.readFileSync(filePath, 'utf8');
      const { up, checksum } = parseMigrationSql(rawContent);

      if (!up) {
        console.log(`   ⏭️ [PULADO] ${file} (bloco UP vazio)`);
        continue;
      }

      console.log(`   ⚙️ Aplicando: ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(up);
        await client.query(
          'INSERT INTO public.cap_schema_migrations (name, batch, checksum) VALUES ($1, $2, $3)',
          [file, currentBatch, checksum]
        );
        await client.query('COMMIT');
        console.log(`   ✅ [SUCESSO] ${file}`);
        appliedFiles.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`\n❌ [FALHA CRÍTICA] Erro ao aplicar migração ${file}:`);
        console.error(`   ${err.message}\n`);
        throw err;
      }
    }

    console.log(`\n🎉 Migrações concluídas: ${appliedFiles.length} arquivo(s) executados no Batch #${currentBatch}.`);
    return { appliedCount: appliedFiles.length, appliedFiles, batch: currentBatch };
  } finally {
    client.release();
  }
}

// 5. Comando: migrate down (Rollback)
export async function runMigrateDown(pool) {
  const client = await pool.connect();
  try {
    await ensureMigrationTable(client);

    const batchRes = await client.query('SELECT MAX(batch) as max_batch FROM public.cap_schema_migrations');
    const lastBatch = batchRes.rows[0].max_batch;

    if (!lastBatch) {
      console.log('ℹ️ Nenhuma migração foi aplicada para ser revertida.');
      return { rolledBackCount: 0, rolledBackFiles: [] };
    }

    const lastMigrationsRes = await client.query(
      'SELECT id, name FROM public.cap_schema_migrations WHERE batch = $1 ORDER BY id DESC',
      [lastBatch]
    );

    const toRollback = lastMigrationsRes.rows;
    console.log(`🔄 Revertendo ${toRollback.length} migração(ões) do Batch #${lastBatch}...\n`);
    const rolledBackFiles = [];

    for (const record of toRollback) {
      const filePath = path.join(migrationsDir, record.name);
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Erro: Arquivo de migração original '${record.name}' não encontrado no disco para reversão.`);
        throw new Error(`Arquivo de migração ${record.name} ausente`);
      }

      const rawContent = fs.readFileSync(filePath, 'utf8');
      const { down, hasRollback } = parseMigrationSql(rawContent);

      if (!hasRollback || !down) {
        console.warn(`⚠️ Aviso: A migração '${record.name}' não possui bloco DOWN definido. Removendo apenas registro de schema.`);
      }

      console.log(`   ⏪ Revertendo: ${record.name}...`);
      await client.query('BEGIN');
      try {
        if (down) {
          await client.query(down);
        }
        await client.query('DELETE FROM public.cap_schema_migrations WHERE id = $1', [record.id]);
        await client.query('COMMIT');
        console.log(`   ✅ [REVERTIDO] ${record.name}`);
        rolledBackFiles.push(record.name);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`\n❌ [FALHA NO ROLLBACK] Erro ao reverter ${record.name}:`);
        console.error(`   ${err.message}\n`);
        throw err;
      }
    }

    console.log(`\n🎉 Rollback do Batch #${lastBatch} concluído com sucesso: ${rolledBackFiles.length} migração(ões) revertidas.`);
    return { rolledBackCount: rolledBackFiles.length, rolledBackFiles, batch: lastBatch };
  } finally {
    client.release();
  }
}

// 6. Comando: migrate baseline
export async function runMigrateBaseline(pool) {
  const client = await pool.connect();
  try {
    await ensureMigrationTable(client);

    if (!fs.existsSync(migrationsDir)) {
      console.log('ℹ️ Diretório de migrações não encontrado.');
      return { count: 0 };
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    console.log(`📌 Registrando ${files.length} migrações existentes como Baseline (Batch #1)...`);
    let registered = 0;

    for (const file of files) {
      const rawContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(rawContent).digest('hex');

      const res = await client.query(`
        INSERT INTO public.cap_schema_migrations (name, batch, checksum)
        VALUES ($1, 1, $2)
        ON CONFLICT (name) DO NOTHING
      `, [file, checksum]);

      if (res.rowCount > 0) {
        registered++;
      }
    }

    console.log(`✅ Baseline configurado com sucesso! ${registered} nova(s) migração(ões) registrada(s).`);
    return { count: registered };
  } finally {
    client.release();
  }
}

// 7. Comando: migrate create <nome>
export function createMigrationFile(name) {
  if (!name) {
    console.error('❌ Erro: Informe o nome da migração.');
    console.error('Exemplo: npm run migrate:create add_customer_notes');
    process.exit(1);
  }

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const filename = `${timestamp}_${sanitizedName}.sql`;
  const filePath = path.join(migrationsDir, filename);

  const template = `-- ==============================================================================
-- Migração: ${name}
-- Criado em: ${new Date().toISOString()}
-- ==============================================================================

-- >>> UP >>>
-- Coloque aqui os comandos SQL para APLICAR a migração (CREATE, ALTER, INSERT, etc):



-- >>> DOWN >>>
-- Coloque aqui os comandos SQL para REVERTER a migração (DROP, DELETE, etc):


`;

  fs.writeFileSync(filePath, template, 'utf8');
  console.log(`✅ Arquivo de migração criado com sucesso:`);
  console.log(`   ${filePath}`);
  return filePath;
}

// 8. Execução CLI se chamado diretamente via terminal
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] || 'status';
  const param = process.argv[3];
  const pool = getDbPool();

  (async () => {
    try {
      if (command === 'up') {
        await runMigrateUp(pool);
      } else if (command === 'down') {
        await runMigrateDown(pool);
      } else if (command === 'status') {
        const list = await getMigrationStatus(pool);
        console.log('\n==========================================================================');
        console.log('             OperaBeauty SaaS - Status de Migrações do Banco');
        console.log('==========================================================================');
        if (list.length === 0) {
          console.log('Nenhuma migração encontrada em /migrations.');
        } else {
          list.forEach(m => {
            const statusStr = m.applied 
              ? `\x1b[32m[APLICADA (Batch #${m.batch})]\x1b[0m` 
              : `\x1b[33m[PENDENTE]\x1b[0m`;
            const dateStr = m.executed_at ? ` em ${new Date(m.executed_at).toLocaleString('pt-BR')}` : '';
            console.log(` ${statusStr.padEnd(30)} ${m.name}${dateStr}`);
          });
        }
        console.log('==========================================================================\n');
      } else if (command === 'create') {
        createMigrationFile(param);
      } else if (command === 'baseline') {
        await runMigrateBaseline(pool);
      } else {
        console.log(`Comando desconhecido: ${command}`);
        console.log('Uso: node scripts/migrate.js [up | down | status | create <nome> | baseline]');
      }
    } catch (err) {
      console.error('\n❌ Erro durante a execução da ferramenta de migrações:', err.message);
      process.exit(1);
    } finally {
      await pool.end();
    }
  })();
}
