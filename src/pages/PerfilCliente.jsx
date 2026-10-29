import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  User,
  Lock,
  Calendar,
  Gift,
  Share2,
  FileText,
  Download,
  Trash2,
  LogOut,
  CheckCircle,
  AlertCircle,
  Check,
  ChevronRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';
import { TelaCliente } from '../components/ui/TelaCliente';

const PerfilCliente = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session, loading: loadingTenant, logout } = useTenant();
  const { showSuccess, showError, confirm } = useNotification();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [anamnesisStatus, setAnamnesisStatus] = useState(null);

  // Carrega os dados cadastrais do cliente
  useEffect(() => {
    if (loadingTenant) return;
    if (!session || session.role !== 'client') {
      navigate(`/${tenant_slug}/login`);
      return;
    }

    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const data = await api.clients.get(session.id);
        if (data && isMounted) {
          setNome(data.name || '');
          setTelefone(data.phone || '');

          let birthDateStr = '';
          if (data.birth_date) {
            birthDateStr = String(data.birth_date).includes('T')
              ? data.birth_date.split('T')[0]
              : data.birth_date;
          }
          setDataNascimento(birthDateStr);
        }

        // Status da Ficha de Anamnese
        try {
          const token = localStorage.getItem('operabeauty_token');
          const resAnamnesis = await fetch(`/api/anamnesis/client/${session.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resAnamnesis.ok && isMounted) {
            const anamnesis = await resAnamnesis.json();
            if (anamnesis && anamnesis.expires_at) {
              const isExpired = new Date(anamnesis.expires_at) < new Date();
              setAnamnesisStatus({
                isExpired,
                expiresAt: anamnesis.expires_at,
                updatedAt: anamnesis.updated_at
              });
            } else {
              setAnamnesisStatus({ isExpired: true });
            }
          }
        } catch (e) {
          // Ignora caso endpoint de anamnese não esteja ativo
        }
      } catch (err) {
        console.error('Erro ao buscar perfil do cliente:', err);
      } finally {
        if (isMounted) setInitialLoad(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [session, loadingTenant, navigate, tenant_slug]);

  const handleLogout = async () => {
    const confirmed = await confirm('Deseja realmente sair da sua conta?');
    if (confirmed) {
      logout();
      navigate(`/${tenant_slug}/login`);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      showError('O seu nome é obrigatório.');
      return;
    }

    if (novaSenha || confirmarSenha) {
      if (novaSenha !== confirmarSenha) {
        showError('As senhas digitadas não coincidem.');
        return;
      }
      if (
        novaSenha.length < 6 ||
        !/[a-zA-Z]/.test(novaSenha) ||
        !/[0-9]/.test(novaSenha)
      ) {
        showError('A nova senha deve ter no mínimo 6 caracteres, contendo letras e números.');
        return;
      }
    }

    setLoading(true);
    try {
      await api.clients.updateMe({
        name: nome,
        birth_date: dataNascimento || null
      });

      if (novaSenha) {
        await api.clients.updateMyPassword(novaSenha);
        setNovaSenha('');
        setConfirmarSenha('');
      }

      setSaved(true);
      showSuccess('Informações atualizadas com sucesso!');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      showError('Erro ao salvar alterações: ' + (err.message || 'Tente novamente'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await api.clients.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Meus_Dados_OperaBeauty_${tenant_slug}.json`;
      a.click();
      showSuccess('Arquivo com seus dados exportado com sucesso!');
    } catch (e) {
      showError('Erro ao exportar dados da conta.');
    }
  };

  const handleAnonymize = async () => {
    const confirmed = await confirm(
      'ATENÇÃO: Isso removerá permanentemente seu nome, histórico e telefone dos nossos registros. Esta ação é IRREVERSÍVEL. Deseja continuar?'
    );
    if (!confirmed) return;

    try {
      await api.clients.anonymizeAccount();
      showSuccess('Sua conta foi excluída e anonimizada com sucesso.');
      logout();
      navigate(`/${tenant_slug}/login`);
    } catch (e) {
      showError('Erro ao solicitar anonimização da conta.');
    }
  };

  return (
    <TelaCliente temNavegacaoInferior className="selection:bg-brand-tint selection:text-brand">
      {/* 1. Cabeçalho Sticky */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-line/60 pt-3 pb-3 px-5">
        <div className="max-w-[420px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-tint text-brand flex items-center justify-center font-serif text-sm font-bold overflow-hidden shrink-0">
              {tenant?.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (tenant?.name || 'O').charAt(0)
              )}
            </div>
            <span className="font-serif text-lg font-bold text-ink truncate max-w-[200px]">
              {tenant?.name || 'OperaBeauty'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-9 h-9 rounded-full border border-line bg-surface text-ink-soft hover:text-danger hover:border-danger/30 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
            title="Sair da conta"
            aria-label="Sair da conta"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* 2. Conteúdo Principal Mobile */}
      <main className="w-full max-w-[420px] mx-auto px-5 pt-6 flex-1 flex flex-col">
        {/* Profile Card / Header com Monograma Rosé */}
        <section className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full bg-brand-tint border-2 border-gold/40 flex items-center justify-center shadow-xs overflow-hidden">
              <span className="font-serif text-3xl font-bold text-brand italic">
                {(nome || 'C').charAt(0)}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center shadow-xs">
              <Sparkles size={14} />
            </div>
          </div>

          <h2 className="font-serif text-2xl font-bold text-ink text-center leading-tight">
            {nome || 'Cliente'}
          </h2>
          <p className="text-xs text-ink-soft mt-0.5">{telefone || 'Telefone verificado'}</p>

          {/* Badge VIP / Fidelidade */}
          <div className="mt-2.5">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-brand-tint/60 text-brand border border-gold/30">
              <Sparkles size={12} className="text-gold" />
              <span>{session?.vip_tier || 'Cliente Especial'}</span>
            </span>
          </div>
        </section>

        {/* Alerta de Ficha de Anamnese (se aplicável) */}
        {!initialLoad && anamnesisStatus && (
          <section className="mb-5">
            <button
              type="button"
              onClick={() => navigate(`/${tenant_slug}/anamnese`)}
              className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left shadow-xs cursor-pointer ${
                anamnesisStatus.isExpired
                  ? 'bg-danger/5 border-danger/30 hover:bg-danger/10'
                  : 'bg-brand-tint/30 border-brand/20 hover:bg-brand-tint/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    anamnesisStatus.isExpired
                      ? 'bg-danger/15 text-danger'
                      : 'bg-brand text-white'
                  }`}
                >
                  <FileText size={18} />
                </div>
                <div>
                  <h4
                    className={`text-sm font-bold ${
                      anamnesisStatus.isExpired ? 'text-danger' : 'text-brand'
                    }`}
                  >
                    Ficha de Anamnese
                  </h4>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {anamnesisStatus.isExpired
                      ? 'Informações de saúde pendentes de atualização.'
                      : 'Ficha em dia com o salão.'}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-ink-soft shrink-0" />
            </button>
          </section>
        )}

        {/* Formulário de Edição */}
        {initialLoad ? (
          <div className="space-y-4 py-8">
            <div className="h-44 bg-surface rounded-2xl border border-line/60 animate-pulse" />
            <div className="h-44 bg-surface rounded-2xl border border-line/60 animate-pulse" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {/* Bloco 1: Meus Dados Pessoais */}
            <div className="bg-surface rounded-2xl border border-line/70 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-line/50">
                <User size={16} className="text-brand" />
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Meus Dados Pessoais
                </span>
              </div>

              {/* Nome Completo */}
              <div>
                <label
                  htmlFor="nome-cliente"
                  className="block text-xs font-semibold text-ink-soft mb-1.5"
                >
                  Nome Completo
                </label>
                <input
                  id="nome-cliente"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full h-12 bg-bg border border-line rounded-xl px-4 text-sm text-ink focus:outline-none focus:border-brand transition-colors font-medium"
                  placeholder="Seu nome"
                  required
                />
              </div>

              {/* Telefone (Somente leitura para integridade de login) */}
              <div>
                <label
                  htmlFor="telefone-cliente"
                  className="block text-xs font-semibold text-ink-soft mb-1.5"
                >
                  Telefone de Acesso (WhatsApp)
                </label>
                <input
                  id="telefone-cliente"
                  type="tel"
                  value={telefone}
                  disabled
                  className="w-full h-12 bg-line/20 border border-line/60 rounded-xl px-4 text-sm text-ink-soft font-medium cursor-not-allowed"
                />
                <span className="text-[11px] text-ink-soft/70 mt-1 block">
                  Identificador fixo da sua conta neste salão.
                </span>
              </div>

              {/* Data de Nascimento */}
              <div>
                <label
                  htmlFor="nascimento-cliente"
                  className="block text-xs font-semibold text-ink-soft mb-1.5"
                >
                  Data de Nascimento
                </label>
                <input
                  id="nascimento-cliente"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="w-full h-12 bg-bg border border-line rounded-xl px-4 text-sm text-ink focus:outline-none focus:border-brand transition-colors font-medium"
                />
              </div>
            </div>

            {/* Bloco 2: Segurança e Senha */}
            <div className="bg-surface rounded-2xl border border-line/70 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-line/50">
                <Lock size={16} className="text-brand" />
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Segurança da Conta
                </span>
              </div>

              <div>
                <label
                  htmlFor="nova-senha"
                  className="block text-xs font-semibold text-ink-soft mb-1.5"
                >
                  Nova Senha (opcional)
                </label>
                <input
                  id="nova-senha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Deixe em branco para manter a atual"
                  className="w-full h-12 bg-bg border border-line rounded-xl px-4 text-sm text-ink focus:outline-none focus:border-brand transition-colors"
                />
              </div>

              {/* Requisitos Dinâmicos de Senha */}
              {novaSenha.length > 0 && (
                <div className="bg-bg p-3.5 rounded-xl border border-line/80 space-y-1.5">
                  <span className="text-[11px] font-semibold text-ink-soft block">
                    Requisitos da nova senha:
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={
                        novaSenha.length >= 6 ? 'text-success font-semibold' : 'text-ink-soft'
                      }
                    >
                      {novaSenha.length >= 6 ? '✓' : '○'} Mínimo de 6 caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={
                        /[a-zA-Z]/.test(novaSenha)
                          ? 'text-success font-semibold'
                          : 'text-ink-soft'
                      }
                    >
                      {/[a-zA-Z]/.test(novaSenha) ? '✓' : '○'} Pelo menos 1 letra
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={
                        /[0-9]/.test(novaSenha)
                          ? 'text-success font-semibold'
                          : 'text-ink-soft'
                      }
                    >
                      {/[0-9]/.test(novaSenha) ? '✓' : '○'} Pelo menos 1 número
                    </span>
                  </div>
                </div>
              )}

              {novaSenha.length > 0 && (
                <div>
                  <label
                    htmlFor="confirmar-senha"
                    className="block text-xs font-semibold text-ink-soft mb-1.5"
                  >
                    Confirmar Nova Senha
                  </label>
                  <input
                    id="confirmar-senha"
                    type="password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full h-12 bg-bg border border-line rounded-xl px-4 text-sm text-ink focus:outline-none focus:border-brand transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Bloco 3: Atalhos Úteis (Vales-Presente & Indicação) */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => navigate(`/${tenant_slug}/presentear`)}
                className="w-full bg-surface rounded-2xl border border-line/70 p-4 shadow-xs flex items-center justify-between gap-3 hover:border-brand/40 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-tint text-brand flex items-center justify-center shrink-0">
                    <Gift size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-ink">Meus Vales-Presente</p>
                    <p className="text-xs text-ink-soft">
                      Acompanhe e envie mimos para amigas
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-ink-soft" />
              </button>

              {tenant?.features?.referral && (
                <button
                  type="button"
                  onClick={() => navigate(`/${tenant_slug}/indique-e-ganhe`)}
                  className="w-full bg-gradient-to-r from-brand-tint/40 to-surface rounded-2xl border border-brand/20 p-4 shadow-xs flex items-center justify-between gap-3 hover:border-brand/40 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
                      <Share2 size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-ink">Indique e Ganhe</p>
                      <p className="text-xs text-ink-soft">
                        Convide amigas e ganhe créditos na carteira
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-ink-soft" />
                </button>
              )}
            </div>

            {/* Bloco 4: Privacidade e Direitos LGPD */}
            <div className="bg-surface rounded-2xl border border-line/70 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-line/50">
                <ShieldCheck size={16} className="text-brand" />
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Privacidade (LGPD)
                </span>
              </div>

              <button
                type="button"
                onClick={handleExportData}
                className="w-full flex items-center justify-between py-2 text-xs font-semibold text-ink hover:text-brand transition-colors cursor-pointer"
              >
                <span>Exportar meus dados (JSON)</span>
                <Download size={16} className="text-ink-soft" />
              </button>

              <div className="border-t border-line/50" />

              <button
                type="button"
                onClick={handleAnonymize}
                className="w-full flex items-center justify-between py-2 text-xs font-semibold text-danger/80 hover:text-danger transition-colors cursor-pointer"
              >
                <span>Excluir permanentemente minha conta</span>
                <Trash2 size={16} />
              </button>
            </div>

            {/* Botão Salvar Alterações */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[52px] rounded-full bg-brand text-white font-medium text-base hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvando dados...</span>
                  </>
                ) : saved ? (
                  <>
                    <Check size={18} />
                    <span>Alterações salvas!</span>
                  </>
                ) : (
                  <span>Salvar Alterações</span>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* 3. Navegação Inferior (Ativa em 'perfil') */}
      <ClienteBottomNavBar activeTab="perfil" tenantSlug={tenant_slug} />
    </TelaCliente>
  );
};

export default PerfilCliente;
