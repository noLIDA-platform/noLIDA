export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessService {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  price_min: number | null;
  price_max: number | null;
  currency: string;
  duration_minutes: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessProduct {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  price: number;
  currency: string;
  stock: number | null;
  images: string[] | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}