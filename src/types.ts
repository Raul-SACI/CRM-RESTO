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
  visit_time?: string | null;
  // Calificaciones (1 a 5 estrellas)
  rating_cleanliness?: number | null;          // Limpieza e higiene del local
  rating_cleanliness_bathroom?: number | null; // Limpieza e higiene del baño
  rating_service?: number | null;              // Predisposición del mozo/a
  rating_aesthetics?: number | null;           // Estética de la comida
  rating_food?: number | null;                 // Calidad de la comida
  rating_aesthetics_drink?: number | null;     // Estética de la bebida
  rating_food_drink?: number | null;           // Calidad de la bebida
  rating_overall?: number | null;              // Calificación general
  rating_speed?: number | null;                // (obsoleto, se conserva por compatibilidad)
  // Datos y tiempos
  waiter_name?: string | null;                 // Nombre de quién atendió
  wait_greeting?: string | null;               // Espera hasta que te atendieron
  wait_order_taken?: string | null;            // Espera hasta que tomaron el pedido
  order_type?: string | null;                  // 'bebida' | 'bebida_comida'
  wait_order_delivered?: string | null;        // Espera hasta que trajeron el pedido
  wait_bill?: string | null;                   // Espera hasta que trajeron la cuenta
  photo_url?: string | null;                   // Foto del plato/bebida
  comment?: string | null;                     // Observaciones
  custom_answers?: Record<string, any> | null; // Respuestas a preguntas personalizadas (por id)
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
