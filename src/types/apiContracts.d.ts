// ==============================================================================
// OperaBeauty SaaS - Contratos de Tipagem TypeScript (Item G7 - P2)
// Modelos de Dados e Contratos de Resposta da API REST
// ==============================================================================

export type Role = 'client' | 'professional' | 'manager' | 'admin' | 'superadmin';

export interface User {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  role: Role;
  tenant_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  document?: string | null;
  phone?: string | null;
  plan: 'solo' | 'pro' | 'studio' | 'enterprise';
  is_active: boolean;
  theme?: Record<string, any>;
  settings?: Record<string, any>;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  tenant?: Tenant | null;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  price: number;
  duration_minutes: number;
  category?: string | null;
  is_active: boolean;
  requires_deposit?: boolean;
  deposit_amount?: number;
  created_at: string;
}

export interface Staff {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email?: string | null;
  commission_rate: number;
  is_active: boolean;
  avatar_url?: string | null;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  client_id: string;
  staff_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'pending_deposit' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  total_price: number;
  notes?: string | null;
  created_at: string;
  client?: { name: string; phone: string };
  staff?: { name: string };
  service?: { name: string; price: number; duration_minutes: number };
}

export interface OrderItem {
  id?: string;
  item_type: 'service' | 'product';
  service_id?: string | null;
  inventory_id?: string | null;
  staff_id?: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  commission_rate?: number;
  commission_amount?: number;
  variation_name?: string | null;
  selected_extras?: any[];
}

export interface OrderPayment {
  payment_method: 'cash' | 'pix' | 'credit_card' | 'debit_card' | 'wallet' | 'giftcard';
  amount: number;
  installments?: number;
  giftcard_code?: string | null;
  details?: Record<string, any>;
}

export interface Order {
  id: string;
  tenant_id: string;
  client_id?: string | null;
  appointment_id?: string | null;
  order_number: string;
  status: 'open' | 'paid' | 'cancelled';
  subtotal: number;
  discount_amount: number;
  coupon_code?: string | null;
  tip_amount: number;
  tip_staff_id?: string | null;
  total_amount: number;
  paid_amount: number;
  notes?: string | null;
  created_at: string;
  items?: OrderItem[];
  payments?: OrderPayment[];
}

export interface Coupon {
  id: string;
  tenant_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses?: number | null;
  current_uses: number;
  expires_at?: string | null;
  service_id?: string | null;
  created_at: string;
}

export interface GiftCard {
  id: string;
  tenant_id: string;
  code: string;
  original_value: number;
  current_balance: number;
  status: 'active' | 'partially_redeemed' | 'redeemed' | 'expired';
  recipient_name?: string | null;
  recipient_phone?: string | null;
  message?: string | null;
  expires_at?: string | null;
  created_at: string;
}

export interface CashRegister {
  id: string;
  tenant_id: string;
  opened_by: string;
  opening_date: string;
  closing_date?: string | null;
  initial_balance: number;
  final_balance?: number | null;
  calculated_cash?: number | null;
  cash_difference?: number | null;
  status: 'open' | 'closed';
  notes?: string | null;
}

export interface ClientWallet {
  id: string;
  tenant_id: string;
  client_id: string;
  balance: number;
  points: number;
  updated_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  paid_at?: string | null;
  payment_method?: string | null;
  pix_code?: string | null;
  pix_qrcode_url?: string | null;
  created_at: string;
}
