import pool from '../config/db.js';
import { safeCacheGet, safeCacheSet, safeCacheDel } from '../utils/cacheHelper.js';
import { logAudit } from './auditService.js';

export const listServices = async (tenantId) => {
  const cacheKey = `tenant:${tenantId}:services`;
  const cachedData = await safeCacheGet(cacheKey);
  
  if (cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch {
      // Ignora erro de parse e busca do banco
    }
  }

  const result = await pool.query(
    `SELECT 
      s.id, s.name, s.short_description, s.duration_minutes, s.price, s.is_starting_price, s.reduces_stock, s.maintenance_days, s.is_active,
      s.requires_deposit, s.deposit_type, s.deposit_amount,
      COALESCE((
        SELECT json_agg(json_build_object('inventory_id', si.inventory_id, 'quantity_consumed', si.quantity_consumed))
        FROM public.cap_service_inventory si WHERE si.service_id = s.id
      ), '[]'::json) as inputs,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', sv.id,
          'name', sv.name,
          'price', sv.price,
          'duration_minutes', sv.duration_minutes,
          'is_active', sv.is_active,
          'order_index', sv.order_index
        ) ORDER BY sv.order_index ASC, sv.price ASC)
        FROM public.cap_service_variations sv WHERE sv.service_id = s.id AND sv.is_active = TRUE
      ), '[]'::json) as variations,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id', se.id,
          'name', se.name,
          'price', se.price,
          'duration_minutes', se.duration_minutes,
          'is_active', se.is_active,
          'order_index', se.order_index
        ) ORDER BY se.order_index ASC, se.price ASC)
        FROM public.cap_service_extras se WHERE se.service_id = s.id AND se.is_active = TRUE
      ), '[]'::json) as extras
     FROM public.cap_services s
     WHERE s.tenant_id = $1 
     ORDER BY s.name`,
    [tenantId]
  );

  // Mapeia serviços para garantir que se houver variações ativas, is_starting_price seja true e o preço base reflita o mínimo
  const mappedRows = result.rows.map(service => {
    const vars = service.variations || [];
    const hasVars = vars.length > 0;
    const isStarting = Boolean(service.is_starting_price || hasVars);
    let minPrice = parseFloat(service.price || 0);
    if (hasVars) {
      const varPrices = vars.map(v => parseFloat(v.price || 0));
      minPrice = Math.min(...varPrices);
    }
    return {
      ...service,
      is_starting_price: isStarting,
      starting_price: minPrice
    };
  });
  
  // TTL de 5 minutos (300 segundos) para dados do catálogo
  await safeCacheSet(cacheKey, 300, mappedRows);
  
  return mappedRows;
};

export const getServiceInputs = async (id, tenantId) => {
  const result = await pool.query(
    'SELECT inventory_id, quantity_consumed FROM public.cap_service_inventory WHERE service_id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return result.rows;
};

export const createService = async (
  tenantId,
  name,
  duration_minutes,
  price,
  is_starting_price,
  reduces_stock,
  maintenance_days,
  inputs,
  requires_deposit = false,
  deposit_type = 'percentage',
  deposit_amount = 0,
  short_description = null,
  variations = [],
  extras = []
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hasVariations = Array.isArray(variations) && variations.length > 0;
    const computedStartingPrice = Boolean(is_starting_price || hasVariations);

    const serviceResult = await client.query(
      `INSERT INTO public.cap_services (tenant_id, name, duration_minutes, price, is_starting_price, reduces_stock, maintenance_days, is_active, requires_deposit, deposit_type, deposit_amount, short_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10, $11)
       RETURNING id, tenant_id, name, short_description, duration_minutes, price, is_starting_price, reduces_stock, maintenance_days, is_active, requires_deposit, deposit_type, deposit_amount, created_at`,
      [tenantId, name, duration_minutes, price, computedStartingPrice, reduces_stock || false, maintenance_days || 0, requires_deposit || false, deposit_type || 'percentage', deposit_amount || 0, short_description || null]
    );

    const newService = serviceResult.rows[0];

    // Inserção de insumos
    if (reduces_stock && inputs && Array.isArray(inputs) && inputs.length > 0) {
      for (const input of inputs) {
        if (input.inventory_id && input.quantity_consumed) {
          await client.query(
            `INSERT INTO public.cap_service_inventory (tenant_id, service_id, inventory_id, quantity_consumed)
             VALUES ($1, $2, $3, $4)`,
            [tenantId, newService.id, input.inventory_id, parseFloat(input.quantity_consumed)]
          );
        }
      }
    }

    // Inserção de variações de tamanho/preço (Item D12 P2)
    const savedVariations = [];
    if (hasVariations) {
      for (let i = 0; i < variations.length; i++) {
        const v = variations[i];
        if (v && v.name && v.price !== undefined) {
          const varRes = await client.query(
            `INSERT INTO public.cap_service_variations (tenant_id, service_id, name, price, duration_minutes, is_active, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, service_id, name, price, duration_minutes, is_active, order_index`,
            [tenantId, newService.id, v.name.trim(), parseFloat(v.price), parseInt(v.duration_minutes || duration_minutes, 10), v.is_active !== false, v.order_index ?? i]
          );
          savedVariations.push(varRes.rows[0]);
        }
      }
    }

    // Inserção de extras/adicionais opcionais (Item D12 P2)
    const savedExtras = [];
    if (Array.isArray(extras) && extras.length > 0) {
      for (let i = 0; i < extras.length; i++) {
        const e = extras[i];
        if (e && e.name) {
          const extraRes = await client.query(
            `INSERT INTO public.cap_service_extras (tenant_id, service_id, name, price, duration_minutes, is_active, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, service_id, name, price, duration_minutes, is_active, order_index`,
            [tenantId, newService.id, e.name.trim(), parseFloat(e.price || 0), parseInt(e.duration_minutes || 0, 10), e.is_active !== false, e.order_index ?? i]
          );
          savedExtras.push(extraRes.rows[0]);
        }
      }
    }

    await client.query('COMMIT');
    
    await safeCacheDel(`tenant:${tenantId}:services`);
    
    return { newService, inputs, variations: savedVariations, extras: savedExtras };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateService = async (
  id,
  tenantId,
  name,
  duration_minutes,
  price,
  is_starting_price,
  reduces_stock,
  maintenance_days,
  is_active,
  inputs,
  requires_deposit,
  deposit_type,
  deposit_amount,
  short_description = null,
  variations = undefined,
  extras = undefined
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const oldServiceResult = await client.query(
      'SELECT id, tenant_id, name, short_description, duration_minutes, price, is_starting_price, reduces_stock, maintenance_days, is_active, requires_deposit, deposit_type, deposit_amount, created_at FROM public.cap_services WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (oldServiceResult.rows.length === 0) {
      const error = new Error('Serviço não encontrado ou acesso negado.');
      error.statusCode = 404;
      throw error;
    }
    const oldService = oldServiceResult.rows[0];

    const hasVariations = Array.isArray(variations) && variations.length > 0;
    const computedStartingPrice = is_starting_price !== undefined ? (is_starting_price || hasVariations) : oldService.is_starting_price;

    const finalName = name !== undefined ? name : oldService.name;
    const finalDuration = duration_minutes !== undefined ? duration_minutes : oldService.duration_minutes;
    const finalPrice = price !== undefined ? price : oldService.price;
    const finalReducesStock = reduces_stock !== undefined ? reduces_stock : oldService.reduces_stock;
    const finalMaintenanceDays = maintenance_days !== undefined ? maintenance_days : oldService.maintenance_days;
    const finalIsActive = is_active !== undefined ? is_active : oldService.is_active;
    const finalRequiresDeposit = requires_deposit !== undefined ? requires_deposit : oldService.requires_deposit;
    const finalDepositType = deposit_type !== undefined ? deposit_type : oldService.deposit_type;
    const finalDepositAmount = deposit_amount !== undefined ? deposit_amount : oldService.deposit_amount;
    const finalShortDescription = short_description !== undefined ? short_description : oldService.short_description;

    const serviceResult = await client.query(
      `UPDATE public.cap_services 
       SET name = $1, 
           duration_minutes = $2, 
           price = $3, 
           is_starting_price = $4,
           reduces_stock = $5, 
           maintenance_days = $6,
           is_active = $7,
           requires_deposit = $8,
           deposit_type = $9,
           deposit_amount = $10,
           short_description = $11
       WHERE id = $12 AND tenant_id = $13
       RETURNING id, tenant_id, name, short_description, duration_minutes, price, is_starting_price, reduces_stock, maintenance_days, is_active, requires_deposit, deposit_type, deposit_amount, created_at`,
      [finalName, finalDuration, finalPrice, computedStartingPrice, finalReducesStock, finalMaintenanceDays, finalIsActive, finalRequiresDeposit, finalDepositType, finalDepositAmount, finalShortDescription, id, tenantId]
    );

    const updatedService = serviceResult.rows[0];

    // Atualização de insumos apenas quando enviado explicitamente
    if (inputs !== undefined && Array.isArray(inputs)) {
      await client.query(
        'DELETE FROM public.cap_service_inventory WHERE service_id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (finalReducesStock && inputs.length > 0) {
        for (const input of inputs) {
          if (input.inventory_id && input.quantity_consumed) {
            await client.query(
              `INSERT INTO public.cap_service_inventory (tenant_id, service_id, inventory_id, quantity_consumed)
               VALUES ($1, $2, $3, $4)`,
              [tenantId, id, input.inventory_id, parseFloat(input.quantity_consumed)]
            );
          }
        }
      }
    }

    // Atualização de variações (Item D12 P2)
    if (variations !== undefined && Array.isArray(variations)) {
      await client.query(
        'DELETE FROM public.cap_service_variations WHERE service_id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      for (let i = 0; i < variations.length; i++) {
        const v = variations[i];
        if (v && v.name && v.price !== undefined) {
          await client.query(
            `INSERT INTO public.cap_service_variations (tenant_id, service_id, name, price, duration_minutes, is_active, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [tenantId, id, v.name.trim(), parseFloat(v.price), parseInt(v.duration_minutes || duration_minutes, 10), v.is_active !== false, v.order_index ?? i]
          );
        }
      }
    }

    // Atualização de extras (Item D12 P2)
    if (extras !== undefined && Array.isArray(extras)) {
      await client.query(
        'DELETE FROM public.cap_service_extras WHERE service_id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      for (let i = 0; i < extras.length; i++) {
        const e = extras[i];
        if (e && e.name) {
          await client.query(
            `INSERT INTO public.cap_service_extras (tenant_id, service_id, name, price, duration_minutes, is_active, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [tenantId, id, e.name.trim(), parseFloat(e.price || 0), parseInt(e.duration_minutes || 0, 10), e.is_active !== false, e.order_index ?? i]
          );
        }
      }
    }

    await client.query('COMMIT');

    await safeCacheDel(`tenant:${tenantId}:services`);

    return { oldService, updatedService, inputs, variations, extras };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteService = async (id, tenantId) => {
  const result = await pool.query(
    'UPDATE public.cap_services SET is_active = FALSE WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, name, duration_minutes, price, is_starting_price, reduces_stock, maintenance_days, is_active, created_at',
    [id, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Serviço não encontrado ou acesso negado.');
    error.statusCode = 404;
    throw error;
  }

  await safeCacheDel(`tenant:${tenantId}:services`);

  return result.rows[0];
};

export const importServices = async (tenantId, servicesList, options = {}, userId = null) => {
  const { all_or_nothing = true, on_duplicate = 'skip' } = options;
  const client = await pool.connect();

  const total = servicesList.length;
  const rejected = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  try {
    // Isolamento RLS compulsório (SET LOCAL app.current_tenant_id = $1 via set_config)
    await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', String(tenantId)]);

    // Verificar inquilino
    const tenantRes = await client.query(
      `SELECT t.id, t.status FROM public.cap_tenants t WHERE t.id = $1`,
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

    // 1. Pré-validação e duplicidades no próprio lote
    const validRows = [];
    const seenNamesInBatch = new Map();

    for (let i = 0; i < servicesList.length; i++) {
      const row = servicesList[i];
      const rowNum = i + 1;
      const rawName = (row.name || '').trim();
      const rawPrice = parseFloat(row.price);
      const rawDuration = parseInt(row.duration_minutes, 10) || 30;

      if (!rawName) {
        rejected.push({
          row: rowNum,
          name: rawName || 'Sem nome',
          reason: 'Nome do serviço é obrigatório.'
        });
        continue;
      }

      if (isNaN(rawPrice) || rawPrice <= 0) {
        rejected.push({
          row: rowNum,
          name: rawName,
          reason: 'Preço deve ser um valor numérico positivo.'
        });
        continue;
      }

      if (isNaN(rawDuration) || rawDuration <= 0) {
        rejected.push({
          row: rowNum,
          name: rawName,
          reason: 'Duração deve ser maior que zero minutos.'
        });
        continue;
      }

      const nameNormalized = rawName.toLowerCase();
      if (seenNamesInBatch.has(nameNormalized)) {
        const firstSeen = seenNamesInBatch.get(nameNormalized);
        if (on_duplicate === 'skip') {
          skipped++;
          rejected.push({
            row: rowNum,
            name: rawName,
            reason: `Serviço com mesmo nome duplicado na planilha (linha ${firstSeen}).`
          });
          continue;
        }
      } else {
        seenNamesInBatch.set(nameNormalized, rowNum);
      }

      validRows.push({
        rowNum,
        name: rawName,
        shortDescription: row.short_description ? String(row.short_description).trim().slice(0, 255) : null,
        durationMinutes: rawDuration,
        price: rawPrice,
        isStartingPrice: Boolean(row.is_starting_price),
        maintenanceDays: parseInt(row.maintenance_days, 10) || 0,
        isActive: row.is_active !== undefined ? Boolean(row.is_active) : true
      });
    }

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

    // 2. Verificar duplicados no banco
    const namesToQuery = validRows.map(r => r.name.toLowerCase());
    let existingMap = new Map();
    if (namesToQuery.length > 0) {
      const existingRes = await client.query(
        'SELECT id, LOWER(TRIM(name)) as norm_name, name FROM public.cap_services WHERE tenant_id = $1 AND LOWER(TRIM(name)) = ANY($2)',
        [tenantId, namesToQuery]
      );
      for (const row of existingRes.rows) {
        existingMap.set(row.norm_name, row);
      }
    }

    // 3. Executar transação
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', String(tenantId)]);

    for (const item of validRows) {
      const existing = existingMap.get(item.name.toLowerCase());

      if (existing) {
        if (on_duplicate === 'update') {
          await client.query(
            `UPDATE public.cap_services 
             SET short_description = COALESCE($1, short_description),
                 duration_minutes = $2,
                 price = $3,
                 is_starting_price = $4,
                 maintenance_days = $5,
                 is_active = $6
             WHERE id = $7 AND tenant_id = $8`,
            [item.shortDescription, item.durationMinutes, item.price, item.isStartingPrice, item.maintenanceDays, item.isActive, existing.id, tenantId]
          );
          updated++;
        } else {
          skipped++;
        }
      } else {
        await client.query(
          `INSERT INTO public.cap_services (tenant_id, name, short_description, duration_minutes, price, is_starting_price, maintenance_days, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [tenantId, item.name, item.shortDescription, item.durationMinutes, item.price, item.isStartingPrice, item.maintenanceDays, item.isActive]
        );
        imported++;
      }
    }

    await client.query('COMMIT');

    // Invalida cache Redis (fallback seguro para await redisClient.del(`tenant:${tenantId}:services`))
    await safeCacheDel(`tenant:${tenantId}:services`);

    if (userId) {
      logAudit(tenantId, userId, 'IMPORT_SERVICES', {
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
      message: `Importação de serviços concluída! ${imported} adicionado(s)${updated > 0 ? `, ${updated} atualizado(s)` : ''}${skipped > 0 ? `, ${skipped} ignorado(s)` : ''}.`
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
