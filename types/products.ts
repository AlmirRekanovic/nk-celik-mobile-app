export interface WCProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: any[];
  stock_status: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  images: WCProductImage[];
  categories: WCProductCategory[];
  tags: any[];
  attributes: any[];
  variations: number[];
  meta_data: any[];
}

export interface WCProductImage {
  id: number;
  src: string;
  name: string;
  alt: string;
}

export interface WCProductCategory {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  shortDescription: string;
  price: string;
  salePrice?: string;
  onSale: boolean;
  imageUrl?: string;
  permalink: string;
  stockStatus: string;
  stockQuantity: number | null;
  purchasable: boolean;
  categories: string[];
}

export interface Ticket {
  id: string;
  order_id: number;
  product_id: number;
  ticket_code: string;
  ticket_type: string;
  customer_email: string;
  customer_name: string;
  member_id?: string;
  event_name: string;
  event_date?: string;
  status: 'active' | 'used' | 'cancelled';
  check_in_time?: string;
  check_in_by?: string;
  created_at: string;
  updated_at: string;
}
