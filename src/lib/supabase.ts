import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Product, 
  Category, 
  Transaction, 
  User, 
  StoreSettings, 
  StockMovement, 
  ActivityLog 
} from '../types';

// Get credentials from Vite env or localStorage
const getEnvOrStorage = (key: string, storageKey: string): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(storageKey);
    if (saved && saved.trim()) return saved.trim();
  }
  const envVal = (import.meta.env[key] as string) || '';
  return envVal.trim();
};

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export const getSupabaseConfig = () => {
  const url = getEnvOrStorage('VITE_SUPABASE_URL', 'supabase_custom_url');
  const anonKey = getEnvOrStorage('VITE_SUPABASE_ANON_KEY', 'supabase_custom_anon_key');
  const isFromEnv = Boolean(
    ((import.meta.env.VITE_SUPABASE_URL as string) || '').trim() &&
    ((import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '').trim()
  );
  return { 
    url, 
    anonKey, 
    isConfigured: Boolean(url && anonKey),
    isFromEnv 
  };
};

export const setCustomSupabaseConfig = (url: string, anonKey: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('supabase_custom_url', url.trim());
    localStorage.setItem('supabase_custom_anon_key', anonKey.trim());
  }
  cachedClient = null;
  cachedConfigKey = '';
};

export const clearCustomSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('supabase_custom_url');
    localStorage.removeItem('supabase_custom_anon_key');
  }
  cachedClient = null;
  cachedConfigKey = '';
};

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  const currentKey = `${url}::${anonKey}`;
  if (cachedClient && cachedConfigKey === currentKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    cachedConfigKey = currentKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
};

/**
 * Uji koneksi ke database Supabase dan verifikasi kesiapan tabel-tabel utama
 */
export async function testSupabaseConnection(): Promise<{ 
  success: boolean; 
  message: string; 
  details?: { products: number; categories: number; tablesReady: boolean } 
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'URL atau Anon Key Supabase belum diisi atau format tidak valid!' };
  }

  try {
    // 1. Tes tabel categories
    const { count: catCount, error: catError } = await client
      .from('categories')
      .select('*', { count: 'exact', head: true });

    if (catError) {
      if (catError.message.includes('relation "public.categories" does not exist') || catError.code === '42P01') {
        return { 
          success: false, 
          message: 'Tabel database belum dibuat! Buka Supabase Dashboard > SQL Editor, salin isi file supabase_schema.sql lalu klik RUN.' 
        };
      }
      return { success: false, message: `Error Supabase: ${catError.message}` };
    }

    // 2. Tes tabel products
    const { count: prodCount, error: prodError } = await client
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (prodError) {
      return { success: false, message: `Error membaca tabel products: ${prodError.message}` };
    }

    return { 
      success: true, 
      message: 'Koneksi ke Supabase berhasil! Database dan tabel aktif siap digunakan.',
      details: {
        categories: catCount ?? 0,
        products: prodCount ?? 0,
        tablesReady: true
      }
    };
  } catch (err: any) {
    return { success: false, message: `Gagal terhubung: ${err.message || 'Network / CORS error'}` };
  }
}

/**
 * Tarik seluruh data dari database Supabase (Categories, Products, Transactions, Settings, Users, Stock Movements)
 */
export async function fetchSupabaseData(): Promise<{
  success: boolean;
  categories?: Category[];
  products?: Product[];
  transactions?: Transaction[];
  stockMovements?: StockMovement[];
  users?: User[];
  settings?: StoreSettings;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase tidak dikonfigurasi' };
  }

  try {
    // Fetch parallel
    const [
      catRes, 
      prodRes, 
      settingsRes, 
      userRes, 
      txRes, 
      movementRes
    ] = await Promise.all([
      client.from('categories').select('*').order('id', { ascending: true }),
      client.from('products').select('*').order('id', { ascending: true }),
      client.from('settings').select('*').limit(1).maybeSingle(),
      client.from('users').select('*').order('id', { ascending: true }),
      client
        .from('transactions')
        .select(`
          *,
          users ( name ),
          transaction_items ( * )
        `)
        .order('created_at', { ascending: false }),
      client
        .from('stock_movements')
        .select(`
          *,
          products ( name ),
          users ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    // Categories
    const categories: Category[] = (catRes.data || []).map((row: any) => ({
      id: Number(row.id),
      name: row.name,
      slug: row.slug || row.name.toLowerCase().replace(/\s+/g, '-'),
      description: row.description || '',
      created_at: row.created_at,
    }));

    // Products
    const products: Product[] = (prodRes.data || []).map((row: any) => ({
      id: Number(row.id),
      category_id: Number(row.category_id),
      barcode: row.barcode,
      code: row.code,
      name: row.name,
      buy_price: Number(row.buy_price) || 0,
      sell_price: Number(row.sell_price) || 0,
      stock: Number(row.stock) || 0,
      min_stock: Number(row.min_stock) || 0,
      unit: row.unit || 'pcs',
      image_url: row.image || row.image_url || '',
      is_active: row.is_active !== false,
      created_at: row.created_at,
    }));

    // Settings
    let settings: StoreSettings | undefined = undefined;
    if (settingsRes.data) {
      settings = {
        store_name: settingsRes.data.store_name || 'Toko Berkah Sejahtera',
        address: settingsRes.data.address || '',
        phone: settingsRes.data.phone || '',
        receipt_footer: settingsRes.data.receipt_footer || '',
        tax_percent: Number(settingsRes.data.tax_percent) || 0,
        paper_size: (settingsRes.data.paper_size === '80mm' ? '80mm' : '58mm'),
        currency_symbol: settingsRes.data.currency_symbol || 'Rp',
      };
    }

    // Users
    const users: User[] = (userRes.data || []).map((row: any) => ({
      id: Number(row.id),
      username: row.username,
      name: row.name,
      role: row.role as 'admin' | 'cashier',
      is_active: row.is_active !== false,
      must_change_password: Boolean(row.must_change_password),
      created_at: row.created_at,
    }));

    // Transactions with nested items
    const transactions: Transaction[] = (txRes.data || []).map((row: any) => ({
      id: Number(row.id),
      invoice_number: row.invoice_number,
      user_id: Number(row.user_id) || 1,
      user_name: row.users?.name || 'Kasir',
      customer_name: row.customer_name || 'Pelanggan Umum',
      subtotal: Number(row.subtotal) || 0,
      discount_amount: Number(row.discount_amount) || 0,
      tax_amount: Number(row.tax_amount) || 0,
      tax_percent: Number(row.tax_percent) || 0,
      total_amount: Number(row.total_amount) || 0,
      payment_method: row.payment_method || 'tunai',
      cash_received: Number(row.cash_received) || 0,
      change_amount: Number(row.change_amount) || 0,
      status: row.status === 'void' ? 'void' : 'completed',
      void_reason: row.void_reason || undefined,
      void_by: row.void_by || undefined,
      created_at: row.created_at,
      items: (row.transaction_items || []).map((item: any) => ({
        id: Number(item.id),
        transaction_id: Number(item.transaction_id),
        product_id: Number(item.product_id),
        product_name: item.product_name,
        product_code: item.product_code,
        buy_price: Number(item.buy_price) || 0,
        sell_price: Number(item.sell_price) || 0,
        quantity: Number(item.quantity) || 1,
        subtotal: Number(item.subtotal) || 0,
        profit: Number(item.profit) || 0,
      })),
    }));

    // Stock Movements
    const stockMovements: StockMovement[] = (movementRes.data || []).map((row: any) => ({
      id: Number(row.id),
      product_id: Number(row.product_id),
      product_name: row.products?.name || `Produk #${row.product_id}`,
      type: row.type || 'adjustment',
      quantity: Number(row.quantity) || 0,
      previous_stock: Number(row.previous_stock) || 0,
      current_stock: Number(row.current_stock) || 0,
      reason: row.reason || '',
      user_name: row.users?.name || 'Admin',
      created_at: row.created_at,
    }));

    return {
      success: true,
      categories,
      products,
      transactions,
      stockMovements,
      users: users.length > 0 ? users : undefined,
      settings,
    };
  } catch (err: any) {
    console.error('Error fetching Supabase data:', err);
    return { success: false, error: err.message || 'Gagal memuat data dari Supabase' };
  }
}

/**
 * Simpan atau perbarui produk di Supabase
 */
export async function upsertProductInSupabase(product: Product): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: product.id,
      category_id: product.category_id,
      code: product.code,
      barcode: product.barcode,
      name: product.name,
      buy_price: product.buy_price,
      sell_price: product.sell_price,
      stock: product.stock,
      min_stock: product.min_stock,
      unit: product.unit,
      image: product.image_url || null,
      is_active: product.is_active,
    };

    const { error } = await client.from('products').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Gagal sinkronisasi produk ke Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error upserting product in Supabase:', err);
    return false;
  }
}

/**
 * Hapus produk dari Supabase
 */
export async function deleteProductFromSupabase(productId: number): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('products').delete().eq('id', productId);
    if (error) {
      console.warn('Gagal menghapus produk dari Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error deleting product from Supabase:', err);
    return false;
  }
}

/**
 * Simpan atau perbarui kategori di Supabase
 */
export async function upsertCategoryInSupabase(category: Category): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: category.id,
      name: category.name,
      slug: category.slug || category.name.toLowerCase().replace(/\s+/g, '-'),
      description: category.description || null,
    };

    const { error } = await client.from('categories').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Gagal sinkronisasi kategori ke Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error upserting category in Supabase:', err);
    return false;
  }
}

/**
 * Hapus kategori dari Supabase
 */
export async function deleteCategoryFromSupabase(categoryId: number): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('categories').delete().eq('id', categoryId);
    if (error) {
      console.warn('Gagal menghapus kategori dari Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error deleting category from Supabase:', err);
    return false;
  }
}

/**
 * Simpan transaksi dan item detail transaksi ke Supabase
 */
export async function saveTransactionToSupabase(tx: Transaction): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    // 1. Simpan header transaksi
    const txPayload = {
      id: tx.id,
      invoice_number: tx.invoice_number,
      user_id: tx.user_id,
      customer_name: tx.customer_name || 'Pelanggan Umum',
      subtotal: tx.subtotal,
      discount_amount: tx.discount_amount,
      tax_percent: tx.tax_percent,
      tax_amount: tx.tax_amount,
      total_amount: tx.total_amount,
      payment_method: tx.payment_method,
      cash_received: tx.cash_received,
      change_amount: tx.change_amount,
      payment_reference: tx.invoice_number,
      status: tx.status,
      void_reason: tx.void_reason || null,
      void_by: tx.void_by || null,
      created_at: tx.created_at,
    };

    const { error: txError } = await client.from('transactions').upsert(txPayload, { onConflict: 'id' });
    if (txError) {
      console.warn('Gagal menyimpan transaksi ke Supabase:', txError.message);
      return false;
    }

    // 2. Simpan item transaksi
    if (tx.items && tx.items.length > 0) {
      const itemsPayload = tx.items.map((item, idx) => ({
        id: item.id || Date.now() + idx,
        transaction_id: tx.id,
        product_id: item.product_id,
        product_code: item.product_code,
        product_name: item.product_name,
        buy_price: item.buy_price,
        sell_price: item.sell_price,
        quantity: item.quantity,
        discount_amount: 0,
        subtotal: item.subtotal,
        profit: item.profit,
      }));

      const { error: itemsError } = await client
        .from('transaction_items')
        .upsert(itemsPayload, { onConflict: 'id' });

      if (itemsError) {
        console.warn('Gagal menyimpan transaction_items ke Supabase:', itemsError.message);
      }
    }

    return true;
  } catch (err) {
    console.error('Error saving transaction to Supabase:', err);
    return false;
  }
}

/**
 * Batalkan transaksi (Void) di Supabase
 */
export async function voidTransactionInSupabase(
  transactionId: number,
  voidReason: string,
  voidBy: string
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('transactions')
      .update({
        status: 'void',
        void_reason: voidReason,
        void_by: voidBy,
        void_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    if (error) {
      console.warn('Gagal memperbarui status void di Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error voiding transaction in Supabase:', err);
    return false;
  }
}

/**
 * Catat pergerakan stok ke Supabase
 */
export async function insertStockMovementInSupabase(movement: StockMovement): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: movement.id,
      product_id: movement.product_id,
      type: movement.type,
      quantity: movement.quantity,
      previous_stock: movement.previous_stock,
      current_stock: movement.current_stock,
      reason: movement.reason,
      created_at: movement.created_at,
    };

    const { error } = await client.from('stock_movements').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Gagal mencatat stock_movement ke Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error inserting stock movement into Supabase:', err);
    return false;
  }
}

/**
 * Simpan pengaturan toko ke Supabase
 */
export async function updateSettingsInSupabase(settings: StoreSettings): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: 1,
      store_name: settings.store_name,
      address: settings.address,
      phone: settings.phone,
      receipt_footer: settings.receipt_footer,
      tax_percent: settings.tax_percent,
      paper_size: settings.paper_size,
      currency_symbol: settings.currency_symbol || 'Rp',
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('settings').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Gagal memperbarui settings di Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error updating settings in Supabase:', err);
    return false;
  }
}

/**
 * Catat activity log ke Supabase
 */
export async function insertActivityLogInSupabase(log: ActivityLog): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: log.id,
      user_id: log.user_id,
      action: log.action,
      description: log.description,
      ip_address: log.ip_address || '127.0.0.1',
      created_at: log.created_at,
    };

    const { error } = await client.from('activity_logs').insert(payload);
    if (error) {
      console.warn('Gagal mencatat activity_log ke Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error logging to Supabase:', err);
    return false;
  }
}

/**
 * Upload seluruh data lokal (kategori, produk, pengaturan) ke Supabase (Seeding)
 */
export async function pushAllLocalDataToSupabase(data: {
  categories: Category[];
  products: Product[];
  settings: StoreSettings;
  users: User[];
}): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase belum dikonfigurasi!' };
  }

  try {
    // 1. Categories
    if (data.categories.length > 0) {
      const catRows = data.categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug || c.name.toLowerCase().replace(/\s+/g, '-'),
        description: c.description || null,
      }));
      const { error: catErr } = await client.from('categories').upsert(catRows, { onConflict: 'id' });
      if (catErr) throw new Error(`Gagal upload kategori: ${catErr.message}`);
    }

    // 2. Products
    if (data.products.length > 0) {
      const prodRows = data.products.map((p) => ({
        id: p.id,
        category_id: p.category_id,
        code: p.code,
        barcode: p.barcode,
        name: p.name,
        buy_price: p.buy_price,
        sell_price: p.sell_price,
        stock: p.stock,
        min_stock: p.min_stock,
        unit: p.unit,
        image: p.image_url || null,
        is_active: p.is_active,
      }));
      const { error: prodErr } = await client.from('products').upsert(prodRows, { onConflict: 'id' });
      if (prodErr) throw new Error(`Gagal upload produk: ${prodErr.message}`);
    }

    // 3. Settings
    const { error: setErr } = await client.from('settings').upsert({
      id: 1,
      store_name: data.settings.store_name,
      address: data.settings.address,
      phone: data.settings.phone,
      receipt_footer: data.settings.receipt_footer,
      tax_percent: data.settings.tax_percent,
      paper_size: data.settings.paper_size,
      currency_symbol: data.settings.currency_symbol || 'Rp',
    }, { onConflict: 'id' });
    if (setErr) throw new Error(`Gagal upload settings: ${setErr.message}`);

    return {
      success: true,
      message: `Berhasil mengunggah ${data.categories.length} kategori, ${data.products.length} produk, dan profil toko ke Supabase!`,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal mengunggah data ke Supabase' };
  }
}

/**
 * Listener Realtime Supabase untuk sinkronisasi otomatis multi-kasir
 */
export function subscribeSupabaseRealtime(callbacks: {
  onProductChange?: () => void;
  onTransactionChange?: () => void;
  onStockChange?: () => void;
}): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  try {
    const channel = client
      .channel('pos-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        callbacks.onProductChange?.();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        callbacks.onTransactionChange?.();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, () => {
        callbacks.onStockChange?.();
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.error('Failed to subscribe to realtime changes:', err);
    return () => {};
  }
}

/**
 * Konversi base64/dataURL ke Blob untuk upload file
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(parts[1]);
  const array = [];
  for (let i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }
  return new Blob([new Uint8Array(array)], { type: mime });
}

/**
 * Upload foto produk ke Supabase Storage (bucket: 'product-images')
 */
export async function uploadProductImageToSupabase(
  input: File | Blob | string,
  preferredName?: string
): Promise<{ success: boolean; publicUrl?: string; message?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase belum dikonfigurasi.' };
  }

  try {
    let fileBody: Blob;
    let contentType = 'image/jpeg';
    let fileExt = 'jpg';

    if (typeof input === 'string') {
      if (input.startsWith('data:')) {
        fileBody = dataUrlToBlob(input);
        contentType = fileBody.type || 'image/jpeg';
        fileExt = contentType.split('/')[1] || 'jpg';
      } else {
        // Sudah berupa URL
        return { success: true, publicUrl: input };
      }
    } else {
      fileBody = input;
      contentType = input.type || 'image/jpeg';
      fileExt = input.type ? input.type.split('/')[1] : 'jpg';
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 7);
    const sanitizedName = preferredName
      ? preferredName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)
      : 'prod';
    const filePath = `products/${sanitizedName}_${timestamp}_${randomStr}.${fileExt}`;

    // Upload ke bucket 'product-images'
    const { data: uploadData, error: uploadError } = await client.storage
      .from('product-images')
      .upload(filePath, fileBody, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

    if (uploadError) {
      console.warn('Gagal upload ke Supabase Storage:', uploadError.message);
      return { success: false, message: uploadError.message };
    }

    // Ambil URL Publik
    const { data: urlData } = client.storage
      .from('product-images')
      .getPublicUrl(uploadData.path);

    return {
      success: true,
      publicUrl: urlData.publicUrl,
      message: 'Foto berhasil disimpan di Supabase Storage!',
    };
  } catch (err: any) {
    console.error('Error uploading product image to Supabase:', err);
    return { 
      success: false, 
      message: err.message || 'Gagal mengunggah foto ke Supabase Storage' 
    };
  }
}

