import React, { useState } from 'react';
import { Store, Lock, User as UserIcon, AlertCircle, ArrowRight, Eye, EyeOff, Shield } from 'lucide-react';
import { StoreSettings } from '../types';

interface LoginViewProps {
  settings: StoreSettings;
  onLogin: (username: string, password: string) => boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  settings,
  onLogin,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      const success = onLogin(username, password);
      setIsLoading(false);
      if (!success) {
        setErrorMsg('Username atau kata sandi tidak sesuai. Silakan periksa kembali kredensial Anda.');
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Subtle modern ambient background glows */}
      <div className="absolute top-1/4 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-8 text-center text-white relative border-b border-slate-800">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 mb-3 ring-4 ring-indigo-500/20">
              <Store className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">{settings.store_name}</h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">Sistem Kasir & Point of Sale (POS) Terpadu</p>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sesi Terenkripsi & Aman</span>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 sm:p-8 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Username Pengguna
                </label>
                <div className="relative">
                  <div className="w-10 h-10 absolute left-0 top-0 flex items-center justify-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username Anda"
                    className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 border border-slate-300/80 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent transition-all outline-hidden text-slate-800 font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Kata Sandi (Password)
                  </label>
                </div>
                <div className="relative">
                  <div className="w-10 h-10 absolute left-0 top-0 flex items-center justify-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full pl-10 pr-10 py-3 text-sm bg-slate-50 border border-slate-300/80 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent transition-all outline-hidden text-slate-800 font-medium placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="w-10 h-10 absolute right-0 top-0 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-rose-50 text-rose-700 rounded-2xl text-xs flex items-center gap-2.5 border border-rose-200/80 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="leading-snug">{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Masuk ke Sistem Kasir</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                Hubungi administrator jika Anda lupa kata sandi akun kasir.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400/80 mt-6 font-medium">
          &copy; {new Date().getFullYear()} {settings.store_name} &bull; POS Kasir Modern
        </p>
      </div>
    </div>
  );
};
