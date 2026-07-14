import pool from '../config/db.js';

export const listInventory = async (tenantId, limit, offset) => {
  const result = await pool.query(
    'SELECT id, name, quantity, unit, min_quantity, type, price, is_active FROM public.cap_inventory WHERE tenant_id = $1 AND is_active = TRUE ORDER BY name LIMIT $2 OFFSET $3',
    [tenantId, limit, offset]
  );
  return result.rows;
};

export const createInventoryItem = async (tenantId, name, quantity, unit, min_quantity, type, price) => {
  const result = await pool.query(
    `INSERT INTO public.cap_inventory (tenant_id, name, quantity, unit, min_quantity, type, price, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
     RETURNING id, tenant_id, name, quantity, unit, min_quantity, type, price, is_active, created_at`,
    [tenantId, name, parseFloat(quantity), unit, parseFloat(min_quantity), type || 'professional', parseFloat(price || 0)]
  );
  return result.rows[0];
};

export const updateInventoryItem = async (id, tenantId, name, quantity, unit, min_quantity, type, price, is_active) => {
  const oldItemResult = await pool.query(
    'SELECT id, tenant_id, name, quantity, unit, min_quantity, type, price, is_active, created_at FROM public.cap_inventory WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  if (oldItemResult.rows.length === 0) {
    const error = new Error('Item não encontrado ou acesso negado.');
    error.statusCode = 404;
    throw error;
  }
  const oldItem = oldItemResult.rows[0];

  const result = await pool.query(
    `UPDATE public.cap_inventory 
     SET name = $1, 
         quantity = $2, 
         unit = $3, 
         min_quantity = $4, 
         type = $5, 
         price = $6,
         is_active = COALESCE($7, is_active)
     WHERE id = $8 AND tenant_id = $9
     RETURNING id, tenant_id, name, quantity, unit, min_quantity, type, price, is_active, created_at`,
    [name, parseFloat(quantity), unit, parseFloat(min_quantity), type, parseFloat(price), is_active, id, tenantId]
  );

  return { oldItem, updatedItem: result.rows[0] };
};

export const deleteInventoryItem = async (id, tenantId) => {
  const result = await pool.query(
    'UPDATE public.cap_inventory SET is_active = FALSE WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, name, quantity, unit, min_quantity, type, price, is_active, created_at',
    [id, tenantId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Item não encontrado ou acesso negado.');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};
