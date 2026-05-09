export type UserRole = 'stringer' | 'customer';
export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'delivered';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';
export type InventoryCategory = 'string' | 'grip' | 'dampener' | 'other';
export type InventoryType = 'reel' | 'set' | 'unit';
export type ItemType = 'main_string' | 'cross_string' | 'service' | 'other';
export type SenderType = 'shop' | 'customer';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  shop_id: string | null;
  role: UserRole;
  has_completed_onboarding: boolean;
  onesignal_player_id: string | null;
  updated_at: string;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  settings: Record<string, any>;
  created_at: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  profile_id: string | null;
  first_name: string;
  last_name: string;
  name?: string; // Support parts of code using .name
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Racquet {
  id: string;
  customer_id: string;
  shop_id: string;
  brand: string;
  model: string;
  serial_number: string | null;
  qr_code: string | null;
  head_size: number;
  string_pattern_mains: number;
  string_pattern_crosses: number;
  mains_skip: string | null;
  mains_tie_off: string | null;
  crosses_start: string | null;
  crosses_tie_off: string | null;
  one_piece_length: string | null;
  two_piece_length: string | null;
  stringing_instructions: string | null;
  current_string_main: string | null;
  current_string_cross: string | null;
  current_tension_main: number;
  current_tension_cross: number;
  specs_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customers?: {
    shop_id: string;
  };
}

export interface InventoryItem {
  id: string;
  shop_id: string;
  category: string; 
  brand: string;
  model: string;
  name?: string;
  type: string | null;
  color: string | null;
  gauge: string | null;
  quantity: number;
  unit_price: number | null;
  low_stock_threshold: number;
  packaging?: string;
  length_unit?: 'm' | 'ft';
  total_length?: number;
  remaining_length?: number;
  grip_type?: string;
  qr_code?: string;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  shop_id: string;
  customer_id: string;
  racquet_id: string | null;
  status: JobStatus;
  payment_status: PaymentStatus;
  total_price: number;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  customers?: {
    first_name: string;
    last_name: string;
    email: string | null;
  };
}

export interface JobDetail {
  id: string;
  job_id: string;
  item_type: ItemType;
  inventory_id: string | null;
  tension: string | null;
  price: number;
  created_at: string;
}

export interface Message {
  id: string;
  shop_id: string;
  customer_id: string;
  sender_type: SenderType;
  content: string;
  is_read: boolean;
  created_at: string;
  customers?: {
    first_name: string;
    last_name: string;
  };
}
