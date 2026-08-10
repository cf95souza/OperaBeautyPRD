import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    const sqlPath = path.join(__dirname, '20_giftcards_v2.sql');
    const sqlString = fs.readFileSync(sqlPath, 'utf8');

    console.log('Iniciando migração de Gift Cards V2...');
    await client.query('BEGIN');
    await client.query(sqlString);
    await client.query('COMMIT');
    console.log('Migração concluída com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro na migração:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
