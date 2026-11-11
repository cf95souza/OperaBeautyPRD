import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  WHITE_LABEL_THEMES, 
  generateCustomPalette, 
  getContrastRatio, 
  getThemeTokens 
} from '../../lib/themeTokens';
import { ModalRecorteImagem } from '../../components/ui/ModalRecorteImagem';
import { PlaceholderImagem } from '../../components/ui/PlaceholderImagem';

const THEME_LIST = [
  WHITE_LABEL_THEMES.rose,
  WHITE_LABEL_THEMES.nude,
  WHITE_LABEL_THEMES.lavender,
  WHITE_LABEL_THEMES.sage,
  WHITE_LABEL_THEMES.noir,
  WHITE_LABEL_THEMES.bordeaux
];

const BrandingCustomizacao = () => {
  const { tenant_slug } = useParams();
  const { tenant, setTenant, applyLiveTheme } = useTenant();
  const { showSuccess, showError } = useNotification();
  
  const [selectedThemeId, setSelectedThemeId] = useState('rose');
  const [customBrandHex, setCustomBrandHex] = useState('#8E3B4E');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Estados do Modal de Recorte Guiado de Imagens (Item A6)
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropModalFile, setCropModalFile] = useState(null);
  const [cropTarget, setCropTarget] = useState('logo'); // 'logo', 'cover' ou 'banner'
  const [uploadingImage, setUploadingImage] = useState(false);

  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const [branding, setBranding] = useState({
    name: 'Salão',
    slug: '',
    primary_color: '#8E3B4E',
    secondary_color: '#F6E4E4',
    tertiary_color: '#FBF7F5',
    logo_url: '',
    cover_url: '',
    banners: [],
    welcome_message: 'Bem-vindo ao salão. Agende seu próximo momento de tranquilidade abaixo.'
  });

  const [saving, setSaving] = useState(false);
  const [selectedBannerIndex, setSelectedBannerIndex] = useState(0);

  // Inicializa com os dados do tenant
  useEffect(() => {
    if (tenant) {
      const themeId = tenant.theme_id || 'rose';
      const brandHex = tenant.brand_hex || tenant.primary_color || '#8E3B4E';
      
      setSelectedThemeId(themeId);
      setCustomBrandHex(brandHex);
      setIsCustomMode(themeId === 'custom');

      setBranding({
        name: tenant.name || 'Salão',
        slug: tenant.slug || '',
        primary_color: tenant.primary_color || '#8E3B4E',
        secondary_color: tenant.secondary_color || '#F6E4E4',
        tertiary_color: tenant.tertiary_color || '#FBF7F5',
        logo_url: tenant.logo_url || '',
        cover_url: tenant.cover_url || '',
        banners: Array.isArray(tenant.banners) && tenant.banners.length > 0 
          ? tenant.banners 
          : [
              {
                id: 'default',
                url: tenant.banner_url || '',
                title: tenant.banner_title || 'Pacote Especial',
                subtitle: tenant.banner_subtitle || 'Reserve seu momento de cuidado hoje mesmo.'
              }
            ],
        welcome_message: tenant.welcome_message || 'Bem-vindo ao salão. Agende seu próximo momento de tranquilidade abaixo.'
      });
    }
  }, [tenant]);

  // Cálculos do modo personalizado
  const customPalette = React.useMemo(() => {
    try {
      return generateCustomPalette(customBrandHex);
    } catch {
      return null;
    }
  }, [customBrandHex]);

  const customContrast = React.useMemo(() => {
    return Math.round(getContrastRatio(customBrandHex, '#FFFFFF') * 10) / 10;
  }, [customBrandHex]);

  const isCustomContrastOk = customContrast >= 4.5;

  // Seleciona um tema pronto da lista
  const handleSelectPredefinedTheme = (themeId) => {
    setSelectedThemeId(themeId);
    setIsCustomMode(false);
    if (applyLiveTheme) {
      applyLiveTheme(themeId);
    }
  };

  // Ativa o modo de cor livre
  const handleEnableCustomMode = () => {
    setIsCustomMode(true);
    setSelectedThemeId('custom');
    if (applyLiveTheme && customPalette) {
      applyLiveTheme('custom', customBrandHex);
    }
  };

  // Atualiza a cor personalizada com live preview
  const handleCustomColorChange = (newHex) => {
    setCustomBrandHex(newHex);
    if (applyLiveTheme) {
      try {
        applyLiveTheme('custom', newHex);
      } catch (e) {
        // Ignora hex incompleto enquanto digita
      }
    }
  };

  // Auto-ajusta para cor segura com contraste >= 4.5:1
  const handleApplySuggestedColor = () => {
    if (customPalette && customPalette.suggestedBrandHex) {
      setCustomBrandHex(customPalette.suggestedBrandHex);
      if (applyLiveTheme) {
        applyLiveTheme('custom', customPalette.suggestedBrandHex);
      }
    }
  };

  // Funções de Recorte Guiado e Upload de Imagens (Item A6)
  const handleTriggerLogoUpload = () => {
    if (logoInputRef.current) {
      logoInputRef.current.click();
    }
  };

  const handleTriggerCoverUpload = () => {
    if (coverInputRef.current) {
      coverInputRef.current.click();
    }
  };

  const handleTriggerBannerUpload = () => {
    if (bannerInputRef.current) {
      bannerInputRef.current.click();
    }
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropTarget('logo');
    setCropModalFile(file);
    setCropModalOpen(true);
    e.target.value = '';
  };

  const handleCoverFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropTarget('cover');
    setCropModalFile(file);
    setCropModalOpen(true);
    e.target.value = '';
  };

  const handleBannerFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropTarget('banner');
    setCropModalFile(file);
    setCropModalOpen(true);
    e.target.value = '';
  };

  const handleCropComplete = async ({ blob, filename }) => {
    setUploadingImage(true);
    try {
      const res = await api.upload.image(blob, filename);
      if (cropTarget === 'logo') {
        setBranding(prev => ({ ...prev, logo_url: res.url }));
        showSuccess('Logo recortada e convertida para WebP com sucesso!');
      } else if (cropTarget === 'cover') {
        setBranding(prev => ({ ...prev, cover_url: res.url }));
        showSuccess('Foto de capa recortada (16:9) e convertida para WebP com sucesso!');
      } else if (cropTarget === 'banner') {
        const updated = [...branding.banners];
        if (updated[selectedBannerIndex]) {
          updated[selectedBannerIndex] = {
            ...updated[selectedBannerIndex],
            url: res.url
          };
          setBranding(prev => ({ ...prev, banners: updated }));
          showSuccess('Banner recortado (16:9) e convertido para WebP com sucesso!');
        }
      }
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao enviar imagem.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateBanner = () => {
    const maxBanners = tenant?.max_banners || 1;
    if (branding.banners.length >= maxBanners) {
      showError(`O seu plano atual permite cadastrar no máximo ${maxBanners} banner(s).`);
      return;
    }
    const newBanner = {
      id: Math.random().toString(36).substring(2, 9),
      url: '',
      title: 'Nova Promoção',
      subtitle: 'Descrição da sua promoção especial.'
    };
    const updated = [...branding.banners, newBanner];
    setBranding({ ...branding, banners: updated });
    setSelectedBannerIndex(updated.length - 1);
  };

  const handleDeleteBanner = (idxToDelete) => {
    if (branding.banners.length <= 1) {
      showError("Você precisa manter pelo menos um banner configurado.");
      return;
    }
    const updated = branding.banners.filter((_, idx) => idx !== idxToDelete);
    setBranding({ ...branding, banners: updated });
    if (selectedBannerIndex >= updated.length) {
      setSelectedBannerIndex(updated.length - 1);
    }
  };

  const handleUpdateActiveBanner = (field, value) => {
    const updatedBanners = [...branding.banners];
    if (updatedBanners[selectedBannerIndex]) {
      updatedBanners[selectedBannerIndex] = {
        ...updatedBanners[selectedBannerIndex],
        [field]: value
      };
      setBranding({ ...branding, banners: updatedBanners });
    }
  };

  const handleSave = async () => {
    if (!tenant) return;

    // Bloqueio obrigatório de contraste ruim no modo personalizado
    if (isCustomMode && !isCustomContrastOk) {
      showError(`A cor personalizada (${customBrandHex}) não possui contraste suficiente (mínimo 4,5:1). Ajuste para um tom mais escuro antes de salvar.`);
      return;
    }

    setSaving(true);
    try {
      const finalThemeId = isCustomMode ? 'custom' : selectedThemeId;
      const finalBrandHex = isCustomMode 
        ? customBrandHex 
        : (WHITE_LABEL_THEMES[selectedThemeId]?.brand || '#8E3B4E');

      const payload = {
        name: branding.name,
        theme_id: finalThemeId,
        brand_hex: finalBrandHex,
        logo_url: branding.logo_url,
        cover_url: branding.cover_url,
        banners: branding.banners,
        welcome_message: branding.welcome_message
      };

      const updatedTenant = await api.tenants.updateBranding(payload);
      
      // Atualiza o estado global e aplica os tokens imediatamente
      if (setTenant) {
        setTenant(updatedTenant);
      }
      if (applyLiveTheme) {
        applyLiveTheme(finalThemeId, finalBrandHex);
      }

      showSuccess('Identidade visual e temas salvos com sucesso!');
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao salvar configurações de identidade visual.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-[1240px] mx-auto w-full animate-fade-in-up pb-32">
      {/* Cabeçalho da Página */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#EADFDC]/60 pb-6">
        <div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-[#8E3B4E] bg-[#F6E4E4] px-3 py-1 rounded-full mb-2 inline-block">
            Personalização White-Label
          </span>
          <h1 className="font-serif text-3xl md:text-4xl text-[#2B2327] tracking-tight">
            Branding & Temas
          </h1>
          <p className="text-sm md:text-base text-[#6F6168] mt-1">
            Escolha uma paleta de alta costura ou personalize a cor da sua marca com acessibilidade garantida.
          </p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving || (isCustomMode && !isCustomContrastOk)}
          className="hidden md:flex items-center gap-2 bg-[#8E3B4E] text-white px-6 py-3 rounded-full font-medium text-sm hover:opacity-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">{saving ? 'sync' : 'check'}</span> 
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </header>

      {/* SEÇÃO PRINCIPAL: 6 TEMAS WHITE-LABEL (1:1 COM Temas white-label@2x.png) */}
      <section className="bg-white rounded-3xl p-6 md:p-8 border border-[#EADFDC]/80 shadow-[0_4px_24px_rgba(142,59,78,0.04)] mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-3">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl text-[#2B2327]">
              Temas prontos para cada salão
            </h2>
            <p className="text-sm text-[#6F6168] mt-1">
              O salão escolhe um tema ou uma cor de marca; o sistema gera os tons e bloqueia combinações com contraste ruim.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectPredefinedTheme('rose')}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                !isCustomMode 
                  ? 'bg-[#8E3B4E] text-white' 
                  : 'bg-[#F6E4E4] text-[#8E3B4E] hover:bg-[#F6E4E4]/80'
              }`}
            >
              Temas Prontos (6)
            </button>
            <button
              type="button"
              onClick={handleEnableCustomMode}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                isCustomMode 
                  ? 'bg-[#8E3B4E] text-white' 
                  : 'bg-[#F6E4E4] text-[#8E3B4E] hover:bg-[#F6E4E4]/80'
              }`}
            >
              Cor Personalizada
            </button>
          </div>
        </div>

        {/* Mostruário dos 6 Temas */}
        {!isCustomMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {THEME_LIST.map((th) => {
              const isSelected = selectedThemeId === th.id;
              return (
                <div
                  key={th.id}
                  onClick={() => handleSelectPredefinedTheme(th.id)}
                  style={{ backgroundColor: th.bg }}
                  className={`rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer border ${
                    isSelected 
                      ? 'border-[#8E3B4E] ring-2 ring-[#8E3B4E]/30 shadow-md scale-[1.02]' 
                      : 'border-[#EADFDC]/80 hover:border-[#8E3B4E]/50 hover:shadow-sm'
                  }`}
                >
                  {/* Nome do Tema */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-serif text-lg font-semibold text-[#2B2327]">
                      {th.name}
                    </h3>
                    {isSelected && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#2B2327] text-white px-2 py-0.5 rounded-full">
                        Ativo
                      </span>
                    )}
                  </div>

                  {/* Mini-Cartão de Serviço */}
                  <div className="bg-white rounded-xl p-2.5 mb-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-[#EADFDC]/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-7 h-7 rounded-lg shrink-0" 
                        style={{ backgroundColor: th.tint }}
                      />
                      <span className="text-xs font-semibold text-[#2B2327]">Corte</span>
                    </div>
                    <span 
                      className="font-serif text-xs font-bold"
                      style={{ color: th.brand }}
                    >
                      R$ 45
                    </span>
                  </div>

                  {/* Chips: Manhã e 11:00 */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <span 
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md text-[#2B2327]"
                      style={{ backgroundColor: th.tint }}
                    >
                      Manhã
                    </span>
                    <span 
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md text-white"
                      style={{ backgroundColor: th.brand }}
                    >
                      11:00
                    </span>
                  </div>

                  {/* Botão Agendar Horário */}
                  <button
                    type="button"
                    style={{ 
                      backgroundColor: th.brand, 
                      color: th.on_brand || '#FFFFFF' 
                    }}
                    className="w-full py-2 rounded-xl text-xs font-medium mb-3 shadow-sm transition-transform active:scale-95"
                  >
                    Agendar horário
                  </button>

                  {/* Paleta no rodapé: 4 círculos (bg, tint, accent, brand) */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-black/5">
                    <div 
                      className="w-4 h-4 rounded-full border border-black/10" 
                      style={{ backgroundColor: th.bg }} 
                      title="Fundo (bg)"
                    />
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: th.tint }} 
                      title="Suave (tint)"
                    />
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: th.accent }} 
                      title="Acento (accent)"
                    />
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: th.brand }} 
                      title="Marca (brand)"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* MODO COR LIVRE (PERSONALIZADO COM VALIDAÇÃO WCAG) */
          <div className="p-6 rounded-2xl bg-[#FBF7F5] border border-[#EADFDC] flex flex-col lg:flex-row gap-8 items-start">
            {/* Controles de Cor */}
            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6F6168] block mb-2">
                  Escolha a cor principal da sua marca
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={customBrandHex}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="w-12 h-12 rounded-xl cursor-pointer border border-[#EADFDC] p-1 bg-white"
                  />
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={customBrandHex}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      placeholder="#8E3B4E"
                      maxLength={7}
                      className="w-full border border-[#EADFDC] rounded-xl px-4 py-3 font-mono text-sm uppercase bg-white focus:outline-none focus:border-[#8E3B4E]"
                    />
                  </div>
                </div>
              </div>

              {/* Selo de Contraste WCAG 2.1 */}
              <div className="p-4 rounded-xl border bg-white flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#2B2327]">
                    Aferição de Acessibilidade (WCAG AA)
                  </span>
                  <span 
                    className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      isCustomContrastOk 
                        ? 'bg-[#E2EBDF] text-[#3F6B55]' 
                        : 'bg-[#F1DDE0] text-[#B3261E]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {isCustomContrastOk ? 'check_circle' : 'warning'}
                    </span>
                    {isCustomContrastOk ? `Contraste OK (${customContrast}:1)` : `Contraste Ruim (${customContrast}:1)`}
                  </span>
                </div>
                
                <p className="text-xs text-[#6F6168]">
                  {isCustomContrastOk 
                    ? 'A cor selecionada garante legibilidade em botões, cartões e numerais de preços segundo a norma W3C.'
                    : 'A cor escolhida é muito clara e tornará textos ilegíveis. Bloqueamos cores com contraste inferior a 4,5:1.'}
                </p>

                {!isCustomContrastOk && customPalette?.suggestedBrandHex && (
                  <button
                    type="button"
                    onClick={handleApplySuggestedColor}
                    className="mt-2 text-xs font-medium text-[#8E3B4E] bg-[#F6E4E4] hover:bg-[#F6E4E4]/80 px-3 py-2 rounded-lg self-start flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">auto_fix_high</span>
                    Ajustar automaticamente para tom seguro ({customPalette.suggestedBrandHex})
                  </button>
                )}
              </div>
            </div>

            {/* Preview do Card Personalizado */}
            {customPalette && (
              <div 
                style={{ backgroundColor: customPalette.bg }}
                className="w-full lg:w-72 rounded-2xl p-5 border border-[#EADFDC] shadow-sm shrink-0"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-lg font-semibold text-[#2B2327]">
                    Personalizado
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#8E3B4E] text-white px-2 py-0.5 rounded-full">
                    Preview
                  </span>
                </div>

                <div className="bg-white rounded-xl p-3 mb-3 border border-[#EADFDC]/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-7 h-7 rounded-lg shrink-0" 
                      style={{ backgroundColor: customPalette.tint }}
                    />
                    <span className="text-xs font-semibold text-[#2B2327]">Corte</span>
                  </div>
                  <span 
                    className="font-serif text-xs font-bold"
                    style={{ color: customPalette.brand }}
                  >
                    R$ 45
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span 
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md text-[#2B2327]"
                    style={{ backgroundColor: customPalette.tint }}
                  >
                    Manhã
                  </span>
                  <span 
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md text-white"
                    style={{ backgroundColor: customPalette.brand }}
                  >
                    11:00
                  </span>
                </div>

                <button
                  type="button"
                  style={{ 
                    backgroundColor: customPalette.brand, 
                    color: customPalette.on_brand || '#FFFFFF' 
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-medium mb-3 shadow-sm"
                >
                  Agendar horário
                </button>

                <div className="flex items-center gap-1.5 pt-2 border-t border-black/5">
                  <div className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: customPalette.bg }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: customPalette.tint }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: customPalette.accent }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: customPalette.brand }} />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* SEÇÃO INFERIOR: IDENTIDADE, LOGO, BANNERS E MENSAGENS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Identidade e Slug */}
        <section className="bg-white rounded-2xl border border-[#EADFDC]/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="font-serif text-xl text-[#2B2327] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8E3B4E]">storefront</span> Identidade do Salão
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#6F6168] block mb-1">Nome do Estabelecimento</label>
                <input 
                  type="text" 
                  value={branding.name}
                  onChange={e => setBranding({...branding, name: e.target.value})}
                  className="w-full border border-[#EADFDC] rounded-xl p-3 text-sm focus:outline-none focus:border-[#8E3B4E]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#6F6168] block mb-1">Link Exclusivo (Slug)</label>
                <div className="flex items-center border border-[#EADFDC] rounded-xl overflow-hidden bg-[#FBF7F5]">
                  <span className="bg-[#F6E4E4] text-[#8E3B4E] px-3 py-2.5 text-xs font-semibold select-none border-r border-[#EADFDC]">
                    app.com/
                  </span>
                  <input 
                    disabled
                    type="text" 
                    value={branding.slug}
                    className="w-full p-2.5 text-sm bg-transparent text-[#6F6168] cursor-not-allowed outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-[#F6E4E4]/50 border border-[#F6E4E4] p-3 rounded-xl flex items-start gap-2">
            <span className="material-symbols-outlined text-[#8E3B4E] text-[18px] mt-0.5">info</span>
            <p className="text-[11px] text-[#8E3B4E] leading-relaxed">
              O link exclusivo (slug) é a chave de acesso do seu salão e não deve ser alterado sem alinhamento prévio.
            </p>
          </div>
        </section>

        {/* Logo da Marca (Item A6) */}
        <section className="bg-white rounded-2xl border border-[#EADFDC]/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-serif text-xl text-[#2B2327] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8E3B4E]">image</span> Logo da Marca
              </h2>
              <span className="text-[10px] font-semibold text-[#8E3B4E] bg-[#F6E4E4] px-2.5 py-0.5 rounded-full">
                1:1 · Quadrada
              </span>
            </div>
            <p className="text-xs text-[#6F6168] mb-4">
              Envie a imagem da sua logo. O sistema fará o recorte guiado em proporção 1:1 e conversão WebP.
            </p>

            {/* Input de Arquivo Oculto */}
            <input 
              ref={logoInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleLogoFileChange}
              className="hidden"
            />

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleTriggerLogoUpload}
                disabled={uploadingImage}
                className="w-full py-2.5 px-4 bg-[#F6E4E4] hover:bg-[#F6E4E4]/80 text-[#8E3B4E] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#EADFDC]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {uploadingImage ? 'sync' : 'upload_file'}
                </span>
                {uploadingImage ? 'Enviando WebP...' : 'Fazer Upload e Recortar Logo (1:1)'}
              </button>

              <div>
                <label className="text-[11px] font-medium text-[#6F6168] block mb-1">Ou informe uma URL direta</label>
                <input 
                  type="url" 
                  placeholder="https://exemplo.com/logo.png"
                  value={branding.logo_url || ''}
                  onChange={e => setBranding({...branding, logo_url: e.target.value})}
                  className="w-full border border-[#EADFDC] rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#8E3B4E]"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 p-3 bg-[#FBF7F5] rounded-xl border border-[#EADFDC]">
            <div className="w-14 h-14 rounded-full bg-white border border-[#EADFDC] flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              {branding.logo_url ? (
                <img 
                  src={branding.logo_url} 
                  alt="Logo Preview" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }} 
                />
              ) : null}
              <div style={{ display: branding.logo_url ? 'none' : 'flex' }} className="w-full h-full items-center justify-center">
                <PlaceholderImagem 
                  tipo="logo" 
                  nome={branding.name || 'O'} 
                  aspectRatio="circle" 
                  className="w-full h-full border-0" 
                  iconSize="20px" 
                />
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-[#2B2327]">Visualização do Topo</p>
              <p className="text-xs text-[#6F6168] truncate">
                {branding.logo_url ? 'Logo personalizada ativa' : 'Monograma editorial automático'}
              </p>
            </div>
          </div>
        </section>

        {/* Mensagem de Boas-vindas */}
        <section className="bg-white rounded-2xl border border-[#EADFDC]/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="font-serif text-xl text-[#2B2327] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8E3B4E]">edit_note</span> Boas-vindas
            </h2>
            <p className="text-xs text-[#6F6168] mb-3">Frase de saudação editorial apresentada aos clientes no topo da tela inicial.</p>
            <textarea 
              value={branding.welcome_message}
              onChange={e => setBranding({...branding, welcome_message: e.target.value})}
              rows={4}
              placeholder="Digite a saudação acolhedora..."
              className="w-full border border-[#EADFDC] rounded-xl p-3 text-sm focus:outline-none focus:border-[#8E3B4E] resize-none"
            />
          </div>
          <p className="text-[11px] text-[#6F6168] mt-2">
            A saudação inicial é complementada automaticamente com o primeiro nome da cliente logada.
          </p>
        </section>

      </div>

      {/* SEÇÃO FOTO DE CAPA / FACHADA (TELA DE ENTRADA DO CLIENTE) */}
      <section className="mt-6 bg-white rounded-2xl border border-[#EADFDC]/80 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl text-[#2B2327] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8E3B4E]">storefront</span> Foto de Capa / Fachada (Tela de Entrada)
              </h2>
              <span className="text-[10px] font-semibold text-[#8E3B4E] bg-[#F6E4E4] px-2.5 py-0.5 rounded-full">
                16:9 · Tela de Boas-Vindas
              </span>
            </div>
            <p className="text-xs text-[#6F6168] mt-1">
              Esta é a foto principal exibida aos clientes na tela inicial de login e identificação. Ideal para uma foto do salão, recepção ou fachada.
            </p>
          </div>
        </div>

        {/* Input Oculto de Arquivo da Foto de Capa */}
        <input 
          ref={coverInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleCoverFileChange}
          className="hidden"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Lado Esquerdo: Ações e URL */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-[#FBF7F5] border border-[#EADFDC] p-4 rounded-xl space-y-3">
              <p className="text-xs text-[#2B2327] font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#8E3B4E] text-[18px]">photo_camera</span>
                Carregar Imagem do Seu Espaço
              </p>
              <p className="text-[11px] text-[#6F6168] leading-relaxed">
                Envie qualquer foto (horizontal ou vertical). O novo recorte com zoom permite afastar (zoom-out) e enquadrar perfeitamente sem cortar o ambiente.
              </p>

              <button
                type="button"
                onClick={handleTriggerCoverUpload}
                disabled={uploadingImage}
                className="w-full py-3 px-4 bg-[#8E3B4E] hover:bg-[#8E3B4E]/90 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {uploadingImage && cropTarget === 'cover' ? 'sync' : 'crop_original'}
                </span>
                {uploadingImage && cropTarget === 'cover' ? 'Enviando WebP...' : 'Fazer Upload e Recortar Foto de Capa (16:9)'}
              </button>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#6F6168] block mb-1">Ou informe uma URL direta para a capa</label>
              <input 
                type="url" 
                placeholder="https://exemplo.com/fachada-salao.jpg"
                value={branding.cover_url || ''}
                onChange={e => setBranding({...branding, cover_url: e.target.value})}
                className="w-full border border-[#EADFDC] rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#8E3B4E]"
              />
            </div>

            {branding.cover_url && (
              <button
                type="button"
                onClick={() => setBranding({ ...branding, cover_url: '' })}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Remover foto de capa (usará visual padrão)
              </button>
            )}
          </div>

          {/* Lado Direito: Preview idêntico à Tela de Entrada */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <span className="text-[10px] font-semibold text-[#6F6168] uppercase tracking-wider mb-2 self-start flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">visibility</span> Pré-visualização na Tela de Entrada
            </span>
            <div className="w-full max-w-[380px] bg-[#FAF8F5] p-5 rounded-3xl border border-[#EADFDC] shadow-sm flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white border border-[#EADFDC] flex items-center justify-center mb-2 overflow-hidden shadow-sm">
                {branding.logo_url ? (
                  <img src={branding.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif font-bold text-[#8E3B4E]">{branding.name ? branding.name.charAt(0) : 'S'}</span>
                )}
              </div>
              <h3 className="font-serif text-base font-semibold text-[#2B2327] mb-3">{branding.name || 'Nome do Salão'}</h3>

              {/* Caixa da Imagem de Capa */}
              <div className="w-full h-40 rounded-2xl overflow-hidden border border-[#EADFDC] bg-[#F2EDE8] shadow-inner relative flex items-center justify-center">
                {branding.cover_url || (branding.banners && branding.banners[0]?.url) ? (
                  <img 
                    src={branding.cover_url || (branding.banners && branding.banners[0]?.url)} 
                    alt="Capa do Salão" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="flex flex-col items-center text-[#A8989F] gap-1 p-4 text-center">
                    <span className="material-symbols-outlined text-3xl">storefront</span>
                    <span className="text-[11px] font-mono tracking-wider">[FOTO NÍTIDA DO SALÃO]</span>
                  </div>
                )}
              </div>

              <div className="w-full mt-3 text-center">
                <p className="font-serif text-sm font-semibold text-[#2B2327]">Que bom ter você aqui</p>
                <p className="text-[10px] text-[#6F6168]">Sua jornada de autocuidado e luxo começa aqui.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO BANNERS PROMOCIONAIS */}
      <section className="mt-6 bg-white rounded-2xl border border-[#EADFDC]/80 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <div>
            <h2 className="font-serif text-xl text-[#2B2327] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8E3B4E]">view_carousel</span> Banners Promocionais
            </h2>
            <p className="text-xs text-[#6F6168] mt-0.5">
              Destaque pacotes, lançamentos ou estações no carrossel superior do cliente.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {(branding.banners || []).length < (tenant?.max_banners || 3) && (
              <button
                type="button"
                onClick={handleCreateBanner}
                className="flex items-center gap-1.5 px-4 py-2 border border-[#8E3B4E] text-[#8E3B4E] hover:bg-[#F6E4E4] rounded-full text-xs font-semibold transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Novo Banner
              </button>
            )}
            <span className="text-xs text-[#6F6168] font-medium bg-[#FBF7F5] px-3 py-1.5 rounded-full border border-[#EADFDC]">
              {(branding.banners || []).length} / {tenant?.max_banners || 3} cadastrado(s)
            </span>
          </div>
        </div>

        {/* Abas dos Banners */}
        <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-[#EADFDC]">
          {(branding.banners || []).map((b, idx) => (
            <div 
              key={b.id || idx} 
              className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full text-xs transition-all ${
                selectedBannerIndex === idx 
                  ? 'bg-[#8E3B4E] text-white font-semibold shadow-sm' 
                  : 'bg-[#FBF7F5] text-[#2B2327] hover:bg-[#F6E4E4]'
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedBannerIndex(idx)}
                className="cursor-pointer"
              >
                Banner {idx + 1}
              </button>
              {(branding.banners || []).length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteBanner(idx)}
                  className="w-4 h-4 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                  title="Excluir banner"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Editor do Banner Selecionado */}
        {branding.banners && branding.banners[selectedBannerIndex] && (
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div 
              className="w-full md:w-64 h-36 rounded-2xl overflow-hidden relative flex items-center justify-center shrink-0 border border-[#EADFDC]"
              style={{
                background: !branding.banners[selectedBannerIndex].url 
                  ? 'linear-gradient(135deg, #8E3B4E, #B76E79)' 
                  : '#2B2327'
              }}
            >
              {branding.banners[selectedBannerIndex].url ? (
                <img 
                  src={branding.banners[selectedBannerIndex].url} 
                  alt="Banner" 
                  className="w-full h-full object-cover" 
                  onError={(e) => e.target.style.display='none'} 
                />
              ) : (
                <div className="p-4 text-center text-white">
                  <span className="font-serif text-sm font-semibold block truncate">
                    {branding.banners[selectedBannerIndex].title || 'Título da Promoção'}
                  </span>
                  <span className="text-[11px] opacity-80 block truncate mt-1">
                    {branding.banners[selectedBannerIndex].subtitle || 'Descrição breve'}
                  </span>
                </div>
              )}
            </div>

            {/* Input de Arquivo Oculto para Banner */}
            <input 
              ref={bannerInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleBannerFileChange}
              className="hidden"
            />

            <div className="flex-1 w-full space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerBannerUpload}
                  disabled={uploadingImage}
                  className="py-2 px-4 bg-[#F6E4E4] hover:bg-[#F6E4E4]/80 text-[#8E3B4E] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#EADFDC]"
                >
                  <span className="material-symbols-outlined text-[16px]">crop</span>
                  Fazer Upload e Recortar (16:9)
                </button>
                <span className="text-[11px] text-[#6F6168] self-center">
                  Proporção widescreen ideal para o carrossel do aplicativo.
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-[#6F6168] block mb-1">URL da Imagem de Fundo</label>
                <input 
                  type="url" 
                  value={branding.banners[selectedBannerIndex].url || ''}
                  onChange={e => handleUpdateActiveBanner('url', e.target.value)}
                  placeholder="https://exemplo.com/banner.jpg"
                  className="w-full border border-[#EADFDC] rounded-xl p-2.5 text-sm focus:outline-none focus:border-[#8E3B4E]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#6F6168] block mb-1">Título do Banner</label>
                  <input 
                    type="text" 
                    value={branding.banners[selectedBannerIndex].title || ''}
                    onChange={e => handleUpdateActiveBanner('title', e.target.value)}
                    placeholder="Ex: Primavera Rosé"
                    className="w-full border border-[#EADFDC] rounded-xl p-2.5 text-sm focus:outline-none focus:border-[#8E3B4E]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6F6168] block mb-1">Subtítulo / Oferta</label>
                  <input 
                    type="text" 
                    value={branding.banners[selectedBannerIndex].subtitle || ''}
                    onChange={e => handleUpdateActiveBanner('subtitle', e.target.value)}
                    placeholder="Ex: 20% off no combo"
                    className="w-full border border-[#EADFDC] rounded-xl p-2.5 text-sm focus:outline-none focus:border-[#8E3B4E]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Modal de Recorte Guiado de Imagens (Item A6) */}
      <ModalRecorteImagem 
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        file={cropModalFile}
        aspectRatio={cropTarget === 'logo' ? 1 : 16 / 9}
        isLogo={cropTarget === 'logo'}
        title={
          cropTarget === 'logo' 
            ? 'Recorte da Logo da Marca (1:1)' 
            : cropTarget === 'cover'
            ? 'Recorte da Foto de Capa / Fachada (16:9)'
            : 'Recorte do Banner Promocional (16:9)'
        }
        onCropComplete={handleCropComplete}
      />

      {/* Barra Fixa Inferior Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 w-full p-4 pb-safe bg-white/95 backdrop-blur-md border-t border-[#EADFDC] z-40">
        <button 
          onClick={handleSave}
          disabled={saving || (isCustomMode && !isCustomContrastOk)}
          className="w-full bg-[#8E3B4E] text-white py-3.5 rounded-full font-medium text-sm flex justify-center items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">{saving ? 'sync' : 'check'}</span> 
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
};

export default BrandingCustomizacao;
