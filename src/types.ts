export interface Profile {
  id: string;
  dni: string;
  full_name: string;
  email: string;
  birth_date: string;
  points: number;
  role: 'client' | 'waiter' | 'admin';
  branch?: string | null;
  is_mystery_shopper?: boolean;
  created_at: string;
}

// Reporte de supervisión enviado por un cliente oculto (mystery shopper).
// Solo lo ven el propio cliente oculto y el administrador.
export interface MysteryReport {
  id: string;
  client_id: string;
  branch?: string | null;
  visit_date?: string | null;
  rating_cleanliness?: number | null;
  rating_service?: number | null;
  rating_speed?: number | null;
  rating_food?: number | null;
  rating_overall?: number | null;
  comment?: string | null;
  status: 'pendiente' | 'revisado';
  points_awarded?: number | null;
  created_at: string;
  // Relación opcional (cuando el admin trae el nombre del cliente)
  profiles?: { full_name?: string; email?: string; dni?: string } | null;
}

export interface Transaction {
  id: string;
  client_id: string;
  waiter_id: string;
  amount: number;
  points_earned: number;
  branch?: string;
  redemption_code?: string;
  invoice_number?: string;
  description: string;
  created_at: string;
  // Optional relations
  transaction_items?: TransactionItem[];
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  item_name: string;
  quantity: number;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  points_conversion_rate: number; // amount of money for 1 point
  updated_at: string;
}

export interface Prize {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  image_url: string;
  is_active: boolean;
}

export interface AppNotification {
  id: string;
  client_id: string | null; // null = para todos
  title: string;
  message: string;
  created_at: string;
}
