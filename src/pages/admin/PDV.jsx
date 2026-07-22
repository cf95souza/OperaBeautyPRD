import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

const PDV = () => {
  const { tenant } = useTenant();
  const { showSuccess, showError, confirm } = useNotification();

  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'history'
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cart State
  const [cart, setCart] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [processing, setProcessing] = useState(false);

  // Search Filter
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!tenant) return;
    fetchData();
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Carrega produtos do estoque
      const invData = await api.inventory.list();
      // Filtra por itens de revenda ativos e com preço cadastrado
      const saleProducts = invData ? invData.filter(item => item.type === 'sale' && item.is_active) : [];
      setProducts(saleProducts);

      // 2. Carrega clientes do salão
      const clientsData = await api.clients.list();
      setClients(clientsData || []);

      // 3. Carrega histórico de vendas
      const historyData = await api.pdv.listSales();
      setSalesHistory(historyData || []);
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar dados do PDV.');
    } finally {
      setLoading(false);
    }
  };

  // Add to Cart
  const addToCart = (product) => {
    if (product.quantity <= 0) {
      showError(`O produto "${product.name}" está sem estoque.`);
      return;
    }

    const existingIndex = cart.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantityInCart;
      if (currentQty >= product.quantity) {
        showError(`Quantidade limite atingida. Apenas ${product.quantity} unidades disponíveis em estoque.`);
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantityInCart += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, { ...product, quantityInCart: 1 }]);
    }
  };

  // Remove / Decrease from Cart
  const updateCartQty = (productId, amount) => {
    const existingIndex = cart.findIndex(item => item.id === productId);
    if (existingIndex === -1) return;

    const updatedCart = [...cart];
    const item = updatedCart[existingIndex];
    const newQty = item.quantityInCart + amount;

    if (newQty <= 0) {
      updatedCart.splice(existingIndex, 1);
    } else {
      if (newQty > item.quantity) {
        showError(`Estoque insuficiente. Apenas ${item.quantity} unidades disponíveis.`);
        return;
      }
      item.quantityInCart = newQty;
    }
    setCart(updatedCart);
  };

  // Clear Cart
  const clearCart = () => {
    setCart([]);
    setSelectedClientId('');
    setPaymentMethod('pix');
  };

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showError('O carrinho está vazio.');
      return;
    }

    if (!(await confirm('Deseja realmente confirmar esta venda? O estoque dos produtos será baixado automaticamente.'))) return;

    setProcessing(true);
    try {
      const payload = {
        client_id: selectedClientId || null,
        payment_method: paymentMethod,
        items: cart.map(item => ({
          inventory_id: item.id,
          quantity: item.quantityInCart
        }))
      };

      await api.pdv.createSale(payload);
      showSuccess('Venda realizada com sucesso!');
      clearCart();
      fetchData(); // Atualiza estoque e histórico
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao processar venda.');
    } finally {
      setProcessing(false);
    }
  };

  // Total calculation
  const totalCartPrice = cart.reduce((acc, item) => acc + (parseFloat(item.price || 0) * item.quantityInCart), 0);

  // Filter products by search term
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-gutter md:p-xl flex-1 flex flex-col gap-lg max-w-[1200px] mx-auto w-full animate-fade-in-up">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>point_of_sale</span> PDV — Caixa Rápido
          </h2>
          <p className="font-body-md text-body-md text-secondary mt-1">Realize venda direta de produtos físicos e faça a baixa automática de estoque.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30">
        <button
          onClick={() => setActiveTab('pos')}
          className={`px-6 py-3 font-label-md text-label-md transition-colors relative ${
            activeTab === 'pos' ? 'text-primary border-b-2 border-primary font-semibold' : 'text-secondary hover:text-on-surface'
          }`}
        >
          Frente de Caixa (PDV)
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-label-md text-label-md transition-colors relative ${
            activeTab === 'history' ? 'text-primary border-b-2 border-primary font-semibold' : 'text-secondary hover:text-on-surface'
          }`}
        >
          Histórico de Vendas
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-xl"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>
      ) : activeTab === 'pos' ? (
        <div className="flex flex-col lg:flex-row gap-lg">
          
          {/* Catalogo de produtos */}
          <div className="flex-1 flex flex-col gap-md">
            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary">search</span>
              <input
                type="text"
                placeholder="Buscar produto por nome..."
                className="w-full border border-outline rounded-2xl pl-11 pr-4 py-3 bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center p-xl text-secondary bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex flex-col items-center">
                <span className="material-symbols-outlined text-5xl mb-3 opacity-40">inventory</span>
                <p className="font-headline-sm text-headline-sm-mobile mb-1">Nenhum produto encontrado</p>
                <p className="text-xs">Certifique-se de cadastrar produtos com tipo "Venda" na tela de estoque.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md">
                {filteredProducts.map(product => (
                  <div 
                    key={product.id} 
                    onClick={() => addToCart(product)}
                    className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-md shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                          product.quantity <= 0 
                            ? 'bg-[#FEF2F2] text-[#B91C1C]' 
                            : product.quantity <= product.min_quantity 
                            ? 'bg-[#FFFBEB] text-[#D97706]' 
                            : 'bg-[#ECFDF5] text-[#047857]'
                        }`}>
                          {product.quantity <= 0 ? 'Sem Estoque' : `${product.quantity} ${product.unit}`}
                        </span>
                      </div>
                      <h4 className="font-headline-sm text-on-surface line-clamp-2 group-hover:text-primary transition-colors text-base mb-1">{product.name}</h4>
                    </div>

                    <div className="flex justify-between items-end mt-4 pt-2 border-t border-outline-variant/10">
                      <div>
                        <span className="text-[10px] text-secondary block uppercase tracking-wider">Preço</span>
                        <span className="font-headline-sm text-primary font-bold text-lg">R$ {Number(product.price).toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="bg-primary-container text-on-primary-container p-2 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Carrinho de Compras (Checkout) */}
          <div className="w-full lg:w-[380px] bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-lg flex flex-col gap-lg shadow-sm h-fit">
            <div className="flex justify-between items-center pb-md border-b border-outline-variant/20">
              <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">shopping_basket</span> Carrinho ({cart.reduce((a, b) => a + b.quantityInCart, 0)})
              </h3>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-error font-label-sm text-xs hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">delete_sweep</span> Limpar
                </button>
              )}
            </div>

            {/* Listagem do Carrinho */}
            {cart.length === 0 ? (
              <div className="py-xl text-center text-secondary flex flex-col items-center">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-30">add_shopping_cart</span>
                <p className="text-sm">Carrinho vazio.</p>
                <p className="text-xs">Selecione produtos no catálogo à esquerda.</p>
              </div>
            ) : (
              <div className="space-y-md max-h-[250px] overflow-y-auto pr-1">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center border-b border-outline-variant/10 pb-sm">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-label-md text-on-surface truncate text-sm" title={item.name}>{item.name}</div>
                      <div className="text-xs text-primary font-semibold">R$ {Number(item.price).toFixed(2).replace('.', ',')}</div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => updateCartQty(item.id, -1)}
                        className="w-7 h-7 rounded-full bg-surface-variant hover:bg-outline-variant/40 flex items-center justify-center text-sm font-bold"
                      >
                        -
                      </button>
                      <span className="font-semibold text-sm w-5 text-center">{item.quantityInCart}</span>
                      <button 
                        onClick={() => updateCartQty(item.id, 1)}
                        className="w-7 h-7 rounded-full bg-surface-variant hover:bg-outline-variant/40 flex items-center justify-center text-sm font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Configurações da Venda */}
            <div className="space-y-md border-t border-outline-variant/20 pt-md">
              {/* Seleção de Cliente */}
              <div>
                <label className="block font-label-sm text-secondary mb-1">Cliente (Opcional)</label>
                <select
                  className="w-full border border-outline rounded-xl px-3 py-2 bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                >
                  <option value="">Venda Avulsa / Consumidor Final</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block font-label-sm text-secondary mb-2">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-sm">
                  {[
                    { id: 'pix', label: 'Pix', icon: 'qr_code_2' },
                    { id: 'credit_card', label: 'Crédito', icon: 'credit_card' },
                    { id: 'debit_card', label: 'Débito', icon: 'credit_card_heart' },
                    { id: 'cash', label: 'Dinheiro', icon: 'payments' }
                  ].map(method => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        paymentMethod === method.id 
                          ? 'border-primary bg-primary-container text-on-primary-container' 
                          : 'border-outline-variant hover:bg-surface-variant/20 text-secondary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{method.icon}</span>
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Total e Checkout */}
            <div className="border-t border-outline-variant/20 pt-md space-y-md">
              <div className="flex justify-between items-end">
                <span className="font-label-md text-secondary">Valor Total</span>
                <span className="font-headline-sm text-primary font-bold text-2xl">R$ {totalCartPrice.toFixed(2).replace('.', ',')}</span>
              </div>

              <button
                disabled={cart.length === 0 || processing}
                onClick={handleCheckout}
                className="w-full bg-primary text-on-primary py-3.5 rounded-2xl font-bold text-sm hover:opacity-95 transition-all shadow-md disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Processando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check_circle</span> Finalizar Venda
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      ) : (
        /* Histórico de Vendas Físicas */
        salesHistory.length === 0 ? (
          <div className="text-center p-xl text-secondary bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex flex-col items-center">
            <span className="material-symbols-outlined text-5xl mb-3 opacity-40">history</span>
            <p className="font-headline-sm text-headline-sm-mobile mb-1">Nenhuma venda registrada ainda</p>
            <p className="text-xs">As vendas efetuadas no Caixa Rápido aparecerão listadas aqui.</p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 bg-surface-container-low">
                    <th className="py-md px-lg font-label-md text-secondary">Data da Venda</th>
                    <th className="py-md px-lg font-label-md text-secondary">Cliente</th>
                    <th className="py-md px-lg font-label-md text-secondary">Método Pagamento</th>
                    <th className="py-md px-lg font-label-md text-secondary">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {salesHistory.map(sale => (
                    <tr key={sale.id} className="border-b border-outline-variant/20 hover:bg-surface-variant/20 transition-colors">
                      <td className="py-md px-lg text-sm text-on-surface">
                        {new Date(sale.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-md px-lg text-sm text-on-surface">
                        {sale.client_name || <span className="text-secondary italic">Consumidor Final (Avulsa)</span>}
                      </td>
                      <td className="py-md px-lg text-sm text-on-surface uppercase">
                        {sale.payment_method === 'pix' ? 'Pix' :
                         sale.payment_method === 'credit_card' ? 'Crédito' :
                         sale.payment_method === 'debit_card' ? 'Débito' : 'Dinheiro'}
                      </td>
                      <td className="py-md px-lg font-semibold text-primary">
                        R$ {Number(sale.total_price).toFixed(2).replace('.', ',')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

    </div>
  );
};

export default PDV;
