import { BufferJSON, initAuthCreds } from '@whiskeysockets/baileys';
import pool from '../config/db.js';
import { encrypt, decrypt } from '../crypto/cipher.js';

/**
 * Adaptador de Sessão PostgreSQL com Criptografia AES-256-GCM para Baileys v7
 * Governança: 01-security-constitution & 07-database-architect
 * 
 * @param {string} tenantId - UUID do salão contratante
 * @returns {Promise<{ state: { creds: any, keys: any }, saveCreds: () => Promise<void> }>}
 */
export async function usePostgresAuthState(tenantId) {
  if (!tenantId) {
    throw new Error('tenantId é obrigatório para inicializar auth state');
  }

  // 1. Carrega ou inicializa 'creds'
  let creds;
  try {
    const credsResult = await pool.query(
      'SELECT encrypted_value FROM public.cap_whatsapp_auth_keys WHERE tenant_id = $1 AND key_name = $2',
      [tenantId, 'creds']
    );

    if (credsResult.rows.length > 0) {
      const decrypted = decrypt(credsResult.rows[0].encrypted_value);
      creds = JSON.parse(decrypted, BufferJSON.reviver);
    } else {
      creds = initAuthCreds();
    }
  } catch (error) {
    console.error(`[AuthState] Erro ao recuperar creds para o tenant ${tenantId}, reinicializando:`, error.message);
    creds = initAuthCreds();
  }

  // 2. Função para salvar 'creds'
  const saveCreds = async () => {
    try {
      const serialized = JSON.stringify(creds, BufferJSON.replacer);
      const encrypted = encrypt(serialized);

      await pool.query(
        `INSERT INTO public.cap_whatsapp_auth_keys (tenant_id, key_name, encrypted_value, updated_at)
         VALUES ($1, 'creds', $2, NOW())
         ON CONFLICT (tenant_id, key_name)
         DO UPDATE SET encrypted_value = EXCLUDED.encrypted_value, updated_at = NOW()`,
        [tenantId, encrypted]
      );
    } catch (error) {
      console.error(`[AuthState] Falha ao salvar creds para tenant ${tenantId}:`, error.message);
      throw error;
    }
  };

  // 3. Interface de keys (get / set) para chaves do protocolo Signal
  const keys = {
    get: async (type, ids) => {
      const data = {};
      if (!ids || ids.length === 0) return data;

      const keyNames = ids.map((id) => `${type}-${id}`);

      try {
        const result = await pool.query(
          'SELECT key_name, encrypted_value FROM public.cap_whatsapp_auth_keys WHERE tenant_id = $1 AND key_name = ANY($2::text[])',
          [tenantId, keyNames]
        );

        for (const row of result.rows) {
          try {
            const rawId = row.key_name.replace(`${type}-`, '');
            const decrypted = decrypt(row.encrypted_value);
            let parsed = JSON.parse(decrypted, BufferJSON.reviver);

            if (type === 'app-state-sync-key' && parsed) {
              // Baileys proto import handle se necessário
            }
            data[rawId] = parsed;
          } catch (itemErr) {
            console.error(`[AuthState] Falha ao decriptar chave ${row.key_name}:`, itemErr.message);
          }
        }
      } catch (dbErr) {
        console.error(`[AuthState] Erro ao buscar chaves [${type}] para tenant ${tenantId}:`, dbErr.message);
      }

      return data;
    },

    set: async (data) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const category of Object.keys(data)) {
          for (const id of Object.keys(data[category])) {
            const value = data[category][id];
            const keyName = `${category}-${id}`;

            if (value) {
              const serialized = JSON.stringify(value, BufferJSON.replacer);
              const encrypted = encrypt(serialized);

              await client.query(
                `INSERT INTO public.cap_whatsapp_auth_keys (tenant_id, key_name, encrypted_value, updated_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (tenant_id, key_name)
                 DO UPDATE SET encrypted_value = EXCLUDED.encrypted_value, updated_at = NOW()`,
                [tenantId, keyName, encrypted]
              );
            } else {
              await client.query(
                'DELETE FROM public.cap_whatsapp_auth_keys WHERE tenant_id = $1 AND key_name = $2',
                [tenantId, keyName]
              );
            }
          }
        }

        await client.query('COMMIT');
      } catch (txError) {
        await client.query('ROLLBACK');
        console.error(`[AuthState] Erro ao persistir lote de chaves para tenant ${tenantId}:`, txError.message);
        throw txError;
      } finally {
        client.release();
      }
    },
  };

  return {
    state: {
      creds,
      keys,
    },
    saveCreds,
  };
}

export default usePostgresAuthState;
