import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  Camera, 
  Sparkles, 
  Plus, 
  Trash2, 
  Search, 
  Scissors, 
  User, 
  Upload, 
  Link as LinkIcon, 
  X, 
  ExternalLink,
  Layers,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { formatCurrency } from '../../utils/formatters';

const LookbookAdmin = () => {
  const { tenant } = useTenant();
  const { showSuccess, showError, confirm } = useNotification();

  const [lookbooks, setLookbooks] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState('all');

  // Estado do Modal
  const [showModal, setShowModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    image_url: '',
    title: '',
    description: '',
    service_id: '',
    staff_id: ''
  });

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
    }
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lookData, servData, staffData] = await Promise.all([
        api.lookbook.list(tenant.id),
        api.services.list(tenant.id),
        api.staff.list(tenant.id)
      ]);
      setLookbooks(lookData || []);
      setServices(servData || []);
      setStaff(staffData || []);
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar dados do lookbook.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    const itemLabel = title ? `"${title}"` : 'esta inspiração';
    if (await confirm(`Tem certeza que deseja remover ${itemLabel} do Lookbook?`)) {
      try {
        await api.lookbook.delete(id);
        showSuccess('Inspiração removida com sucesso!');
        fetchData();
      } catch (err) {
        showError('Erro ao remover inspiração.');
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('O arquivo é muito grande. O limite máximo é de 5MB.');
      return;
    }

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);
  };

  const handleOpenModal = () => {
    setFormData({ image_url: '', title: '', description: '', service_id: '', staff_id: '' });
    setSelectedFile(null);
    setFilePreview(null);
    setUploadMode('file');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (filePreview && filePreview.startsWith('blob:')) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleSave = async () => {
    let finalImageUrl = formData.image_url.trim();

    if (uploadMode === 'file') {
      if (!selectedFile) {
        showError('Por favor, selecione um arquivo de foto para enviar.');
        return;
      }
      setIsSubmitting(true);
      try {
        const uploadResult = await api.upload.image(selectedFile);
        finalImageUrl = uploadResult.url;
      } catch (err) {
        setIsSubmitting(false);
        showError(err.message || 'Falha ao enviar imagem. Verifique o tamanho do arquivo.');
        return;
      }
    } else {
      if (!finalImageUrl) {
        showError('Por favor, informe a URL da imagem.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await api.lookbook.create({
        tenant_id: tenant.id,
        image_url: finalImageUrl,
        title: formData.title.trim() || null,
        description: formData.description.trim() || null,
        service_id: formData.service_id || null,
        staff_id: formData.staff_id || null
      });

      showSuccess('Inspiração adicionada ao Lookbook!');
      handleCloseModal();
      fetchData();
    } catch (err) {
      showError(err.message || 'Erro ao salvar inspiração no lookbook.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtragem e busca
  const filteredLookbooks = useMemo(() => {
    return lookbooks.filter(item => {
      const matchSearch = searchTerm === '' ||
        (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.service_name && item.service_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.staff_name && item.staff_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchService = selectedServiceFilter === 'all' || item.service_id === selectedServiceFilter;

      return matchSearch && matchService;
    });
  }, [lookbooks, searchTerm, selectedServiceFilter]);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
      
      {/* 1. Cabeçalho Editorial */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-champagne-200/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-800 border border-brand-100">
              <Camera className="w-3.5 h-3.5 text-brand" />
              Galeria de Tendências
            </span>
            <span className="text-xs text-charcoal-light font-medium">
              {lookbooks.length} {lookbooks.length === 1 ? 'inspiração publicada' : 'inspirações publicadas'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal tracking-tight">
            Lookbook & Galeria de Estilo
          </h1>
          <p className="text-sm text-charcoal-light max-w-2xl mt-1 leading-relaxed">
            Exiba os resultados mais encantadores do salão. As fotos vinculadas a serviços ativam o botão <strong className="text-charcoal">"Quero Fazer Igual"</strong>, permitindo que a cliente agende exatamente aquele procedimento com 1 clique.
          </p>
        </div>

        <button 
          onClick={handleOpenModal} 
          className="inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all active:scale-95 text-sm whitespace-nowrap self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nova Inspiração
        </button>
      </div>

      {/* 2. Barra de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-light" />
          <input
            type="text"
            placeholder="Buscar por título, técnica, serviço ou profissional..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-champagne-200 rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all text-charcoal placeholder:text-charcoal-light/60"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-light hover:text-charcoal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-charcoal-light hidden sm:block" />
          <select
            value={selectedServiceFilter}
            onChange={(e) => setSelectedServiceFilter(e.target.value)}
            className="text-sm bg-white border border-champagne-200 text-charcoal px-3 py-2 rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all font-medium"
          >
            <option value="all">Todos os Serviços</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Conteúdo Principal */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-champagne-100 shadow-xs animate-pulse">
              <div className="aspect-[4/5] bg-champagne-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-champagne-100 rounded-md w-3/4" />
                <div className="h-3 bg-champagne-50 rounded-md w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredLookbooks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-champagne-200 p-8 text-center my-6 shadow-xs">
          <EstadoVazio 
            icon={Camera}
            titulo={searchTerm || selectedServiceFilter !== 'all' ? "Nenhuma inspiração encontrada" : "Seu Lookbook está vazio"}
            descricao={
              searchTerm || selectedServiceFilter !== 'all'
                ? "Nenhuma foto corresponde aos filtros aplicados. Tente limpar os termos de busca."
                : "Cadastre fotos dos melhores cortes, mechas, penteados e procedimentos realizados pela sua equipe para inspirar clientes e atrair agendamentos diretos."
            }
            textoAcao="Adicionar Inspiração"
            aoClicarAcao={handleOpenModal}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredLookbooks.map(item => (
            <div 
              key={item.id} 
              className="bg-white rounded-2xl overflow-hidden border border-champagne-200/70 shadow-xs hover:shadow-md transition-all duration-300 group flex flex-col hover:border-brand/40"
            >
              {/* Imagem com Proporção 4:5 e Badge de Serviço */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-champagne-50">
                <img 
                  src={item.image_url} 
                  alt={item.title || 'Lookbook'} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  loading="lazy"
                />

                {/* Badge translúcido do serviço */}
                {item.service_name && (
                  <div className="absolute top-3 left-3 max-w-[85%]">
                    <span className="inline-flex items-center gap-1.5 backdrop-blur-md bg-white/90 text-brand-900 border border-brand-100 text-xs px-2.5 py-1 rounded-full font-semibold shadow-xs truncate">
                      <Sparkles className="w-3 h-3 text-brand shrink-0" />
                      <span className="truncate">{item.service_name}</span>
                    </span>
                  </div>
                )}

                {/* Botão de Excluir */}
                <button 
                  onClick={() => handleDelete(item.id, item.title)}
                  title="Remover inspiração"
                  className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-charcoal hover:text-red-600 hover:bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Informações da Inspiração */}
              <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                <div>
                  <h3 className="font-serif font-bold text-charcoal text-base line-clamp-1 mb-1">
                    {item.title || 'Inspiração de Estilo'}
                  </h3>
                  {item.description ? (
                    <p className="text-xs text-charcoal-light line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  ) : (
                    <p className="text-xs text-charcoal-light/60 italic">Sem descrição detalhada.</p>
                  )}
                </div>

                {/* Rodapé do Card: Profissional & Preço */}
                <div className="pt-2 border-t border-champagne-100 flex items-center justify-between text-xs text-charcoal-light">
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-brand shrink-0" />
                    <span className="truncate font-medium">{item.staff_name || 'Equipe do Salão'}</span>
                  </div>
                  {item.service_price && (
                    <span className="font-bold text-brand shrink-0">
                      {formatCurrency(item.service_price)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Modal de Nova Inspiração (Rosé Editorial) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh] border border-champagne-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-champagne-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-charcoal">Nova Inspiração</h3>
                  <p className="text-xs text-charcoal-light">Adicione uma foto de resultado à vitrine do seu salão</p>
                </div>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-charcoal-light hover:text-charcoal p-1.5 rounded-lg hover:bg-champagne-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alternância de Modo: Arquivo ou URL */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-charcoal uppercase tracking-wider mb-2">
                Origem da Foto
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-champagne-50 rounded-xl border border-champagne-200">
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                    uploadMode === 'file' 
                      ? 'bg-white text-brand shadow-xs border border-champagne-200' 
                      : 'text-charcoal-light hover:text-charcoal'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Enviar do Celular / PC
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('url')}
                  className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                    uploadMode === 'url' 
                      ? 'bg-white text-brand shadow-xs border border-champagne-200' 
                      : 'text-charcoal-light hover:text-charcoal'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Link de Imagem (URL)
                </button>
              </div>
            </div>

            {/* Campos do Formulário */}
            <div className="space-y-4">
              
              {/* Opção 1: Upload de Arquivo */}
              {uploadMode === 'file' ? (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {filePreview ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-champagne-200 bg-champagne-50 group">
                      <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white text-xs font-semibold rounded-lg shadow-sm hover:bg-champagne-50 text-charcoal"
                        >
                          Trocar Foto
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setFilePreview(null); }}
                          className="p-1.5 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-champagne-300 hover:border-brand rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-brand-50/20 group"
                    >
                      <div className="w-12 h-12 rounded-full bg-champagne-100 group-hover:bg-brand-100 text-brand flex items-center justify-center mx-auto mb-2 transition-colors">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-charcoal">Clique para escolher uma foto</p>
                      <p className="text-xs text-charcoal-light mt-1">Formatos JPG, PNG ou WebP até 5MB</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Opção 2: URL Externa */
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">URL da Imagem *</label>
                  <input 
                    type="url" 
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-champagne-200 rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all text-charcoal placeholder:text-charcoal-light/60"
                    placeholder="https://exemplo.com/resultado-cabelo.jpg"
                  />
                  {formData.image_url && (
                    <div className="mt-2.5 aspect-video w-full rounded-xl bg-champagne-50 border border-champagne-200 overflow-hidden">
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { e.target.style.display = 'none'; }} 
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Título da Inspiração */}
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Título da Técnica / Visual</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-champagne-200 rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all text-charcoal placeholder:text-charcoal-light/60"
                  placeholder="Ex: Mechas Morena Iluminada"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Descrição do Procedimento (Opcional)</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-champagne-200 rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all text-charcoal placeholder:text-charcoal-light/60 min-h-[70px] resize-none"
                  placeholder="Ex: Técnica de esfumado na raiz com tonalização caramelo e hidratação profunda."
                />
              </div>

              {/* Serviço Vinculado (Ativa o "Quero Fazer Igual") */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-charcoal">Serviço Vinculado</label>
                  <span className="text-[11px] font-semibold text-brand flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> "Quero Fazer Igual"
                  </span>
                </div>
                <select 
                  value={formData.service_id}
                  onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-champagne-200 rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all text-charcoal"
                >
                  <option value="">Nenhum (Apenas foto na galeria)</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {formatCurrency(s.price)}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-charcoal-light mt-1">
                  Vinculando um serviço, a cliente poderá agendar este procedimento imediatamente pelo aplicativo.
                </p>
              </div>

              {/* Profissional Responsável */}
              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1">Profissional Responsável (Opcional)</label>
                <select 
                  value={formData.staff_id}
                  onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-champagne-200 rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all text-charcoal"
                >
                  <option value="">Equipe do Salão (Geral)</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-champagne-100 flex items-center justify-end gap-3">
              <button 
                type="button"
                onClick={handleCloseModal} 
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold text-charcoal hover:bg-champagne-50 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleSave} 
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-brand hover:bg-brand-dark text-white rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Publicar Inspiração
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default LookbookAdmin;
