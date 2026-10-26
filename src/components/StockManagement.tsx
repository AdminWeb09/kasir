import React, { useState } from 'react';
import { Product, StockMovement, User } from '../types';
import { formatDateTime, exportToCSV } from '../utils/helpers';
import { 
  PlusCircle, 
  SlidersHorizontal, 
  History, 
  FileSpreadsheet, 
  ArrowDownRight, 
  ArrowUpRight, 
  CheckCircle2, 
  Boxes 
} from 'lucide-react';

interface StockManagementProps {
  products: Product[];
  stockMovements: StockMovement[];
  currentUser: User;
  onStockIn: (productId: number, qty: number, reason: string) => void;
  onStockAdjustment: (productId: number, actualQty: number, reason: string) => void;
}

export const StockManagement: React.FC<StockManagementProps> = ({
  products,
  stockMovements,
  currentUser,
  onStockIn,
  onStockAdjustment,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'in' | 'adjustment'>('history');

  // Stock In Form
  const [inProductId, setInProductId] = useState<number>(products[0]?.id || 1);
  const [inQty, setInQty] = useState<number>(10);
  const [inReason, setInReason] = useState('Penerimaan dari Supplier / Distributor');
  const [inSuccess, setInSuccess] = useState(false);

  // Stock Adjustment Form
  const [adjProductId, setAdjProductId] = useState<number>(products[0]?.id || 1);
  const selectedAdjProduct = products.find((p) => p.id === adjProductId);
  const [adjActualQty, setAdjActualQty] = useState<number>(selectedAdjProduct?.stock || 0);
  const [adjReason, setAdjReason] = useState('Stock opname fisik bulanan');
  const [adjSuccess, setAdjSuccess] = useState(false);

  const handleStockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inQty <= 0) return;
    onStockIn(inProductId, inQty, inReason);
    setInSuccess(true);
    setTimeout(() => {
      setInSuccess(false);
      setActiveTab('history');
    }, 1000);
  };

  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStockAdjustment(adjProductId, adjActualQty, adjReason);
    setAdjSuccess(true);
    setTimeout(() => {
      setAdjSuccess(false);
      setActiveTab('history');
    }, 1000);
  };

  const handleExportCSV = () => {
    const headers = ['Waktu', 'Produk', 'Tipe Pergerakan', 'Perubahan Qty', 'Stok Awal', 'Stok Akhir', 'Keterangan', 'Petugas'];
    const rows = stockMovements.map((m) => [
      formatDateTime(m.created_at),
      m.product_name,
      m.type.toUpperCase(),
      m.quantity,
      m.previous_stock,
      m.current_stock,
      m.reason,
      m.user_name,
    ]);
    exportToCSV(`pergerakan_stok_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Manajemen Inventaris & Stok</h2>
          <p className="text-xs text-slate-500">
            Catat stok barang masuk dari supplier, penyesuaian stock opname fisik, dan audit trail pergerakan stok.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('in')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'in'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-500" />
            <span>Stok Masuk</span>
          </button>

          <button
            onClick={() => setActiveTab('adjustment')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'adjustment'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
            <span>Penyesuaian (Opname)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Riwayat Pergerakan ({stockMovements.length})
        </button>
        <button
          onClick={() => setActiveTab('in')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'in'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Form Stok Masuk
        </button>
        <button
          onClick={() => setActiveTab('adjustment')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'adjustment'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Form Penyesuaian Fisik (Opname)
        </button>
      </div>

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Nama Produk</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3 text-center">Jumlah</th>
                  <th className="px-4 py-3 text-center">Stok Awal → Akhir</th>
                  <th className="px-4 py-3">Keterangan / Alasan</th>
                  <th className="px-4 py-3">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      Belum ada riwayat pergerakan stok.
                    </td>
                  </tr>
                ) : (
                  stockMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {m.product_name}
                      </td>
                      <td className="px-4 py-3">
                        {m.type === 'in' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <ArrowDownRight className="w-3 h-3" />
                            <span>Stok Masuk</span>
                          </span>
                        ) : m.type === 'out' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Penjualan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Penyesuaian</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-bold font-mono-numbers">
                        <span className={m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono-numbers text-slate-700">
                        {m.previous_stock} → <span className="font-bold text-slate-900">{m.current_stock}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {m.reason}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-medium whitespace-nowrap">
                        {m.user_name}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Stok Masuk */}
      {activeTab === 'in' && (
        <div className="max-w-lg bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <PlusCircle className="w-5 h-5" />
            <span>Form Penerimaan Stok Masuk (Supplier)</span>
          </div>

          <form onSubmit={handleStockInSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Pilih Produk
              </label>
              <select
                value={inProductId}
                onChange={(e) => setInProductId(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-800"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stok sekarang: {p.stock} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Jumlah Stok Masuk (Qty) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={inQty}
                onChange={(e) => setInQty(Number(e.target.value) || 0)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono-numbers focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Keterangan / Nomor Surat Jalan
              </label>
              <textarea
                rows={2}
                value={inReason}
                onChange={(e) => setInReason(e.target.value)}
                placeholder="Contoh: PO-2026/05 dari PT Sumber Pangan Makmur"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {inSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Stok berhasil ditambahkan dan dicatat ke riwayat pergerakan!</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              Simpan Stok Masuk
            </button>
          </form>
        </div>
      )}

      {/* Form Penyesuaian Fisik */}
      {activeTab === 'adjustment' && (
        <div className="max-w-lg bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
            <SlidersHorizontal className="w-5 h-5" />
            <span>Form Penyesuaian Stok Fisik (Stock Opname)</span>
          </div>

          <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Pilih Produk
              </label>
              <select
                value={adjProductId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setAdjProductId(id);
                  const p = products.find((x) => x.id === id);
                  if (p) setAdjActualQty(p.stock);
                }}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stok sistem saat ini: {p.stock} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Jumlah Stok Fisik Sebenarnya di Rak/Gudang <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={adjActualQty}
                onChange={(e) => setAdjActualQty(Number(e.target.value) || 0)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono-numbers focus:ring-2 focus:ring-indigo-500"
              />
              {selectedAdjProduct && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Selisih koreksi:{' '}
                  <span className="font-bold font-mono-numbers">
                    {adjActualQty - selectedAdjProduct.stock > 0
                      ? `+${adjActualQty - selectedAdjProduct.stock}`
                      : adjActualQty - selectedAdjProduct.stock}{' '}
                    {selectedAdjProduct.unit}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Alasan Penyesuaian Stok
              </label>
              <textarea
                rows={2}
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="Contoh: Barang kadaluarsa dibuang / Barang rusak kemasan saat pengiriman / Stock opname mingguan"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {adjSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Stok produk berhasil disesuaikan!</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              Simpan Penyesuaian Stok
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
