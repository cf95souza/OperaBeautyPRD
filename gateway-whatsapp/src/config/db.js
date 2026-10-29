import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Governança C11: Fuso horário canônico e parser imutável de datas
process.env.TZ = 'America/Sao_Paulo';
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export const pool = new Pool({
  host: process.env.DB_HOST || 'operabeauty-db',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'operabeauty',
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', (client) => {
  client.query("SET TIME ZONE 'America/Sao_Paulo'");
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Gateway] Erro inesperado no pool de conexão:', err.message);
});

export default pool;
