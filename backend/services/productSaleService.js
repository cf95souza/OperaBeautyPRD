import pool from '../config/db.js';

// 1. Criar Venda de Produtos no PDV com Baixa Automática no Estoque (Atômica)
export const createProductSale = async (tenantId, clientId, paymentMethod, items) => {
  const clientConnection = await pool.connect();
  
  try {
    await clientConnection.query('BEGIN');
    
    // 1. Ordena itens por inventory_id para prevenir deadlocks em requisições simultâneas
    const sortedItems = [...items].sort((a, b) => String(a.inventory_id).localeCompare(String(b.inventory_id)));

    // 2. Validar e verificar estoque de todos os itens com lock pessimista (FOR UPDATE)
    let totalPrice = 0;
    const validatedItems = [];
    
    for (const item of sortedItems) {
      const { inventory_id, quantity } = item;
      
      const invResult = await clientConnection.query(
        'SELECT id, name, quantity, price, type FROM public.cap_inventory WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [inventory_id, tenantId]
      );
      
      if (invResult.rows.length === 0) {
        const error = new Error(`Item de estoque não encontrado.`);
        error.statusCode = 404;
        throw error;
      }
      
      const dbItem = invResult.rows[0];
      
      if (dbItem.type !== 'sale') {
        const error = new Error(`O item "${dbItem.name}" não é um produto de revenda.`);
        error.statusCode = 400;
        throw error;
      }
      
      if (parseFloat(dbItem.quantity) < quantity) {
        const error = new Error(`Estoque insuficiente para o produto "${dbItem.name}". Estoque disponível: ${dbItem.quantity}`);
        error.statusCode = 400;
        throw error;
      }
      
      const unitPrice = parseFloat(dbItem.price || 0);
      const itemTotalPrice = unitPrice * quantity;
      totalPrice += itemTotalPrice;
      
      validatedItems.push({
        inventory_id,
        name: dbItem.name,
        quantity,
        unit_price: unitPrice,
        total_price: itemTotalPrice
      });
    }
    
    // 3. Registrar a Venda
    const saleResult = await clientConnection.query(
      `INSERT INTO public.cap_product_sales (tenant_id, client_id, total_price, payment_method, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, tenant_id, client_id, total_price, payment_method, created_at`,
      [tenantId, clientId || null, totalPrice, paymentMethod]
    );
    
    const sale = saleResult.rows[0];
    
    // 4. Registrar Itens e Baixar Estoque Atomicamente
    for (const item of validatedItems) {
      await clientConnection.query(
        `INSERT INTO public.cap_product_sale_items (sale_id, inventory_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [sale.id, item.inventory_id, item.quantity, item.unit_price, item.total_price]
      );
      
      const updateResult = await clientConnection.query(
        `UPDATE public.cap_inventory
         SET quantity = quantity - $1
         WHERE id = $2 AND tenant_id = $3 AND quantity >= $1
         RETURNING id, quantity`,
        [item.quantity, item.inventory_id, tenantId]
      );

      if (updateResult.rowCount === 0) {
        const error = new Error(`Estoque insuficiente para o produto "${item.name}".`);
        error.statusCode = 400;
        throw error;
      }
    }
    
    await clientConnection.query('COMMIT');
    return { ...sale, items: validatedItems };
  } catch (error) {
    await clientConnection.query('ROLLBACK');
    if (error.code === '23514') {
      error.message = 'Operação não permitida: a quantidade em estoque não pode ser negativa.';
      error.statusCode = 400;
    }
    throw error;
  } finally {
    clientConnection.release();
  }
};

// 2. Listar Histórico de Vendas do Salão
export const listProductSales = async (tenantId) => {
  const result = await pool.query(
    `SELECT ps.id, ps.tenant_id, ps.client_id, ps.total_price, ps.payment_method, ps.created_at,
            c.name as client_name
     FROM public.cap_product_sales ps
     LEFT JOIN public.cap_clients c ON ps.client_id = c.id
     WHERE ps.tenant_id = $1
     ORDER BY ps.created_at DESC`,
    [tenantId]
  );
  
  return result.rows;
};
