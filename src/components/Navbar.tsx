import React, { useState, useEffect } from 'react';
import { User, StoreSettings } from '../types';
import { 
  ShoppingCart, 
  LayoutDashboard, 
  Package, 
  Boxes, 
  FileText, 
  Users, 
  Settings as SettingsIcon, 
  History, 
  LogOut, 
  Clock, 
  Store,
  ChevronDown,
  KeyRound,
  Shield,
  Activity,
  Menu,
  X
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  settings: StoreSettings;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  onChangePasswordClick: () => void;
  supabaseStatus?: 'connected' | 'offline' | 'error' | 'syncing';
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  settings,
  activeTab,
  onSelectTab,
  onLogout,
  onChangePasswordClick,
  supabaseStatus = 'offline',
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(now);
      setTimeStr(`${formatted} WIB`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';

  const handleTabClick = (tab: string) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-3.5 sm:px-6 py-2.5 gap-3">
          {/* Left: Brand & Store */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-lg shadow-md shadow-indigo-600/20 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-100 tracking-tight text-sm sm:text-base truncate max-w-[140px] sm:max-w-[220px]">
                  {settings.store_name}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                  isAdmin 
                    ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30' 
                    : 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30'
                }`}>
                  {isAdmin ? 'Admin' : 'Kasir'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <Clock className="w-3 h-3 text-slate-500" />
                <span className="font-mono-numbers">{timeStr}</span>
              </div>
            </div>
          </div>

          {/* Center: Desktop Navigation Menus */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/60 shadow-inner">
            <button
              onClick={() => handleTabClick('pos')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pos' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Kasir POS</span>
            </button>

            <button
              onClick={() => handleTabClick('transactions')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'transactions' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Riwayat</span>
            </button>

            {/* Admin Tabs */}
            {isAdmin && (
              <>
                <div className="w-px h-4 bg-slate-700 mx-1" />
                
                <button
                  onClick={() => handleTabClick('dashboard')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'dashboard' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => handleTabClick('products')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'products' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Produk</span>
                </button>

                <button
                  onClick={() => handleTabClick('stock')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'stock' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  <Boxes className="w-4 h-4" />
                  <span>Stok</span>
                </button>

                <button
                  onClick={() => handleTabClick('reports')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'reports' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Laporan</span>
                </button>

                <button
                  onClick={() => handleTabClick('users')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'users' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Pengguna</span>
                </button>

                <button
                  onClick={() => handleTabClick('settings')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'settings' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4" />
                  <span>Toko</span>
                </button>
              </>
            )}
          </nav>

          {/* Right: User Profile & Mobile Menu Toggle */}
          <div className="flex items-center gap-2">
            {/* Database status pill */}
            <button
              type="button"
              onClick={() => isAdmin && handleTabClick('settings')}
              title={
                supabaseStatus === 'connected'
                  ? 'Supabase Cloud Terhubung (Klik untuk buka pengaturan)'
                  : supabaseStatus === 'error'
                  ? 'Koneksi Supabase Terputus (Klik untuk periksa pengaturan)'
                  : 'Mode Penyimpanan Lokal (Klik untuk menghubungkan Supabase)'
              }
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${
                isAdmin ? 'cursor-pointer hover:brightness-110' : 'cursor-default'
              } ${
                supabaseStatus === 'connected'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : supabaseStatus === 'error'
                  ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                supabaseStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : supabaseStatus === 'error'
                  ? 'bg-rose-400'
                  : 'bg-amber-400'
              }`} />
              <span>{supabaseStatus === 'connected' ? 'Supabase' : 'Lokal'}</span>
            </button>

            {/* User Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 transition-all text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block leading-tight text-xs">
                  <p className="font-bold text-slate-100 truncate max-w-[100px]">{currentUser.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{currentUser.role === 'admin' ? 'Administrator' : 'Kasir'}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setUserDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-3 border-b border-slate-800">
                      <p className="font-bold text-slate-100 text-sm">{currentUser.name}</p>
                      <p className="text-slate-400 font-mono text-[11px] mt-0.5">@{currentUser.username}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isAdmin ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-400/20 text-emerald-300'
                        }`}>
                          {isAdmin ? 'Administrator' : 'Kasir'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onChangePasswordClick();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left font-medium cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4 text-slate-400" />
                        <span>Ganti Kata Sandi</span>
                      </button>

                      <div className="my-1.5 border-t border-slate-800" />

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left font-semibold cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Keluar (Logout)</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Hamburger button for admin tabs */}
            {isAdmin && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                aria-label="Menu Admin"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile slide-down drawer for Admin */}
        {mobileMenuOpen && isAdmin && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-900/98 p-3 space-y-1 animate-in slide-in-from-top-2 duration-200">
            <p className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Menu Manajemen Admin</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleTabClick('dashboard')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold ${
                  activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-300 bg-slate-800/80 hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => handleTabClick('products')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold ${
                  activeTab === 'products' ? 'bg-indigo-600 text-white' : 'text-slate-300 bg-slate-800/80 hover:bg-slate-800'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Produk</span>
              </button>

              <button
                onClick={() => handleTabClick('stock')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold ${
                  activeTab === 'stock' ? 'bg-indigo-600 text-white' : 'text-slate-300 bg-slate-800/80 hover:bg-slate-800'
                }`}
              >
                <Boxes className="w-4 h-4" />
                <span>Stok</span>
              </button>

              <button
                onClick={() => handleTabClick('reports')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold ${
                  activeTab === 'reports' ? 'bg-indigo-600 text-white' : 'text-slate-300 bg-slate-800/80 hover:bg-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Laporan</span>
              </button>

              <button
                onClick={() => handleTabClick('users')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold ${
                  activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-300 bg-slate-800/80 hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Pengguna</span>
              </button>

              <button
                onClick={() => handleTabClick('settings')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold ${
                  activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-300 bg-slate-800/80 hover:bg-slate-800'
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
                <span>Toko</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Modern Mobile Bottom Navigation Bar (Screens < lg) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-3 py-2 flex items-center justify-around select-none">
        <button
          onClick={() => handleTabClick('pos')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'pos' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[10px]">Kasir</span>
        </button>

        <button
          onClick={() => handleTabClick('transactions')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'transactions' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px]">Riwayat</span>
        </button>

        {isAdmin ? (
          <>
            <button
              onClick={() => handleTabClick('dashboard')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                activeTab === 'dashboard' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px]">Dashboard</span>
            </button>

            <button
              onClick={() => handleTabClick('products')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                activeTab === 'products' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-5 h-5" />
              <span className="text-[10px]">Produk</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                mobileMenuOpen ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px]">Lainnya</span>
            </button>
          </>
        ) : null}
      </nav>
    </>
  );
};
