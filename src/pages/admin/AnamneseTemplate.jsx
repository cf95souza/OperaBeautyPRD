import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import {
  FileText,
  ShieldCheck,
  Plus,
  Trash2,
  Save,
  PenTool,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  HelpCircle
} from 'lucide-react';

const AnamneseTemplate = () => {
  const { tenant_slug } = useParams();
  const { tenant } = useTenant();
  const { showSuccess, showError } = useNotification();

  const [activeTab, setActiveTab] = useState('questions'); // 'questions' | 'terms'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState([]);
  const [termsText, setTermsText] = useState('');
  const [termsVersion, setTermsVersion] = useState(1);
  const [requireTerms, setRequireTerms] = useState(true);
  const [requireSignature, setRequireSignature] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (tenant?.id) {
      fetchTemplate();
    }
  }, [tenant]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const data = await api.anamnesis.getTemplate(tenant.id);
      setFields(data.fields_schema || []);
      setTermsText(
        data.terms_text ||
          'Declaro para os devidos fins que as informações acima prestadas são verdadeiras e completas. Autorizo a realização dos procedimentos estéticos e capilares indicados e estou ciente das orientações e cuidados pós-atendimento.'
      );
      setTermsVersion(data.terms_version || 1);
      setRequireTerms(data.require_terms !== undefined ? data.require_terms : true);
      setRequireSignature(data.require_signature !== undefined ? data.require_signature : false);
      setLastUpdated(data.updated_at);
    } catch (err) {
      console.error(err);
      showError('Não foi possível carregar a Ficha de Anamnese.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.anamnesis.updateTemplate({
        fields_schema: fields,
        terms_text: termsText,
        terms_version: termsVersion,
        require_terms: requireTerms,
        require_signature: requireSignature
      });
      setLastUpdated(res.updated_at || new Date().toISOString());
      showSuccess('Ficha de Anamnese e Termo atualizados com sucesso!');
    } catch (err) {
      console.error(err);
      showError('Erro ao salvar as alterações da ficha.');
    } finally {
      setSaving(false);
    }
  };

  const handleIncrementVersion = () => {
    if (window.confirm('Ao incrementar a versão do termo, todas as clientes deverão ler e aceitar o novo termo no próximo agendamento. Deseja continuar?')) {
      setTermsVersion(prev => prev + 1);
    }
  };

  const addField = () => {
    setFields([
      ...fields,
      {
        id: `field_${Date.now()}`,
        label: 'Nova Pergunta de Saúde ou Procedimento',
        type: 'text',
        required: false,
        options: []
      }
    ]);
  };

  const updateField = (index, updates) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
  };

  const removeField = (index) => {
    const updated = [...fields];
    updated.splice(index, 1);
    setFields(updated);
  };

  const addOption = (index) => {
    const updated = [...fields];
    if (!updated[index].options) updated[index].options = [];
    updated[index].options.push('Nova Opção');
    setFields(updated);
  };

  const updateOption = (fieldIndex, optIndex, value) => {
    const updated = [...fields];
    updated[fieldIndex].options[optIndex] = value;
    setFields(updated);
  };

  const removeOption = (fieldIndex, optIndex) => {
    const updated = [...fields];
    updated[fieldIndex].options.splice(optIndex, 1);
    setFields(updated);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 border-3 border-brand/20 border-t-brand rounded-full animate-spin" />
        <p className="text-xs text-secondary font-medium tracking-wide">Carregando ficha e termos de consentimento...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 animate-fade-in-up">
      {/* Cabeçalho Rosé Editorial */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-brand/10 text-brand">
              Conformidade LGPD (Art. 11)
            </span>
            {lastUpdated && (
              <span className="text-xs text-secondary flex items-center gap-1">
                <Clock className="w-3 h-3 text-secondary/70" />
                Atualizado em {new Date(lastUpdated).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-on-surface">
            Anamnese & Termos de Consentimento
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Personalize as perguntas de saúde, termos jurídicos e exigência de assinatura digital.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand text-white text-xs sm:text-sm font-medium hover:bg-brand-hover active:scale-95 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Salvando alterações...' : 'Salvar Ficha'}</span>
        </button>
      </div>

      {/* Tabs de Navegação */}
      <div className="flex border-b border-line mb-6 gap-2">
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'questions'
              ? 'border-brand text-brand'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Perguntas da Ficha ({fields.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('terms')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'terms'
              ? 'border-brand text-brand'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Termo de Consentimento & Assinatura (v{termsVersion})</span>
        </button>
      </div>

      {/* ABA 1: PERGUNTAS DA FICHA */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="bg-white border border-line rounded-[22px] p-6 shadow-2xs">
            {fields.length === 0 ? (
              <div className="text-center py-12 text-secondary">
                <FileText className="w-12 h-12 text-secondary/40 mx-auto mb-3" />
                <p className="text-sm font-semibold text-on-surface">Sua ficha de anamnese está vazia</p>
                <p className="text-xs text-secondary mt-1 max-w-sm mx-auto">
                  Adicione perguntas sobre histórico de saúde, alergias, gestação ou preferências para proteger seu salão.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, i) => (
                  <div
                    key={field.id}
                    className="bg-stone-50/70 border border-line/80 rounded-2xl p-4 sm:p-5 relative group transition-all hover:border-brand/40 hover:bg-stone-50"
                  >
                    <button
                      onClick={() => removeField(i)}
                      className="absolute top-4 right-4 text-stone-400 hover:text-red-600 transition-colors p-1"
                      title="Remover pergunta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pr-8">
                      <div className="sm:col-span-7">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-secondary mb-1">
                          Pergunta
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(i, { label: e.target.value })}
                          placeholder="Ex: Possui alguma alergia a cosméticos?"
                          className="w-full bg-white border border-line rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand transition-colors"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-secondary mb-1">
                          Tipo de Resposta
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) => updateField(i, { type: e.target.value })}
                          className="w-full bg-white border border-line rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand transition-colors"
                        >
                          <option value="text">Texto Curto</option>
                          <option value="textarea">Texto Longo</option>
                          <option value="radio">Seleção Única (Sim/Não)</option>
                          <option value="select">Dropdown</option>
                          <option value="checkbox">Múltipla Escolha</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2 flex items-center pt-5">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-on-surface">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(i, { required: e.target.checked })}
                            className="w-4 h-4 rounded text-brand focus:ring-brand accent-brand"
                          />
                          <span>Obrigatório</span>
                        </label>
                      </div>
                    </div>

                    {/* Opções configuráveis quando for radio, select ou checkbox */}
                    {['radio', 'checkbox', 'select'].includes(field.type) && (
                      <div className="mt-3 pt-3 border-t border-line/60 bg-white/70 p-3 rounded-xl">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary mb-2">
                          Opções de resposta:
                        </p>
                        <div className="space-y-1.5 mb-2.5">
                          {field.options?.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => updateOption(i, optIdx, e.target.value)}
                                className="flex-1 bg-white border border-line rounded-lg px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:border-brand"
                              />
                              <button
                                onClick={() => removeOption(i, optIdx)}
                                className="text-secondary hover:text-red-600 p-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => addOption(i)}
                          className="text-brand text-xs font-semibold inline-flex items-center gap-1 hover:underline"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Adicionar opção</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={addField}
              className="w-full mt-5 border-2 border-dashed border-line hover:border-brand text-secondary hover:text-brand py-3.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar nova pergunta</span>
            </button>
          </div>
        </div>
      )}

      {/* ABA 2: TERMO DE CONSENTIMENTO & ASSINATURA DIGITAL */}
      {activeTab === 'terms' && (
        <div className="space-y-6">
          <div className="bg-white border border-line rounded-[22px] p-6 shadow-2xs space-y-6">
            {/* Bloco de Informações Jurídicas LGPD */}
            <div className="bg-brand/5 border border-brand/20 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-brand">Segurança e Validade Jurídica Digital</p>
                <p className="text-secondary mt-0.5 leading-relaxed">
                  Cada resposta da cliente gera um hash criptográfico <strong>SHA-256</strong> inviolável, registrando data/hora, endereço IP e identificador do dispositivo. Os dados de saúde são armazenados sob criptografia <strong>AES-256-GCM</strong> em repouso.
                </p>
              </div>
            </div>

            {/* Configurações do Termo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-stone-50 border border-line/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-on-surface block">
                    Exigir Aceite do Termo
                  </label>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Cliente deve marcar o checkbox de ciência legal antes de salvar a ficha.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={requireTerms}
                  onChange={(e) => setRequireTerms(e.target.checked)}
                  className="w-5 h-5 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                />
              </div>

              <div className="bg-stone-50 border border-line/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-on-surface block">
                    Exigir Assinatura Digital Manuscrita
                  </label>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Habilita o quadro interativo para a cliente assinar com o dedo ou caneta touch.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={requireSignature}
                  onChange={(e) => setRequireSignature(e.target.checked)}
                  className="w-5 h-5 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                />
              </div>
            </div>

            {/* Versão do Termo */}
            <div className="bg-stone-50 border border-line/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-on-surface">Versão Atual do Termo: v{termsVersion}</p>
                <p className="text-[11px] text-secondary mt-0.5">
                  Ao atualizar o texto legal com mudanças significativas, incremente a versão para recolher novo consentimento.
                </p>
              </div>
              <button
                type="button"
                onClick={handleIncrementVersion}
                className="px-3 py-1.5 rounded-full border border-brand text-brand hover:bg-brand hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Nova Versão (v{termsVersion + 1})
              </button>
            </div>

            {/* Editor do Texto do Termo */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-secondary mb-1">
                Texto do Termo de Consentimento
              </label>
              <textarea
                rows={7}
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
                placeholder="Insira o texto legal de consentimento e responsabilidade..."
                className="w-full bg-white border border-line rounded-2xl p-3.5 text-xs sm:text-sm text-on-surface leading-relaxed focus:outline-none focus:border-brand transition-colors font-sans"
              />
              <p className="text-[11px] text-secondary mt-1">
                Dica: O texto é apresentado integralmente na tela do celular da cliente com confirmação prévia ao atendimento.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnamneseTemplate;
