import React from 'react';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';

interface Forbidden403Props {
  onBackToPos: () => void;
  onLogoutAndLoginAdmin: () => void;
}

export const Forbidden403: React.FC<Forbidden403Props> = ({
  onBackToPos,
  onLogoutAndLoginAdmin,
}) => {
  return (
    <div className="flex-1 min-h-[calc(100vh-62px)] flex items-center justify-center p-4 md:p-6 bg-slate-50/70">
      <div className="bg-white max-w-md w-full rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-8 text-center space-y-5 animate-in fade-in duration-300">
        <div className="w-18 h-18 mx-auto rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div>
          <span className="text-4xl font-extrabold text-slate-800 tracking-tight font-mono-numbers">403</span>
          <h2 className="text-xl font-bold text-slate-800 mt-1">Akses Ditolak (Forbidden)</h2>
          <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
            Halaman ini khusus untuk peran <span className="font-semibold text-slate-700">Administrator</span>. 
            Akun Anda saat ini memiliki hak akses sebagai <span className="font-semibold text-slate-700">Operator / Kasir</span> yang hanya diizinkan untuk transaksi kasir dan riwayat transaksi milik sendiri.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            onClick={onBackToPos}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Kasir POS</span>
          </button>

          <button
            onClick={onLogoutAndLoginAdmin}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>Login Akun Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
};
