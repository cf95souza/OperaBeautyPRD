import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';
import { TelaCliente } from '../components/ui/TelaCliente';
import { AssinaturaDigitalCanvas } from '../components/ui/AssinaturaDigitalCanvas';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';

const ClienteAnamnese = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { showSuccess, showError, showWarning } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState({
    fields_schema: [],
    terms_text: '',
    terms_version: 1,
    require_terms: true,
    require_signature: false
  });
  const [answers, setAnswers] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
    }
  }, [tenant]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const session = JSON.parse(localStorage.getItem('operabeauty_user') || '{}');

      // 1. Busca o template da ficha e termos
      const tmplData = await api.anamnesis.getTemplate(tenant.id);
      setTemplate({
        fields_schema: tmplData.fields_schema || [],
        terms_text:
          tmplData.terms_text ||
          'Declaro para os devidos fins que as informações acima prestadas são verdadeiras e completas. Autorizo a realização dos procedimentos estéticos e capilares indicados e estou ciente das orientações e cuidados pós-atendimento.',
        terms_version: tmplData.terms_version || 1,
        require_terms: tmplData.require_terms !== undefined ? tmplData.require_terms : true,
        require_signature: tmplData.require_signature !== undefined ? tmplData.require_signature : false
      });

      // 2. Busca as respostas salvas do cliente logado
      if (session?.id) {
        try {
          const ansData = await api.anamnesis.getClientAnamnesis(session.id);
          if (ansData) {
            setAnswers(ansData.answers || {});
            setTermsAccepted(Boolean(ansData.terms_accepted));
            setSignatureData(ansData.signature_data || null);
            setLastUpdate(ansData.updated_at);
          }
        } catch (err) {
          // Cliente ainda não preencheu, segue limpo
        }
      }
    } catch (err) {
      console.error('Erro ao carregar Ficha de Anamnese:', err);
      showError('Erro ao carregar Ficha de Anamnese.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldId, value) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId, option, checked) => {
    setAnswers(prev => {
      const current = Array.isArray(prev[fieldId]) ? prev[fieldId] : [];
      if (checked) {
        return { ...prev, [fieldId]: [...current, option] };
      } else {
        return { ...prev, [fieldId]: current.filter(o => o !== option) };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação de campos obrigatórios
    for (const field of template.fields_schema) {
      if (field.required) {
        const val = answers[field.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          showWarning(`Por favor, responda o campo obrigatório: "${field.label}"`);
          return;
        }
      }
    }

    // Validação do termo de consentimento
    if (template.require_terms && !termsAccepted) {
      showWarning('Você precisa aceitar os termos de consentimento para prosseguir.');
      return;
    }

    // Validação da assinatura se exigida
    if (template.require_signature && !signatureData) {
      showWarning('Por favor, assine no quadro eletrônico antes de confirmar.');
      return;
    }

    try {
      setSaving(true);
      const data = await api.anamnesis.submit({
        answers,
        terms_accepted: termsAccepted,
        terms_version: template.terms_version,
        signature_data: signatureData
      });

      setLastUpdate(data.updated_at);
      showSuccess('Ficha e consentimento gravados com sucesso! Válido por 4 meses.');
      setTimeout(() => navigate(`/${tenant_slug}/perfil`), 1800);
    } catch (err) {
      console.error(err);
      showError('Erro ao salvar formulário de anamnese.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 gap-3">
        <div className="w-10 h-10 border-3 border-brand/20 border-t-brand rounded-full animate-spin" />
        <p className="text-xs text-secondary font-medium tracking-wide">Carregando ficha de saúde...</p>
      </div>
    );
  }

  return (
    <TelaCliente temNavegacaoInferior={false} larguraMaxima="max-w-2xl">
      {/* Top Bar Rosé */}
      <div className="sticky top-0 z-20 bg-stone-50/90 backdrop-blur-md border-b border-line px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-stone-200/60 text-on-surface transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="font-serif text-base font-bold text-on-surface">Ficha de Anamnese</h1>
            <p className="text-[11px] text-secondary">Saúde, cuidados e consentimento</p>
          </div>
          <div className="w-8" />
        </div>
      </div>

      <div className="py-6 px-4 sm:px-6 space-y-6">
        {/* Banner Informativo LGPD / Status */}
        {lastUpdate ? (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-2xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-emerald-900">Ficha preenchida e válida</p>
              <p className="text-emerald-700 mt-0.5">
                Última atualização em {new Date(lastUpdate).toLocaleDateString('pt-BR')} às{' '}
                {new Date(lastUpdate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-brand/5 border border-brand/20 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-brand">Privacidade e Proteção de Dados (LGPD)</p>
              <p className="text-secondary mt-0.5 leading-relaxed">
                Suas informações de saúde são confidenciais, protegidas por criptografia militar e acessadas exclusivamente pelos profissionais responsáveis pelo seu atendimento.
              </p>
            </div>
          </div>
        )}

        {template.fields_schema.length === 0 ? (
          <div className="bg-white border border-line rounded-[22px] p-8 text-center text-secondary shadow-2xs">
            <Sparkles className="w-10 h-10 text-secondary/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-on-surface">Nenhuma pergunta configurada</p>
            <p className="text-xs text-secondary mt-1">Este espaço ainda não adicionou perguntas personalizadas de anamnese.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Lista de Perguntas Dinâmicas */}
            <div className="space-y-4">
              {template.fields_schema.map((field) => (
                <div
                  key={field.id}
                  className="bg-white border border-line rounded-[22px] p-5 shadow-2xs space-y-2.5 transition-all focus-within:border-brand/70"
                >
                  <label className="block text-xs sm:text-sm font-semibold text-on-surface leading-tight">
                    {field.label}{' '}
                    {field.required && <span className="text-brand font-bold">*</span>}
                  </label>

                  {/* Input Texto Curto */}
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={answers[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      placeholder="Sua resposta..."
                      className="w-full bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand focus:bg-white transition-all"
                    />
                  )}

                  {/* Input Texto Longo */}
                  {field.type === 'textarea' && (
                    <textarea
                      rows={3}
                      value={answers[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      placeholder="Descreva com detalhes..."
                      className="w-full bg-stone-50 border border-line rounded-xl p-3 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand focus:bg-white transition-all resize-none"
                    />
                  )}

                  {/* Opções Radio (Seleção Única) */}
                  {field.type === 'radio' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {field.options?.map((opt, optIdx) => (
                        <label
                          key={optIdx}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition-all ${
                            answers[field.id] === opt
                              ? 'border-brand bg-brand/5 text-brand shadow-2xs font-semibold'
                              : 'border-line bg-stone-50/60 text-secondary hover:bg-stone-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={field.id}
                            value={opt}
                            checked={answers[field.id] === opt}
                            onChange={() => handleInputChange(field.id, opt)}
                            className="w-4 h-4 text-brand focus:ring-brand accent-brand cursor-pointer"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Dropdown Select */}
                  {field.type === 'select' && (
                    <select
                      value={answers[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className="w-full bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand focus:bg-white transition-all"
                    >
                      <option value="">Selecione uma opção...</option>
                      {field.options?.map((opt, optIdx) => (
                        <option key={optIdx} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Multi-Seleção Checkbox */}
                  {field.type === 'checkbox' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {field.options?.map((opt, optIdx) => {
                        const isChecked = Array.isArray(answers[field.id]) && answers[field.id].includes(opt);
                        return (
                          <label
                            key={optIdx}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition-all ${
                              isChecked
                                ? 'border-brand bg-brand/5 text-brand shadow-2xs font-semibold'
                                : 'border-line bg-stone-50/60 text-secondary hover:bg-stone-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleCheckboxChange(field.id, opt, e.target.checked)}
                              className="w-4 h-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bloco do Termo de Consentimento & Assinatura Digital */}
            {template.require_terms && (
              <div className="bg-white border border-line rounded-[22px] p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-brand" />
                    <h2 className="font-serif text-sm sm:text-base font-bold text-on-surface">
                      Termo de Consentimento Digital
                    </h2>
                  </div>
                  <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    Versão {template.terms_version}
                  </span>
                </div>

                {/* Caixa de Texto do Termo com Scroll */}
                <div className="bg-stone-50 border border-line/80 rounded-2xl p-4 max-h-48 overflow-y-auto text-xs text-secondary leading-relaxed space-y-2">
                  <p>{template.terms_text}</p>
                </div>

                {/* Checkbox de Aceite Formal */}
                <label className="flex items-start gap-3 p-3 bg-brand/5 border border-brand/20 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded text-brand focus:ring-brand accent-brand shrink-0 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-on-surface block">
                      Declaro que li, compreendi e concordo integralmente com o termo acima.
                    </span>
                    <span className="text-secondary text-[11px]">
                      Seu aceite digital será gravado com assinatura criptográfica vinculada ao seu usuário.
                    </span>
                  </div>
                </label>

                {/* Assinatura Manuscrita Digital (se configurada) */}
                {template.require_signature && (
                  <div className="space-y-2 pt-2 border-t border-line/60">
                    <label className="block text-xs font-semibold text-on-surface">
                      Assinatura Digital Manuscrita <span className="text-brand">*</span>
                    </label>
                    <AssinaturaDigitalCanvas
                      value={signatureData}
                      onChange={setSignatureData}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Botão de Envio */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 px-6 rounded-full bg-brand text-white text-xs sm:text-sm font-semibold hover:bg-brand-hover active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Gravando dados confidenciais...' : 'Salvar e Confirmar Ficha de Saúde'}
              </button>
            </div>
          </form>
        )}
      </div>
    </TelaCliente>
  );
};

export default ClienteAnamnese;
