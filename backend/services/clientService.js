import pool from '../config/db.js';
import { logAudit } from './auditService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const listClients = async (tenantId, limit, offset) => {
  const result = await pool.query(
    `SELECT 
        c.id, c.name, c.phone, c.birth_date, c.vip_tier, c.created_at,
        c.anamnese_data,
        c.no_show_count, c.is_blocked, c.blocked_reason,
        COUNT(a.id) FILTER (WHERE a.status = 'completed') as visits,
        COALESCE(SUM(a.total_price) FILTER (WHERE a.status = 'completed'), 0) as ltv,
        MAX(a.start_time) FILTER (WHERE a.status = 'completed') as last_visit
     FROM public.cap_clients c
     LEFT JOIN public.cap_appointments a ON c.id = a.client_id
     WHERE c.tenant_id = $1
     GROUP BY c.id
     ORDER BY c.name LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset]
  );
  return result.rows;
};

export const createClient = async (tenantId, name, phone, password = '123456', birth_date = null, vip_tier = 'Prata') => {
  const cleanPhone = phone.replace(/\D/g, '');
  const existCheck = await pool.query(
    'SELECT id FROM public.cap_clients WHERE tenant_id = $1 AND phone = $2',
    [tenantId, cleanPhone]
  );
  if (existCheck.rows.length > 0) {
    const error = new Error('Já existe um cliente cadastrado com este telefone.');
    error.statusCode = 409;
    throw error;
  }

  const result = await pool.query(
    'SELECT cap_register_client($1, $2, $3, $4) AS client_id',
    [tenantId, name.trim(), cleanPhone, password]
  );
  const clientId = result.rows[0].client_id;

  if (birth_date || (vip_tier && vip_tier !== 'Prata')) {
    await pool.query(
      'UPDATE public.cap_clients SET birth_date = COALESCE($1, birth_date), vip_tier = COALESCE($2, vip_tier) WHERE id = $3 AND tenant_id = $4',
      [birth_date || null, vip_tier || 'Prata', clientId, tenantId]
    );
  }

  return { id: clientId, name: name.trim(), phone: cleanPhone, birth_date, vip_tier: vip_tier || 'Prata' };
};

export const importClients = async (tenantId, clientsList, options = {}, userId = null) => {
  const { all_or_nothing = true, on_duplicate = 'skip' } = options;
  const client = await pool.connect();

  const total = clientsList.length;
  const rejected = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  try {
    // Isolamento RLS compulsório (SET LOCAL app.current_tenant_id = $1 via set_config)
    await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', String(tenantId)]);

    // 1. Verificar se o inquilino existe e está ativo
    const tenantRes = await client.query(
      `SELECT t.id, t.name, t.status, p.features, p.name as plan_name 
       FROM public.cap_tenants t
       LEFT JOIN public.cap_plans p ON t.plan_id = p.id
       WHERE t.id = $1`,
      [tenantId]
    );

    if (tenantRes.rows.length === 0) {
      const error = new Error('Inquilino/Salão não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    if (tenantRes.rows[0].status === 'suspended') {
      const error = new Error('Conta do salão está suspensa. Importação bloqueada.');
      error.statusCode = 403;
      throw error;
    }

    // 2. Pré-validação e detecção de duplicidades no próprio lote
    const validRows = [];
    const seenPhonesInBatch = new Map(); // phone -> first seen row index

    for (let i = 0; i < clientsList.length; i++) {
      const row = clientsList[i];
      const rowNum = i + 1;
      const rawName = (row.name || '').trim();
      const rawPhone = (row.phone || '').toString().replace(/\D/g, '');

      if (!rawName) {
        rejected.push({
          row: rowNum,
          name: rawName || 'Sem nome',
          phone: row.phone || '',
          reason: 'Nome do cliente é obrigatório.'
        });
        continue;
      }

      if (!rawPhone || rawPhone.length < 10) {
        rejected.push({
          row: rowNum,
          name: rawName,
          phone: row.phone || '',
          reason: 'Telefone inválido (mínimo 10 dígitos com DDD).'
        });
        continue;
      }

      // Validar data de nascimento se fornecida
      let birthDate = null;
      if (row.birth_date) {
        const bdStr = String(row.birth_date).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(bdStr)) {
          birthDate = bdStr;
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(bdStr)) {
          const [d, m, y] = bdStr.split('/');
          birthDate = `${y}-${m}-${d}`;
        }
      }

      // Validar tier VIP
      const validTiers = ['Prata', 'Ouro', 'VIP', 'Black'];
      const vipTier = validTiers.includes(row.vip_tier) ? row.vip_tier : 'Prata';

      // Checar duplicata no lote
      if (seenPhonesInBatch.has(rawPhone)) {
        const firstSeen = seenPhonesInBatch.get(rawPhone);
        if (on_duplicate === 'skip') {
          skipped++;
          rejected.push({
            row: rowNum,
            name: rawName,
            phone: rawPhone,
            reason: `Telefone duplicado na planilha (mesmo telefone da linha ${firstSeen}).`
          });
          continue;
        }
      } else {
        seenPhonesInBatch.set(rawPhone, rowNum);
      }

      validRows.push({
        rowNum,
        name: rawName,
        phone: rawPhone,
        birthDate,
        vipTier,
        password: row.password || '123456'
      });
    }

    // Se o modo for tudo ou nada e houver linhas rejeitadas fatalmente na validação
    if (all_or_nothing && rejected.length > 0) {
      return {
        success: false,
        imported: 0,
        updated: 0,
        skipped,
        rejected,
        total,
        message: `Importação abortada: ${rejected.length} linha(s) apresentaram erros de validação.`
      };
    }

    // 3. Buscar clientes existentes no banco para esse tenant com os telefones do lote
    const phonesToQuery = validRows.map(r => r.phone);
    let existingMap = new Map();
    if (phonesToQuery.length > 0) {
      const existingRes = await client.query(
        'SELECT id, phone, name FROM public.cap_clients WHERE tenant_id = $1 AND phone = ANY($2)',
        [tenantId, phonesToQuery]
      );
      for (const row of existingRes.rows) {
        existingMap.set(row.phone, row);
      }
    }

    // 4. Executar transação no banco de dados
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', String(tenantId)]);

    for (const item of validRows) {
      const existing = existingMap.get(item.phone);

      if (existing) {
        if (on_duplicate === 'update') {
          await client.query(
            `UPDATE public.cap_clients 
             SET name = $1, 
                 birth_date = COALESCE($2, birth_date), 
                 vip_tier = COALESCE($3, vip_tier)
             WHERE id = $4 AND tenant_id = $5`,
            [item.name, item.birthDate, item.vipTier, existing.id, tenantId]
          );
          updated++;
        } else {
          skipped++;
        }
      } else {
        await client.query(
          `INSERT INTO public.cap_clients (tenant_id, name, phone, password_hash, birth_date, vip_tier)
           VALUES ($1, $2, $3, crypt($4, gen_salt('bf')), $5, $6)`,
          [tenantId, item.name, item.phone, item.password, item.birthDate, item.vipTier]
        );
        imported++;
      }
    }

    await client.query('COMMIT');

    if (userId) {
      logAudit(tenantId, userId, 'IMPORT_CLIENTS', {
        total,
        imported,
        updated,
        skipped,
        rejectedCount: rejected.length
      }).catch(err => console.error('[Audit Error]', err));
    }

    return {
      success: true,
      imported,
      updated,
      skipped,
      rejected,
      total,
      message: `Importação realizada com sucesso! ${imported} cliente(s) adicionado(s)${updated > 0 ? `, ${updated} atualizado(s)` : ''}${skipped > 0 ? `, ${skipped} ignorado(s)` : ''}.`
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateMe = async (userId, tenantId, name, birth_date, email = undefined) => {
  const result = await pool.query(
    `UPDATE public.cap_clients 
     SET name = COALESCE($1, name), 
         birth_date = COALESCE($2, birth_date),
         email = CASE WHEN $3::text IS NOT NULL THEN NULLIF(LOWER(TRIM($3)), '') ELSE email END
     WHERE id = $4 AND tenant_id = $5
     RETURNING id, name, phone, birth_date, email`,
    [name !== undefined ? name : null, birth_date !== undefined ? birth_date : null, email !== undefined ? email : null, userId, tenantId]
  );
  return result.rows[0];
};

export const updateClientPassword = async (clientId, tenantId, password, userRole = 'manager') => {
  let targetTenantId = tenantId;
  if (userRole === 'superadmin') {
    const clientRow = await pool.query('SELECT tenant_id FROM public.cap_clients WHERE id = $1', [clientId]);
    if (clientRow.rows.length === 0) {
      const error = new Error('Cliente não encontrado.');
      error.statusCode = 404;
      throw error;
    }
    targetTenantId = clientRow.rows[0].tenant_id;
  } else {
    const clientRow = await pool.query('SELECT id FROM public.cap_clients WHERE id = $1 AND tenant_id = $2', [clientId, tenantId]);
    if (clientRow.rows.length === 0) {
      const error = new Error('Cliente não encontrado neste salão.');
      error.statusCode = 404;
      throw error;
    }
  }

  await pool.query(
    'SELECT cap_update_client_password($1, $2, $3)',
    [clientId, targetTenantId, password]
  );
};

export const getClientById = async (id, tenantId, userId, userRole) => {
  if (userRole === 'client' && userId !== id) {
    const error = new Error('Acesso negado. Você só pode visualizar seus próprios dados.');
    error.statusCode = 403;
    throw error;
  }

  const result = await pool.query(
    'SELECT id, name, phone, email, birth_date, anamnese_data, vip_tier, no_show_count, is_blocked, blocked_reason, created_at FROM public.cap_clients WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Cliente não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const updateClient = async (id, tenantId, userId, userRole, name, phone, birth_date, vip_tier, is_blocked, blocked_reason, no_show_count) => {
  if (userRole === 'client' && userId !== id) {
    const error = new Error('Acesso negado. Você só pode atualizar seus próprios dados.');
    error.statusCode = 403;
    throw error;
  }

  // Apenas equipe administrativa pode alterar a categoria VIP, bloqueio ou faltas
  const isStaff = userRole === 'manager' || userRole === 'professional';
  const finalVipTier = isStaff ? vip_tier : undefined;
  const finalIsBlocked = isStaff && is_blocked !== undefined ? is_blocked : null;
  const finalBlockedReason = isStaff && blocked_reason !== undefined ? blocked_reason : null;
  const finalNoShowCount = isStaff && no_show_count !== undefined ? parseInt(no_show_count, 10) : null;

  const result = await pool.query(
    `UPDATE public.cap_clients 
     SET name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         birth_date = COALESCE($3, birth_date),
         vip_tier = COALESCE($4, vip_tier),
         is_blocked = COALESCE($5, is_blocked),
         blocked_reason = CASE WHEN $5 IS NOT NULL THEN $6 ELSE blocked_reason END,
         no_show_count = COALESCE($7, no_show_count)
     WHERE id = $8 AND tenant_id = $9
     RETURNING id, name, phone, birth_date, vip_tier, no_show_count, is_blocked, blocked_reason`,
    [name, phone, birth_date || null, finalVipTier || null, finalIsBlocked, finalBlockedReason, finalNoShowCount, id, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Cliente não encontrado ou acesso negado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

/**
 * Zerar faltas do cliente (D8 P1)
 * Redefine o contador para 0, remove bloqueio se oriundo de faltas e grava na timeline
 */
export const resetClientNoShows = async (id, tenantId, authorId = null) => {
  const result = await pool.query(
    `UPDATE public.cap_clients
     SET no_show_count = 0,
         is_blocked = CASE WHEN blocked_reason ILIKE '%falta%' THEN FALSE ELSE is_blocked END,
         blocked_reason = CASE WHEN blocked_reason ILIKE '%falta%' THEN NULL ELSE blocked_reason END
     WHERE id = $1 AND tenant_id = $2
     RETURNING id, name, phone, birth_date, vip_tier, no_show_count, is_blocked, blocked_reason`,
    [id, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Cliente não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  // Registrar na timeline
  await pool.query(
    `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, staff_id, content, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [tenantId, id, authorId || null, 'Histórico de faltas zerado pela gestão do salão.']
  );

  return result.rows[0];
};

/**
 * Alternar bloqueio do cliente para agendamentos online (D8 P1)
 */
export const toggleClientBlock = async (id, tenantId, is_blocked, reason = null, authorId = null) => {
  const result = await pool.query(
    `UPDATE public.cap_clients
     SET is_blocked = $1,
         blocked_reason = CASE WHEN $1 = TRUE THEN $2 ELSE NULL END
     WHERE id = $3 AND tenant_id = $4
     RETURNING id, name, phone, birth_date, vip_tier, no_show_count, is_blocked, blocked_reason`,
    [is_blocked, reason || (is_blocked ? 'Bloqueado pela administração do salão.' : null), id, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Cliente não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const noteMsg = is_blocked
    ? `Cliente bloqueado para agendamentos online: ${reason || 'Sem motivo informado.'}`
    : 'Bloqueio de agendamentos online removido pelo gestor.';

  await pool.query(
    `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, staff_id, content, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [tenantId, id, authorId || null, noteMsg]
  );

  return result.rows[0];
};

export const updateAnamnese = async (id, tenantId, anamnese_data) => {
  const result = await pool.query(
    `UPDATE public.cap_clients 
     SET anamnese_data = $1
     WHERE id = $2 AND tenant_id = $3
     RETURNING id, name, anamnese_data`,
    [JSON.stringify(anamnese_data), id, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Cliente não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const getClientTimeline = async (id, tenantId) => {
  const result = await pool.query(
    `SELECT n.id, n.content, n.image_path, n.created_at, n.appointment_id, 
            a.start_time as appointment_date,
            json_build_object('name', COALESCE(s.name, s2.name)) as cap_staff
     FROM public.cap_timeline_notes n
     LEFT JOIN public.cap_appointments a ON n.appointment_id = a.id
     LEFT JOIN public.cap_staff s ON n.staff_id = s.id
     LEFT JOIN public.cap_staff s2 ON a.staff_id = s2.id
     WHERE n.client_id = $1 AND n.tenant_id = $2
     ORDER BY n.created_at DESC`,
    [id, tenantId]
  );
  return result.rows;
};

export const createTimelineNote = async (id, tenantId, staffId, content, appointment_id, image_path) => {
  const result = await pool.query(
    `INSERT INTO public.cap_timeline_notes (tenant_id, client_id, appointment_id, staff_id, content, image_path, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING id, tenant_id, client_id, appointment_id, staff_id, content, image_path, created_at`,
    [tenantId, id, appointment_id || null, staffId || null, content, image_path || null]
  );
  return result.rows[0];
};

export const deleteTimelineNote = async (noteId, tenantId) => {
  const result = await pool.query(
    'DELETE FROM public.cap_timeline_notes WHERE id = $1 AND tenant_id = $2 RETURNING image_path',
    [noteId, tenantId]
  );

  const deletedNote = result.rows[0];
  if (deletedNote && deletedNote.image_path) {
    try {
      const filename = path.basename(deletedNote.image_path);
      const privatePath = path.resolve(__dirname, '../private_uploads/crm', tenantId, filename);
      const publicPath = path.resolve(__dirname, '../public/uploads', filename);

      if (fs.existsSync(privatePath)) {
        fs.unlinkSync(privatePath);
      } else if (fs.existsSync(publicPath)) {
        fs.unlinkSync(publicPath);
      }
    } catch (fsErr) {
      console.warn('[CRM Delete Note] Não foi possível remover o arquivo físico:', fsErr.message);
    }
  }
};

// LGPD Compliance (FINDING-27)
export const exportClientData = async (userId, tenantId) => {
  const profile = await pool.query('SELECT name, phone, birth_date, anamnese_data, created_at FROM public.cap_clients WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
  const appointments = await pool.query('SELECT id, status, total_price, start_time, end_time, created_at FROM public.cap_appointments WHERE client_id = $1 AND tenant_id = $2', [userId, tenantId]);
  const timeline = await pool.query('SELECT id, content, created_at FROM public.cap_timeline_notes WHERE client_id = $1 AND tenant_id = $2', [userId, tenantId]);
  
  if (profile.rows.length === 0) throw new Error('Cliente não encontrado.');
  
  return {
    perfil: profile.rows[0],
    agendamentos: appointments.rows,
    prontuario: timeline.rows
  };
};

export const anonymizeClient = async (userId, tenantId) => {
  // Gera um telefone falso para manter a restrição de NOT NULL e possível UNIQUE, ex: DEL-a1b2c3d4
  const deletedPhone = `DEL-${userId.substring(0, 8)}`;
  const result = await pool.query(`
    UPDATE public.cap_clients
    SET name = 'ANÔNIMO (LGPD)',
        phone = $3,
        email = NULL,
        password_hash = NULL,
        anamnese_data = '{}'::jsonb
    WHERE id = $1 AND tenant_id = $2
    RETURNING id
  `, [userId, tenantId, deletedPhone]);
  
  if (result.rows.length === 0) throw new Error('Cliente não encontrado.');
  return result.rows[0];
};
