import pool from '../config/db.js';

/**
 * OperaBeauty — Helper Único de Consulta Segura Multi-Tenant (C6 - P1)
 * 
 * Garante que:
 * 1. O tenant_id é validado obrigatoriamente (Fail Closed / Default Deny).
 * 2. Injeta `SET LOCAL app.current_tenant_id` na sessão para ativar o RLS do PostgreSQL.
 * 3. Proíbe vazamento acidental cross-tenant entre estabelecimentos.
 */

export async function tenantQuery(tenantId, sqlText, params = [], options = {}) {
  const isSuperadmin = options.isSuperadmin || false;

  // Validação constitucional de segurança: Salões não podem consultar sem tenant_id
  if (!isSuperadmin) {
    if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
      const error = new Error('Isolamento Multi-Tenant: tenant_id é estritamente obrigatório para esta consulta.');
      error.statusCode = 403;
      throw error;
    }
  }

  const client = await pool.connect();
  try {
    // Configura o contexto isolado da sessão no PostgreSQL para as políticas de RLS
    if (isSuperadmin) {
      await client.query("SET LOCAL app.is_superadmin = 'true'");
    } else {
      await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', tenantId.trim()]);
    }

    const result = await client.query(sqlText, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Helper para transações multi-tenant atômicas com contexto de RLS
 */
export async function tenantTransaction(tenantId, callback, options = {}) {
  const isSuperadmin = options.isSuperadmin || false;

  if (!isSuperadmin) {
    if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
      const error = new Error('Isolamento Multi-Tenant: tenant_id é estritamente obrigatório para esta transação.');
      error.statusCode = 403;
      throw error;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (isSuperadmin) {
      await client.query("SET LOCAL app.is_superadmin = 'true'");
    } else {
      await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', tenantId.trim()]);
    }

    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default {
  tenantQuery,
  tenantTransaction
};
