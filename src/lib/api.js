/**
 * @fileoverview Cliente HTTP centralizado do OperaBeauty SaaS com tipagem gradual TypeScript.
 * @typedef {import('../types/apiContracts').User} User
 * @typedef {import('../types/apiContracts').Tenant} Tenant
 * @typedef {import('../types/apiContracts').Appointment} Appointment
 * @typedef {import('../types/apiContracts').Order} Order
 * @typedef {import('../types/apiContracts').Coupon} Coupon
 * @typedef {import('../types/apiContracts').GiftCard} GiftCard
 * @typedef {import('../types/apiContracts').CashRegister} CashRegister
 */

const API_BASE = '/api';

// Recuperar token do localStorage
const getToken = () => localStorage.getItem('operabeauty_token');

// Recuperar ou gerar identificador estável do dispositivo (C3 - P0)
export const getDeviceId = () => {
  let deviceId = localStorage.getItem('operabeauty_device_id');
  if (!deviceId) {
    deviceId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    localStorage.setItem('operabeauty_device_id', deviceId);
  }
  return deviceId;
};

let refreshTokenPromise = null;

// Requisição HTTP Base
async function request(path, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    'x-device-id': getDeviceId(),
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  let response = await fetch(`${API_BASE}${path}`, config);
  
  // Interceptar 401 para tentar o refresh
  const isAuthRoute = path.startsWith('/auth/login') || path === '/auth/refresh-token' || path === '/auth/logout';
  
  if (response.status === 401 && !isAuthRoute) {
    if (!refreshTokenPromise) {
      refreshTokenPromise = fetch(`${API_BASE}/auth/refresh-token`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'x-device-id': getDeviceId()
        }
      }).then(async (refreshResponse) => {
        if (!refreshResponse.ok) {
          throw new Error('Sessão expirada');
        }
        const refreshData = await refreshResponse.json();
        localStorage.setItem('operabeauty_token', refreshData.token);
        if (refreshData.user) {
          localStorage.setItem('operabeauty_user', JSON.stringify(refreshData.user));
        }
        return refreshData.token;
      }).catch((e) => {
        api.auth.logout();
        throw new Error('Sessão expirada. Faça login novamente.');
      }).finally(() => {
        refreshTokenPromise = null;
      });
    }

    try {
      const newToken = await refreshTokenPromise;
      // Refazer requisição original com novo token
      headers['Authorization'] = `Bearer ${newToken}`;
      config.headers = headers;
      response = await fetch(`${API_BASE}${path}`, config);
    } catch (e) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  }

  // Tratamento de respostas de sucesso/erro
  if (!response.ok) {
    let errorMessage = 'Erro ao processar requisição.';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      // Ignora erro de parse
    }
    throw new Error(errorMessage);
  }

  // Se a resposta for vazia (ex: status 204 ou sem conteúdo)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  // Base HTTP Request (Exposto para chamadas flexíveis)
  request,

  // Autenticação
  auth: {
    async loginStaff(tenantSlug, email, password) {
      return request('/auth/login-staff', {
        method: 'POST',
        body: JSON.stringify({ tenant_slug: tenantSlug, email, password }),
      });
    },
    async loginClient(tenantSlug, phone, password) {
      return request('/auth/login-client', {
        method: 'POST',
        body: JSON.stringify({ tenant_slug: tenantSlug, phone, password }),
      });
    },

    async loginSuperAdmin(email, password) {
      return request('/auth/login-superadmin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },
    async verifySuperAdmin2Fa(tempToken, code) {
      return request('/auth/login-superadmin/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({ temp_token: tempToken, code }),
      });
    },
    async setupSuperAdmin2Fa() {
      return request('/auth/superadmin/2fa/setup', { method: 'POST' });
    },
    async enableSuperAdmin2Fa(code) {
      return request('/auth/superadmin/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
    },
    async disableSuperAdmin2Fa(code) {
      return request('/auth/superadmin/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
    },
    async checkPhone(tenantIdOrSlug, phone) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantIdOrSlug);
      const params = isUuid ? { tenant_id: tenantIdOrSlug, phone } : { tenant_slug: tenantIdOrSlug, phone };
      const query = new URLSearchParams(params).toString();
      return request(`/auth/check-phone?${query}`);
    },
    async checkClientExists(tenantId, phone) {
      return request('/auth/check-client', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: tenantId, phone }),
      });
    },
    async registerClient(tenantId, name, phone, password, birthDate, ref) {
      return request('/auth/register-client', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: tenantId, name, phone, password, birth_date: birthDate, ref }),
      });
    },
    async requestClientCode(tenantSlug, phone, purpose = 'reset_password') {
      return request('/auth/client/request-code', {
        method: 'POST',
        body: JSON.stringify({ tenant_slug: tenantSlug, phone, purpose }),
      });
    },
    async verifyClientCode(tenantSlug, phone, code) {
      return request('/auth/client/verify-code', {
        method: 'POST',
        body: JSON.stringify({ tenant_slug: tenantSlug, phone, code }),
      });
    },
    async resetClientPassword(resetToken, newPassword) {
      return request('/auth/client/reset-password', {
        method: 'POST',
        body: JSON.stringify({ reset_token: resetToken, new_password: newPassword }),
      });
    },
    async me() {
      return request('/auth/me');
    },
    logout() {
      fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
      localStorage.removeItem('operabeauty_token');
      localStorage.removeItem('operabeauty_user');
    }
  },

  // Tenants / Salões
  tenants: {
    async getBySlug(slug) {
      return request(`/tenants/by-slug/${slug}`);
    },
    async updateBranding(payload) {
      return request('/tenants/branding', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    }
  },

  // Serviços
  services: {
    async list(tenantId) {
      const hasValidTenant = tenantId && tenantId !== 'undefined' && tenantId !== 'null';
      const q = hasValidTenant ? `?tenant_id=${tenantId}` : '';
      return request(`/services${q}`);
    },
    async getInputs(serviceId) {
      return request(`/services/${serviceId}/inputs`);
    },
    async create(payload) {
      return request('/services', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async update(id, payload) {
      return request(`/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async delete(id) {
      return request(`/services/${id}`, {
        method: 'DELETE',
      });
    },
    async import(services, options = {}) {
      return request('/services/import', {
        method: 'POST',
        body: JSON.stringify({ services, options }),
      });
    }
  },

  // Estoque
  inventory: {
    async list() {
      return request('/inventory');
    },
    async create(payload) {
      return request('/inventory', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async update(id, payload) {
      return request(`/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async delete(id) {
      return request(`/inventory/${id}`, {
        method: 'DELETE',
      });
    }
  },

  // Equipe
  staff: {
    async list(tenantId) {
      const hasValidTenant = tenantId && tenantId !== 'undefined' && tenantId !== 'null';
      const q = hasValidTenant ? `?tenant_id=${tenantId}` : '';
      return request(`/staff${q}`);
    },
    async create(payload) {
      return request('/staff', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateMe(payload) {
      return request('/staff/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async update(id, payload) {
      return request(`/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async delete(id) {
      return request(`/staff/${id}`, {
        method: 'DELETE',
      });
    }
  },

  // Clientes & CRM
  clients: {
    async list(tenantId = '') {
      const hasValidTenant = tenantId && tenantId !== 'undefined' && tenantId !== 'null';
      return request(`/clients${hasValidTenant ? `?tenant_id=${tenantId}` : ''}`);
    },
    async create(payload) {
      return request('/clients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async import(clients, options = {}) {
      return request('/clients/import', {
        method: 'POST',
        body: JSON.stringify({ clients, options }),
      });
    },
    async get(id) {
      return request(`/clients/${id}`);
    },
    async update(id, payload) {
      return request(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async updateAnamnese(id, anamneseData) {
      return request(`/clients/${id}/anamnese`, {
        method: 'PUT',
        body: JSON.stringify({ anamnese_data: anamneseData }),
      });
    },
    async updateMe(payload) {
      return request(`/clients/me`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async updateMyPassword(password) {
      return request(`/clients/me/password`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      });
    },
    async exportData() {
      return request('/clients/me/export');
    },
    async anonymizeAccount() {
      return request('/clients/me/anonymize', { method: 'DELETE' });
    },
    async updatePassword(id, password) {
      return request(`/clients/${id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      });
    },
    async getTimeline(id) {
      return request(`/clients/${id}/timeline`);
    },
    async addTimelineNote(id, formData) {
      const token = getToken();
      return fetch(`${API_BASE}/clients/${id}/timeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        credentials: 'include'
      }).then(async res => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Erro ao salvar nota na timeline.');
        }
        return res.json();
      });
    },
    async deleteTimelineNote(clientId, noteId) {
      return request(`/clients/${clientId}/timeline/${noteId}`, {
        method: 'DELETE'
      });
    },
    async resetNoShows(id) {
      return request(`/clients/${id}/reset-no-shows`, {
        method: 'POST'
      });
    },
    async toggleBlock(id, payload) {
      return request(`/clients/${id}/toggle-block`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
  },

  // Clube de Assinaturas do Salão
  memberships: {
    async createPlan(payload) {
      return request('/memberships/plans', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async listPlans(tenantId) {
      const hasValidTenant = tenantId && tenantId !== 'undefined' && tenantId !== 'null';
      const q = hasValidTenant ? `?tenant_id=${tenantId}` : '';
      return request(`/memberships/plans${q}`);
    },
    async updatePlan(id, payload) {
      return request(`/memberships/plans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async subscribe(membershipId) {
      return request('/memberships/subscribe', {
        method: 'POST',
        body: JSON.stringify({ membership_id: membershipId }),
      });
    },
    async getMySubscriptions() {
      return request('/memberships/my');
    },
    async listSubscriptions() {
      return request('/memberships/subscriptions');
    },
    async renewSubscription(id) {
      return request(`/memberships/subscriptions/${id}/renew`, {
        method: 'POST',
      });
    }
  },

  // Caixa Rápido / PDV (Venda de Produtos)
  pdv: {
    async createSale(payload) {
      return request('/product-sales', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async listSales() {
      return request('/product-sales');
    }
  },

  // Estoque e Inventário
  inventory: {
    async list(limit = 1000, offset = 0) {
      return request(`/inventory?limit=${limit}&offset=${offset}`);
    },
    async create(payload) {
      return request('/inventory', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async update(id, payload) {
      return request(`/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async delete(id) {
      return request(`/inventory/${id}`, {
        method: 'DELETE',
      });
    }
  },

  // Carteira Digital e Cashback
  wallets: {
    async getMyWallet() {
      return request('/wallets/my');
    },
    async getClientWallet(clientId) {
      return request(`/wallets/client/${clientId}`);
    }
  },

  // Agendamentos
  appointments: {
    async list(filters = {}) {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.staff_id) params.append('staff_id', filters.staff_id);
      if (filters.client_id) params.append('client_id', filters.client_id);
      if (filters.tenant_id) params.append('tenant_id', filters.tenant_id);
      
      const query = params.toString() ? `?${params.toString()}` : '';
      return request(`/appointments${query}`);
    },
    async get(id) {
      return request(`/appointments/${id}`);
    },
    async getOccupiedSlots(tenantId, date, staffId = null, serviceId = null, serviceIds = null) {
      const params = new URLSearchParams({ tenant_id: tenantId, date });
      if (staffId && staffId !== 'any') params.append('staff_id', staffId);
      if (serviceId) params.append('service_id', serviceId);
      if (serviceIds && serviceIds.length > 0) params.append('service_ids', JSON.stringify(serviceIds));
      return request(`/appointments/occupied-slots?${params.toString()}`);
    },
    async getNextAvailableSlot(tenantId, { date, staffId, serviceId, services } = {}) {
      const params = new URLSearchParams({ tenant_id: tenantId });
      if (date) params.append('date', date);
      if (staffId && staffId !== 'any') params.append('staff_id', staffId);
      if (serviceId) params.append('service_id', serviceId);
      if (services && services.length > 0) params.append('services', JSON.stringify(services));
      return request(`/appointments/next-available-slot?${params.toString()}`);
    },
    async create(payload) {
      return request('/appointments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async update(id, payload) {
      return request(`/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async reschedule(id, payload) {
      return request(`/appointments/${id}/reschedule`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async delete(id, payload = {}) {
      return request(`/appointments/${id}`, {
        method: 'DELETE',
        body: payload && Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined
      });
    },
    async markNoShow(id) {
      return request(`/appointments/${id}/no-show`, {
        method: 'POST'
      });
    },
    async undoNoShow(id) {
      return request(`/appointments/${id}/undo-no-show`, {
        method: 'POST'
      });
    },
    async payCommissions(staff_id) {
      return request('/appointments/pay-commissions', {
        method: 'PUT',
        body: JSON.stringify({ staff_id }),
      });
    }
  },

  // Lista de Espera e Vagas Liberadas (Fase 44 - D6 P1)
  waitlist: {
    async join(payload) {
      return request('/waitlist', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async getMy() {
      return request('/waitlist/my');
    },
    async accept(id, payload) {
      return request(`/waitlist/${id}/accept`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async cancel(id) {
      return request(`/waitlist/${id}`, {
        method: 'DELETE',
      });
    },
    async list(filters = {}) {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.date) params.append('date', filters.date);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request(`/waitlist${query}`);
    }
  },

  // Configurações do Salão (Horários e Exceções)
  settings: {
    async getBusinessHours(tenantId) {
      const hasValidTenant = tenantId && tenantId !== 'undefined' && tenantId !== 'null';
      const q = hasValidTenant ? `?tenant_id=${tenantId}` : '';
      return request(`/settings/business-hours${q}`);
    },
    async updateBusinessHours(hoursArray) {
      return request('/settings/business-hours', {
        method: 'PUT',
        body: JSON.stringify({ hours: hoursArray }),
      });
    },
    async getExceptions(tenantId) {
      const hasValidTenant = tenantId && tenantId !== 'undefined' && tenantId !== 'null';
      const q = hasValidTenant ? `?tenant_id=${tenantId}` : '';
      return request(`/settings/exceptions${q}`);
    },
    async addException(payload) {
      return request('/settings/exceptions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async deleteException(id) {
      return request(`/settings/exceptions/${id}`, {
        method: 'DELETE',
      });
    },
    async getPaymentGateway() {
      return request('/settings/payment-gateway');
    }
  },

  // Planos SaaS
  plans: {
    async list(activeOnly = false) {
      return request(`/plans${activeOnly ? '?active_only=true' : ''}`);
    },
    async create(payload) {
      return request('/plans', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async update(id, payload) {
      return request(`/plans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    }
  },

  // Faturas SaaS
  invoices: {
    async list(tenantId = '') {
      const hasValidTenant = tenantId && tenantId !== 'undefined' && tenantId !== 'null';
      return request(`/invoices${hasValidTenant ? `?tenant_id=${tenantId}` : ''}`);
    },
    async create(payload) {
      return request('/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async pay(id, paymentMethod = 'manual') {
      return request(`/invoices/${id}/pay`, {
        method: 'PUT',
        body: JSON.stringify({ payment_method: paymentMethod }),
      });
    }
  },

  // Cupons de Desconto
  coupons: {
    async get(id) {
      return request(`/coupons/${id}`);
    },
    async list(tenantId) {
      const hasValidTenant = tenantId && tenantId !== 'undefined' && tenantId !== 'null';
      const q = hasValidTenant ? `?tenant_id=${tenantId}` : '';
      return request(`/coupons${q}`);
    },
    async getByCode(tenantId, code) {
      const hasValidTenant = tenantId && tenantId !== 'undefined' && tenantId !== 'null';
      const params = new URLSearchParams();
      if (hasValidTenant) params.append('tenant_id', tenantId);
      if (code) params.append('code', code);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request(`/coupons${q}`);
    },
    async create(payload) {
      return request('/coupons', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async delete(id) {
      return request(`/coupons/${id}`, {
        method: 'DELETE',
      });
    },
    async update(id, payload) {
      return request(`/coupons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async redeem(id, tenantId) {
      const hasValidTenant = tenantId && tenantId !== 'undefined' && tenantId !== 'null';
      const q = hasValidTenant ? `?tenant_id=${tenantId}` : '';
      return request(`/coupons/${id}/redeem${q}`, {
        method: 'POST'
      });
    }
  },

  // Super Admin
  superadmin: {
    async getDashboardMetrics(period = 'month') {
      const q = period ? `?period=${period}` : '';
      return request(`/superadmin/dashboard-metrics${q}`);
    },
    async getOverdueTenants() {
      return request('/superadmin/overdue-tenants');
    },
    async listTenants() {
      return request('/superadmin/tenants');
    },
    async getTenant(id) {
      return request(`/superadmin/tenants/${id}`);
    },
    async createTenant(payload) {
      return request('/superadmin/tenants', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateTenant(id, payload) {
      return request(`/superadmin/tenants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async suspendTenant(id, { confirm_tenant_name, reason }) {
      return request(`/superadmin/tenants/${id}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ confirm_tenant_name, reason }),
      });
    },
    async reactivateTenant(id) {
      return request(`/superadmin/tenants/${id}/reactivate`, {
        method: 'POST',
      });
    },
    async deleteTenant(id) {
      return request(`/superadmin/tenants/${id}`, {
        method: 'DELETE',
      });
    },
    async updateStaffPassword(id, password) {
      return request(`/superadmin/staff/${id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      });
    },
    async createStaff(payload) {
      return request('/superadmin/staff', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async getPlatformSettings() {
      return request('/superadmin/settings');
    },
    async savePlatformSettings(payload) {
      return request('/superadmin/settings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async listAdmins() {
      return request('/superadmin/admins');
    },
    async createAdmin(payload) {
      return request('/superadmin/admins', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateAdmin(id, payload) {
      return request(`/superadmin/admins/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async deleteAdmin(id) {
      return request(`/superadmin/admins/${id}`, {
        method: 'DELETE',
      });
    },
    async listAnnouncements() {
      return request('/superadmin/announcements');
    },
    async createAnnouncement(payload) {
      return request('/superadmin/announcements', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateAnnouncement(id, payload) {
      return request(`/superadmin/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async deleteAnnouncement(id) {
      return request(`/superadmin/announcements/${id}`, {
        method: 'DELETE',
      });
    },
    async getAuditLogs(params = {}) {
      const query = new URLSearchParams();
      if (params.action && params.action !== 'ALL') query.set('action', params.action);
      if (params.tenant_id) query.set('tenant_id', params.tenant_id);
      if (params.search && params.search.trim()) query.set('search', params.search.trim());
      if (params.limit) query.set('limit', params.limit);
      const qs = query.toString() ? `?${query.toString()}` : '';
      return request(`/superadmin/audit-logs${qs}`);
    },
    async getStorageUsage() {
      return request('/superadmin/storage-usage');
    },
    async listFeatureFlags() {
      return request('/superadmin/feature-flags');
    },
    async createFeatureFlag(payload) {
      return request('/superadmin/feature-flags', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async updateFeatureFlag(id, payload) {
      return request(`/superadmin/feature-flags/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async deleteFeatureFlag(id) {
      return request(`/superadmin/feature-flags/${id}`, {
        method: 'DELETE',
      });
    },
    async listTenantFeatureFlags(tenantId) {
      return request(`/superadmin/feature-flags/tenants/${tenantId}`);
    },
    async toggleTenantFeatureFlag(payload) {
      return request('/superadmin/feature-flags/tenants', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    // Gestão do Programa de Parceiros e Revenda SaaS
    async getResellerSettings() {
      return request('/superadmin/resellers/settings');
    },
    async updateResellerSettings(payload) {
      return request('/superadmin/resellers/settings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async listResellers() {
      return request('/superadmin/resellers');
    },
    async createReseller(payload) {
      return request('/superadmin/resellers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async updateResellerStatus(id, status) {
      return request(`/superadmin/resellers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    },
    async updateResellerCommission(id, commissionRate) {
      return request(`/superadmin/resellers/${id}/commission`, {
        method: 'PATCH',
        body: JSON.stringify({ commission_rate: commissionRate })
      });
    },
    async listResellerPayouts(status) {
      const q = status ? `?status=${status}` : '';
      return request(`/superadmin/resellers/payouts${q}`);
    },
    async processResellerPayout(id, payload) {
      return request(`/superadmin/resellers/payouts/${id}/process`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },

    // Governança DPO e LGPD no Super Admin (F5)
    async listPrivacyRequests(status = 'all') {
      const q = status ? `?status=${status}` : '';
      return request(`/superadmin/privacy/requests${q}`);
    },
    async updatePrivacyRequest(id, payload) {
      return request(`/superadmin/privacy/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
    }
  },

  // Consulta Pública de Status de Revenda
  resellers: {
    async getStatus() {
      return request('/resellers/status');
    }
  },

  // Lookbook
  lookbook: {
    async list(tenantId) {
      const hasValidTenant = tenantId && tenantId !== 'undefined' && tenantId !== 'null';
      const q = hasValidTenant ? `?tenant_id=${tenantId}` : '';
      return request(`/lookbook${q}`);
    },
    async create(payload) {
      return request('/lookbook', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async delete(id) {
      return request(`/lookbook/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Upload Seguro de Arquivos
  upload: {
    async image(file) {
      const formData = new FormData();
      formData.append('file', file);
      const token = getToken();
      const res = await fetch(`${API_BASE}/upload/image`, {
        method: 'POST',
        headers: {
          'x-device-id': getDeviceId(),
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData,
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro no upload da imagem.');
      }
      return res.json();
    }
  },

  // Platform (Public)
  platform: {
    async getActiveAnnouncements() {
      return request('/tenants/platform-announcements');
    }
  },

  // Notificações Push e In-App
  notifications: {
    async getPublicKey() {
      return request('/notifications/vapid-public-key');
    },
    async subscribe(subscription) {
      return request('/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription }),
      });
    },
    async list() {
      return request('/notifications');
    },
    async markAsRead(id) {
      return request(`/notifications/${id}/read`, {
        method: 'PUT',
      });
    },
    async clearRead() {
      return request('/notifications/read', {
        method: 'DELETE',
      });
    }
  },

  // Gestão de Planos SaaS (Item H5)
  plans: {
    async list(includeInactive = true) {
      return request('/plans');
    },
    async create(data) {
      return request('/plans', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async update(id, data) {
      return request(`/plans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    async reorder(orderedIds) {
      return request('/plans/reorder', {
        method: 'PUT',
        body: JSON.stringify({ ordered_ids: orderedIds }),
      });
    }
  },

  // Upload Seguro de Imagens (Item A6)
  upload: {
    async image(fileOrBlob, filename = 'image.webp') {
      const formData = new FormData();
      formData.append('file', fileOrBlob, filename);
      const token = getToken();
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE}/upload/image`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao realizar upload da imagem.');
      }

      return response.json();
    }
  },

  // Integração com WhatsApp Gateway Nativo (Fase 44 - D2 P1)
  whatsapp: {
    async getStatus() {
      return request('/whatsapp/status');
    },
    async connect(phoneNumber, method = 'pairing_code') {
      return request('/whatsapp/connect', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, method }),
      });
    },
    async disconnect() {
      return request('/whatsapp/disconnect', {
        method: 'POST',
      });
    },
    async getMessages(limit = 50) {
      return request(`/whatsapp/messages?limit=${limit}`);
    }
  },

  // Pagamentos & Sinal por PIX (Fase 44 - D3 P1)
  payments: {
    async getGatewayConfig() {
      return request('/payments/gateway-config');
    },
    async saveGatewayConfig(payload) {
      return request('/payments/gateway-config', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    async createDeposit(appointmentId, tenantId) {
      return request('/payments/create-deposit', {
        method: 'POST',
        body: JSON.stringify({ appointmentId, tenantId }),
      });
    },
    async getDepositStatus(appointmentId) {
      return request(`/payments/deposit-status/${appointmentId}`);
    },
    async simulatePaid(appointmentId) {
      return request(`/payments/simulate-paid/${appointmentId}`, {
        method: 'POST',
      });
    }
  },

  // Relatórios & BI / Impacto OperaBeauty (Fase 44 - D9 P1)
  reports: {
    async getMonthlyImpact({ year, month } = {}) {
      const params = new URLSearchParams();
      if (year) params.append('year', year);
      if (month) params.append('month', month);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request(`/reports/monthly-impact${query}`);
    },
    async sendMonthlyImpactWhatsApp({ year, month, phone } = {}) {
      return request('/reports/monthly-impact/send-whatsapp', {
        method: 'POST',
        body: JSON.stringify({ year, month, phone })
      });
    },
    async getRetention() {
      return request('/reports/bi/retention');
    },
    async getStaffRanking() {
      return request('/reports/bi/staff-ranking');
    },
    async getHeatmap() {
      return request('/reports/bi/heatmap');
    }
  },

  // Onboarding Guiado do Salão & Display de Balcão com QR Code (Fase 44 - D11 P1)
  onboarding: {
    async getStatus() {
      return request('/onboarding/status');
    },
    async getCatalogTemplates() {
      return request('/onboarding/catalog-templates');
    },
    async applyCatalogTemplate(segment, services = null) {
      return request('/onboarding/apply-catalog-template', {
        method: 'POST',
        body: JSON.stringify({ segment, services })
      });
    },
    async dismiss(dismissed = true) {
      return request('/onboarding/dismiss', {
        method: 'POST',
        body: JSON.stringify({ dismissed })
      });
    },
    async markQrGenerated() {
      return request('/onboarding/mark-qr-generated', {
        method: 'POST'
      });
    }
  },

  // Cobrança Automática do SaaS, Faturas e PIX (Fase 44 - D18 P1)
  invoices: {
    async list(tenantId = null) {
      const query = tenantId ? `?tenant_id=${tenantId}` : '';
      return request(`/invoices${query}`);
    },
    async getBillingStatus(tenantId = null) {
      const query = tenantId ? `?tenant_id=${tenantId}` : '';
      return request(`/invoices/status${query}`);
    },
    async create(payload) {
      return request('/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async pay(id, paymentMethod = 'manual') {
      return request(`/invoices/${id}/pay`, {
        method: 'PUT',
        body: JSON.stringify({ payment_method: paymentMethod }),
      });
    },
    async simulatePayment(id) {
      return request(`/invoices/${id}/simulate-pay`, {
        method: 'POST'
      });
    },
    async checkOverdue() {
      return request('/invoices/check-overdue', {
        method: 'POST'
      });
    }
  },

  // Pacotes de Sessões e Saldo de Clientes (Fase 44 - D13 P2)
  packages: {
    async list(tenantId = null) {
      const query = tenantId ? `?tenant_id=${tenantId}` : '';
      return request(`/packages${query}`);
    },
    async create(payload) {
      return request('/packages', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async update(id, payload) {
      return request(`/packages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },
    async delete(id) {
      return request(`/packages/${id}`, {
        method: 'DELETE'
      });
    },
    async sell(payload) {
      return request('/packages/sell', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async getClientPackages(clientId) {
      return request(`/packages/client/${clientId}`);
    },
    async checkEligible(serviceId, clientId = null) {
      const query = clientId ? `?service_id=${serviceId}&client_id=${clientId}` : `?service_id=${serviceId}`;
      return request(`/packages/check-eligible${query}`);
    },
    async getReport() {
      return request('/packages/report');
    }
  },

  // Anamnese Dinâmica e Termo de Consentimento (Fase 44 - D14 P2)
  anamnesis: {
    async getTemplate(tenantId) {
      return request(`/anamnesis/template/${tenantId}`);
    },
    async updateTemplate(payload) {
      return request('/anamnesis/template', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },
    async getClientAnamnesis(clientId) {
      return request(`/anamnesis/client/${clientId}`);
    },
    async submit(payload) {
      return request('/anamnesis/client', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
  },

  // Evolução Clínica, Fotos Antes/Depois e Medidas (Fase 44 - D14 P2)
  evolutions: {
    async create(payload) {
      return request('/evolutions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async listByClient(clientId) {
      return request(`/evolutions/client/${clientId}`);
    },
    async update(id, payload) {
      return request(`/evolutions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },
    async delete(id) {
      return request(`/evolutions/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Campanhas Automáticas de Retenção (Fase 44 - D15 P2)
  campaigns: {
    async list() {
      return request('/campaigns');
    },
    async update(type, payload) {
      return request(`/campaigns/${type}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },
    async run() {
      return request('/campaigns/run', {
        method: 'POST'
      });
    },
    async getHistory(params = {}) {
      const q = new URLSearchParams(params).toString();
      return request(`/campaigns/history${q ? `?${q}` : ''}`);
    },
    async toggleClientOptOut(clientId, optOut) {
      return request(`/campaigns/clients/${clientId}/opt-out`, {
        method: 'POST',
        body: JSON.stringify({ opt_out: optOut })
      });
    }
  },

  // Avaliações e Google Reviews (Fase 44 - D16 P2)
  reviews: {
    async getStats() {
      return request('/reviews/stats');
    },
    async list(params = {}) {
      const q = new URLSearchParams(params).toString();
      return request(`/reviews${q ? `?${q}` : ''}`);
    },
    async listPublic(tenantId, limit = 10) {
      const hasValidTenant = tenantId && tenantId !== 'undefined' && tenantId !== 'null';
      const params = new URLSearchParams({ limit });
      if (hasValidTenant) params.append('tenant_id', tenantId);
      return request(`/reviews/public?${params.toString()}`);
    },
    async getPending() {
      return request('/reviews/pending');
    },
    async create(payload) {
      return request('/reviews', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async toggleVisibility(id, isPublic) {
      return request(`/reviews/${id}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ is_public: isPublic })
      });
    },
    async reply(id, replyText) {
      return request(`/reviews/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply: replyText })
      });
    },
    async updateGoogleUrl(googleReviewUrl) {
      return request('/reviews/google-url', {
        method: 'PUT',
        body: JSON.stringify({ google_review_url: googleReviewUrl })
      });
    }
  },

  // Sessões de Caixa Diário (Item D17)
  cashRegister: {
    async getCurrent() {
      return request('/cash-register/current');
    },
    async open(payload) {
      return request('/cash-register/open', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async addMovement(payload) {
      return request('/cash-register/movements', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async close(payload) {
      return request('/cash-register/close', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async listHistory(params = {}) {
      const q = new URLSearchParams(params).toString();
      return request(`/cash-register/history${q ? `?${q}` : ''}`);
    },
    async getDetails(id) {
      return request(`/cash-register/${id}`);
    }
  },

  // Comandas Unificadas e Checkout (Item D17)
  orders: {
    async create(payload) {
      return request('/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async addItem(orderId, item) {
      return request(`/orders/${orderId}/items`, {
        method: 'POST',
        body: JSON.stringify(item)
      });
    },
    async removeItem(orderId, itemId) {
      return request(`/orders/${orderId}/items/${itemId}`, {
        method: 'DELETE'
      });
    },
    async checkout(orderId, payload) {
      return request(`/orders/${orderId}/checkout`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async get(id) {
      return request(`/orders/${id}`);
    },
    async list(params = {}) {
      const q = new URLSearchParams(params).toString();
      return request(`/orders${q ? `?${q}` : ''}`);
    },
    async cancel(orderId, reason) {
      return request(`/orders/${orderId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    }
  },

  // Programa Indique e Ganhe (Item D19 P2)
  referral: {
    async getProfile() {
      return request('/referral/profile');
    },
    async getStats() {
      return request('/referral/stats');
    },
    async validate(code, tenantSlugOrId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantSlugOrId);
      const query = isUuid ? `tenant_id=${tenantSlugOrId}` : `tenant_slug=${tenantSlugOrId}`;
      return request(`/referral/validate/${encodeURIComponent(code)}?${query}`);
    },
    async getAdminDashboard(params = {}) {
      const q = new URLSearchParams(params).toString();
      return request(`/referral/admin/dashboard${q ? `?${q}` : ''}`);
    },
    async updateAdminSettings(settings) {
      return request('/referral/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
    }
  },

  // Mini-site do Salão e SEO Dinâmico (Item D20 P2)
  minisite: {
    async get(slug) {
      return request(`/minisite/${slug}`);
    },
    async getSeo(slug) {
      return request(`/minisite/${slug}/seo`);
    },
    async update(payload) {
      return request('/minisite', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    }
  },

  // Programa de Revenda e Parceiros (F4)
  resellers: {
    async getStatus() {
      return request('/resellers/status');
    },
    async validate(code) {
      return request(`/resellers/validate/${encodeURIComponent(code)}`);
    },
    async register(data) {
      return request('/resellers/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    async login(data) {
      return request('/resellers/login', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    async getDashboard(id) {
      return request(`/resellers/dashboard/${id}`);
    },
    async requestPayout(id, data) {
      return request(`/resellers/payout/${id}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  },

  // Canal de Privacidade e DPO (F5)
  privacy: {
    async getDpoInfo() {
      return request('/privacy/dpo-info');
    },
    async sendRequest(data) {
      return request('/privacy/request', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    async checkStatus(protocol) {
      return request(`/privacy/status/${encodeURIComponent(protocol)}`);
    }
  },

  // Complementos e Add-ons do SaaS (Fase 45 - E3 P2)
  addons: {
    async listAvailable() {
      return request('/addons');
    },
    async getTenantAddons(tenantId = null) {
      const path = tenantId ? `/addons/tenant/${tenantId}` : '/addons/tenant';
      return request(path);
    },
    async subscribe(payload) {
      return request('/addons/subscribe', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async cancel(payload) {
      return request('/addons/cancel', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    async updateConfig(payload) {
      return request('/addons/config', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },
    async verifyDomain(payload) {
      return request('/addons/verify-domain', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
  }
};

export default api;




