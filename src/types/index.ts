export type UserRole = 'admin' | 'cashier';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  must_change_password?: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  created_at?: string;
}

export interface Product {
  id: number;
  category_id: number;
  barcode: string;
  code: string;
  name: string;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  image_url?: string;
  is_active: boolean;
  created_at?: string;
}

export type StockMovementType = 'in' | 'out' | 'adjustment';

export interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  type: StockMovementType;
  quantity: number;
  previous_stock: number;
  current_stock: number;
  reason: string;
  user_name: string;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount_percent: number; // 0 - 100
  discount_amount: number;  // Rp
  subtotal: number;
}

export type PaymentMethod = 'tunai' | 'qris' | 'debit';

export interface TransactionItem {
  id: number;
  transaction_id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  buy_price: number;
  sell_price: number;
  quantity: number;
  subtotal: number;
  profit: number;
}

export interface Transaction {
  id: number;
  invoice_number: string;
  user_id: number;
  user_name: string;
  customer_name?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  tax_percent: number;
  total_amount: number;
  payment_method: PaymentMethod;
  cash_received: number;
  change_amount: number;
  status: 'completed' | 'void';
  void_reason?: string;
  void_by?: string;
  created_at: string;
  items: TransactionItem[];
}

export interface StoreSettings {
  store_name: string;
  address: string;
  phone: string;
  receipt_footer: string;
  tax_percent: number;
  paper_size: '58mm' | '80mm';
  currency_symbol: string;
}

export type ActivityAction = 
  | 'login' 
  | 'logout' 
  | 'transaction' 
  | 'void' 
  | 'stock_update' 
  | 'product_crud' 
  | 'user_crud' 
  | 'settings_update';

export interface ActivityLog {
  id: number;
  user_id: number;
  user_name: string;
  action: ActivityAction;
  description: string;
  ip_address: string;
  created_at: string;
}
