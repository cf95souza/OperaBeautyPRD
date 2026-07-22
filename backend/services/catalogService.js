import pool from '../config/db.js';
import redisClient from '../config/redis.js';

export const listServices = async (tenantId) => {
  const cacheKey = `tenant:${tenantId}:services`;
  const cachedData = await redisClient.get(cacheKey);
  
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  const result = await pool.query(
    `SELECT 
      s.id, s.name, s.duration_minutes, s.price, s.reduces_stock, s.maintenance_days, s.is_active,
      COALESCE(
        json_agg(
          json_build_object('inventory_id', si.inventory_id, 'quantity_consumed', si.quantity_consumed)
        ) FILTER (WHERE si.inventory_id IS NOT NULL), '[]'
      ) as inputs
     FROM public.cap_services s
     LEFT JOIN public.cap_service_inventory si ON s.id = si.service_id
     WHERE s.tenant_id = $1 
     GROUP BY s.id
     ORDER BY s.name`,
    [tenantId]
  );
  
  // TTL de 5 minutos (300 segundos) para dados do catálogo
  await redisClient.setex(cacheKey, 300, JSON.stringify(result.rows));
  
  return result.rows;
};

export const getServiceInputs = async (id, tenantId) => {
  const result = await pool.query(
    'SELECT inventory_id, quantity_consumed FROM public.cap_service_inventory WHERE service_id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return result.rows;
};

export const createService = async (tenantId, name, duration_minutes, price, reduces_stock, maintenance_days, inputs) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const serviceResult = await client.query(
      `INSERT INTO public.cap_services (tenant_id, name, duration_minutes, price, reduces_stock, maintenance_days, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, tenant_id, name, duration_minutes, price, reduces_stock, maintenance_days, is_active, created_at`,
      [tenantId, name, duration_minutes, price, reduces_stock || false, maintenance_days || 0]
    );

    const newService = serviceResult.rows[0];

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

    await client.query('COMMIT');
    
    await redisClient.del(`tenant:${tenantId}:services`);
    
    return { newService, inputs };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateService = async (id, tenantId, name, duration_minutes, price, reduces_stock, maintenance_days, is_active, inputs) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const oldServiceResult = await client.query(
      'SELECT id, tenant_id, name, duration_minutes, price, reduces_stock, maintenance_days, is_active, created_at FROM public.cap_services WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    const oldService = oldServiceResult.rows[0];

    const serviceResult = await client.query(
      `UPDATE public.cap_services 
       SET name = $1, 
           duration_minutes = $2, 
           price = $3, 
           reduces_stock = $4, 
           maintenance_days = $5,
           is_active = COALESCE($6, is_active)
       WHERE id = $7 AND tenant_id = $8
       RETURNING id, tenant_id, name, duration_minutes, price, reduces_stock, maintenance_days, is_active, created_at`,
      [name, duration_minutes, price, reduces_stock, maintenance_days, is_active, id, tenantId]
    );

    if (serviceResult.rows.length === 0) {
      const error = new Error('Serviço não encontrado ou acesso negado.');
      error.statusCode = 404;
      throw error;
    }

    const updatedService = serviceResult.rows[0];

    await client.query(
      'DELETE FROM public.cap_service_inventory WHERE service_id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (reduces_stock && inputs && Array.isArray(inputs) && inputs.length > 0) {
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

    await client.query('COMMIT');

    await redisClient.del(`tenant:${tenantId}:services`);

    return { oldService, updatedService, inputs };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteService = async (id, tenantId) => {
  const result = await pool.query(
    'UPDATE public.cap_services SET is_active = FALSE WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, name, duration_minutes, price, reduces_stock, maintenance_days, is_active, created_at',
    [id, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Serviço não encontrado ou acesso negado.');
    error.statusCode = 404;
    throw error;
  }

  await redisClient.del(`tenant:${tenantId}:services`);

  return result.rows[0];
};
