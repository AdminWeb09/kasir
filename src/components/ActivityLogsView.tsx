import React, { useState, useMemo } from 'react';
import { ActivityLog } from '../types';
import { formatDateTime, exportToCSV } from '../utils/helpers';
import { Shield, Search, FileSpreadsheet, Activity } from 'lucide-react';

interface ActivityLogsViewProps {
  logs: ActivityLog[];
}

export const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchAction = selectedAction === 'all' || log.action === selectedAction;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        log.user_name.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        log.ip_address.includes(q);
      return matchAction && matchSearch;
    });
  }, [logs, selectedAction, search]);

  const handleExportCSV = () => {
    const headers = ['Waktu', 'Pengguna', 'Aksi', 'Deskripsi Aktivitas', 'IP Address'];
    const rows = filteredLogs.map((l) => [
      formatDateTime(l.created_at),
      l.user_name,
      l.action.toUpperCase(),
      l.description,
      l.ip_address,
    ]);
    exportToCSV(`log_aktivitas_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const getBadgeColor = (action: string) => {
    switch (action) {
      case 'login':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'transaction':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'void':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'stock_update':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Log Aktivitas & Audit Trail</h2>
          <p className="text-xs text-slate-500">
            Catatan historis seluruh aktivitas penting (login, transaksi kasir, pembatalan void, penyesuaian stok, dan perubahan data).
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Ekspor CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari deskripsi, pengguna, atau IP..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full sm:w-auto text-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="all">Semua Tipe Aksi</option>
            <option value="login">Login Pengguna</option>
            <option value="transaction">Transaksi Baru</option>
            <option value="void">Pembatalan (Void)</option>
            <option value="stock_update">Pergerakan Stok</option>
            <option value="product_crud">Perubahan Produk</option>
            <option value="user_crud">Perubahan User</option>
            <option value="settings_update">Pengaturan Toko</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Waktu (WIB)</th>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Aksi</th>
                <th className="px-4 py-3">Keterangan Aktivitas</th>
                <th className="px-4 py-3 font-mono">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    Tidak ada log aktivitas yang cocok.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {log.user_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.description}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                      {log.ip_address}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
