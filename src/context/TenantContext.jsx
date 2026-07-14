import React, { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

const TenantContext = createContext({});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }) => {
  const { tenant_slug } = useParams();
  const [tenant, setTenant] = useState(null);
  const [session, setSession] = useState(null); // { id, name, role, tenant_id }
  const [loading, setLoading] = useState(true);

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

        if (isMounted) setTenant(tenantData);

        // 2. Aplica as cores do Salão (White Label)
        if (tenantData.primary_color) {
          document.documentElement.style.setProperty('--color-primary', tenantData.primary_color);
        }
        if (tenantData.secondary_color) {
          document.documentElement.style.setProperty('--color-primary-container', tenantData.secondary_color);
        }

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

  return (
    <TenantContext.Provider value={{ tenant, session, loading, login, loginClient, loginStaff, logout }}>
      {children}
    </TenantContext.Provider>
  );
};
