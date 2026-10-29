import React, { useState, useEffect } from 'react';
import { 
  Star, 
  MessageSquare, 
  Eye, 
  EyeOff, 
  CornerDownRight, 
  Send, 
  ExternalLink, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  Sparkles,
  Search,
  Filter
} from 'lucide-react';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { useTenant } from '../../context/TenantContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const GestaoAvaliacoes = () => {
  const { tenant } = useTenant();
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    average: 0,
    total_reviews: 0,
    satisfaction_rate: 100,
    google_review_url: '',
    star_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    staff: []
  });

  const [reviews, setReviews] = useState([]);
  const [filterRating, setFilterRating] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [googleUrlInput, setGoogleUrlInput] = useState('');
  const [isSavingUrl, setIsSavingUrl] = useState(false);

  // Estado para resposta inline
  const [replyingReviewId, setReplyingReviewId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, reviewsData] = await Promise.all([
        api.reviews.getStats(),
        api.reviews.list({ limit: 100 })
      ]);

      setStats(statsData || {});
      setGoogleUrlInput(statsData?.google_review_url || '');
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar dados de avaliações.');
    } finally {
      setLoading(false);
    }
  };

  // Salvar Link do Google Reviews
  const handleSaveGoogleUrl = async (e) => {
    e.preventDefault();
    setIsSavingUrl(true);
    try {
      await api.reviews.updateGoogleUrl(googleUrlInput.trim());
      showSuccess('Link do Google Reviews atualizado com sucesso!');
      setStats(prev => ({ ...prev, google_review_url: googleUrlInput.trim() }));
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao salvar link do Google.');
    } finally {
      setIsSavingUrl(false);
    }
  };

  // Alternar Visibilidade Pública (Moderação)
  const handleToggleVisibility = async (reviewId, currentVisibility) => {
    try {
      const updated = await api.reviews.toggleVisibility(reviewId, !currentVisibility);
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, is_public: updated.is_public } : r));
      showSuccess(updated.is_public ? 'Avaliação agora está visível no site!' : 'Avaliação ocultada da vitrine pública.');
    } catch (err) {
      console.error(err);
      showError('Erro ao alterar visibilidade da avaliação.');
    }
  };

  // Responder Avaliação
  const handleSendReply = async (reviewId) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      const updated = await api.reviews.reply(reviewId, replyText.trim());
      setReviews(prev => prev.map(r => r.id === reviewId ? { 
        ...r, 
        staff_reply: updated.staff_reply,
        replied_at: updated.replied_at
      } : r));
      showSuccess('Resposta enviada com sucesso!');
      setReplyingReviewId(null);
      setReplyText('');
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao enviar resposta.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Filtragem local das avaliações
  const filteredReviews = reviews.filter(r => {
    const matchesRating = filterRating === 'all' || r.rating === Number(filterRating);
    const matchesSearch = !searchQuery.trim() || 
      r.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.professional_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.comment?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRating && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1360px] mx-auto w-full flex flex-col gap-8 animate-fade-in text-ink">
      
      {/* 1. Cabeçalho Editorial Rosé */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">
            Reputação & Satisfação do Cliente (D16)
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-ink mt-1">
            Avaliações & Google Reviews
          </h1>
          <p className="text-sm text-ink-soft mt-1 max-w-2xl">
            Acompanhe o nível de excelência dos atendimentos, a média de cada profissional e impulsione sua autoridade no Google Meu Negócio.
          </p>
        </div>

        {stats.google_review_url && (
          <a
            href={stats.google_review_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-line text-xs font-semibold text-ink hover:text-brand hover:border-brand/40 transition-all shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <span>Ver página no Google</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* 2. KPIs Executivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Média Geral */}
        <div className="bg-white border border-line rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Nota Média Geral
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-serif font-bold text-ink">
              {stats.average > 0 ? stats.average.toFixed(1) : '5.0'}
            </span>
            <div className="flex items-center gap-0.5 text-amber-400">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${
                    s <= Math.round(stats.average || 5)
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-transparent text-stone-200'
                  }`}
                />
              ))}
            </div>
          </div>
          <span className="text-[11px] text-ink-soft mt-1">
            Baseado em {stats.total_reviews} atendimento(s) avaliado(s)
          </span>
        </div>

        {/* KPI 2: Taxa de Satisfação */}
        <div className="bg-white border border-line rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Taxa de Satisfação
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-serif font-bold text-emerald-600">
              {stats.satisfaction_rate}%
            </span>
          </div>
          <span className="text-[11px] text-ink-soft mt-1">
            Avaliações 4 e 5 estrelas registradas
          </span>
        </div>

        {/* KPI 3: Total de Avaliações */}
        <div className="bg-white border border-line rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Total de Feedbacks
            </span>
            <div className="w-8 h-8 rounded-xl bg-brand-tint text-brand flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-serif font-bold text-ink">
              {stats.total_reviews}
            </span>
          </div>
          <span className="text-[11px] text-ink-soft mt-1">
            1 feedback único por atendimento
          </span>
        </div>

        {/* KPI 4: Google Reviews Integrado */}
        <div className="bg-white border border-line rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Convite Google
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              stats.google_review_url ? 'bg-blue-50 text-blue-600' : 'bg-stone-100 text-stone-400'
            }`}>
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              stats.google_review_url 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-stone-100 text-stone-600 border-stone-200'
            }`}>
              {stats.google_review_url ? 'Ativo e Redirecionando' : 'Pendente de Configuração'}
            </span>
          </div>
          <span className="text-[11px] text-ink-soft mt-1">
            Clientes 4★ e 5★ convidados automaticamente
          </span>
        </div>
      </div>

      {/* 3. Card de Configuração do Link Google Meu Negócio */}
      <div className="bg-white border border-line rounded-3xl p-6 sm:p-7 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ExternalLink className="w-5 h-5" />
            </span>
            <h2 className="font-serif text-xl font-bold text-ink">
              Impulsionador de Avaliações no Google Meu Negócio
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-ink-soft mt-2 leading-relaxed max-w-3xl">
            Insira o link oficial de avaliação da sua ficha no Google (ex: <code>https://g.page/r/sua-empresa/review</code>). Toda vez que uma cliente der <strong>4 ou 5 estrelas</strong> no OperaBeauty, ela será carinhosamente convidada a publicar no Google, multiplicando suas notas públicas sem risco de notas baixas externas.
          </p>
        </div>

        <form onSubmit={handleSaveGoogleUrl} className="flex flex-col sm:flex-row items-stretch gap-2.5 w-full lg:w-auto shrink-0">
          <input
            type="url"
            value={googleUrlInput}
            onChange={(e) => setGoogleUrlInput(e.target.value)}
            placeholder="https://g.page/r/.../review"
            className="px-4 py-2.5 rounded-full bg-bg border border-line text-sm text-ink focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand w-full sm:w-80"
          />
          <button
            type="submit"
            disabled={isSavingUrl}
            className="px-6 py-2.5 rounded-full bg-brand hover:bg-brand-dark text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSavingUrl ? 'Salvando...' : 'Salvar Link'}
          </button>
        </form>
      </div>

      {/* 4. Grid de Conteúdo: Ranking da Equipe (4 cols) & Feed de Avaliações (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA ESQUERDA: Ranking por Profissional (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white border border-line rounded-3xl p-6 shadow-2xs flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-line/60 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-brand" />
                <h3 className="font-serif text-lg font-bold text-ink">
                  Média por Profissional
                </h3>
              </div>
              <span className="text-[11px] text-ink-soft">
                {stats.staff?.length || 0} membro(s)
              </span>
            </div>

            {(!stats.staff || stats.staff.length === 0) ? (
              <p className="text-xs text-ink-soft py-4 text-center">
                Nenhum profissional com avaliações no momento.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {stats.staff.map((prof, idx) => (
                  <div key={prof.id} className="flex items-center justify-between p-3 rounded-2xl bg-bg border border-line/60 hover:border-brand/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-brand-tint border border-brand/20 text-brand font-bold text-sm flex items-center justify-center shrink-0">
                        {prof.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-xs sm:text-sm text-ink truncate">
                          {prof.name}
                        </span>
                        <span className="text-[10px] text-ink-soft">
                          {prof.total_reviews} feedback(s) · {prof.satisfaction_rate}% satisfação
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-sm text-ink tabular-nums">
                        {prof.average.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: Feed de Avaliações com Moderação e Resposta (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          
          {/* Barra de Filtros e Busca */}
          <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Seletor de Estrelas */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {[
                { label: 'Todas', value: 'all' },
                { label: '5 ★', value: '5' },
                { label: '4 ★', value: '4' },
                { label: '3 ★', value: '3' },
                { label: '2 ★', value: '2' },
                { label: '1 ★', value: '1' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilterRating(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    filterRating === opt.value
                      ? 'bg-brand text-white shadow-xs'
                      : 'bg-bg text-ink-soft hover:text-ink hover:bg-surface-variant'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Campo de Busca */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente ou equipe..."
                className="w-full pl-9 pr-4 py-1.5 rounded-full bg-bg border border-line text-xs text-ink focus:outline-hidden focus:border-brand"
              />
            </div>
          </div>

          {/* Lista de Avaliações */}
          {loading ? (
            <div className="p-12 text-center text-ink-soft text-sm">Carregando avaliações...</div>
          ) : filteredReviews.length === 0 ? (
            <div className="bg-white border border-line rounded-3xl p-12 text-center flex flex-col items-center shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mb-3">
                <Star className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-lg font-bold text-ink">Nenhuma avaliação encontrada</h4>
              <p className="text-xs text-ink-soft mt-1 max-w-sm">
                Nenhum feedback corresponde aos filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredReviews.map((rev) => (
                <div key={rev.id} className="bg-white border border-line rounded-3xl p-5 sm:p-6 shadow-2xs flex flex-col gap-4 hover:border-brand/30 transition-all">
                  
                  {/* Topo do Card: Cliente + Data + Estrelas + Moderação */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-tint border border-brand/20 text-brand font-bold text-sm flex items-center justify-center shrink-0">
                        {rev.client_name ? rev.client_name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-ink">
                          {rev.client_name || 'Cliente'}
                        </span>
                        <span className="text-[11px] text-ink-soft">
                          {rev.service_name || 'Procedimento'} com <strong>{rev.professional_name || 'Profissional'}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {/* Estrelas */}
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= rev.rating 
                                ? 'fill-amber-400 text-amber-400' 
                                : 'fill-transparent text-stone-200'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Botão de Moderação de Visibilidade Pública */}
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(rev.id, rev.is_public)}
                        title={rev.is_public ? "Visível no site público. Clique para ocultar." : "Oculto do site público. Clique para exibir."}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                          rev.is_public
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                        }`}
                      >
                        {rev.is_public ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{rev.is_public ? 'Público' : 'Oculto'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Comentário da Cliente */}
                  {rev.comment && (
                    <div className="bg-bg/60 border border-line/60 rounded-2xl p-3.5 text-xs sm:text-sm text-ink leading-relaxed">
                      "{rev.comment}"
                    </div>
                  )}

                  {/* Resposta do Salão / Equipe */}
                  {rev.staff_reply ? (
                    <div className="pl-4 sm:pl-6 border-l-2 border-brand/40 flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1.5 text-brand font-semibold">
                        <CornerDownRight className="w-3.5 h-3.5" />
                        <span>Resposta do Salão:</span>
                        {rev.replied_at && (
                          <span className="text-[10px] text-ink-soft font-normal">
                            ({format(new Date(rev.replied_at), "dd 'de' MMM, HH:mm", { locale: ptBR })})
                          </span>
                        )}
                      </div>
                      <p className="text-ink-soft leading-relaxed italic">
                        "{rev.staff_reply}"
                      </p>
                    </div>
                  ) : (
                    <div>
                      {replyingReviewId === rev.id ? (
                        <div className="flex flex-col gap-2 pt-2 border-t border-line/40 animate-fade-in">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Escreva sua resposta de agradecimento ou esclarecimento..."
                            rows={2}
                            maxLength={600}
                            className="w-full p-3 rounded-xl bg-bg border border-line text-xs text-ink focus:outline-hidden focus:border-brand resize-none"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingReviewId(null);
                                setReplyText('');
                              }}
                              className="px-3 py-1.5 rounded-full border border-line text-ink-soft hover:text-ink text-xs font-medium cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendReply(rev.id)}
                              disabled={isSubmittingReply || !replyText.trim()}
                              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-brand text-white hover:bg-brand-dark text-xs font-semibold cursor-pointer disabled:opacity-50"
                            >
                              <Send className="w-3 h-3" />
                              <span>{isSubmittingReply ? 'Enviando...' : 'Publicar Resposta'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-1 border-t border-line/40 text-[11px] text-ink-soft">
                          <span>
                            {rev.created_at ? format(new Date(rev.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingReviewId(rev.id);
                              setReplyText('');
                            }}
                            className="inline-flex items-center gap-1 text-brand hover:underline font-semibold cursor-pointer"
                          >
                            <CornerDownRight className="w-3 h-3" />
                            <span>Responder à cliente</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default GestaoAvaliacoes;
