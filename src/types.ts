export interface Profile {
  id: string;
  dni: string;
  full_name: string;
  email: string;
  birth_date: string;
  points: number;
  role: 'client' | 'waiter' | 'admin';
  created_at: string;
}

export interface Transaction {
  id: string;
  client_id: string;
  waiter_id: string;
  amount: number;
  points_earned: number;
  branch?: string;
  description: string;
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
