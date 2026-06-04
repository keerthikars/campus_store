export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          created_at?: string;
        };
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          address: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string;
          phone?: string;
          address?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string;
          address?: string;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          category_id: string | null;
          price: number;
          quantity: number;
          supplier_id: string | null;
          image_url: string;
          sku: string;
          description: string;
          low_stock_threshold: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category_id?: string | null;
          price: number;
          quantity: number;
          supplier_id?: string | null;
          image_url?: string;
          sku?: string;
          description?: string;
          low_stock_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category_id?: string | null;
          price?: number;
          quantity?: number;
          supplier_id?: string | null;
          image_url?: string;
          sku?: string;
          description?: string;
          low_stock_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      sales: {
        Row: {
          id: string;
          customer_name: string;
          customer_email: string;
          subtotal: number;
          tax_rate: number;
          tax_amount: number;
          total_amount: number;
          payment_method: string;
          status: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          customer_name?: string;
          customer_email?: string;
          subtotal: number;
          tax_rate?: number;
          tax_amount: number;
          total_amount: number;
          payment_method?: string;
          status?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          customer_name?: string;
          customer_email?: string;
          subtotal?: number;
          tax_rate?: number;
          tax_amount?: number;
          total_amount?: number;
          payment_method?: string;
          status?: string;
          created_at?: string;
          created_by?: string | null;
        };
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Insert: {
          id?: string;
          sale_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Update: {
          id?: string;
          sale_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
        };
      };
    };
  };
}

// App types
export interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category_id: string | null;
  price: number;
  quantity: number;
  supplier_id: string | null;
  image_url: string;
  sku: string;
  description: string;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
  categories?: { name: string } | null;
  suppliers?: { name: string } | null;
}

export interface Sale {
  id: string;
  customer_name: string;
  customer_email: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  created_by: string | null;
  sale_items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type Theme = 'light' | 'dark';
