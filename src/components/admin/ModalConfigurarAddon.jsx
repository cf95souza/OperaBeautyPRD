import React, { useState, useEffect } from 'react';
import { X, Globe, FileText, CheckCircle2, AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

/**
 * Modal de Configuração de Complementos (Add-ons do SaaS - E3 P2)
 * Suporte a Domínio Próprio (DNS CNAME) e Emissão Fiscal NFS-e
 */
const ModalConfigurarAddon = ({ isOpen, onClose, addon, tenantId, onSaveSuccess }) => {
  const { showSuccess, showError } = useNotification();
  const [domainInput, setDomainInput] = useState('');
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [copiedCname, setCopiedCname] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dados Fiscais NFS-e
  const [fiscalData, setFiscalData] = useState({
    cnpj: '',
    inscricao_municipal: '',
    cnae: '',
    regime_tributario: 'simples_nacional'
  });

  useEffect(() => {
    if (addon?.category === 'domain') {
      setDomainInput(addon.config?.custom_domain || '');
    } else if (addon?.category === 'fiscal') {
      setFiscalData({
        cnpj: addon.config?.cnpj || '',
        inscricao_municipal: addon.config?.inscricao_municipal || '',
        cnae: addon.config?.cnae || '',
        regime_tributario: addon.config?.regime_tributario || 'simples_nacional'
      });
    }
  }, [addon]);

  if (!isOpen || !addon) return null;

  const handleCopyCname = () => {
    navigator.clipboard.writeText('cname.operabeauty.com.br');
    setCopiedCname(true);
    setTimeout(() => setCopiedCname(false), 2000);
  };

  const handleVerifyDns = async () => {
    if (!domainInput.trim()) {
      showError('Informe o seu domínio próprio.');
      return;
    }
    setVerifyingDns(true);
    try {
      const res = await api.addons.verifyDomain({
        tenant_id: tenantId,
        domain: domainInput.trim()
      });
      if (res.verified) {
        showSuccess(res.message || 'Domínio próprio e apontamento DNS verificados!');
        if (onSaveSuccess) onSaveSuccess();
        onClose();
      } else {
        showError(res.error || 'Apontamento DNS ainda não localizado. Aguarde a propagação.');
      }
    } catch (err) {
      showError(err.message || 'Erro ao verificar apontamento DNS.');
    } finally {
      setVerifyingDns(false);
    }
  };

  const handleSaveFiscal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addons.updateConfig({
        tenant_id: tenantId,
        addon_slug: addon.slug,
        config: fiscalData
      });
      showSuccess('Configurações fiscais da NFS-e salvas com sucesso!');
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      showError(err.message || 'Erro ao salvar dados fiscais.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="relative w-full max-w-lg rounded-[28px] border border-line bg-white p-6 sm:p-8 shadow-xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-ink-soft hover:text-ink hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-brand-tint flex items-center justify-center text-brand shrink-0">
            {addon.category === 'domain' ? <Globe className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-ink">
              {addon.category === 'domain' ? 'Configurar Domínio Próprio' : 'Configurar Módulo Fiscal NFS-e'}
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">
              {addon.name}
            </p>
          </div>
        </div>

        {/* Conteúdo para Domínio Próprio */}
        {addon.category === 'domain' && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase text-ink-soft tracking-wider mb-2">
                Seu Domínio ou Subdomínio
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="ex: agendamento.meusalao.com.br"
                  className="w-full px-4 py-3 rounded-xl border border-line bg-stone-50 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand text-sm text-ink placeholder:text-ink-soft/60 transition-all"
                />
              </div>
              <p className="text-[11px] text-ink-soft mt-1.5 leading-relaxed">
                Você pode utilizar tanto um subdomínio (recomendado) quanto seu domínio principal.
              </p>
            </div>

            {/* Caixa de Instruções DNS */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-line/80 space-y-3">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wide">
                Instruções de Apontamento DNS
              </h4>
              <p className="text-xs text-ink-soft leading-relaxed">
                Acesse o painel do seu registrador de domínio (Registro.br, Cloudflare, GoDaddy, Hostgator) e adicione a seguinte entrada DNS:
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-line">
                  <span className="text-ink-soft">Tipo:</span>
                  <strong className="font-mono text-ink font-bold">CNAME</strong>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-line">
                  <span className="text-ink-soft">Destino (Valor):</span>
                  <div className="flex items-center gap-2">
                    <strong className="font-mono text-brand font-bold">cname.operabeauty.com.br</strong>
                    <button
                      type="button"
                      onClick={handleCopyCname}
                      className="p-1 rounded text-ink-soft hover:text-brand transition-colors cursor-pointer"
                      title="Copiar CNAME"
                    >
                      {copiedCname ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-ink-soft italic">
                * A propagação DNS pode levar de 5 minutos a algumas horas dependendo do seu provedor.
              </p>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-full border border-line bg-white hover:bg-stone-50 text-xs font-bold text-ink-soft hover:text-ink transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleVerifyDns}
                disabled={verifyingDns || !domainInput.trim()}
                className="flex-1 py-3 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {verifyingDns ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verificando DNS...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Salvar e Verificar DNS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Conteúdo para NFS-e */}
        {addon.category === 'fiscal' && (
          <form onSubmit={handleSaveFiscal} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                CNPJ do Estabelecimento
              </label>
              <input
                type="text"
                value={fiscalData.cnpj}
                onChange={(e) => setFiscalData(prev => ({ ...prev, cnpj: e.target.value }))}
                placeholder="00.000.000/0001-00"
                className="w-full px-4 py-2.5 rounded-xl border border-line bg-stone-50 focus:bg-white text-sm text-ink"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Inscrição Municipal
              </label>
              <input
                type="text"
                value={fiscalData.inscricao_municipal}
                onChange={(e) => setFiscalData(prev => ({ ...prev, inscricao_municipal: e.target.value }))}
                placeholder="Ex: 12345678"
                className="w-full px-4 py-2.5 rounded-xl border border-line bg-stone-50 focus:bg-white text-sm text-ink"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Código CNAE Principal
              </label>
              <input
                type="text"
                value={fiscalData.cnae}
                onChange={(e) => setFiscalData(prev => ({ ...prev, cnae: e.target.value }))}
                placeholder="Ex: 9602-5/01 (Cabeleireiros e estética)"
                className="w-full px-4 py-2.5 rounded-xl border border-line bg-stone-50 focus:bg-white text-sm text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1">
                Regime Tributário
              </label>
              <select
                value={fiscalData.regime_tributario}
                onChange={(e) => setFiscalData(prev => ({ ...prev, regime_tributario: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-line bg-stone-50 focus:bg-white text-sm text-ink"
              >
                <option value="simples_nacional">Simples Nacional / MEI</option>
                <option value="lucro_presumido">Lucro Presumido</option>
                <option value="lucro_real">Lucro Real</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-full border border-line bg-white hover:bg-stone-50 text-xs font-bold text-ink-soft cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Dados Fiscais</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ModalConfigurarAddon;
