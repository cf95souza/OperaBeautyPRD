import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configurar o parser do pg para retornar DATE (OID 1082) como string YYYY-MM-DD sem conversão de fuso horário
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Testar a conexão na inicialização
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erro ao conectar no PostgreSQL:', err.message);
  } else {
    console.log('✅ Conexão com o PostgreSQL estabelecida com sucesso em:', res.rows[0].now);
  }
});

export default pool;
