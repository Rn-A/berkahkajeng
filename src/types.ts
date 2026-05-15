export type WoodCondition = 'X' | 'Rijelk' | 'Super kecil' | 'Super' | 'B' | 'C' | 'C/Standar' | 'D' | 'Kerab';

export const DIAMETER_RANGES = [
  { label: '10-14', min: 10, max: 14 },
  { label: '15-19', min: 15, max: 19 },
  { label: '20-24', min: 20, max: 24 },
  { label: '25-29', min: 25, max: 29 },
  { label: '30+', min: 30, max: 100 },
];

export interface LogEntry {
  id: string;
  diameter: number; // in cm
  volume: number; // in m3
}

export interface WoodCategory {
  id: string;
  name?: string;
  woodType: string;
  length: number; // in cm (updated from meters)
  condition: WoodCondition;
  pricePerM3: number; // Rp per m3
  logs: LogEntry[];
}

export interface WoodSet {
  id: string;
  supplierName: string;
  date: string;
  categories: WoodCategory[];
  total_volume: number;
  total_value: number;
}

export interface InventoryItem {
  id: number;
  wood_type: string;
  diameter_group: string;
  length: number;
  condition_val: string;
  total_logs: number;
  total_volume: number;
  avg_price: number;
  total_value: number;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  wood_type: string;
  diameter_group: string;
  length: number;
  condition?: string;
  volume: number;
  sale_price_per_m3: number;
  cost_price_per_m3: number;
  subtotal_revenue: number;
  subtotal_cost: number;
  profit: number;
}

export interface Sale {
  id: string;
  customer_name: string;
  date: string;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  items: SaleItem[];
}

export interface User {
  id: number;
  username: string;
  role: 'owner' | 'mandor';
  full_name: string;
  email?: string;
  token: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  created_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  created_at?: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  details: string;
  created_at: string;
}

export interface DashboardData {
  inventory: { total_volume: number; total_value: number };
  purchases: { total_volume: number; total_value: number };
  sales: { total_revenue: number; total_profit: number; total_volume: number };
  expenses: { total_expenses: number };
  stockComposition?: { wood_type: string; volume: number }[];
  trends?: {
    purchases: any[];
    sales: any[];
    expenses: any[];
  };
}
