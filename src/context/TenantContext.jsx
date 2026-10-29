import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { getThemeTokens, applyThemeVariables } from '../lib/themeTokens';

const TenantContext = createContext({});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }) => {
  const { tenant_slug } = useParams();
  const location = useLocation();
  const [tenant, setTenant] = useState(null);
  const [session, setSession] = useState(null); // { id, name, role, tenant_id }
  const [loading, setLoading] = useState(true);

  // Monitora a rota para decidir o modo do PWA
  useEffect(() => {
    if (tenant_slug) {
      if (location.pathname.includes('/staff')) {
        localStorage.setItem('operabeauty_pwa_mode', 'staff');
      } else {
        localStorage.setItem('operabeauty_pwa_mode', 'client');
      }
    }
  }, [tenant_slug, location.pathname]);

  // Captura e preservação do código de indicação (Item D19 P2)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refParam = params.get('ref');
    if (refParam && tenant_slug) {
      const cleanRef = refParam.trim().toUpperCase();
      sessionStorage.setItem(`opera_referral_code:${tenant_slug}`, cleanRef);
      localStorage.setItem(`opera_referral_code:${tenant_slug}`, cleanRef);
    }
  }, [location.search, tenant_slug]);


  useEffect(() => {
    let isMounted = true;

    const initializeTenant = async () => {
      setLoading(true);
      try {
        if (!tenant_slug) return;

        // 1. Busca os dados do Salão
        const tenantData = await api.tenants.getBySlug(tenant_slug);

        if (!tenantData || tenantData.status !== 'active') {
          console.error("Salão não encontrado ou inativo.");
          if (isMounted) setLoading(false);
          return;
        }

        if (isMounted) {
          setTenant(tenantData);
          // Salva o último salão visitado para redirecionamento do PWA
          localStorage.setItem('operabeauty_last_tenant', tenant_slug);
          
          // --- Injeção Dinâmica de PWA (Especial para iOS e Multi-Tenant) ---
          const isStaff = window.location.pathname.includes('/staff');
          const pwaDisplayName = isStaff 
            ? (tenantData.name || 'OperaBeauty') + ' - Staff' 
            : (tenantData.name || 'OperaBeauty');
          
          document.title = pwaDisplayName;
          let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
          if (appleTitle) {
            appleTitle.content = pwaDisplayName;
          }
        }

        // 2. Aplica as cores do Salão (White Label / Rosé Design System)
        const themeTokens = getThemeTokens(
          tenantData.theme_id || 'rose', 
          tenantData.brand_hex || tenantData.primary_color || '#8E3B4E'
        );
        applyThemeVariables(themeTokens);

        // 3. Tenta recuperar a sessão do usuário via API
        try {
          const token = localStorage.getItem('operabeauty_token');
          if (token) {
            const userData = await api.auth.me();
            // Garante que o usuário pertence ao salão que está acessando, ou é superadmin
            if (userData && (userData.tenant_id === tenantData.id || userData.role === 'superadmin')) {
              if (isMounted) setSession(userData);
            }
          }
        } catch (authErr) {
          // Ignora erro de autenticação (usuário não logado)
        }

      } catch (err) {
        console.error("Erro ao inicializar Tenant:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeTenant();

    return () => {
      isMounted = false;
    };
  }, [tenant_slug]);

  // Login Cliente via Express API
  const loginClient = async (phone, password) => {
    if (!tenant) throw new Error("Salão não carregado.");
    const { token, user } = await api.auth.loginClient(tenant.slug, phone, password);
    localStorage.setItem('operabeauty_token', token);
    setSession(user);
    return user;
  };

  // Login Staff via Express API
  const loginStaff = async (email, password) => {
    if (!tenant) throw new Error("Salão não carregado.");
    const { token, user } = await api.auth.loginStaff(tenant.slug, email, password);
    localStorage.setItem('operabeauty_token', token);
    setSession(user);
    return user;
  };

  // Função central para processar Login (usado ao registrar ou por outras páginas)
  const login = (userData, token = null) => {
    if (!tenant) return;
    if (token) localStorage.setItem('operabeauty_token', token);
    setSession(userData);
  };

  // Função central para Logout
  const logout = async () => {
    if (!tenant) return;
    await api.auth.logout();
    setSession(null);
  };

  // Permite preview dinâmico ao vivo ao selecionar tema ou mudar cor no painel do salão
  const applyLiveTheme = (themeId, brandHex = null) => {
    const tokens = getThemeTokens(themeId, brandHex);
    applyThemeVariables(tokens);
  };

  return (
    <TenantContext.Provider value={{ 
      tenant, 
      setTenant,
      session, 
      loading, 
      login, 
      loginClient, 
      loginStaff, 
      logout,
      applyLiveTheme
    }}>
      {children}
    </TenantContext.Provider>
  );
};
