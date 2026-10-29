import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../lib/api';
import { 
  X, 
  Sparkles, 
  Building2, 
  User, 
  Palette, 
  Check, 
  Eye, 
  EyeOff, 
  KeyRound, 
  ShieldCheck, 
  Layers, 
  AlertCircle 
} from 'lucide-react';
import { 
  WHITE_LABEL_THEMES, 
  generateCustomPalette, 
  getContrastRatio, 
  checkWcagAA 
} from '../../lib/themeTokens';

const THEME_LIST = [
  WHITE_LABEL_THEMES.rose,
  WHITE_LABEL_THEMES.nude,
  WHITE_LABEL_THEMES.lavender,
  WHITE_LABEL_THEMES.sage,
  WHITE_LABEL_THEMES.noir,
  WHITE_LABEL_THEMES.bordeaux
];

const CreateTenantModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Dados do Espaço
  const [tenantName, setTenantName] = useState('');
  const [slug, setSlug] = useState('');

  // 2. Plano de Assinatura
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedPlanPrice, setSelectedPlanPrice] = useState(69.90);

  // 3. Tema e Cores White-Label
  const [selectedThemeId, setSelectedThemeId] = useState('rose');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customBrandHex, setCustomBrandHex] = useState('#8E3B4E');

  // 4. Gestor Inicial
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Auto-gerar slug a partir do nome
  const handleNameChange = (e) => {
    const val = e.target.value;
    setTenantName(val);
    setSlug(val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''));
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
      setError('');
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      const data = await api.plans.list(true);
      if (data && data.length > 0) {
        // Filtrar apenas ativos e ordenar por preço
        const active = data
          .filter(p => p.is_active && p.slug !== 'solo')
          .sort((a, b) => Number(a.price) - Number(b.price));
        setPlans(active);
        if (active.length > 0) {
          setSelectedPlanId(active[0].id);
          setSelectedPlanPrice(Number(active[0].price));
        }
      }
    } catch (err) {
      console.error('Erro ao buscar planos:', err);
    }
  };

  // Gerador de senha forte aleatória
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = 'Op@';
    for (let i = 0; i < 9; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setManagerPassword(pwd);
    setShowPassword(true);
  };

  // Cores dinâmicas ativas
  const activeColors = useMemo(() => {
    if (isCustomMode) {
      const pal = generateCustomPalette(customBrandHex);
      return {
        brand: customBrandHex,
        tint: pal.tint,
        bg: pal.bg,
        accent: pal.accent,
        on_brand: pal.on_brand
      };
    }
    const th = WHITE_LABEL_THEMES[selectedThemeId] || WHITE_LABEL_THEMES.rose;
    return {
      brand: th.brand,
      tint: th.tint,
      bg: th.bg,
      accent: th.accent,
      on_brand: th.on_brand
    };
  }, [isCustomMode, selectedThemeId, customBrandHex]);

  // Contraste para modo customizado
  const contrastRatio = useMemo(() => {
    if (!isCustomMode) return 7.0;
    return Math.round(getContrastRatio(customBrandHex, '#FFFFFF') * 10) / 10;
  }, [isCustomMode, customBrandHex]);

  const contrastAcceptable = useMemo(() => {
    if (!isCustomMode) return true;
    return checkWcagAA(customBrandHex, '#FFFFFF').passes;
  }, [isCustomMode, customBrandHex]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isCustomMode && !contrastAcceptable) {
      setError(`A cor personalizada (${customBrandHex}) não possui contraste suficiente (mínimo 4,5:1). Escolha um tom mais escuro.`);
      setLoading(false);
      return;
    }

    try {
      const themeIdToSave = isCustomMode ? 'custom' : selectedThemeId;
      const brandHexToSave = activeColors.brand;

      // 1. Criar Salão (Tenant) com Tema e Cores
      const tenantData = await api.superadmin.createTenant({
        name: tenantName.trim(),
        slug: slug.trim(),
        plan_price: Number(selectedPlanPrice),
        plan_id: selectedPlanId,
        primary_color: activeColors.brand,
        secondary_color: activeColors.tint,
        tertiary_color: activeColors.bg,
        theme_id: themeIdToSave,
        brand_hex: brandHexToSave,
        welcome_message: `Bem-vinda ao ${tenantName.trim()}! Agende seu momento de cuidado exclusivo.`
      });

      if (!tenantData || !tenantData.id) {
        throw new Error('Falha ao registrar espaço. Verifique se o link único já está em uso.');
      }

      // 2. Criar Conta do Gestor Mestre
      await api.superadmin.createStaff({
        tenant_id: tenantData.id,
        name: managerName.trim(),
        phone: managerPhone.replace(/\D/g, ''),
        email: managerEmail.trim().toLowerCase(),
        password: managerPassword,
        role: 'manager'
      });

      if (onSuccess) onSuccess(tenantData);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao criar o salão.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#FAF7F5] border border-[#EADFDC] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho Editorial */}
        <div className="p-6 pb-4 border-b border-[#EADFDC] bg-white flex items-start justify-between relative">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider bg-[#F6E4E4] text-[#8E3B4E] px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" /> Onboarding White-Label
              </span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#2B2327]">
              Cadastrar Novo Salão
            </h2>
            <p className="text-xs text-[#6F6168] mt-0.5">
              Defina a identidade da marca, selecione o tema e configure o acesso do gestor principal.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-[#6F6168] hover:text-[#2B2327] bg-[#F6E4E4]/40 hover:bg-[#F6E4E4] rounded-full w-9 h-9 flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Modal com Scroll Suave */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#2B2327]">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form id="createTenantForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. DADOS DO ESPAÇO */}
            <div className="bg-white p-5 rounded-2xl border border-[#EADFDC] shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-[#EADFDC]/70 pb-2.5">
                <Building2 className="w-4 h-4 text-[#8E3B4E]" />
                <h3 className="font-serif text-sm font-bold text-[#2B2327] tracking-wide">
                  1. Dados do Espaço
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2327] mb-1.5">
                    Nome do Salão <span className="text-[#8E3B4E]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Studio Elegance"
                    value={tenantName}
                    onChange={handleNameChange}
                    className="w-full bg-[#FAF7F5] border border-[#EADFDC] rounded-xl px-3.5 py-2.5 text-xs text-[#2B2327] placeholder-[#6F6168]/50 focus:outline-none focus:ring-2 focus:ring-[#8E3B4E]/30 focus:border-[#8E3B4E] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2327] mb-1.5">
                    Link Único (Slug) <span className="text-[#8E3B4E]">*</span>
                  </label>
                  <div className="flex items-center">
                    <span className="bg-[#EADFDC]/50 border border-r-0 border-[#EADFDC] rounded-l-xl px-2.5 py-2.5 text-[11px] font-mono text-[#6F6168]">
                      operabeauty.tech/
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="studioelegance"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                      className="w-full bg-[#FAF7F5] border border-[#EADFDC] rounded-r-xl px-3 py-2.5 text-xs font-mono text-[#2B2327] focus:outline-none focus:ring-2 focus:ring-[#8E3B4E]/30 focus:border-[#8E3B4E] transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. PLANO DE ASSINATURA */}
            <div className="bg-white p-5 rounded-2xl border border-[#EADFDC] shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[#EADFDC]/70 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#8E3B4E]" />
                  <h3 className="font-serif text-sm font-bold text-[#2B2327] tracking-wide">
                    2. Plano de Assinatura (SaaS)
                  </h3>
                </div>
                <span className="text-[11px] text-[#6F6168]">Sem fidelidade</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {plans.map((p) => {
                  const isSelected = selectedPlanId === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        setSelectedPlanId(p.id);
                        setSelectedPlanPrice(Number(p.price));
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected 
                          ? 'border-[#8E3B4E] bg-[#F6E4E4]/30 ring-2 ring-[#8E3B4E]/30 shadow-sm' 
                          : 'border-[#EADFDC] bg-[#FAF7F5] hover:border-[#8E3B4E]/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-[#2B2327]">
                            {p.slug === 'basico' || (p.name && p.name.toLowerCase().includes('sico')) ? 'Básico' : p.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#8E3B4E]" />}
                        </div>
                        {p.badge_label && (
                          <span className="inline-block text-[9px] font-semibold bg-[#8E3B4E] text-white px-1.5 py-0.2 rounded-md mb-1">
                            {p.badge_label}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 pt-1 border-t border-black/5">
                        <span className="text-sm font-serif font-extrabold text-[#8E3B4E]">
                          R$ {Number(p.price).toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[10px] text-[#6F6168]">/mês</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. TEMA E IDENTIDADE VISUAL WHITE-LABEL */}
            <div className="bg-white p-5 rounded-2xl border border-[#EADFDC] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#EADFDC]/70 pb-2.5">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#8E3B4E]" />
                  <h3 className="font-serif text-sm font-bold text-[#2B2327] tracking-wide">
                    3. Identidade Visual White-Label
                  </h3>
                </div>

                {/* Abas: Temas Prontos vs Cor Personalizada */}
                <div className="flex items-center gap-1.5 bg-[#FAF7F5] p-1 rounded-xl border border-[#EADFDC]">
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(false)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      !isCustomMode
                        ? 'bg-white text-[#8E3B4E] shadow-xs'
                        : 'text-[#6F6168] hover:text-[#2B2327]'
                    }`}
                  >
                    Temas Prontos (6)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(true)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      isCustomMode
                        ? 'bg-white text-[#8E3B4E] shadow-xs'
                        : 'text-[#6F6168] hover:text-[#2B2327]'
                    }`}
                  >
                    Tom Exclusivo (HEX)
                  </button>
                </div>
              </div>

              {!isCustomMode ? (
                /* Grade dos 6 Temas Prontos */
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {THEME_LIST.map((th) => {
                    const isSelected = selectedThemeId === th.id;
                    return (
                      <div
                        key={th.id}
                        onClick={() => setSelectedThemeId(th.id)}
                        style={{ backgroundColor: th.bg }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#8E3B4E] ring-2 ring-[#8E3B4E]/30 shadow-md scale-[1.02]'
                            : 'border-[#EADFDC] hover:border-[#8E3B4E]/40 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-serif text-xs font-bold text-[#2B2327]">
                            {th.name}
                          </span>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[#8E3B4E] text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        {/* Amostras de Cores (Brand, Tint, Accent) */}
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <div 
                            className="w-5 h-5 rounded-full shadow-xs border border-white/60"
                            style={{ backgroundColor: th.brand }}
                            title={`Cor Principal: ${th.brand}`}
                          />
                          <div 
                            className="w-5 h-5 rounded-full shadow-xs border border-white/60"
                            style={{ backgroundColor: th.tint }}
                            title={`Tom Secundário: ${th.tint}`}
                          />
                          <div 
                            className="w-5 h-5 rounded-full shadow-xs border border-white/60"
                            style={{ backgroundColor: th.accent }}
                            title={`Destaque: ${th.accent}`}
                          />
                        </div>

                        {/* Mini Botão de Exemplo */}
                        <div
                          style={{ backgroundColor: th.brand, color: th.on_brand }}
                          className="w-full py-1.5 rounded-lg text-[10px] font-semibold text-center shadow-xs"
                        >
                          Visualizar Tema
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Seletor HEX Personalizado com WCAG */
                <div className="space-y-3.5 bg-[#FAF7F5] p-4 rounded-2xl border border-[#EADFDC]">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="color"
                          value={customBrandHex}
                          onChange={(e) => setCustomBrandHex(e.target.value.toUpperCase())}
                          className="w-12 h-12 rounded-2xl border border-[#EADFDC] cursor-pointer p-0.5 bg-white shadow-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#2B2327]">
                          Código HEX da Marca
                        </label>
                        <input
                          type="text"
                          maxLength={7}
                          value={customBrandHex}
                          onChange={(e) => setCustomBrandHex(e.target.value.toUpperCase())}
                          className="w-28 bg-white border border-[#EADFDC] rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-[#2B2327] mt-0.5"
                        />
                      </div>
                    </div>

                    {/* Selo de Contraste WCAG */}
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 ${
                        contrastAcceptable 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Contraste: {contrastRatio}:1 ({contrastAcceptable ? 'Excelente' : 'Baixo'})</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#6F6168]">
                    Ao definir a cor principal, o OperaBeauty calcula automaticamente os tons secundários, gradientes e fundos para máxima legibilidade no aplicativo do salão.
                  </p>
                </div>
              )}

              {/* Mini Preview Ao Vivo do Salão */}
              <div 
                style={{ backgroundColor: activeColors.bg }}
                className="p-3.5 rounded-2xl border border-[#EADFDC] transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div 
                    style={{ backgroundColor: activeColors.brand, color: activeColors.on_brand }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-serif text-sm font-bold shadow-xs"
                  >
                    {tenantName ? tenantName.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div>
                    <h4 className="font-serif text-xs font-bold text-[#2B2327]">
                      {tenantName || 'Nome do Salão'}
                    </h4>
                    <span 
                      style={{ backgroundColor: activeColors.tint, color: activeColors.brand }}
                      className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mt-0.5"
                    >
                      Agendamento Online Ativo
                    </span>
                  </div>
                </div>

                <div 
                  style={{ backgroundColor: activeColors.brand, color: activeColors.on_brand }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs"
                >
                  Agendar
                </div>
              </div>
            </div>

            {/* 4. CONTA DO GESTOR MESTRE */}
            <div className="bg-white p-5 rounded-2xl border border-[#EADFDC] shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-[#EADFDC]/70 pb-2.5">
                <User className="w-4 h-4 text-[#8E3B4E]" />
                <h3 className="font-serif text-sm font-bold text-[#2B2327] tracking-wide">
                  4. Acesso do Gestor Principal
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2327] mb-1.5">
                    Nome Completo <span className="text-[#8E3B4E]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Amanda Silveira"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    className="w-full bg-[#FAF7F5] border border-[#EADFDC] rounded-xl px-3.5 py-2.5 text-xs text-[#2B2327] placeholder-[#6F6168]/50 focus:outline-none focus:ring-2 focus:ring-[#8E3B4E]/30 focus:border-[#8E3B4E] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2327] mb-1.5">
                    WhatsApp (Contato) <span className="text-[#8E3B4E]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 99999-9999"
                    value={managerPhone}
                    onChange={(e) => setManagerPhone(e.target.value)}
                    className="w-full bg-[#FAF7F5] border border-[#EADFDC] rounded-xl px-3.5 py-2.5 text-xs text-[#2B2327] placeholder-[#6F6168]/50 focus:outline-none focus:ring-2 focus:ring-[#8E3B4E]/30 focus:border-[#8E3B4E] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2327] mb-1.5">
                    E-mail de Acesso (Login) <span className="text-[#8E3B4E]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="gestor@salao.com.br"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    className="w-full bg-[#FAF7F5] border border-[#EADFDC] rounded-xl px-3.5 py-2.5 text-xs text-[#2B2327] placeholder-[#6F6168]/50 focus:outline-none focus:ring-2 focus:ring-[#8E3B4E]/30 focus:border-[#8E3B4E] transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#2B2327]">
                      Senha Provisória <span className="text-[#8E3B4E]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateStrongPassword}
                      className="text-[10px] font-semibold text-[#8E3B4E] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-3 h-3" /> Gerar Segura
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={managerPassword}
                      onChange={(e) => setManagerPassword(e.target.value)}
                      className="w-full bg-[#FAF7F5] border border-[#EADFDC] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-[#2B2327] focus:outline-none focus:ring-2 focus:ring-[#8E3B4E]/30 focus:border-[#8E3B4E] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F6168] hover:text-[#2B2327] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Rodapé Fixo */}
        <div className="p-4 px-6 border-t border-[#EADFDC] bg-white flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#6F6168] hover:text-[#2B2327] hover:bg-[#FAF7F5] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            form="createTenantForm"
            disabled={loading}
            className="bg-[#8E3B4E] hover:bg-[#732f3f] text-white px-6 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Ativando Espaço...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Criar Salão e Ativar Espaço</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default CreateTenantModal;
