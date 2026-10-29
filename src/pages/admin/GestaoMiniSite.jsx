import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  Globe, 
  ExternalLink, 
  Sparkles, 
  Save, 
  Image as ImageIcon, 
  MapPin, 
  Share2, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Eye, 
  Info,
  HelpCircle
} from 'lucide-react';

export const GestaoMiniSite = () => {
  const { tenant, tenantSlug } = useTenant();
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    minisite_enabled: true,
    headline: '',
    about_text: '',
    google_maps_url: '',
    meta_title: '',
    meta_description: '',
    meta_image_url: '',
    minisite_gallery: []
  });

  // Modal para adicionar nova foto à galeria
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');

  useEffect(() => {
    if (tenant) {
      loadMinisiteSettings();
    }
  }, [tenant]);

  const loadMinisiteSettings = async () => {
    setLoading(true);
    try {
      const res = await api.minisite.get(tenant.slug);
      const t = res.tenant;
      setFormData({
        minisite_enabled: t.minisite_enabled !== false,
        headline: t.headline || '',
        about_text: t.about_text || '',
        google_maps_url: t.google_maps_url || '',
        meta_title: t.meta_title || '',
        meta_description: t.meta_description || '',
        meta_image_url: t.meta_image_url || '',
        minisite_gallery: Array.isArray(t.minisite_gallery) ? t.minisite_gallery : []
      });
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar dados do mini-site.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await api.minisite.update(formData);
      showSuccess('Mini-site e configurações de SEO atualizadas com sucesso!');
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao salvar configurações do mini-site.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    setFormData(prev => ({
      ...prev,
      minisite_gallery: [
        ...prev.minisite_gallery,
        { url: newPhotoUrl.trim(), caption: newPhotoCaption.trim() || 'Espaço do Salão' }
      ]
    }));
    setNewPhotoUrl('');
    setNewPhotoCaption('');
    setShowAddPhotoModal(false);
  };

  const handleRemovePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      minisite_gallery: prev.minisite_gallery.filter((_, i) => i !== index)
    }));
  };

  const minisiteUrl = `${window.location.origin}/${tenant?.slug}/site`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(minisiteUrl);
    setCopiedLink(true);
    showSuccess('Link copiado para a área de transferência!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-10 h-10 border-3 border-brand/20 border-t-brand rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-secondary font-medium">Carregando configurações do mini-site...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      
      {/* 1. Header com Status e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-brand-tint text-brand flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-on-surface">Mini-site do Salão & SEO</h1>
          </div>
          <p className="text-xs text-secondary">
            Página pública institucional com galeria, depoimentos, mapa e links de compartilhamento social.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-line bg-white hover:bg-stone-50 text-xs font-semibold text-secondary hover:text-on-surface transition-all cursor-pointer shadow-2xs"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
          </button>

          <a
            href={minisiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand text-white hover:bg-brand-dark text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Visualizar Mini-site</span>
            <ExternalLink className="w-3 h-3 text-white/70" />
          </a>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* 2. Switch de Ativação do Mini-site */}
        <div className="bg-white border border-line rounded-3xl p-6 shadow-2xs flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-base font-bold text-on-surface">Status do Mini-site Público</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                formData.minisite_enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-600'
              }`}>
                {formData.minisite_enabled ? 'Ativo na Web' : 'Desativado'}
              </span>
            </div>
            <p className="text-xs text-secondary mt-1 max-w-xl">
              Quando ativado, sua página institucional fica disponível publicamente no endereço{' '}
              <strong className="text-on-surface">{`/${tenant?.slug}/site`}</strong> com indexação para Google e redes sociais.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={formData.minisite_enabled}
              onChange={(e) => setFormData({ ...formData, minisite_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
          </label>
        </div>

        {/* 3. Seção Institucional: Headline & História */}
        <div className="bg-white border border-line rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-line">
            <Sparkles className="w-4 h-4 text-brand" />
            <h2 className="font-serif text-lg font-bold text-on-surface">Apresentação & Filosofia do Espaço</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-semibold text-secondary tracking-wider mb-1.5">
                Headline / Slogan em Destaque *
              </label>
              <input
                type="text"
                required
                maxLength={300}
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                placeholder="Ex: Realçando sua beleza natural com sofisticação e cuidado."
                className="w-full px-4 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-on-surface focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <p className="text-[11px] text-secondary mt-1">
                Frase impactante exibida em letras grandes logo no topo do seu mini-site.
              </p>
            </div>

            <div>
              <label className="block text-xs uppercase font-semibold text-secondary tracking-wider mb-1.5">
                Sobre Nós / História do Espaço
              </label>
              <textarea
                rows={4}
                maxLength={2000}
                value={formData.about_text}
                onChange={(e) => setFormData({ ...formData, about_text: e.target.value })}
                placeholder="Conte a história do salão, seus diferenciais de atendimento, os produtos utilizados e a experiência acolhedora que suas clientes encontram..."
                className="w-full px-4 py-3 bg-stone-50/70 border border-line rounded-xl text-sm text-on-surface focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-y"
              />
              <p className="text-[11px] text-secondary mt-1">
                Apresente o seu espaço de forma acolhedora. Texto exibido na seção "Nossa Filosofia".
              </p>
            </div>

            <div>
              <label className="block text-xs uppercase font-semibold text-secondary tracking-wider mb-1.5">
                Link do Google Maps (Traçar Rota)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={formData.google_maps_url}
                  onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                  placeholder="https://maps.google.com/?q=..."
                  className="w-full px-4 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-on-surface focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <p className="text-[11px] text-secondary mt-1">
                Link direto da ficha do seu salão no Google Maps para que a cliente abra a rota com 1 clique.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Galeria de Fotos do Espaço */}
        <div className="bg-white border border-line rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand" />
              <h2 className="font-serif text-lg font-bold text-on-surface">Fotos da Estrutura do Salão</h2>
            </div>

            <button
              type="button"
              onClick={() => setShowAddPhotoModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-tint text-brand text-xs font-semibold hover:bg-brand hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Foto</span>
            </button>
          </div>

          <p className="text-xs text-secondary">
            Fotos da recepção, lavatórios, salas de procedimento e detalhes do seu espaço. Serão combinadas com os trabalhos do Lookbook.
          </p>

          {formData.minisite_gallery.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-line rounded-2xl p-6">
              <ImageIcon className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-on-surface">Nenhuma foto do espaço adicionada</p>
              <p className="text-[11px] text-secondary mt-0.5">Adicione fotos para encantar visitantes e futuras clientes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {formData.minisite_gallery.map((photo, idx) => (
                <div key={idx} className="relative rounded-2xl overflow-hidden border border-line group aspect-square bg-stone-100">
                  <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 text-white">
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="self-end p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-[11px] font-semibold truncate">{photo.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. SEO & Compartilhamento Social (WhatsApp, Facebook, Google) - F3 */}
        <div className="bg-white border border-line rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-line">
            <Share2 className="w-4 h-4 text-brand" />
            <h2 className="font-serif text-lg font-bold text-on-surface">Compartilhamento em Redes Sociais & SEO (F3)</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Campos de SEO */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs uppercase font-semibold text-secondary tracking-wider mb-1.5">
                  Título de Compartilhamento (og:title)
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  placeholder={`Ex: ${tenant?.name || 'Studio da Tha'} | Beleza & Estética`}
                  className="w-full px-4 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-on-surface focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
                <p className="text-[11px] text-secondary mt-1">
                  Título que aparece em negrito quando o link for enviado no WhatsApp ou compartilhado nas redes.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-secondary tracking-wider mb-1.5">
                  Descrição Curta (og:description)
                </label>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  placeholder="Ex: Agende online cortes, mechas, manicure e tratamentos estéticos exclusivos com profissionais especialistas."
                  className="w-full px-4 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-on-surface focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-y"
                />
                <p className="text-[11px] text-secondary mt-1">
                  Texto de prévia exibido abaixo do título no cartão de mensagem.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold text-secondary tracking-wider mb-1.5">
                  URL da Imagem de Capa (og:image)
                </label>
                <input
                  type="url"
                  value={formData.meta_image_url}
                  onChange={(e) => setFormData({ ...formData, meta_image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-stone-50/70 border border-line rounded-xl text-sm text-on-surface focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
                <p className="text-[11px] text-secondary mt-1">
                  Foto em alta resolução (1200x630px recomendada) que ilustra o preview no WhatsApp.
                </p>
              </div>
            </div>

            {/* Prévia Realista do Cartão no WhatsApp */}
            <div className="lg:col-span-5 bg-stone-100/70 border border-line rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-3">
                Pré-visualização no WhatsApp / Instagram
              </span>

              <div className="bg-[#EFEAE2] p-3 rounded-2xl max-w-sm mx-auto shadow-xs">
                <div className="bg-white rounded-xl overflow-hidden shadow-2xs border border-stone-200/80">
                  <div className="aspect-16/9 bg-stone-200 overflow-hidden relative">
                    <img 
                      src={formData.meta_image_url || tenant?.logo_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80'} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-3 bg-stone-50">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">
                      {window.location.host}
                    </span>
                    <h4 className="font-bold text-xs text-stone-900 mt-0.5 line-clamp-1">
                      {formData.meta_title || `${tenant?.name || 'Salão'} | Beleza, Estética & Bem-Estar`}
                    </h4>
                    <p className="text-[11px] text-stone-600 mt-1 line-clamp-2 leading-tight">
                      {formData.meta_description || formData.headline || 'Agende seu horário com nossos profissionais especialistas.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Barra de Ação Flutuante para Salvar */}
        <div className="sticky bottom-6 z-20 bg-white/95 backdrop-blur-md border border-line rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
          <p className="text-xs text-secondary hidden sm:block">
            As alterações são refletidas instantaneamente na página pública e nos caches do sistema.
          </p>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand hover:bg-brand-dark text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Salvando alterações...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Modal Adicionar Foto na Galeria */}
      {showAddPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-line rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-on-surface">Adicionar Foto à Galeria</h3>
            <p className="text-xs text-secondary">
              Insira a URL de uma foto em alta resolução do espaço físico do salão.
            </p>

            <div>
              <label className="block text-xs uppercase font-semibold text-secondary tracking-wider mb-1">
                URL da Imagem *
              </label>
              <input
                type="url"
                required
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2 bg-stone-50 border border-line rounded-xl text-xs text-on-surface focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-semibold text-secondary tracking-wider mb-1">
                Legenda / Ambiente
              </label>
              <input
                type="text"
                value={newPhotoCaption}
                onChange={(e) => setNewPhotoCaption(e.target.value)}
                placeholder="Ex: Sala de Massagem & Spa Facial"
                className="w-full px-3.5 py-2 bg-stone-50 border border-line rounded-xl text-xs text-on-surface focus:outline-none focus:border-brand"
              />
            </div>

            {newPhotoUrl && (
              <div className="rounded-xl overflow-hidden aspect-video border border-line bg-stone-100">
                <img src={newPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddPhotoModal(false)}
                className="px-4 py-2 rounded-full border border-line text-xs font-semibold text-secondary hover:text-on-surface cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddPhoto}
                disabled={!newPhotoUrl.trim()}
                className="px-5 py-2 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-dark disabled:opacity-50 cursor-pointer"
              >
                Inserir na Galeria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestaoMiniSite;
