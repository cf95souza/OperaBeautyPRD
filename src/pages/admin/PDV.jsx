import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  Package, 
  Plus, 
  Search, 
  X, 
  ShoppingBag, 
  CheckCircle2, 
  Tag, 
  User, 
  Clock, 
  Receipt,
  ArrowRight,
  Sparkles,
  Scissors,
  DollarSign,
  CreditCard,
  QrCode,
  Wallet,
  Gift,
  Lock,
  LockOpen,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  FileText,
  History,
  Calendar
} from 'lucide-react';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { ModalAbrirCaixa } from '../../components/admin/ModalAbrirCaixa';
import { ModalMovimentacaoCaixa } from '../../components/admin/ModalMovimentacaoCaixa';
import { ModalFecharCaixa } from '../../components/admin/ModalFecharCaixa';

const PDV = () => {
  const { tenant } = useTenant();
  const { showSuccess, showError, confirm } = useNotification();

  // Abas: 'order' (Comanda Unificada) | 'cash_register' (Sessão de Caixa) | 'products' (Catálogo de Revenda) | 'history' (Histórico)
  const [activeTab, setActiveTab] = useState('order'); 
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [clients, setClients] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [cashHistory, setCashHistory] = useState([]);
  const [currentCashRegister, setCurrentCashRegister] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros de Produtos
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Estado da Comanda Unificada
  const [orderItems, setOrderItems] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [tipAmount, setTipAmount] = useState(0);
  const [tipStaffId, setTipStaffId] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedBenefitName, setAppliedBenefitName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState([
    { method: 'pix', amount: '' }
  ]);
  const [singlePaymentMethod, setSinglePaymentMethod] = useState('pix');
  const [processing, setProcessing] = useState(false);

  // Modais de Controle de Caixa
  const [showOpenRegisterModal, setShowOpenRegisterModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState('bleed');
  const [showCloseRegisterModal, setShowCloseRegisterModal] = useState(false);
  const [savingRegisterAction, setSavingRegisterAction] = useState(false);

  // Modais de Itens e Benefícios
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState('');
  const [selectedStaffToAdd, setSelectedStaffToAdd] = useState('');
  const [showBenefitModal, setShowBenefitModal] = useState(false);
  const [benefitType, setBenefitType] = useState('coupon'); // 'coupon' | 'giftcard' | 'wallet'
  const [benefitCode, setBenefitCode] = useState('');
  const [validatingBenefit, setValidatingBenefit] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProductData, setNewProductData] = useState({ name: '', price: '', quantity: '', min_quantity: '5', unit: 'un' });
  const [savingProduct, setSavingProduct] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);

  useEffect(() => {
    if (!tenant) return;
    fetchData();
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Carrega Caixa Atual
      const cashRes = await api.cashRegister.getCurrent();
      setCurrentCashRegister(cashRes && cashRes.isOpen !== false ? cashRes : null);

      // 2. Carrega Produtos do Estoque
      const invData = await api.inventory.list();
      const saleProducts = Array.isArray(invData) 
        ? invData.filter(item => item.type === 'sale' && item.is_active) 
        : [];
      setProducts(saleProducts);

      // 3. Carrega Serviços
      const srvData = await api.services.list(tenant?.id);
      setServices(Array.isArray(srvData) ? srvData.filter(s => s.is_active) : []);

      // 4. Carrega Profissionais
      const staffData = await api.staff.list(tenant?.id);
      setStaffList(Array.isArray(staffData) ? staffData.filter(s => s.is_active) : []);

      // 5. Carrega Clientes
      const clientsData = await api.clients.list(tenant?.id);
      setClients(Array.isArray(clientsData) ? clientsData : []);

      // 6. Carrega Agendamentos de Hoje
      const todayStr = new Date().toISOString().slice(0, 10);
      const apptData = await api.appointments.list({ date: todayStr });
      setTodayAppointments(Array.isArray(apptData) ? apptData : []);

      // 7. Carrega Histórico de Comandas
      const ordersData = await api.orders.list({ limit: 20 });
      setSalesHistory(Array.isArray(ordersData) ? ordersData : []);

      // 8. Carrega Histórico de Caixas
      const cashHistData = await api.cashRegister.listHistory({ limit: 10 });
      setCashHistory(Array.isArray(cashHistData) ? cashHistData : []);
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar dados do PDV e caixa.');
    } finally {
      setLoading(false);
    }
  };

  // Categorias de Produtos
  const categories = useMemo(() => {
    const defaultCats = ['Todos'];
    const detected = new Set();
    products.forEach(p => {
      const lower = p.name.toLowerCase();
      if (lower.includes('perfume') || lower.includes('óleo') || lower.includes('aroma')) detected.add('Perfumaria');
      else if (lower.includes('cabelo') || lower.includes('shampoo') || lower.includes('máscara') || lower.includes('condicionador')) detected.add('Cabelo');
      else if (lower.includes('unha') || lower.includes('esmalte')) detected.add('Unhas');
      else if (lower.includes('pele') || lower.includes('creme') || lower.includes('sérum')) detected.add('Skincare');
    });
    return [...defaultCats, ...Array.from(detected)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !searchTerm.trim() || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
      let matchesCategory = true;
      if (selectedCategory === 'Perfumaria') matchesCategory = /perfume|óleo|aroma/i.test(p.name);
      else if (selectedCategory === 'Cabelo') matchesCategory = /cabelo|shampoo|máscara|condicionador/i.test(p.name);
      else if (selectedCategory === 'Unhas') matchesCategory = /unha|esmalte/i.test(p.name);
      else if (selectedCategory === 'Skincare') matchesCategory = /pele|creme|sérum/i.test(p.name);
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const filteredClients = useMemo(() => {
    if (!clientSearchTerm.trim()) return clients;
    const term = clientSearchTerm.toLowerCase().trim();
    return clients.filter(c => 
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term))
    );
  }, [clients, clientSearchTerm]);

  // Cálculos Financeiros da Comanda
  const subtotal = useMemo(() => {
    return orderItems.reduce((acc, item) => acc + (Number(item.unit_price || 0) * (item.quantity || 1)), 0);
  }, [orderItems]);

  const netTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + Number(tipAmount || 0));
  }, [subtotal, discountAmount, tipAmount]);

  // Total de pagamentos informados no Split
  const totalAllocatedPayments = useMemo(() => {
    if (!isSplitPayment) return netTotal;
    return splitPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [isSplitPayment, splitPayments, netTotal]);

  const remainingPayment = Math.max(0, netTotal - totalAllocatedPayments);

  // Ações de Itens na Comanda
  const addProductToOrder = (product) => {
    if (product.quantity <= 0) {
      showError(`O produto "${product.name}" está sem estoque.`);
      return;
    }

    const existingIdx = orderItems.findIndex(it => it.item_type === 'product' && it.inventory_id === product.id);
    if (existingIdx > -1) {
      const currentQty = orderItems[existingIdx].quantity;
      if (currentQty >= product.quantity) {
        showError(`Estoque limite atingido. Apenas ${product.quantity} unidades disponíveis.`);
        return;
      }
      const updated = [...orderItems];
      updated[existingIdx].quantity += 1;
      setOrderItems(updated);
    } else {
      setOrderItems([
        ...orderItems,
        {
          item_type: 'product',
          inventory_id: product.id,
          name: product.name,
          unit_price: Number(product.price || 0),
          quantity: 1,
          staff_id: null
        }
      ]);
    }
  };

  const handleAddServiceConfirm = (e) => {
    e.preventDefault();
    if (!selectedServiceToAdd) {
      showError('Selecione um serviço.');
      return;
    }
    const srv = services.find(s => s.id === selectedServiceToAdd);
    if (!srv) return;

    setOrderItems([
      ...orderItems,
      {
        item_type: 'service',
        service_id: srv.id,
        name: srv.name,
        unit_price: Number(srv.price || 0),
        quantity: 1,
        staff_id: selectedStaffToAdd || null
      }
    ]);
    setShowAddServiceModal(false);
    setSelectedServiceToAdd('');
    setSelectedStaffToAdd('');
  };

  const updateItemQty = (index, delta) => {
    const updated = [...orderItems];
    const item = updated[index];
    const newQty = (item.quantity || 1) + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      item.quantity = newQty;
    }
    setOrderItems(updated);
  };

  const removeItem = (index) => {
    const updated = [...orderItems];
    updated.splice(index, 1);
    setOrderItems(updated);
  };

  // Importar Serviços de um Agendamento
  const handleImportAppointment = (appt) => {
    setSelectedAppointment(appt);
    if (appt.client_id) {
      const cl = clients.find(c => c.id === appt.client_id);
      if (cl) setSelectedClient(cl);
    }

    const itemsToAdd = [];
    if (appt.services && appt.services.length > 0) {
      appt.services.forEach(s => {
        itemsToAdd.push({
          item_type: 'service',
          service_id: s.service_id,
          name: s.service_name,
          unit_price: Number(s.price || 0),
          quantity: 1,
          staff_id: appt.staff_id,
          variation_name: s.variation_name,
          selected_extras: s.selected_extras
        });
      });
    } else {
      itemsToAdd.push({
        item_type: 'service',
        service_id: appt.service_id,
        name: appt.service_name || 'Atendimento',
        unit_price: Number(appt.total_price || 0),
        quantity: 1,
        staff_id: appt.staff_id
      });
    }

    setOrderItems([...orderItems, ...itemsToAdd]);
    setShowAppointmentModal(false);
    showSuccess(`Atendimento de "${appt.client_name || 'Cliente'}" importado para a comanda.`);
  };

  // Limpar Comanda
  const clearOrder = () => {
    setOrderItems([]);
    setSelectedClient(null);
    setSelectedAppointment(null);
    setTipAmount(0);
    setTipStaffId('');
    setDiscountAmount(0);
    setAppliedBenefitName('');
    setOrderNotes('');
    setIsSplitPayment(false);
    setSplitPayments([{ method: 'pix', amount: '' }]);
  };

  // Aplicar Cupom / Vale / Cashback
  const handleApplyBenefit = async (e) => {
    e.preventDefault();
    if (!benefitCode.trim() && benefitType !== 'wallet') return;

    setValidatingBenefit(true);
    try {
      const codeUpper = benefitCode.trim().toUpperCase();

      if (benefitType === 'coupon') {
        const couponRes = await api.coupons.validate(codeUpper, subtotal);
        if (couponRes && couponRes.discount_amount) {
          const discount = Number(couponRes.discount_amount);
          setDiscountAmount(discount);
          setAppliedBenefitName(`Cupom ${codeUpper} (-${formatCurrency(discount)})`);
          showSuccess(`Cupom "${codeUpper}" aplicado com sucesso!`);
          setShowBenefitModal(false);
          setBenefitCode('');
          return;
        }
      } else if (benefitType === 'giftcard') {
        const giftRes = await api.giftcards.validateCode(codeUpper);
        if (giftRes && giftRes.available_balance) {
          const available = Number(giftRes.available_balance);
          const applyValue = Math.min(available, netTotal);
          // Adiciona como forma de pagamento giftcard
          setIsSplitPayment(true);
          setSplitPayments([
            ...splitPayments.filter(p => p.amount > 0),
            { method: 'giftcard', amount: applyValue, giftcard_code: codeUpper }
          ]);
          setAppliedBenefitName(`Vale-Presente ${codeUpper} (R$ ${applyValue.toFixed(2)})`);
          showSuccess(`Vale-Presente validado com saldo de ${formatCurrency(available)}.`);
          setShowBenefitModal(false);
          setBenefitCode('');
          return;
        }
      } else if (benefitType === 'wallet') {
        if (!selectedClient) {
          showError('Selecione uma cliente para consultar o saldo de cashback.');
          return;
        }
        const walletRes = await api.wallets.getBalance(selectedClient.id);
        const balance = Number(walletRes?.balance || 0);
        if (balance <= 0) {
          showError('A cliente não possui saldo de cashback disponível.');
          return;
        }
        const applyValue = Math.min(balance, netTotal);
        setIsSplitPayment(true);
        setSplitPayments([
          ...splitPayments.filter(p => p.amount > 0),
          { method: 'wallet', amount: applyValue }
        ]);
        setAppliedBenefitName(`Saldo Cashback (-${formatCurrency(applyValue)})`);
        showSuccess(`Saldo de ${formatCurrency(balance)} resgatado na comanda.`);
        setShowBenefitModal(false);
        return;
      }

      showError('Benefício inválido, indisponível ou expirado.');
    } catch (err) {
      console.error(err);
      showError(err.message || 'Código não encontrado.');
    } finally {
      setValidatingBenefit(false);
    }
  };

  // Gerenciamento de Split Payment
  const addSplitPaymentRow = () => {
    setSplitPayments([...splitPayments, { method: 'credit_card', amount: '' }]);
  };

  const updateSplitRow = (index, field, value) => {
    const updated = [...splitPayments];
    updated[index][field] = value;
    setSplitPayments(updated);
  };

  const removeSplitRow = (index) => {
    if (splitPayments.length <= 1) return;
    const updated = [...splitPayments];
    updated.splice(index, 1);
    setSplitPayments(updated);
  };

  // Finalizar Comanda Unificada (Checkout)
  const handleCheckoutOrder = async () => {
    if (orderItems.length === 0) {
      showError('Adicione pelo menos um serviço ou produto à comanda.');
      return;
    }

    setProcessing(true);
    try {
      // 1. Cria a comanda no backend
      const orderPayload = {
        client_id: selectedClient ? selectedClient.id : null,
        appointment_id: selectedAppointment ? selectedAppointment.id : null,
        tip_amount: Number(tipAmount || 0),
        tip_staff_id: tipStaffId || null,
        coupon_code: appliedBenefitName.includes('Cupom') ? appliedBenefitName.split(' ')[1] : null,
        notes: orderNotes.trim() || null,
        items: orderItems.map(it => ({
          item_type: it.item_type,
          service_id: it.service_id || null,
          inventory_id: it.inventory_id || null,
          staff_id: it.staff_id || null,
          name: it.name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          variation_name: it.variation_name || null,
          selected_extras: it.selected_extras || []
        }))
      };

      const createdOrder = await api.orders.create(orderPayload);

      // 2. Prepara pagamentos
      let paymentsToSend = [];
      if (!isSplitPayment) {
        paymentsToSend = [{ payment_method: singlePaymentMethod, amount: netTotal }];
      } else {
        paymentsToSend = splitPayments
          .filter(p => Number(p.amount) > 0)
          .map(p => ({
            payment_method: p.method,
            amount: Number(p.amount),
            giftcard_code: p.giftcard_code || null
          }));
      }

      // 3. Quita a comanda
      const receipt = await api.orders.checkout(createdOrder.id, {
        payments: paymentsToSend,
        tip_amount: Number(tipAmount || 0),
        tip_staff_id: tipStaffId || null,
        discount_amount: discountAmount,
        notes: orderNotes.trim() || null
      });

      setLastReceipt({
        ...receipt,
        orderNumber: createdOrder.order_number,
        clientName: selectedClient ? selectedClient.name : 'Venda Avulsa / Balcão',
        items: orderItems,
        totalPaid: netTotal,
        change: receipt.change_amount || 0
      });

      setShowSuccessModal(true);
      clearOrder();
      fetchData(); // Atualiza caixa, estoque e histórico
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao finalizar comanda.');
    } finally {
      setProcessing(false);
    }
  };

  // Funções de Caixa
  const handleOpenRegister = async (data) => {
    setSavingRegisterAction(true);
    try {
      await api.cashRegister.open(data);
      showSuccess('Caixa diário aberto com sucesso!');
      setShowOpenRegisterModal(false);
      await fetchData();
    } catch (err) {
      showError(err.message || 'Erro ao abrir caixa.');
    } finally {
      setSavingRegisterAction(false);
    }
  };

  const handleRegisterMovement = async (data) => {
    setSavingRegisterAction(true);
    try {
      await api.cashRegister.addMovement({
        cash_register_id: currentCashRegister.id,
        ...data
      });
      showSuccess(`${data.type === 'bleed' ? 'Sangria' : 'Suprimento'} registrada com sucesso!`);
      setShowMovementModal(false);
      await fetchData();
    } catch (err) {
      showError(err.message || 'Erro ao registrar movimentação.');
    } finally {
      setSavingRegisterAction(false);
    }
  };

  const handleCloseRegister = async (data) => {
    setSavingRegisterAction(true);
    try {
      await api.cashRegister.close(data);
      showSuccess('Caixa diário encerrado com sucesso!');
      setShowCloseRegisterModal(false);
      await fetchData();
    } catch (err) {
      showError(err.message || 'Erro ao fechar caixa.');
    } finally {
      setSavingRegisterAction(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in text-ink">
      
      {/* 1. Cabeçalho Editorial Rosé */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Comanda & Caixa</h1>
            {currentCashRegister ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Caixa Aberto
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                <Lock className="w-3 h-3" />
                Caixa Fechado
              </span>
            )}
          </div>
          <p className="text-sm text-ink-soft mt-1">
            Comanda unificada de serviços e produtos, gorjetas, split payment e fechamento diário de caixa.
          </p>
        </div>

        {/* Abas Superiores */}
        <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('order')}
            className={`pb-2 font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'order'
                ? 'text-brand border-b-2 border-brand'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            Comanda & Checkout
          </button>

          <button
            onClick={() => setActiveTab('cash_register')}
            className={`pb-2 font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cash_register'
                ? 'text-brand border-b-2 border-brand'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            Sessão de Caixa
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`pb-2 font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'products'
                ? 'text-brand border-b-2 border-brand'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            Catálogo de Revenda
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 font-semibold text-sm transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'text-brand border-b-2 border-brand'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            Histórico & Fechamentos
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink-soft flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
          <span className="text-sm">Carregando dados da comanda e do caixa...</span>
        </div>
      ) : activeTab === 'order' ? (
        
        /* 2. ABA: COMANDA UNIFICADA & CHECKOUT (D17) */
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Coluna Esquerda: Construtor da Comanda */}
          <div className="flex-1 w-full space-y-5">
            
            {/* Header da Comanda: Cliente e Vínculo com Agendamento */}
            <div className="bg-white rounded-3xl border border-line p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-brand" />
                  <span className="text-xs font-bold text-ink uppercase tracking-wider">
                    {selectedClient ? selectedClient.name : 'Venda Avulsa / Balcão'}
                  </span>
                  {selectedClient?.phone && (
                    <span className="text-2xs text-ink-soft">({selectedClient.phone})</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowClientModal(true)}
                    className="px-3 py-1.5 rounded-full border border-line text-xs font-semibold text-ink-soft hover:text-ink hover:bg-stone-50 transition-all cursor-pointer"
                  >
                    {selectedClient ? 'Trocar Cliente' : 'Identificar Cliente'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAppointmentModal(true)}
                    className="px-3 py-1.5 rounded-full border border-brand/30 bg-brand-tint/30 text-xs font-semibold text-brand hover:bg-brand-tint/60 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Puxar Agendamento do Dia
                  </button>
                </div>
              </div>

              {/* Botões Rápidos de Adição de Itens */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-line/60">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(true)}
                  className="px-4 py-2 rounded-2xl bg-surface hover:bg-stone-100 border border-line text-xs font-semibold text-ink transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Scissors className="w-3.5 h-3.5 text-brand" />
                  + Adicionar Serviço
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className="px-4 py-2 rounded-2xl bg-surface hover:bg-stone-100 border border-line text-xs font-semibold text-ink transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-brand" />
                  + Adicionar Produto de Estoque
                </button>

                <button
                  type="button"
                  onClick={() => setShowBenefitModal(true)}
                  className="px-4 py-2 rounded-2xl bg-surface hover:bg-stone-100 border border-line text-xs font-semibold text-ink transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Tag className="w-3.5 h-3.5 text-brand" />
                  Aplicar Benefício (Cupom / Vale / Cashback)
                </button>
              </div>
            </div>

            {/* Tabela de Itens da Comanda */}
            <div className="bg-white rounded-3xl border border-line overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-line flex items-center justify-between">
                <span className="font-display font-bold text-base text-ink">Itens da Comanda ({orderItems.length})</span>
                {orderItems.length > 0 && (
                  <button
                    onClick={clearOrder}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                  >
                    Limpar tudo
                  </button>
                )}
              </div>

              {orderItems.length === 0 ? (
                <div className="py-14 text-center">
                  <EstadoVazio
                    icone={<Receipt className="w-8 h-8 text-brand" />}
                    titulo="Comanda vazia"
                    descricao="Adicione serviços, produtos de pronta entrega ou importe um agendamento do dia para fechar a conta."
                  />
                </div>
              ) : (
                <div className="divide-y divide-line/60">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          item.item_type === 'service' ? 'bg-brand-tint/60 text-brand' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {item.item_type === 'service' ? <Scissors className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{item.name}</p>
                          <div className="flex items-center gap-2 text-2xs text-ink-soft">
                            <span className="capitalize">{item.item_type === 'service' ? 'Serviço' : 'Produto'}</span>
                            {item.variation_name && <span>• {item.variation_name}</span>}
                            {item.staff_id && (
                              <span>• Profissional: {staffList.find(s => s.id === item.staff_id)?.name}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {/* Controles de Quantidade */}
                        <div className="flex items-center border border-line rounded-full overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() => updateItemQty(idx, -1)}
                            className="w-7 h-7 flex items-center justify-center text-ink-soft hover:text-ink cursor-pointer hover:bg-stone-100"
                          >
                            -
                          </button>
                          <span className="w-7 text-center text-xs font-semibold lining-nums text-ink">
                            {item.quantity || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateItemQty(idx, 1)}
                            className="w-7 h-7 flex items-center justify-center text-ink-soft hover:text-ink cursor-pointer hover:bg-stone-100"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-semibold text-sm text-ink tabular-nums lining-nums min-w-[70px] text-right">
                          {formatCurrency((item.unit_price || 0) * (item.quantity || 1))}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-stone-400 hover:text-red-600 p-1 rounded-full cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gorjeta & Observações */}
            {orderItems.length > 0 && (
              <div className="bg-white rounded-3xl border border-line p-5 shadow-2xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                      Gorjeta para a Equipe (R$)
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="0,00"
                        value={tipAmount || ''}
                        onChange={(e) => setTipAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-line bg-surface text-sm font-semibold text-ink focus:outline-none focus:border-brand"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                      Profissional Beneficiado
                    </label>
                    <select
                      value={tipStaffId}
                      onChange={(e) => setTipStaffId(e.target.value)}
                      className="w-full p-2.5 rounded-2xl border border-line bg-surface text-sm text-ink focus:outline-none focus:border-brand cursor-pointer"
                    >
                      <option value="">Equipe inteira / Salão</option>
                      {staffList.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1.5">
                    Observações da Comanda
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Cliente elogiou o resultado, combinar retorno em 15 dias..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-sm text-ink focus:outline-none focus:border-brand"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Checkout & Split Payment */}
          <div className="w-full lg:w-96 bg-white rounded-3xl border border-line p-6 shadow-xs space-y-5 shrink-0">
            <h2 className="font-display font-bold text-lg text-ink border-b border-line pb-3">Resumo da Comanda</h2>

            {/* Totais Financeiros */}
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal ({orderItems.length} itens):</span>
                <span className="font-medium text-ink tabular-nums lining-nums">{formatCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    {appliedBenefitName || 'Desconto'}:
                  </span>
                  <span className="font-medium tabular-nums lining-nums">-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              {tipAmount > 0 && (
                <div className="flex justify-between text-brand">
                  <span>Gorjeta equipe:</span>
                  <span className="font-medium tabular-nums lining-nums">+{formatCurrency(tipAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold text-ink pt-3 border-t border-line">
                <span>Total a Pagar:</span>
                <span className="font-display text-xl text-brand tabular-nums lining-nums">{formatCurrency(netTotal)}</span>
              </div>
            </div>

            {/* Formas de Pagamento / Split Payment */}
            <div className="pt-2 border-t border-line space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Forma de Pagamento</span>
                <button
                  type="button"
                  onClick={() => setIsSplitPayment(!isSplitPayment)}
                  className="text-xs font-bold text-brand hover:underline cursor-pointer"
                >
                  {isSplitPayment ? 'Pagamento Único' : '+ Dividir Pagamento'}
                </button>
              </div>

              {!isSplitPayment ? (
                /* Seleção de Pagamento Único */
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'pix', label: 'PIX', icon: QrCode },
                    { id: 'credit_card', label: 'Crédito', icon: CreditCard },
                    { id: 'debit_card', label: 'Débito', icon: CreditCard },
                    { id: 'cash', label: 'Dinheiro', icon: DollarSign }
                  ].map(method => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSinglePaymentMethod(method.id)}
                        className={`p-3 rounded-2xl border text-left text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                          singlePaymentMethod === method.id
                            ? 'border-brand bg-brand-tint/40 text-brand shadow-2xs'
                            : 'border-line hover:border-brand/40 text-ink bg-surface'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Split Payment: Múltiplas Linhas */
                <div className="space-y-2.5">
                  {splitPayments.map((p, idx) => (
                    <div key={idx} className="p-3 bg-surface rounded-2xl border border-line space-y-2">
                      <div className="flex items-center justify-between">
                        <select
                          value={p.method}
                          onChange={(e) => updateSplitRow(idx, 'method', e.target.value)}
                          className="text-xs font-semibold text-ink bg-white border border-line rounded-xl px-2 py-1.5 focus:outline-none focus:border-brand cursor-pointer"
                        >
                          <option value="pix">PIX</option>
                          <option value="credit_card">Cartão de Crédito</option>
                          <option value="debit_card">Cartão de Débito</option>
                          <option value="cash">Dinheiro</option>
                          <option value="wallet">Carteira (Cashback)</option>
                          <option value="giftcard">Vale-Presente</option>
                        </select>

                        {splitPayments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSplitRow(idx)}
                            className="text-ink-soft hover:text-red-600 p-1 rounded-full cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <DollarSign className="w-3.5 h-3.5 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Valor R$"
                          value={p.amount}
                          onChange={(e) => updateSplitRow(idx, 'amount', e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-line bg-white text-xs font-semibold text-ink focus:outline-none focus:border-brand"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addSplitPaymentRow}
                    className="w-full py-2 rounded-2xl border border-dashed border-brand/40 text-brand text-xs font-bold hover:bg-brand-tint/20 transition-all cursor-pointer"
                  >
                    + Adicionar Outra Forma
                  </button>

                  {/* Restante a Pagar */}
                  <div className="p-3 rounded-2xl bg-stone-50 border border-line/60 flex items-center justify-between text-xs">
                    <span className="text-ink-soft">Restante a Pagar:</span>
                    <span className={`font-bold lining-nums ${remainingPayment === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {formatCurrency(remainingPayment)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Botão de Finalização */}
            <button
              type="button"
              disabled={orderItems.length === 0 || processing || (isSplitPayment && remainingPayment > 0)}
              onClick={handleCheckoutOrder}
              className="w-full py-3.5 rounded-full bg-brand text-white font-semibold text-sm hover:opacity-95 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Quitando Comanda...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finalizar Comanda · {formatCurrency(netTotal)}</span>
                </>
              )}
            </button>
          </div>
        </div>

      ) : activeTab === 'cash_register' ? (
        
        /* 3. ABA: SESSÃO & FECHAMENTO DIÁRIO DE CAIXA (D17) */
        <div className="space-y-6">
          {!currentCashRegister ? (
            /* Caixa Fechado */
            <div className="bg-white rounded-3xl border border-line p-8 text-center max-w-lg mx-auto space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h2 className="font-display font-bold text-2xl text-ink">O Caixa está Fechado</h2>
                <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                  Inicie a sessão do dia informando o fundo de troco presente na gaveta para começar a registrar recebimentos e vendas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowOpenRegisterModal(true)}
                className="w-full py-3.5 rounded-full bg-brand text-white font-semibold text-sm hover:opacity-95 active:scale-98 transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <LockOpen className="w-4 h-4" />
                <span>Abrir Caixa do Salão</span>
              </button>
            </div>
          ) : (
            /* Caixa Aberto: Painel em Tempo Real */
            <div className="space-y-6">
              
              {/* Card de Status e Ações */}
              <div className="bg-white rounded-3xl border border-line p-6 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Sessão em Andamento</span>
                  </div>
                  <h2 className="font-display font-bold text-2xl text-ink mt-1">
                    Operador: {currentCashRegister.opened_by_name || 'Equipe'}
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Aberto em {new Date(currentCashRegister.opened_at).toLocaleDateString('pt-BR')} às {new Date(currentCashRegister.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Fundo inicial: {formatCurrency(currentCashRegister.initial_balance)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setMovementType('supply'); setShowMovementModal(true); }}
                    className="px-4 py-2.5 rounded-full border border-line bg-surface hover:bg-stone-50 text-xs font-semibold text-ink flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    + Suprimento
                  </button>

                  <button
                    type="button"
                    onClick={() => { setMovementType('bleed'); setShowMovementModal(true); }}
                    className="px-4 py-2.5 rounded-full border border-line bg-surface hover:bg-stone-50 text-xs font-semibold text-ink flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                    - Sangria
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCloseRegisterModal(true)}
                    className="px-5 py-2.5 rounded-full bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    Fechar Caixa Diário
                  </button>
                </div>
              </div>

              {/* 4 KPIs em Tempo Real */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white rounded-3xl border border-line shadow-2xs">
                  <div className="flex items-center justify-between text-ink-soft mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Dinheiro em Gaveta</span>
                    <DollarSign className="w-4 h-4 text-brand" />
                  </div>
                  <span className="font-display font-bold text-2xl text-ink tabular-nums lining-nums">
                    {formatCurrency(currentCashRegister.current_cash_in_drawer)}
                  </span>
                  <span className="text-2xs text-ink-soft block mt-1">
                    Inicial + Entradas em espécie + Suprimentos - Sangrias
                  </span>
                </div>

                <div className="p-5 bg-white rounded-3xl border border-line shadow-2xs">
                  <div className="flex items-center justify-between text-ink-soft mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Entradas PIX</span>
                    <QrCode className="w-4 h-4 text-brand" />
                  </div>
                  <span className="font-display font-bold text-2xl text-ink tabular-nums lining-nums">
                    {formatCurrency(currentCashRegister.sales_by_method?.pix || 0)}
                  </span>
                  <span className="text-2xs text-ink-soft block mt-1">
                    Recebidos via chave ou QR Code
                  </span>
                </div>

                <div className="p-5 bg-white rounded-3xl border border-line shadow-2xs">
                  <div className="flex items-center justify-between text-ink-soft mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Cartões (Créd./Déb.)</span>
                    <CreditCard className="w-4 h-4 text-brand" />
                  </div>
                  <span className="font-display font-bold text-2xl text-ink tabular-nums lining-nums">
                    {formatCurrency((currentCashRegister.sales_by_method?.credit || 0) + (currentCashRegister.sales_by_method?.debit || 0))}
                  </span>
                  <span className="text-2xs text-ink-soft block mt-1">
                    Crédito: {formatCurrency(currentCashRegister.sales_by_method?.credit || 0)} • Débito: {formatCurrency(currentCashRegister.sales_by_method?.debit || 0)}
                  </span>
                </div>

                <div className="p-5 bg-white rounded-3xl border border-line shadow-2xs">
                  <div className="flex items-center justify-between text-ink-soft mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Total Geral Movimentado</span>
                    <Receipt className="w-4 h-4 text-brand" />
                  </div>
                  <span className="font-display font-bold text-2xl text-brand tabular-nums lining-nums">
                    {formatCurrency(currentCashRegister.current_expected_total)}
                  </span>
                  <span className="text-2xs text-ink-soft block mt-1">
                    Soma de todas as entradas na sessão
                  </span>
                </div>
              </div>

            </div>
          )}
        </div>

      ) : activeTab === 'products' ? (
        
        /* 4. ABA: CATÁLOGO DE REVENDA */
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-ink-soft absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar produto por nome..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-full border border-line bg-white text-sm text-ink focus:outline-none focus:border-brand"
              />
            </div>

            <button
              onClick={() => setShowNewProductModal(true)}
              className="px-4 py-2.5 rounded-full bg-brand text-white text-xs font-semibold hover:opacity-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Produto Rápido
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(prod => (
              <div key={prod.id} className="bg-white rounded-3xl border border-line p-4 shadow-2xs space-y-3 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-surface flex items-center justify-center text-brand mb-2">
                    <Package className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-ink line-clamp-1">{prod.name}</h3>
                  <p className="text-xs text-ink-soft">Estoque: {prod.quantity} {prod.unit || 'un'}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-line/60">
                  <span className="font-display font-bold text-base text-ink tabular-nums lining-nums">
                    {formatCurrency(prod.price)}
                  </span>
                  <button
                    onClick={() => { addProductToOrder(prod); setActiveTab('order'); }}
                    className="px-3 py-1.5 rounded-full bg-brand-tint/60 text-brand text-xs font-bold hover:bg-brand-tint transition-all cursor-pointer"
                  >
                    + Comanda
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      ) : (
        
        /* 5. ABA: HISTÓRICO & FECHAMENTOS */
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-line p-6 shadow-2xs">
            <h2 className="font-display font-bold text-xl text-ink mb-4">Comandas Quitadas Recentemente</h2>
            <div className="divide-y divide-line/60">
              {salesHistory.length === 0 ? (
                <p className="text-xs text-ink-soft py-4 text-center">Nenhuma comanda registrada ainda.</p>
              ) : (
                salesHistory.map(order => (
                  <div key={order.id} className="py-3.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-ink text-sm block">{order.order_number}</span>
                      <span className="text-ink-soft">
                        {order.client_name || 'Venda Avulsa'} • {new Date(order.created_at).toLocaleDateString('pt-BR')} às {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-display font-bold text-sm text-brand block tabular-nums lining-nums">
                        {formatCurrency(order.total_amount)}
                      </span>
                      <span className="text-2xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                        Quitada
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-line p-6 shadow-2xs">
            <h2 className="font-display font-bold text-xl text-ink mb-4">Histórico de Fechamentos de Caixa</h2>
            <div className="divide-y divide-line/60">
              {cashHistory.length === 0 ? (
                <p className="text-xs text-ink-soft py-4 text-center">Nenhum fechamento registrado.</p>
              ) : (
                cashHistory.map(reg => (
                  <div key={reg.id} className="py-3.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-ink text-sm block">
                        Caixa de {new Date(reg.opened_at).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-ink-soft">
                        Operador: {reg.opened_by_name} • Fechado por: {reg.closed_by_name || 'Equipe'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-ink block tabular-nums lining-nums">
                        Total: {formatCurrency(reg.actual_total || reg.expected_total)}
                      </span>
                      <span className={`text-2xs font-semibold ${
                        Math.abs(reg.cash_difference) < 0.01 ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        Diferença: {formatCurrency(reg.cash_difference)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modais de Caixa */}
      <ModalAbrirCaixa
        isOpen={showOpenRegisterModal}
        onClose={() => setShowOpenRegisterModal(false)}
        onConfirm={handleOpenRegister}
        loading={savingRegisterAction}
      />

      <ModalMovimentacaoCaixa
        isOpen={showMovementModal}
        onClose={() => setShowMovementModal(false)}
        onConfirm={handleRegisterMovement}
        type={movementType}
        maxBleed={currentCashRegister?.current_cash_in_drawer}
        loading={savingRegisterAction}
      />

      <ModalFecharCaixa
        isOpen={showCloseRegisterModal}
        onClose={() => setShowCloseRegisterModal(false)}
        onConfirm={handleCloseRegister}
        currentRegister={currentCashRegister}
        loading={savingRegisterAction}
      />

      {/* Modal: Identificar Cliente */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-line shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-lg text-ink">Selecionar Cliente</h3>
              <button onClick={() => setShowClientModal(false)} className="text-ink-soft hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={clientSearchTerm}
              onChange={(e) => setClientSearchTerm(e.target.value)}
              className="w-full p-2.5 rounded-2xl border border-line text-sm"
            />
            <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-line/40">
              <button
                type="button"
                onClick={() => { setSelectedClient(null); setShowClientModal(false); }}
                className="w-full p-3 text-left hover:bg-stone-50 rounded-xl text-xs font-semibold text-ink-soft"
              >
                Venda Avulsa (Não identificar)
              </button>
              {filteredClients.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setSelectedClient(c); setShowClientModal(false); }}
                  className="w-full p-3 text-left hover:bg-stone-50 rounded-xl text-xs flex justify-between items-center"
                >
                  <span className="font-bold text-ink">{c.name}</span>
                  <span className="text-ink-soft">{c.phone}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Puxar Agendamento do Dia */}
      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-line shadow-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-lg text-ink">Agendamentos do Dia</h3>
              <button onClick={() => setShowAppointmentModal(false)} className="text-ink-soft hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {todayAppointments.length === 0 ? (
                <p className="text-xs text-ink-soft text-center py-6">Nenhum agendamento para hoje.</p>
              ) : (
                todayAppointments.map(appt => (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => handleImportAppointment(appt)}
                    className="w-full p-3.5 bg-surface hover:bg-brand-tint/30 rounded-2xl border border-line text-left flex justify-between items-center transition-all cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-sm text-ink block">{appt.client_name || 'Cliente'}</span>
                      <span className="text-2xs text-ink-soft">
                        {appt.service_name || 'Procedimento'} • Profissional: {appt.staff_name || 'Equipe'}
                      </span>
                    </div>
                    <span className="font-bold text-sm text-brand tabular-nums lining-nums">
                      {formatCurrency(appt.total_price)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Serviço */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-line shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-lg text-ink">Adicionar Serviço à Comanda</h3>
              <button onClick={() => setShowAddServiceModal(false)} className="text-ink-soft hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddServiceConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">Serviço do Catálogo</label>
                <select
                  value={selectedServiceToAdd}
                  onChange={(e) => setSelectedServiceToAdd(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-2xl border border-line text-sm"
                >
                  <option value="">Selecione um serviço...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.price)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">Profissional Executor</label>
                <select
                  value={selectedStaffToAdd}
                  onChange={(e) => setSelectedStaffToAdd(e.target.value)}
                  className="w-full p-2.5 rounded-2xl border border-line text-sm"
                >
                  <option value="">Sem profissional vinculado</option>
                  {staffList.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="flex-1 py-2.5 rounded-full border border-line text-xs font-semibold text-ink-soft"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-brand text-white text-xs font-semibold"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Aplicar Benefício */}
      {showBenefitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-line shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-lg text-ink">Aplicar Benefício</h3>
              <button onClick={() => setShowBenefitModal(false)} className="text-ink-soft hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBenefitType('coupon')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border ${
                  benefitType === 'coupon' ? 'bg-brand text-white border-brand' : 'border-line text-ink-soft'
                }`}
              >
                Cupom
              </button>
              <button
                type="button"
                onClick={() => setBenefitType('giftcard')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border ${
                  benefitType === 'giftcard' ? 'bg-brand text-white border-brand' : 'border-line text-ink-soft'
                }`}
              >
                Vale-Presente
              </button>
              <button
                type="button"
                onClick={() => setBenefitType('wallet')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border ${
                  benefitType === 'wallet' ? 'bg-brand text-white border-brand' : 'border-line text-ink-soft'
                }`}
              >
                Cashback
              </button>
            </div>

            <form onSubmit={handleApplyBenefit} className="space-y-4">
              {benefitType !== 'wallet' ? (
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Código do {benefitType === 'coupon' ? 'Cupom' : 'Vale-Presente'}
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: PROMO10, VG-XXXX-XXXX"
                    value={benefitCode}
                    onChange={(e) => setBenefitCode(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-2xl border border-line text-sm uppercase font-semibold"
                  />
                </div>
              ) : (
                <p className="text-xs text-ink-soft">
                  O saldo de cashback acumulado pela cliente selecionada ({selectedClient ? selectedClient.name : 'Nenhuma cliente selecionada'}) será resgatado como forma de pagamento na comanda.
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBenefitModal(false)}
                  className="flex-1 py-2.5 rounded-full border border-line text-xs font-semibold text-ink-soft"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={validatingBenefit}
                  className="flex-1 py-2.5 rounded-full bg-brand text-white text-xs font-semibold"
                >
                  {validatingBenefit ? 'Validando...' : 'Aplicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sucesso e Recibo da Comanda */}
      {showSuccessModal && lastReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-line shadow-2xl p-6 text-center max-w-sm w-full space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-2xl text-ink">Comanda Concluída!</h2>
              <p className="text-xs text-ink-soft mt-1">Estoque baixado e pagamento registrado com sucesso.</p>
            </div>

            <div className="bg-surface rounded-2xl p-4 text-xs space-y-2 text-left border border-line/60">
              <div className="flex justify-between">
                <span className="text-ink-soft">Comanda:</span>
                <span className="font-bold text-ink">{lastReceipt.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Cliente:</span>
                <span className="font-bold text-ink">{lastReceipt.clientName}</span>
              </div>
              <div className="flex justify-between border-t border-line/60 pt-2 font-bold text-sm">
                <span>Total Pago:</span>
                <span className="text-brand tabular-nums lining-nums">{formatCurrency(lastReceipt.totalPaid)}</span>
              </div>
              {lastReceipt.change > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                  <span>Troco Devolvido:</span>
                  <span className="tabular-nums lining-nums">{formatCurrency(lastReceipt.change)}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 rounded-full bg-brand text-white text-sm font-semibold hover:opacity-95 cursor-pointer shadow-xs"
            >
              Nova Comanda
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default PDV;
