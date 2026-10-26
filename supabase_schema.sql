-- ====================================================================
-- SKEMA SUPABASE (POSTGRESQL 15+) UNTUK POS KASIR MODERN
-- Dilengkapi Row Level Security (RLS), Realtime, Trigger & Seeder
-- Buka Supabase Dashboard -> SQL Editor -> Tempel & Klik "Run"
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABEL PENGGUNA (users)
CREATE TABLE IF NOT EXISTS public.users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL, -- Bcrypt hash
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role_status ON public.users(role, is_active);

-- 3. TABEL KATEGORI PRODUK (categories)
CREATE TABLE IF NOT EXISTS public.categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);

-- 4. TABEL PRODUK (products)
CREATE TABLE IF NOT EXISTS public.products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  code VARCHAR(50) NOT NULL UNIQUE,
  barcode VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  buy_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  sell_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  stock INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 5,
  unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
  image VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(code);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock, min_stock);

-- 5. TABEL PERGERAKAN STOK (stock_movements)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity INT NOT NULL,
  previous_stock INT NOT NULL,
  current_stock INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  reference_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_created ON public.stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_product ON public.stock_movements(product_id);

-- 6. TABEL PENGATURAN TOKO (settings)
CREATE TABLE IF NOT EXISTS public.settings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_name VARCHAR(150) NOT NULL DEFAULT 'Toko Berkah Sejahtera',
  address TEXT,
  phone VARCHAR(50),
  receipt_footer TEXT,
  tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 11.00,
  paper_size VARCHAR(10) NOT NULL DEFAULT '58mm' CHECK (paper_size IN ('58mm', '80mm')),
  currency_symbol VARCHAR(10) NOT NULL DEFAULT 'Rp',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TABEL TRANSAKSI PENJUALAN (transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  user_id BIGINT REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  customer_name VARCHAR(100) NOT NULL DEFAULT 'Pelanggan Umum',
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'tunai' CHECK (payment_method IN ('tunai', 'qris', 'debit')),
  cash_received NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  change_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  payment_reference VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'void')),
  void_reason VARCHAR(255),
  void_by VARCHAR(100),
  void_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON public.transactions(invoice_number);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- 8. TABEL ITEM DETAIL TRANSAKSI (transaction_items)
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_id BIGINT NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  product_code VARCHAR(50) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  buy_price NUMERIC(15, 2) NOT NULL,
  sell_price NUMERIC(15, 2) NOT NULL,
  quantity INT NOT NULL,
  discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  subtotal NUMERIC(15, 2) NOT NULL,
  profit NUMERIC(15, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_transaction ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_items_product ON public.transaction_items(product_id);

-- 9. TABEL LOG AKTIVITAS (activity_logs)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  action VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  ip_address VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon & authenticated role read-write for POS app usage:
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public write products" ON public.products FOR ALL USING (true);

CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public write categories" ON public.categories FOR ALL USING (true);

CREATE POLICY "Public read transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Public write transactions" ON public.transactions FOR ALL USING (true);

CREATE POLICY "Public read transaction_items" ON public.transaction_items FOR SELECT USING (true);
CREATE POLICY "Public write transaction_items" ON public.transaction_items FOR ALL USING (true);

CREATE POLICY "Public read stock_movements" ON public.stock_movements FOR SELECT USING (true);
CREATE POLICY "Public write stock_movements" ON public.stock_movements FOR ALL USING (true);

CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public update settings" ON public.settings FOR ALL USING (true);

CREATE POLICY "Public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Public write users" ON public.users FOR ALL USING (true);

CREATE POLICY "Public read activity_logs" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "Public write activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- ====================================================================
-- REALTIME SUBSCRIPTIONS
-- ====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;

-- ====================================================================
-- SEEDER DATA AWAL
-- ====================================================================
INSERT INTO public.users (username, password, name, role, is_active, must_change_password)
VALUES 
  ('admin', '$2y$10$w09ZkM4uJ8u5jQ7q8X2aC.L3rM9tY6pW1eA5sD7fG8hJ9kL0z1x2c', 'Budi Santoso (Admin)', 'admin', true, true),
  ('kasir', '$2y$10$tZzT8m0gL9O0R/j7c2Pq4eeQfG5tOaOcl1c7Z940z6P6sD4G4mD5i', 'Siti Rahma (Kasir 1)', 'cashier', true, true),
  ('kasir2', '$2y$10$tZzT8m0gL9O0R/j7c2Pq4eeQfG5tOaOcl1c7Z940z6P6sD4G4mD5i', 'Ahmad Fauzi (Kasir 2)', 'cashier', true, false)
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.settings (id, store_name, address, phone, receipt_footer, tax_percent, paper_size, currency_symbol)
OVERRIDING SYSTEM VALUE
VALUES (1, 'Toko Berkah Sejahtera', 'Jl. Pemuda No. 45, Kebayoran Baru, Jakarta Selatan', '0812-3456-7890', 'Terima kasih atas kunjungan Anda! Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.', 11.00, '58mm', 'Rp')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, name, slug, description)
OVERRIDING SYSTEM VALUE
VALUES 
  (1, 'Minuman', 'minuman', 'Aneka minuman dingin, kopi botol, teh kemasan, dan air mineral'),
  (2, 'Makanan Ringan', 'snack', 'Snack, biskuit, keripik kentang, dan camilan'),
  (3, 'Sembako & Dapur', 'sembako', 'Beras, minyak goreng kemasan, gula pasir, mie instan'),
  (4, 'Perawatan Diri', 'perawatan', 'Sabun mandi, pasta gigi, sampo, dan deterjen'),
  (5, 'Rokok & Tembakau', 'rokok', 'Rokok filter, kretek, dan korek api gas')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (id, category_id, code, barcode, name, buy_price, sell_price, stock, min_stock, unit, is_active)
OVERRIDING SYSTEM VALUE
VALUES 
  (1, 1, 'MIN-001', '8991001100012', 'Kopi Susu Gula Aren 250ml', 6500.00, 10000.00, 45, 10, 'botol', true),
  (2, 1, 'MIN-002', '8991002200021', 'Teh Botol Sosro Kotak 250ml', 2800.00, 4500.00, 60, 15, 'kotak', true),
  (3, 1, 'MIN-003', '8991003300035', 'Air Mineral Le Minerale 600ml', 2200.00, 3500.00, 80, 20, 'botol', true),
  (4, 2, 'SNK-001', '8992001100048', 'Chitato Sapi Panggang 68g', 9000.00, 12500.00, 28, 8, 'bungkus', true),
  (5, 2, 'SNK-002', '8992002200059', 'Oreo Vanilla Cream 133g', 7500.00, 10500.00, 22, 10, 'roll', true),
  (6, 2, 'SNK-003', '8992003300062', 'SilverQueen Cashew 58g', 12000.00, 16500.00, 14, 5, 'batang', true),
  (7, 3, 'SMB-001', '8993001100073', 'Indomie Goreng Spesial 85g', 2600.00, 3500.00, 140, 30, 'bungkus', true),
  (8, 3, 'SMB-002', '8993002200084', 'Minyak Goreng Bimoli Refill 1L', 16500.00, 20000.00, 5, 10, 'pouch', true),
  (9, 3, 'SMB-003', '8993003300095', 'Beras Premium Ramos 5kg', 68000.00, 76000.00, 4, 8, 'karung', true),
  (10, 4, 'PRW-001', '8994001100101', 'Sabun Lifebuoy Total 10 110g', 3800.00, 5500.00, 35, 12, 'batang', true),
  (11, 4, 'PRW-002', '8994002200112', 'Pepsodent Pencegah Gigi Berlubang 190g', 9800.00, 13500.00, 18, 6, 'tube', true),
  (12, 5, 'RKK-001', '8995001100123', 'Sampoerna A Mild 16 Batang', 31000.00, 35000.00, 25, 10, 'bungkus', true)
ON CONFLICT (code) DO NOTHING;

-- ====================================================================
-- 10. SUPABASE STORAGE (PENYIMPANAN FOTO PRODUK)
-- ====================================================================
-- Buat bucket penyimpanan foto produk public (product-images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Kebijakan Akses (RLS) untuk bucket product-images
DO $$
BEGIN
  -- Select Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read product-images'
  ) THEN
    CREATE POLICY "Public read product-images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
  END IF;

  -- Insert Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public upload product-images'
  ) THEN
    CREATE POLICY "Public upload product-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
  END IF;

  -- Update Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public update product-images'
  ) THEN
    CREATE POLICY "Public update product-images" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images');
  END IF;

  -- Delete Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public delete product-images'
  ) THEN
    CREATE POLICY "Public delete product-images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');
  END IF;
END $$;

