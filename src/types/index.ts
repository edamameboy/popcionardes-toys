// src/types/index.ts

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  bg_color: string;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  address: string | null;
  created_at: string;
};

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';

export type Order = {
  id: string;
  user_id: string;
  total_amount: number;
  status: OrderStatus;
  midtrans_transaction_id: string | null;
  biteship_tracking_id: string | null;
  created_at: string;
};