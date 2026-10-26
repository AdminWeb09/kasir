import React, { useState, useMemo } from 'react';
import { Transaction, User, StoreSettings } from '../types';
import { formatRupiah, formatDateTime, exportToCSV } from '../utils/helpers';
import { 
  Printer, 
  Ban, 
  Search, 
  Download, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  X,
  FileSpreadsheet
} from 'lucide-react';

interface TransactionHistoryViewProps {
  transactions: Transaction[];
  currentUser: User;
  settings: StoreSettings;
  onReprintReceipt: (transaction: Transaction) => void;
  onVoidTransaction: (transactionId: number, adminPassword: string, voidReason: string) => boolean;
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({
  transactions,
  currentUser,
  settings,
  onReprintReceipt,
  onVoidTransaction,
}) => {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'completed' | 'void'>('all');
  
  // Void modal state
  const [voidingTransaction, setVoidingTransaction] = useState<Transaction | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState('');

  const isAdmin = currentUser.role === 'admin';

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      // Role protection: Operator only sees their own transactions
      if (!isAdmin && t.user_id !== currentUser.id) {
        return false;
      }

      if (selectedStatus !== 'all' && t.status !== selectedStatus) {
        return false;
      }

      const q = search.toLowerCase();
      if (!q) return true;
      return (
        t.invoice_number.toLowerCase().includes(q) ||
        t.user_name.toLowerCase().includes(q) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(q))
      );
    });
  }, [transactions, currentUser, isAdmin, selectedStatus, search]);

  const handleExportCSV = () => {
    const headers = ['No. Invoice', 'Tanggal', 'Kasir', 'Pelanggan', 'Metode Bayar', 'Total', 'Status', 'Alasan Void'];
    const rows = filtered.map((t) => [
      t.invoice_number,
      formatDateTime(t.created_at),
      t.user_name,
      t.customer_name || 'Pelanggan Umum',
      t.payment_method.toUpperCase(),
      t.total_amount,
      t.status.toUpperCase(),
      t.void_reason || '-',
    ]);
    exportToCSV(`transaksi_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const handleConfirmVoid = (e: React.FormEvent) => {
    e.preventDefault();
    setVoidError('');

    if (!voidingTransaction) return;
    if (!adminPassword.trim()) {
      setVoidError('Password admin wajib diisi!');
      return;
    }
    if (!voidReason.trim()) {
      setVoidError('Alasan pembatalan (void) wajib diisi!');
      return;
    }

    const success = onVoidTransaction(voidingTransaction.id, adminPassword, voidReason);
    if (success) {
      setVoidingTransaction(null);
      setAdminPassword('');
      setVoidReason('');
      setVoidError('');
    } else {
      setVoidError('Password admin salah! Hubungi Supervisor/Administrator.');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Riwayat Transaksi Penjualan</h2>
          <p className="text-xs text-slate-500">
            {isAdmin 
              ? 'Menampilkan seluruh transaksi kasir. Admin dapat melakukan pembatalan (Void) atau cetak ulang nota.'
              : `Menampilkan riwayat transaksi kasir Anda (${currentUser.name}).`}
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Ekspor CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari No. Invoice / Pelanggan..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Status segmented tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-stretch sm:self-auto justify-center">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedStatus === 'all' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-600'
            }`}
          >
            Semua ({transactions.length})
          </button>
          <button
            onClick={() => setSelectedStatus('completed')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedStatus === 'completed' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600'
            }`}
          >
            Selesai
          </button>
          <button
            onClick={() => setSelectedStatus('void')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedStatus === 'void' ? 'bg-white text-red-600 shadow-xs font-semibold' : 'text-slate-600'
            }`}
          >
            Void
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">No. Invoice</th>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Kasir</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Metode</th>
                <th className="px-4 py-3 text-right">Total Transaksi</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada transaksi yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 font-mono">
                      {t.invoice_number}
                      {t.customer_name && t.customer_name !== 'Pelanggan Umum' && (
                        <p className="text-[10px] text-slate-400 font-normal">{t.customer_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateTime(t.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {t.user_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">
                        {t.items.reduce((acc, i) => acc + i.quantity, 0)} pcs
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">({t.items.length} macam)</span>
                    </td>
                    <td className="px-4 py-3 uppercase font-medium">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-mono">
                        {t.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono-numbers">
                      {formatRupiah(t.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {t.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Selesai</span>
                        </span>
                      ) : (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" />
                            <span>Void</span>
                          </span>
                          {t.void_reason && (
                            <span className="text-[10px] text-slate-400 mt-0.5 max-w-[120px] truncate" title={t.void_reason}>
                              {t.void_reason}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onReprintReceipt(t)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Cetak Ulang Nota"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {t.status === 'completed' && (
                          <button
                            onClick={() => {
                              setVoidingTransaction(t);
                              setVoidError('');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Batalkan Transaksi (Void) - Memerlukan Otorisasi Admin"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VOID CONFIRMATION MODAL WITH ADMIN AUTH */}
      {voidingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-bold text-sm">Otorisasi Pembatalan (Void)</h3>
              </div>
              <button
                onClick={() => setVoidingTransaction(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmVoid} className="p-5 space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                <p className="font-bold">Perhatian: Transaksi akan dibatalkan</p>
                <p>
                  Nomor: <span className="font-mono font-semibold">{voidingTransaction.invoice_number}</span> (
                  {formatRupiah(voidingTransaction.total_amount)})
                </p>
                <p className="text-[11px] text-red-600">
                  Stok seluruh produk pada transaksi ini akan dikembalikan secara otomatis ke inventaris.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Alasan Pembatalan (Void) <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Contoh: Pembeli salah memilih varian / Transaksi dibatalkan sebelum dibawa"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Password Administrator <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Masukkan password admin (default: admin123)"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white"
                />
              </div>

              {voidError && (
                <p className="text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-200">
                  {voidError}
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVoidingTransaction(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors"
                >
                  Konfirmasi Void & Kembalikan Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
