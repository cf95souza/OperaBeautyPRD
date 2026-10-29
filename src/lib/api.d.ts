// ==============================================================================
// OperaBeauty SaaS - Declaração de Tipos do Cliente HTTP api.js (Item G7 - P2)
// ==============================================================================

import {
  AuthResponse,
  User,
  Tenant,
  Service,
  Staff,
  Appointment,
  Order,
  OrderItem,
  OrderPayment,
  Coupon,
  GiftCard,
  CashRegister,
  ClientWallet,
  Invoice
} from '../types/apiContracts';

export declare const getDeviceId: () => string;

export interface ApiClient {
  auth: {
    login(phone: string, password: string, tenantId?: string): Promise<AuthResponse>;
    register(payload: Record<string, any>): Promise<AuthResponse>;
    logout(): Promise<{ success: boolean }>;
    me(): Promise<User>;
    changePassword(payload: { currentPassword: string; newPassword: string }): Promise<any>;
    updateProfile(payload: Partial<User>): Promise<User>;
  };

  tenants: {
    getBySlug(slug: string): Promise<Tenant>;
    getById(id: string): Promise<Tenant>;
    update(id: string, payload: Partial<Tenant>): Promise<Tenant>;
    list(): Promise<Tenant[]>;
  };

  clients: {
    list(query?: Record<string, any>): Promise<User[]>;
    getById(id: string): Promise<User>;
    create(payload: Partial<User>): Promise<User>;
    update(id: string, payload: Partial<User>): Promise<User>;
  };

  services: {
    list(tenantId?: string): Promise<Service[]>;
    getById(id: string): Promise<Service>;
    create(payload: Partial<Service>): Promise<Service>;
    update(id: string, payload: Partial<Service>): Promise<Service>;
    delete(id: string): Promise<any>;
  };

  staff: {
    list(tenantId?: string): Promise<Staff[]>;
    getById(id: string): Promise<Staff>;
    create(payload: Partial<Staff>): Promise<Staff>;
    update(id: string, payload: Partial<Staff>): Promise<Staff>;
    delete(id: string): Promise<any>;
  };

  appointments: {
    list(params?: Record<string, any>): Promise<Appointment[]>;
    getById(id: string): Promise<Appointment>;
    create(payload: Partial<Appointment>): Promise<Appointment>;
    update(id: string, payload: Partial<Appointment>): Promise<Appointment>;
    cancel(id: string, reason?: string): Promise<Appointment>;
  };

  orders: {
    list(params?: Record<string, any>): Promise<Order[]>;
    getById(id: string): Promise<Order>;
    create(payload: {
      client_id?: string | null;
      appointment_id?: string | null;
      items?: Partial<OrderItem>[];
      tip_amount?: number;
      coupon_code?: string | null;
    }): Promise<Order>;
    addItem(orderId: string, item: Partial<OrderItem>): Promise<OrderItem>;
    removeItem(orderId: string, itemId: string): Promise<any>;
    checkout(orderId: string, payload: {
      payments: OrderPayment[];
      tip_amount?: number;
      discount_amount?: number;
      notes?: string | null;
    }): Promise<Order>;
    cancel(orderId: string): Promise<Order>;
  };

  cashRegister: {
    getCurrent(): Promise<CashRegister | null>;
    open(initialBalance: number, notes?: string): Promise<CashRegister>;
    addMovement(type: 'supply' | 'bleed', amount: number, reason: string): Promise<any>;
    close(countedFinalBalance: number, notes?: string): Promise<CashRegister>;
    getDetails(id: string): Promise<any>;
    list(params?: Record<string, any>): Promise<CashRegister[]>;
  };

  coupons: {
    list(code?: string): Promise<Coupon[]>;
    getById(id: string): Promise<Coupon>;
    create(payload: Partial<Coupon>): Promise<Coupon>;
    update(id: string, payload: Partial<Coupon>): Promise<Coupon>;
    delete(id: string): Promise<any>;
    redeem(id: string): Promise<any>;
  };

  giftcards: {
    list(): Promise<GiftCard[]>;
    validateCode(code: string): Promise<GiftCard>;
    redeem(code: string, amount: number, appointmentId?: string): Promise<any>;
    create(payload: Partial<GiftCard>): Promise<GiftCard>;
  };

  wallets: {
    getBalance(clientId?: string): Promise<ClientWallet>;
    getTransactions(clientId?: string): Promise<any[]>;
  };

  invoices: {
    list(): Promise<Invoice[]>;
    getById(id: string): Promise<Invoice>;
    payWithPix(id: string): Promise<any>;
  };

  superadmin: {
    getOverview(): Promise<any>;
    listTenants(query?: string): Promise<Tenant[]>;
    createTenant(payload: Partial<Tenant>): Promise<Tenant>;
    getPlans(): Promise<any[]>;
    getAuditLogs(params?: Record<string, any>): Promise<any[]>;
  };

  privacy: {
    getDpoInfo(): Promise<any>;
    sendRequest(data: Record<string, any>): Promise<any>;
    checkStatus(protocol: string): Promise<any>;
  };

  addons: {
    listAvailable(): Promise<any[]>;
    getTenantAddons(tenantId?: string | null): Promise<any>;
    subscribe(payload: Record<string, any>): Promise<any>;
    cancel(payload: Record<string, any>): Promise<any>;
    updateConfig(payload: Record<string, any>): Promise<any>;
    verifyDomain(payload: Record<string, any>): Promise<any>;
  };

  upload: {
    image(file: File): Promise<{ success: boolean; url: string; filename: string }>;
  };
}

export declare const api: ApiClient;
export default api;
