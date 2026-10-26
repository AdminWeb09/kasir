import React, { useState, useEffect } from 'react';
import { StoreSettings } from '../types';
import { 
  Store, 
  Save, 
  CheckCircle2, 
  Database, 
  RefreshCw, 
  UploadCloud, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Copy, 
  Check, 
  FileCode, 
  Unplug, 
  HelpCircle,
  KeyRound,
  ShieldCheck 
} from 'lucide-react';
import { 
  getSupabaseConfig, 
  setCustomSupabaseConfig, 
  clearCustomSupabaseConfig, 
  testSupabaseConnection 
} from '../lib/supabase';
import schemaSql from '../../supabase_schema.sql?raw';

interface StoreSettingsViewProps {
  settings: StoreSettings;
  onUpdateSettings: (newSettings: StoreSettings) => void;
  supabaseStatus: 'connected' | 'offline' | 'error' | 'syncing';
  onRefreshFromSupabase: () => Promise<void>;
  onPushToSupabase: () => Promise<{ success: boolean; message: string }>;
  onSupabaseConfigChanged: () => void;
}

export const StoreSettingsView: React.FC<StoreSettingsViewProps> = ({
  settings,
  onUpdateSettings,
  supabaseStatus,
  onRefreshFromSupabase,
  onPushToSupabase,
  onSupabaseConfigChanged,
}) => {
  // Store form state
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  // Supabase form state
  const config = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(config.url || '');
  const [supabaseKey, setSupabaseKey] = useState(config.anonKey || '');
  const [showKey, setShowKey] = useState(false);

  // Status feedback states
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncingPull, setSyncingPull] = useState(false);
  const [syncingPush, setSyncingPush] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedConfigCode, setCopiedConfigCode] = useState(false);
  const [copiedVercelEnv, setCopiedVercelEnv] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);

  useEffect(() => {
    const current = getSupabaseConfig();
    setSupabaseUrl(current.url);
    setSupabaseKey(current.anonKey);
  }, []);

  const handleSubmitStore = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTestConnection = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setTestResult({
        success: false,
        message: 'Mohon isi Project URL dan Anon Key terlebih dahulu.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    // Temporarily apply to test
    setCustomSupabaseConfig(supabaseUrl, supabaseKey);
    const result = await testSupabaseConnection();
    setTesting(false);
    setTestResult(result);
  };

  const handleSaveSupabaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setActionNotice({
        type: 'error',
        message: 'URL dan Anon Key wajib diisi untuk mengaktifkan koneksi Supabase.',
      });
      return;
    }

    setCustomSupabaseConfig(supabaseUrl, supabaseKey);
    onSupabaseConfigChanged();

    setTesting(true);
    const res = await testSupabaseConnection();
    setTesting(false);
    setTestResult(res);

    if (res.success) {
      setActionNotice({
        type: 'success',
        message: 'Kredensial Supabase berhasil disimpan dan terhubung! Menarik data terbaru...',
      });
      try {
        await onRefreshFromSupabase();
      } catch (err) {
        console.error(err);
      }
    } else {
      setActionNotice({
        type: 'error',
        message: `Kredensial tersimpan, namun koneksi belum valid: ${res.message}`,
      });
    }

    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleDisconnectSupabase = () => {
    if (window.confirm('Yakin ingin memutuskan koneksi Supabase? Aplikasi akan beralih ke penyimpanan lokal (offline).')) {
      clearCustomSupabaseConfig();
      setSupabaseUrl('');
      setSupabaseKey('');
      setTestResult(null);
      onSupabaseConfigChanged();
      setActionNotice({
        type: 'success',
        message: 'Koneksi Supabase telah diputuskan. Sistem saat ini berjalan dalam Mode Lokal.',
      });
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handlePullFromSupabase = async () => {
    setSyncingPull(true);
    setActionNotice(null);
    try {
      await onRefreshFromSupabase();
      setActionNotice({
        type: 'success',
        message: 'Data produk, kategori, dan transaksi berhasil disinkronisasi dari Supabase!',
      });
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: `Gagal menarik data: ${err.message || 'Periksa koneksi internet'}`,
      });
    } finally {
      setSyncingPull(false);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handlePushToSupabase = async () => {
    if (!window.confirm('Unggah seluruh data lokal saat ini (produk, kategori, pengaturan) ke database Supabase?')) {
      return;
    }

    setSyncingPush(true);
    setActionNotice(null);
    try {
      const res = await onPushToSupabase();
      setActionNotice({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: `Gagal upload data: ${err.message || 'Terjadi kesalahan'}`,
      });
    } finally {
      setSyncingPush(false);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopyPermanentConfigCode = () => {
    const code = `/**
 * KONFIGURASI PERMANEN SUPABASE
 * Nilai ini otomatis aktif di SEMUA perangkat, HP/APK,
 * dan deployment Vercel tanpa perlu memasukkan ulang.
 */

export const DEFAULT_SUPABASE_URL = '${supabaseUrl.trim()}';
export const DEFAULT_SUPABASE_ANON_KEY = '${supabaseKey.trim()}';
`;
    navigator.clipboard.writeText(code);
    setCopiedConfigCode(true);
    setTimeout(() => setCopiedConfigCode(false), 2500);
  };

  const handleCopyVercelEnv = () => {
    const envText = `VITE_SUPABASE_URL=${supabaseUrl.trim()}\nVITE_SUPABASE_ANON_KEY=${supabaseKey.trim()}`;
    navigator.clipboard.writeText(envText);
    setCopiedVercelEnv(true);
    setTimeout(() => setCopiedVercelEnv(false), 2500);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Pengaturan Toko & Database</h2>
        <p className="text-xs text-slate-500">
          Kelola profil toko, nota kasir thermal, serta koneksi database cloud Supabase untuk sinkronisasi data kasir secara realtime.
        </p>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 transition-all ${
          actionNotice.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {actionNotice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{actionNotice.message}</span>
        </div>
      )}

      {/* 1. SUPABASE DATABASE CONFIGURATION CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header with Connection Pill */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm">Koneksi Database Supabase</h3>
                {supabaseStatus === 'connected' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Terhubung & Aktif
                  </span>
                )}
                {supabaseStatus === 'offline' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Mode Lokal (Offline)
                  </span>
                )}
                {supabaseStatus === 'error' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Koneksi Terputus
                  </span>
                )}
                {supabaseStatus === 'syncing' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                    <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                    Menyinkronkan...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Simpan data transaksi, pergerakan stok, dan katalog produk di cloud PostgreSQL Supabase.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySql}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all"
              title="Salin SQL Schema untuk dieksekusi di Supabase SQL Editor"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'SQL Tersalin!' : 'Salin SQL Schema'}</span>
            </button>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Supabase</span>
            </a>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Quick Guide Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>Cara Menghubungkan ke Supabase (3 Langkah Cepat):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-1">
              <li>
                Buka <strong className="text-slate-800">Supabase Dashboard</strong> &gt; buat project baru (atau gunakan project yang ada).
              </li>
              <li>
                Masuk ke menu <strong className="text-slate-800">SQL Editor</strong>, klik tombol <span className="font-semibold text-indigo-600">"Salin SQL Schema"</span> di atas, tempel kode tersebut lalu klik <strong className="text-slate-800">"Run"</strong> untuk membuat tabel database dan bucket penyimpanan foto produk (<code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">product-images</code>) secara otomatis.
              </li>
              <li>
                Buka <strong className="text-slate-800">Project Settings &gt; API</strong>, salin <strong className="text-slate-800">Project URL</strong> dan <strong className="text-slate-800">anon/public key</strong>, lalu tempel di formulir di bawah ini.
              </li>
            </ol>
          </div>

          {/* Permanent Config Banner / Helper */}
          {config.isFromPermanentConfig ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center gap-2.5 text-emerald-800">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Konfigurasi Permanen Aktif (Otomatis Terhubung)</p>
                <p className="text-[11px] text-emerald-700">
                  Supabase telah tersimpan di kode sumber (<code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">src/config/supabaseConfig.ts</code>). Semua HP kasir, laptop, dan deployment Vercel otomatis terhubung tanpa perlu memasukkan ulang.
                </p>
              </div>
            </div>
          ) : config.isFromEnv ? (
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs flex items-center gap-2.5 text-indigo-800">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <p className="font-bold">Konfigurasi Environment Variable Aktif</p>
                <p className="text-[11px] text-indigo-700">
                  Aplikasi terhubung via <code className="font-mono bg-indigo-100 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> dari environment Vercel. Tidak perlu memasukkan ulang.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Agar Tidak Perlu Memasukkan Ulang URL & Key di Perangkat Lain / Vercel:</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Saat ini kredensial disimpan di memori browser ini. Agar saat aplikasi dibuka di HP kasir lain atau di-deploy ke Vercel otomatis langsung terhubung tanpa mengetik ulang:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyPermanentConfigCode}
                  disabled={!supabaseUrl.trim() || !supabaseKey.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-lg transition-all disabled:opacity-50"
                  title="Salin isi file src/config/supabaseConfig.ts dengan kredensial ini"
                >
                  {copiedConfigCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedConfigCode ? 'Kode Tersalin!' : 'Salin Kode src/config/supabaseConfig.ts'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyVercelEnv}
                  disabled={!supabaseUrl.trim() || !supabaseKey.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-lg transition-all disabled:opacity-50"
                  title="Salin format Environment Variable untuk Vercel Project Settings"
                >
                  {copiedVercelEnv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedVercelEnv ? 'Env Tersalin!' : 'Salin Format Vercel Environment (.env)'}</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveSupabaseConfig} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Supabase URL */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Supabase Project URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://abcdefghijklmn.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 transition-all outline-hidden"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Didapat dari menu Project Settings &gt; API &gt; Project URL
                </p>
              </div>

              {/* Supabase Anon Key */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Supabase Anon (Public) Key <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    className="w-full text-xs font-mono p-3 pr-10 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 transition-all outline-hidden"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Didapat dari menu Project Settings &gt; API &gt; Project API keys &gt; anon public
                </p>
              </div>
            </div>

            {/* Test result message */}
            {testResult && (
              <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-semibold">{testResult.message}</p>
                </div>
              </div>
            )}

            {/* Button Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={testing}
                  onClick={handleTestConnection}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? 'Menguji Koneksi...' : 'Uji Koneksi'}</span>
                </button>

                {getSupabaseConfig().isConfigured && (
                  <button
                    type="button"
                    onClick={handleDisconnectSupabase}
                    className="px-3.5 py-2.5 text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                    title="Putuskan dan kembali ke mode offline"
                  >
                    <Unplug className="w-3.5 h-3.5" />
                    <span>Putuskan</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={testing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan & Hubungkan</span>
                </button>
              </div>
            </div>
          </form>

          {/* Sync & Cloud Actions (if connected) */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 mb-2.5">Sinkronisasi & Migrasi Data</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={syncingPull || supabaseStatus === 'offline'}
                onClick={handlePullFromSupabase}
                className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-all disabled:opacity-50 group"
              >
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs mb-1">
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingPull ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                  <span>Tarik Data dari Supabase</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Perbarui katalog produk, pergerakan stok, dan riwayat transaksi dari database Supabase ke aplikasi kasir.
                </p>
              </button>

              <button
                type="button"
                disabled={syncingPush || supabaseStatus === 'offline'}
                onClick={handlePushToSupabase}
                className="p-3 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all disabled:opacity-50 group"
              >
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs mb-1">
                  <UploadCloud className={`w-3.5 h-3.5 ${syncingPush ? 'animate-bounce' : ''}`} />
                  <span>Unggah Data Lokal ke Supabase (Seed)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Kirim produk awal dan kategori dari penyimpanan lokal ke tabel Supabase yang baru dibuat.
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STORE IDENTITY & RECEIPT PRINTER CARD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="mb-5 pb-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">Profil Toko & Printer Thermal</h3>
          <p className="text-xs text-slate-500">
            Identitas yang akan dicetak pada kepala nota, tarif pajak, dan format kertas printer kasir.
          </p>
        </div>

        <form onSubmit={handleSubmitStore} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nama Toko / Usaha <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                className="w-full text-sm font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Alamat Lengkap Toko
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nomor Telepon / WhatsApp Toko
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Pajak / PPN Standar (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.tax_percent}
                onChange={(e) => setFormData({ ...formData, tax_percent: Number(e.target.value) || 0 })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono-numbers focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Ukuran Kertas Printer Thermal Default
              </label>
              <select
                value={formData.paper_size}
                onChange={(e) => setFormData({ ...formData, paper_size: e.target.value as '58mm' | '80mm' })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800"
              >
                <option value="58mm">58 mm (Printer Kasir Mini / Bluetooth)</option>
                <option value="80mm">80 mm (Printer Thermal Standar / EPSON TM-T82)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Pesan Footer pada Nota Thermal
              </label>
              <textarea
                rows={2}
                value={formData.receipt_footer}
                onChange={(e) => setFormData({ ...formData, receipt_footer: e.target.value })}
                placeholder="Pesan ucapan terima kasih atau ketentuan pengembalian barang..."
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {saved && (
            <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Pengaturan profil toko berhasil diperbarui!</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Profil Toko</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
