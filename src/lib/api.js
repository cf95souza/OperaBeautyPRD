const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Recuperar token do localStorage
const getToken = () => localStorage.getItem('operabeauty_token');

let refreshTokenPromise = null;

// Requisição HTTP Base
async function request(path, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
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
        headers: { 'Content-Type': 'application/json' }
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
    async checkClientExists(tenantId, phone) {
      return request('/auth/check-client', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: tenantId, phone }),
      });
    },
    async registerClient(tenantId, name, phone, password, birthDate) {
      return request('/auth/register-client', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: tenantId, name, phone, password, birth_date: birthDate }),
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
      return request(`/services?tenant_id=${tenantId}`);
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
      return request(`/staff?tenant_id=${tenantId}`);
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
      return request(`/clients${tenantId ? `?tenant_id=${tenantId}` : ''}`);
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
      }).then(res => {
        if (!res.ok) throw new Error('Erro ao salvar nota com imagem');
        return res.json();
      });
    },
    async deleteTimelineNote(clientId, noteId) {
      return request(`/clients/${clientId}/timeline/${noteId}`, {
        method: 'DELETE'
      });
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
    async getOccupiedSlots(tenantId, date, staffId = null) {
      const params = new URLSearchParams({ tenant_id: tenantId, date });
      if (staffId) params.append('staff_id', staffId);
      return request(`/appointments/occupied-slots?${params.toString()}`);
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
    async delete(id) {
      return request(`/appointments/${id}`, {
        method: 'DELETE',
      });
    },
    async payCommissions(staff_id) {
      return request('/appointments/pay-commissions', {
        method: 'PUT',
        body: JSON.stringify({ staff_id }),
      });
    }
  },

  // Configurações do Salão (Horários e Exceções)
  settings: {
    async getBusinessHours(tenantId) {
      return request(`/settings/business-hours?tenant_id=${tenantId}`);
    },
    async updateBusinessHours(hoursArray) {
      return request('/settings/business-hours', {
        method: 'PUT',
        body: JSON.stringify({ hours: hoursArray }),
      });
    },
    async getExceptions(tenantId) {
      return request(`/settings/exceptions?tenant_id=${tenantId}`);
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
    async list() {
      return request('/plans');
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
      return request(`/invoices${tenantId ? `?tenant_id=${tenantId}` : ''}`);
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
      return request(`/coupons?tenant_id=${tenantId}`);
    },
    async getByCode(tenantId, code) {
      return request(`/coupons?tenant_id=${tenantId}&code=${code}`);
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
      return request(`/coupons/${id}/redeem?tenant_id=${tenantId}`, {
        method: 'POST'
      });
    }
  },

  // Super Admin
  superadmin: {
    async getDashboardMetrics() {
      return request('/superadmin/dashboard-metrics');
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
  }
};
