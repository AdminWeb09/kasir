import React, { useState, useMemo } from 'react';
import { Transaction, Product, Category, User, StoreSettings } from '../types';
import { formatRupiah, formatDateTime, formatDateOnly, exportToCSV } from '../utils/helpers';
import { 
  Printer, 
  FileSpreadsheet, 
  Calendar, 
  Filter, 
  TrendingUp, 
  ShoppingBag, 
  Coins, 
  Users, 
  CreditCard 
} from 'lucide-react';

interface ReportsViewProps {
  transactions: Transaction[];
  products: Product[];
  categories: Category[];
  users: User[];
  settings: StoreSettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  products,
  categories,
  users,
  settings,
}) => {
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  
  // Daily filters
  const [selectedDate, setSelectedDate] = useState<string>(formatDateOnly(new Date()));
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Monthly filters
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  // Filtered transactions for Daily
  const dailyTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.status !== 'completed') return false;
      const matchDate = t.created_at.startsWith(selectedDate);
      const matchCashier = selectedCashier === 'all' || String(t.user_id) === selectedCashier;
      
      let matchCat = true;
      if (selectedCategory !== 'all') {
        const catId = Number(selectedCategory);
        matchCat = t.items.some((item) => {
          const prod = products.find((p) => p.id === item.product_id);
          return prod?.category_id === catId;
        });
      }

      return matchDate && matchCashier && matchCat;
    });
  }, [transactions, selectedDate, selectedCashier, selectedCategory, products]);

  // Daily Totals
  const dailyRevenue = useMemo(() => {
    return dailyTransactions.reduce((acc, t) => acc + t.total_amount, 0);
  }, [dailyTransactions]);

  const dailyItemsCount = useMemo(() => {
    return dailyTransactions.reduce((acc, t) => acc + t.items.reduce((s, i) => s + i.quantity, 0), 0);
  }, [dailyTransactions]);

  const dailyProfit = useMemo(() => {
    return dailyTransactions.reduce((acc, t) => {
      const itemsProfit = t.items.reduce((sum, item) => sum + item.profit, 0);
      return acc + (itemsProfit - t.discount_amount);
    }, 0);
  }, [dailyTransactions]);

  // Recap per cashier
  const cashierRecap = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    dailyTransactions.forEach((t) => {
      const existing = map.get(t.user_name) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += t.total_amount;
      map.set(t.user_name, existing);
    });
    return Array.from(map.entries());
  }, [dailyTransactions]);

  // Recap per payment method
  const paymentRecap = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    dailyTransactions.forEach((t) => {
      const existing = map.get(t.payment_method) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += t.total_amount;
      map.set(t.payment_method, existing);
    });
    return Array.from(map.entries());
  }, [dailyTransactions]);

  // Monthly Data Calculations
  const monthlyTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.status !== 'completed') return false;
      return t.created_at.startsWith(selectedMonth);
    });
  }, [transactions, selectedMonth]);

  const monthlyRevenue = useMemo(() => {
    return monthlyTransactions.reduce((acc, t) => acc + t.total_amount, 0);
  }, [monthlyTransactions]);

  const monthlyProfit = useMemo(() => {
    return monthlyTransactions.reduce((acc, t) => {
      const itemsProfit = t.items.reduce((sum, item) => sum + item.profit, 0);
      return acc + (itemsProfit - t.discount_amount);
    }, 0);
  }, [monthlyTransactions]);

  // Monthly day-by-day revenue breakdown
  const monthlyDailyBreakdown = useMemo(() => {
    const map = new Map<string, { date: string; total: number; profit: number; count: number }>();
    monthlyTransactions.forEach((t) => {
      const day = t.created_at.slice(0, 10);
      const itemsProfit = t.items.reduce((s, i) => s + i.profit, 0) - t.discount_amount;
      const existing = map.get(day) || { date: day, total: 0, profit: 0, count: 0 };
      existing.total += t.total_amount;
      existing.profit += itemsProfit;
      existing.count += 1;
      map.set(day, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [monthlyTransactions]);

  // Handle Export CSV
  const handleExportCSV = () => {
    if (reportType === 'daily') {
      const headers = ['No. Invoice', 'Waktu', 'Kasir', 'Metode Bayar', 'Subtotal', 'Diskon', 'PPN', 'Total', 'Item'];
      const rows = dailyTransactions.map((t) => [
        t.invoice_number,
        formatDateTime(t.created_at),
        t.user_name,
        t.payment_method.toUpperCase(),
        t.subtotal,
        t.discount_amount,
        t.tax_amount,
        t.total_amount,
        t.items.map((i) => `${i.product_name} (${i.quantity})`).join('; '),
      ]);
      exportToCSV(`laporan_harian_${selectedDate}`, headers, rows);
    } else {
      const headers = ['Tanggal', 'Jumlah Transaksi', 'Total Omzet (Rp)', 'Laba Kotor (Rp)'];
      const rows = monthlyDailyBreakdown.map((d) => [d.date, d.count, d.total, d.profit]);
      exportToCSV(`laporan_bulanan_${selectedMonth}`, headers, rows);
    }
  };

  const handlePrintA4 = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Laporan Penjualan & Keuangan</h2>
          <p className="text-xs text-slate-500">
            Laporan harian, omzet bulanan, margin laba kotor, dan rekapitulasi per kasir / metode pembayaran.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel / CSV</span>
          </button>

          <button
            onClick={handlePrintA4}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan (A4)</span>
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 no-print">
        <button
          onClick={() => setReportType('daily')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
            reportType === 'daily'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Laporan Harian
        </button>
        <button
          onClick={() => setReportType('monthly')}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
            reportType === 'monthly'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Laporan Bulanan & Laba Kotor
        </button>
      </div>

      {/* FILTER BAR (No-print) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between no-print">
        {reportType === 'daily' ? (
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Pilih Tanggal</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Filter Kasir</label>
              <select
                value={selectedCashier}
                onChange={(e) => setSelectedCashier(e.target.value)}
                className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700"
              >
                <option value="all">Semua Kasir</option>
                {users
                  .filter((u) => u.role === 'cashier')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Filter Kategori</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700"
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
        ) : (
          <div className="flex items-center gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Pilih Bulan & Tahun</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        <div className="text-right">
          <span className="text-[11px] text-slate-400">Dicetak Pada:</span>
          <p className="text-xs font-semibold text-slate-700">{formatDateTime(new Date().toISOString())}</p>
        </div>
      </div>

      {/* PRINT-A4 TARGET CONTAINER */}
      <div className="print-area print-a4-report bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        {/* Printable Header */}
        <div className="border-b pb-4 border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                {settings.store_name}
              </h1>
              <p className="text-xs text-slate-500">{settings.address}</p>
              <p className="text-xs text-slate-500">Telp: {settings.phone}</p>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-bold text-indigo-700 uppercase">
                {reportType === 'daily' ? 'Laporan Penjualan Harian' : 'Laporan Penjualan Bulanan'}
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Periode: {reportType === 'daily' ? selectedDate : selectedMonth}
              </p>
            </div>
          </div>
        </div>

        {reportType === 'daily' ? (
          <>
            {/* Daily Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold uppercase">Total Omzet Penjualan</span>
                <p className="text-xl font-bold text-slate-900 font-mono-numbers mt-1">
                  {formatRupiah(dailyRevenue)}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold uppercase">Total Laba Kotor</span>
                <p className="text-xl font-bold text-indigo-600 font-mono-numbers mt-1">
                  {formatRupiah(dailyProfit)}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold uppercase">Item Terjual / Transaksi</span>
                <p className="text-xl font-bold text-slate-900 font-mono-numbers mt-1">
                  {dailyItemsCount} pcs <span className="text-xs font-normal text-slate-500">({dailyTransactions.length} transaksi)</span>
                </p>
              </div>
            </div>

            {/* Rekap Kasir & Rekap Metode Pembayaran Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rekap per Kasir */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b pb-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Rekapitulasi per Kasir</span>
                </div>
                {cashierRecap.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">Tidak ada data</p>
                ) : (
                  <div className="space-y-1 text-xs">
                    {cashierRecap.map(([name, stat]) => (
                      <div key={name} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                        <span className="font-medium text-slate-700">{name} ({stat.count} trx)</span>
                        <span className="font-bold text-slate-900 font-mono-numbers">{formatRupiah(stat.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rekap per Metode Bayar */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b pb-2">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  <span>Rekapitulasi per Metode Pembayaran</span>
                </div>
                {paymentRecap.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">Tidak ada data</p>
                ) : (
                  <div className="space-y-1 text-xs">
                    {paymentRecap.map(([method, stat]) => (
                      <div key={method} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                        <span className="capitalize font-medium text-slate-700">{method} ({stat.count} trx)</span>
                        <span className="font-bold text-slate-900 font-mono-numbers">{formatRupiah(stat.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Daily Transactions Detail Table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Rincian Transaksi ({dailyTransactions.length})
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                    <tr>
                      <th className="px-3 py-2">No. Invoice</th>
                      <th className="px-3 py-2">Waktu</th>
                      <th className="px-3 py-2">Kasir</th>
                      <th className="px-3 py-2">Metode</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                      <th className="px-3 py-2 text-right">Diskon</th>
                      <th className="px-3 py-2 text-right">PPN</th>
                      <th className="px-3 py-2 text-right">Total Transaksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                          Tidak ada transaksi pada tanggal ini.
                        </td>
                      </tr>
                    ) : (
                      dailyTransactions.map((t) => (
                        <tr key={t.id}>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-800">{t.invoice_number}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{t.created_at.slice(11, 16)} WIB</td>
                          <td className="px-3 py-2">{t.user_name}</td>
                          <td className="px-3 py-2 uppercase font-mono text-[10px]">{t.payment_method}</td>
                          <td className="px-3 py-2 text-right font-mono-numbers">{formatRupiah(t.subtotal)}</td>
                          <td className="px-3 py-2 text-right font-mono-numbers text-emerald-600">
                            {t.discount_amount > 0 ? `-${formatRupiah(t.discount_amount)}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numbers">{formatRupiah(t.tax_amount)}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900 font-mono-numbers">
                            {formatRupiah(t.total_amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Monthly Report View */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold uppercase">Total Omzet Bulan Ini</span>
                <p className="text-2xl font-bold text-slate-900 font-mono-numbers mt-1">
                  {formatRupiah(monthlyRevenue)}
                </p>
                <p className="text-xs text-slate-500 mt-1">{monthlyTransactions.length} transaksi tercatat</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold uppercase">Total Estimasi Laba Kotor</span>
                <p className="text-2xl font-bold text-indigo-600 font-mono-numbers mt-1">
                  {formatRupiah(monthlyProfit)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Margin: {monthlyRevenue > 0 ? Math.round((monthlyProfit / monthlyRevenue) * 100) : 0}%
                </p>
              </div>
            </div>

            {/* Monthly Day-by-Day Table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Rekapitulasi Harian Bulan {selectedMonth}
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                    <tr>
                      <th className="px-3 py-2">Tanggal</th>
                      <th className="px-3 py-2 text-center">Jumlah Transaksi</th>
                      <th className="px-3 py-2 text-right">Omzet Penjualan</th>
                      <th className="px-3 py-2 text-right">Laba Kotor</th>
                      <th className="px-3 py-2 text-right">Margin (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyDailyBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                          Tidak ada data penjualan pada bulan yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      monthlyDailyBreakdown.map((row) => (
                        <tr key={row.date}>
                          <td className="px-3 py-2 font-semibold text-slate-800">{row.date}</td>
                          <td className="px-3 py-2 text-center font-mono-numbers">{row.count}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900 font-mono-numbers">
                            {formatRupiah(row.total)}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-indigo-600 font-mono-numbers">
                            {formatRupiah(row.profit)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono-numbers">
                            {row.total > 0 ? Math.round((row.profit / row.total) * 100) : 0}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Signature Box for A4 Print */}
        <div className="pt-8 border-t border-slate-200 flex justify-between text-xs text-slate-600">
          <div className="text-center w-48">
            <p>Dibuat Oleh (Kasir / Petugas):</p>
            <div className="h-16" />
            <p className="border-t border-slate-400 pt-1 font-semibold text-slate-800">( .............................. )</p>
          </div>

          <div className="text-center w-48">
            <p>Disetujui Oleh (Supervisor / Owner):</p>
            <div className="h-16" />
            <p className="border-t border-slate-400 pt-1 font-semibold text-slate-800">( .............................. )</p>
          </div>
        </div>
      </div>
    </div>
  );
};
