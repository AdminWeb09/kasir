import React, { useState, useMemo, useRef } from 'react';
import { Product, Category } from '../types';
import { formatRupiah, processImageFileToDataUrl } from '../utils/helpers';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Barcode, 
  FolderPlus, 
  Sparkles, 
  X, 
  Check,
  Layers,
  AlertTriangle,
  Image as ImageIcon,
  Camera,
  Upload,
  RefreshCw,
  Cloud,
  CloudUpload,
  CheckCircle2
} from 'lucide-react';
import { getSupabaseConfig, uploadProductImageToSupabase } from '../lib/supabase';

interface ProductManagementProps {
  products: Product[];
  categories: Category[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (id: number, product: Partial<Product>) => void;
  onDeleteProduct: (id: number) => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onDeleteCategory: (id: number) => void;
}

export const ProductManagement: React.FC<ProductManagementProps> = ({
  products,
  categories,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddCategory,
  onDeleteCategory,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'categories'>('products');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');

  // Product Modal Form
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    barcode: '',
    category_id: categories[0]?.id || 1,
    buy_price: 0,
    sell_price: 0,
    stock: 0,
    min_stock: 5,
    unit: 'pcs',
    image_url: '',
    is_active: true,
  });

  // Device image upload & barcode scanner state
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isUploadingToSupabase, setIsUploadingToSupabase] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Category Modal Form
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Process image from local device storage & upload to Supabase if connected
  const processImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setImageError('File yang dipilih harus berupa gambar (JPG, PNG, WebP).');
      return;
    }
    setImageError(null);
    setUploadSuccessMsg(null);
    setIsProcessingImage(true);
    try {
      const dataUrl = await processImageFileToDataUrl(file, 640, 640, 0.82);
      setFormData((prev) => ({ ...prev, image_url: dataUrl }));

      // Jika Supabase terhubung, langsung simpan foto ke Supabase Storage (bucket: product-images)
      if (getSupabaseConfig().isConfigured) {
        setIsUploadingToSupabase(true);
        const res = await uploadProductImageToSupabase(dataUrl, formData.code || formData.name || 'product');
        if (res.success && res.publicUrl) {
          setFormData((prev) => ({ ...prev, image_url: res.publicUrl! }));
          setUploadSuccessMsg('Foto produk berhasil diunggah ke Supabase Storage!');
          setTimeout(() => setUploadSuccessMsg(null), 3500);
        } else {
          console.warn('Fallback ke data URL lokal:', res.message);
        }
        setIsUploadingToSupabase(false);
      }
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : 'Gagal memproses gambar dari perangkat.');
    } finally {
      setIsProcessingImage(false);
      setIsUploadingToSupabase(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleManualUploadToSupabase = async () => {
    if (!formData.image_url) return;
    setIsUploadingToSupabase(true);
    setImageError(null);
    setUploadSuccessMsg(null);
    const res = await uploadProductImageToSupabase(formData.image_url, formData.code || formData.name || 'product');
    setIsUploadingToSupabase(false);
    if (res.success && res.publicUrl) {
      setFormData((prev) => ({ ...prev, image_url: res.publicUrl! }));
      setUploadSuccessMsg('Foto produk berhasil disimpan di Supabase Storage!');
      setTimeout(() => setUploadSuccessMsg(null), 3500);
    } else {
      setImageError(`Gagal upload ke Supabase Storage: ${res.message || 'Pastikan bucket product-images sudah aktif di Supabase'}`);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleDropImage = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  // Filter products
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
      const q = search.toLowerCase();
      const matchSearch = 
        !q || 
        p.name.toLowerCase().includes(q) || 
        p.code.toLowerCase().includes(q) || 
        p.barcode.includes(q);
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, search]);

  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    const nextCode = `PRD-${String(products.length + 1).padStart(3, '0')}`;
    const randomBarcode = '899' + Math.floor(1000000000 + Math.random() * 9000000000);
    setFormData({
      name: '',
      code: nextCode,
      barcode: randomBarcode,
      category_id: categories[0]?.id || 1,
      buy_price: 0,
      sell_price: 0,
      stock: 10,
      min_stock: 5,
      unit: 'pcs',
      image_url: '',
      is_active: true,
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setFormData({
      name: product.name,
      code: product.code,
      barcode: product.barcode,
      category_id: product.category_id,
      buy_price: product.buy_price,
      sell_price: product.sell_price,
      stock: product.stock,
      min_stock: product.min_stock,
      unit: product.unit,
      image_url: product.image_url || '',
      is_active: product.is_active,
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingProductId) {
      onUpdateProduct(editingProductId, formData);
    } else {
      onAddProduct(formData);
    }
    setIsProductModalOpen(false);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    onAddCategory({
      name: catName,
      slug: catName.toLowerCase().replace(/\s+/g, '-'),
      description: catDesc,
    });
    setCatName('');
    setCatDesc('');
    setIsCategoryModalOpen(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Manajemen Produk & Kategori</h2>
          <p className="text-xs text-slate-500">
            Kelola data master barang dagangan, harga beli/jual, barcode, stok awal, dan kelompok kategori.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'products' ? (
            <button
              onClick={handleOpenAddProduct}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </button>
          ) : (
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Tambah Kategori</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs: Products vs Categories */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('products')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'products'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Daftar Produk ({products.length})
        </button>
        <button
          onClick={() => setActiveSubTab('categories')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
            activeSubTab === 'categories'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Kategori ({categories.length})
        </button>
      </div>

      {activeSubTab === 'products' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, kode atau barcode..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full sm:w-auto text-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-700"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Produk</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Barcode / SKU</th>
                    <th className="px-4 py-3 text-right">Harga Beli</th>
                    <th className="px-4 py-3 text-right">Harga Jual</th>
                    <th className="px-4 py-3 text-center">Stok</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                        Tidak ada data produk yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((prod) => {
                      const cat = categories.find((c) => c.id === prod.category_id);
                      const isLowStock = prod.stock <= prod.min_stock;
                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                                <ImageIcon className="w-5 h-5 text-slate-300 absolute" />
                                {prod.image_url && (
                                  <img
                                    src={prod.image_url}
                                    alt={prod.name}
                                    className="w-full h-full object-cover relative z-10"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{prod.name}</p>
                                <span className="text-[10px] text-slate-400 font-mono">{prod.code}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {cat?.name || 'Tanpa Kategori'}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                            {prod.barcode}
                          </td>
                          <td className="px-4 py-3 text-right font-mono-numbers">
                            {formatRupiah(prod.buy_price)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono-numbers">
                            {formatRupiah(prod.sell_price)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-mono-numbers font-bold text-xs ${
                              isLowStock ? 'text-amber-600' : 'text-slate-800'
                            }`}>
                              {prod.stock} {prod.unit}
                            </span>
                            {isLowStock && (
                              <p className="text-[10px] text-amber-600 flex items-center justify-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Menipis</span>
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => onUpdateProduct(prod.id, { is_active: !prod.is_active })}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                                prod.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {prod.is_active ? 'Aktif' : 'Nonaktif'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditProduct(prod)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Edit Produk"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Yakin ingin menghapus produk "${prod.name}"?`)) {
                                    onDeleteProduct(prod.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Hapus Produk"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Categories Tab */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((c) => {
            const count = products.filter((p) => p.category_id === c.id).length;
            return (
              <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm">{c.name}</h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {count} produk
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{c.description || 'Tidak ada deskripsi'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">Slug: {c.slug}</span>
                  {count === 0 && (
                    <button
                      onClick={() => onDeleteCategory(c.id)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PRODUCT FORM MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingProductId ? 'Edit Data Produk' : 'Tambah Produk Baru'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nama Produk <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Kopi Susu Gula Aren 250ml"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Kode / SKU</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Barcode (EAN-13 / SKU)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="Scan kamera atau ketik..."
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setIsBarcodeScannerOpen(true)}
                      title="Scan Barcode Pakai Kamera HP / Laptop"
                      className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Kamera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          barcode: '899' + Math.floor(1000000000 + Math.random() * 9000000000),
                        })
                      }
                      title="Generate Barcode Acak"
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 shrink-0 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Harga Beli / Pokok (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.buy_price}
                    onChange={(e) => setFormData({ ...formData, buy_price: Number(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono-numbers focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Harga Jual Kasir (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.sell_price}
                    onChange={(e) => setFormData({ ...formData, sell_price: Number(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono-numbers font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Stok Awal</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono-numbers focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Stok Minimum</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono-numbers focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="pcs, botol, bungkus, karung"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Foto Produk (Dari Penyimpanan Perangkat)
                    </label>
                    <span className="text-[10px] text-slate-400">JPG, PNG, WebP (Galeri/Kamera)</span>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />

                  {formData.image_url ? (
                    <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                        <img
                          src={formData.image_url}
                          alt="Preview Produk"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {formData.image_url.includes('supabase.co') || formData.image_url.startsWith('http') ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Cloud className="w-3 h-3 text-emerald-600" /> Supabase Storage Cloud
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 text-slate-700">
                              <Check className="w-3 h-3" /> Foto Lokal
                            </span>
                          )}

                          {isUploadingToSupabase && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-100 text-indigo-700 animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Mengunggah ke Cloud...
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 truncate">
                          {formData.image_url.includes('supabase.co') 
                            ? 'Tersimpan online di bucket storage Supabase.' 
                            : 'Tersimpan di memori perangkat kasir.'}
                        </p>

                        {uploadSuccessMsg && (
                          <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {uploadSuccessMsg}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={isProcessingImage || isUploadingToSupabase}
                            className="text-xs px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-medium text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5 text-indigo-600" />
                            Ganti Foto
                          </button>

                          {getSupabaseConfig().isConfigured && !formData.image_url.includes('supabase.co') && (
                            <button
                              type="button"
                              onClick={handleManualUploadToSupabase}
                              disabled={isUploadingToSupabase}
                              className="text-xs px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg font-semibold text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors"
                              title="Unggah foto ini ke Supabase Storage"
                            >
                              <CloudUpload className="w-3.5 h-3.5" />
                              <span>{isUploadingToSupabase ? 'Mengunggah...' : 'Upload ke Supabase'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, image_url: '' }))}
                            className="text-xs px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg font-medium text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => imageInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={handleDropImage}
                      className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/80 hover:bg-indigo-50/30 rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {isProcessingImage || isUploadingToSupabase ? (
                          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                        ) : (
                          <Upload className="w-5 h-5" />
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        {isUploadingToSupabase 
                          ? 'Mengunggah ke Supabase Storage...' 
                          : isProcessingImage 
                          ? 'Mengoptimalkan foto...' 
                          : 'Pilih Foto dari Galeri / Kamera Perangkat'}
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-xs">
                        {getSupabaseConfig().isConfigured 
                          ? 'Foto otomatis diunggah dan disimpan ke bucket Supabase Storage (product-images).'
                          : 'Ketuk untuk memilih foto produk. Foto akan tersimpan di memori perangkat Anda.'}
                      </p>
                    </div>
                  )}

                  {imageError && (
                    <p className="text-[11px] text-rose-600 mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {imageError}
                    </p>
                  )}
                </div>

                <div className="col-span-2 flex items-center pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Produk Aktif Dijual</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
                >
                  {editingProductId ? 'Simpan Perubahan' : 'Tambah Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY FORM MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Tambah Kategori Baru</h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Kategori <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Contoh: Frozen Food"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Keterangan jenis barang dalam kategori ini..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAMERA BARCODE SCANNER MODAL FOR PRODUCT INPUT */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScanSuccess={(code) => {
          setFormData((prev) => ({ ...prev, barcode: code }));
          setIsBarcodeScannerOpen(false);
        }}
        title="Scan Barcode Produk (Kamera HP / Laptop)"
        subtitle="Arahkan kamera ke barcode kemasan produk untuk mengisi otomatis"
      />
    </div>
  );
};
