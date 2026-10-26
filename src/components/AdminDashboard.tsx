import React, { useMemo } from 'react';
import { Transaction, Product, Category, StoreSettings } from '../types';
import { formatRupiah, formatDateOnly } from '../utils/helpers';
import { 
  TrendingUp, 
  ShoppingBag, 
  AlertTriangle, 
  Coins, 
  ArrowUpRight, 
  ArrowRight,
  Package,
  Layers,
  Calendar,
  Sparkles
} from 'lucide-react';

interface AdminDashboardProps {
  transactions: Transaction[];
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  transactions,
  products,
  categories,
  settings,
  onNavigate,
}) => {
  const todayStr = formatDateOnly(new Date());

  // Filter completed transactions
  const completedTransactions = useMemo(() => {
    return transactions.filter((t) => t.status === 'completed');
  }, [transactions]);

  // Today's metrics
  const todayTransactions = useMemo(() => {
    return completedTransactions.filter((t) => t.created_at.startsWith(todayStr));
  }, [completedTransactions, todayStr]);

  const todayRevenue = useMemo(() => {
    return todayTransactions.reduce((acc, t) => acc + t.total_amount, 0);
  }, [todayTransactions]);

  const todayProfit = useMemo(() => {
    return todayTransactions.reduce((acc, t) => {
      const itemsProfit = t.items.reduce((sum, item) => sum + item.profit, 0);
      return acc + (itemsProfit - t.discount_amount);
    }, 0);
  }, [todayTransactions]);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.is_active && p.stock <= p.min_stock);
  }, [products]);

  // Top selling products
  const topSellingProducts = useMemo(() => {
    const productSalesMap = new Map<number, { product_name: string; total_qty: number; total_omzet: number }>();

    completedTransactions.forEach((t) => {
      t.items.forEach((item) => {
        const existing = productSalesMap.get(item.product_id) || {
          product_name: item.product_name,
          total_qty: 0,
          total_omzet: 0,
        };
        existing.total_qty += item.quantity;
        existing.total_omzet += item.subtotal;
        productSalesMap.set(item.product_id, existing);
      });
    });

    return Array.from(productSalesMap.values())
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, 5);
  }, [completedTransactions]);

  // 7 Days Sales Trend
  const sevenDaysTrend = useMemo(() => {
    const days: { dateStr: string; label: string; total: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDateOnly(d);
      const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(d);
      const dayNum = d.getDate();

      const dayTransactions = completedTransactions.filter((t) => t.created_at.startsWith(dateStr));
      const total = dayTransactions.reduce((sum, t) => sum + t.total_amount, 0);
      days.push({
        dateStr,
        label: `${dayName} ${dayNum}`,
        total,
        count: dayTransactions.length,
      });
    }
    return days;
  }, [completedTransactions]);

  const maxSevenDaysTotal = Math.max(1, ...sevenDaysTrend.map((d) => d.total));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
            Panel Administrator · {settings.store_name}
          </span>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight mt-0.5">
            Ringkasan Operasional & Penjualan Hari Ini
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Pantau arus kas, performa kasir, dan ketersediaan stok produk secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <button
            onClick={() => onNavigate('pos')}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs shadow-sm transition-all text-center"
          >
            Buka Kasir POS
          </button>
          <button
            onClick={() => onNavigate('stock')}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-xs transition-colors text-center"
          >
            Kelola Stok
          </button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Penjualan Hari Ini */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Omzet Hari Ini</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 font-mono-numbers">
              {formatRupiah(todayRevenue)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Dari <span className="font-semibold text-slate-700">{todayTransactions.length}</span> transaksi sukses
            </p>
          </div>
        </div>

        {/* Laba Kotor Estimasi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Laba Kotor Hari Ini</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-indigo-600 font-mono-numbers">
              {formatRupiah(todayProfit)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Margin rata-rata: <span className="font-semibold text-slate-700">{todayRevenue > 0 ? Math.round((todayProfit / todayRevenue) * 100) : 0}%</span>
            </p>
          </div>
        </div>

        {/* Jumlah Transaksi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transaksi Hari Ini</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 font-mono-numbers">
              {todayTransactions.length}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Total riwayat: <span className="font-semibold text-slate-700">{completedTransactions.length}</span> transaksi
            </p>
          </div>
        </div>

        {/* Stok Menipis */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Peringatan Stok</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              lowStockProducts.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-black font-mono-numbers ${
              lowStockProducts.length > 0 ? 'text-amber-600' : 'text-slate-900'
            }`}>
              {lowStockProducts.length} <span className="text-xs font-normal text-slate-500">item</span>
            </h3>
            <button
              onClick={() => onNavigate('stock')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 mt-1 transition-colors"
            >
              <span>Restok sekarang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid: 7-Day Chart & Top Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Sales Trend (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Tren Penjualan 7 Hari Terakhir</h3>
              <p className="text-xs text-slate-400">Total omzet harian yang tercatat di sistem</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Laporan Lengkap</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* SVG Bar & Trend Chart */}
          <div className="pt-4">
            <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-slate-200 pb-2">
              {sevenDaysTrend.map((day) => {
                const heightPercent = Math.max(8, Math.round((day.total / maxSevenDaysTotal) * 100));
                const isToday = day.dateStr === todayStr;

                return (
                  <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-12 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 font-mono-numbers">
                      {formatRupiah(day.total)} ({day.count} trx)
                    </div>

                    {/* Bar */}
                    <div className="w-full max-w-[48px] bg-slate-100 rounded-t-lg relative flex items-end justify-center overflow-hidden h-44">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          isToday
                            ? 'bg-indigo-600'
                            : 'bg-indigo-300 hover:bg-indigo-400'
                        }`}
                      />
                    </div>

                    {/* Day label */}
                    <span className={`text-[10px] sm:text-xs font-medium ${
                      isToday ? 'font-bold text-indigo-600' : 'text-slate-500'
                    }`}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Selling Products (1 col) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">5 Produk Terlaris</h3>
            <span className="text-[11px] text-slate-400">Total Terjual</span>
          </div>

          <div className="space-y-3">
            {topSellingProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Belum ada data penjualan tercatat.</p>
            ) : (
              topSellingProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-[10px] text-slate-600 flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 truncate">{p.product_name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-900 font-mono-numbers">{p.total_qty} pcs</p>
                    <p className="text-[10px] text-slate-400 font-mono-numbers">{formatRupiah(p.total_omzet)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Urgent Low Stock Alert Table */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Daftar Produk Stok Menipis (Perlu Pengadaan Ulang)</span>
            </div>
            <button
              onClick={() => onNavigate('stock')}
              className="text-xs font-semibold text-amber-900 hover:underline"
            >
              Buka Form Stok Masuk →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {lowStockProducts.map((prod) => (
              <div key={prod.id} className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{prod.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">{prod.code}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-red-600 font-mono-numbers">
                    {prod.stock} {prod.unit}
                  </span>
                  <p className="text-[10px] text-slate-400">Min: {prod.min_stock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
