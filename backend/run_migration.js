import fs from 'fs';
import path from 'path';
import pool from './config/db.js';

async function run() {
  try {
    const sql = fs.readFileSync(path.resolve('../migrations/fix_timeline_columns.sql'), 'utf-8');
    console.log('Aplicando o script fix_timeline_columns.sql no banco...');
    await pool.query(sql);
    console.log('✅ Banco de dados atualizado com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Falha ao atualizar o banco de dados:', err);
    process.exit(1);
  }
}

run();
