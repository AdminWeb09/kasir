import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Flashlight, RefreshCw, AlertCircle, Upload, CheckCircle2 } from 'lucide-react';
import { playScannerBeep } from '../utils/helpers';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  title?: string;
  subtitle?: string;
  continuous?: boolean;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan Barcode Kamera HP',
  subtitle = 'Arahkan kamera ke barcode produk (EAN, UPC, Code 128, QR Code)',
  continuous = false,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [manualCode, setManualCode] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-scanner-viewfinder';
  const isStoppingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop scanner safely
  const stopScanner = async () => {
    if (!html5QrCodeRef.current) return;
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    try {
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      await html5QrCodeRef.current.clear();
    } catch (err) {
      console.warn('Gagal menghentikan kamera scanner:', err);
    } finally {
      html5QrCodeRef.current = null;
      isStoppingRef.current = false;
    }
  };

  // Start scanner
  const startScanner = async (cameraIdOrFacingMode: string | { facingMode: string }) => {
    setIsInitializing(true);
    setErrorMsg(null);

    await stopScanner();

    // Check if element exists
    const container = document.getElementById(scannerContainerId);
    if (!container) {
      setIsInitializing(false);
      return;
    }

    try {
      const qrCode = new Html5Qrcode(scannerContainerId, {
        verbose: false,
      });
      html5QrCodeRef.current = qrCode;

      // Available cameras
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          if (typeof cameraIdOrFacingMode === 'string' && cameraIdOrFacingMode) {
            setSelectedCameraId(cameraIdOrFacingMode);
          } else {
            // Find back camera if available
            const backCam = devices.find(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('belakang') || 
              d.label.toLowerCase().includes('environment')
            );
            setSelectedCameraId(backCam ? backCam.id : devices[devices.length - 1].id);
          }
        }
      } catch (camErr) {
        console.warn('Tidak dapat mengambil daftar kamera:', camErr);
      }

      const cameraConfig = typeof cameraIdOrFacingMode === 'string' && cameraIdOrFacingMode
        ? cameraIdOrFacingMode
        : { facingMode: 'environment' };

      await qrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Wide rectangular box optimal for 1D retail barcodes (EAN-13, Code 128)
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const boxWidth = Math.floor(minEdge * 0.85);
            const boxHeight = Math.floor(boxWidth * 0.65);
            return { width: Math.max(220, boxWidth), height: Math.max(140, boxHeight) };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDecodedBarcode(decodedText);
        },
        () => {
          // Frame parse error: silent
        }
      );

      // Check torch support
      try {
        const track = (qrCode as unknown as { getRunningTrackCameraCapabilities?: () => { torchFeature?: () => { isSupported?: () => boolean } } })
          ?.getRunningTrackCameraCapabilities?.();
        if (track?.torchFeature?.()?.isSupported?.()) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }

      setIsInitializing(false);
    } catch (err: unknown) {
      console.error('Error starting camera scanner:', err);
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('NotAllowedError') || message.includes('Permission')) {
        setErrorMsg('Izin kamera ditolak. Harap izinkan akses kamera pada browser Anda.');
      } else if (message.includes('NotFoundError') || message.includes('device')) {
        setErrorMsg('Kamera tidak ditemukan pada perangkat ini.');
      } else {
        setErrorMsg('Gagal menyalakan kamera. Pastikan browser mendukung akses kamera.');
      }
      setIsInitializing(false);
    }
  };

  const handleDecodedBarcode = (code: string) => {
    if (!code) return;
    const cleanCode = code.trim();
    
    // Throttle duplicate continuous reads within 1.2 seconds
    if (cleanCode === lastScanned) return;

    setLastScanned(cleanCode);
    playScannerBeep();

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([60, 40, 60]);
      } catch {
        // ignore
      }
    }

    onScanSuccess(cleanCode);

    if (!continuous) {
      stopScanner().then(() => {
        onClose();
      });
    } else {
      setTimeout(() => {
        setLastScanned(null);
      }, 1500);
    }
  };

  // Toggle flashlight / torch
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current) return;
    try {
      const newTorchState = !torchOn;
      await (html5QrCodeRef.current as unknown as {
        applyVideoConstraints: (c: { advanced: [{ torch: boolean }] }) => Promise<void>;
      }).applyVideoConstraints({
        advanced: [{ torch: newTorchState }],
      });
      setTorchOn(newTorchState);
    } catch (err) {
      console.warn('Gagal mengatur lampu senter:', err);
    }
  };

  // Switch camera
  const handleCameraChange = (cameraId: string) => {
    setSelectedCameraId(cameraId);
    startScanner(cameraId);
  };

  // Scan from photo file
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }
      const result = await html5QrCodeRef.current.scanFile(file, true);
      handleDecodedBarcode(result);
    } catch {
      setErrorMsg('Tidak dapat mendeteksi barcode pada foto yang dipilih. Silakan coba foto yang lebih jelas.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      setLastScanned(null);
      setErrorMsg(null);
      // Small timeout to ensure DOM container is rendered
      const t = setTimeout(() => {
        startScanner({ facingMode: 'environment' });
      }, 120);
      return () => {
        clearTimeout(t);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">{title}</h3>
              <p className="text-[11px] text-slate-400 leading-tight">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner().then(onClose);
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Tutup Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Camera Area */}
        <div className="relative bg-black flex-1 min-h-[300px] flex items-center justify-center overflow-hidden">
          {/* HTML5 QR Container */}
          <div
            id={scannerContainerId}
            className="w-full h-full min-h-[300px] flex items-center justify-center overflow-hidden"
          />

          {/* Scanner Visual Overlay Guide */}
          {!errorMsg && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              {/* Aiming frame with corner brackets */}
              <div className="relative w-64 h-40 sm:w-72 sm:h-44 border-2 border-indigo-400/60 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center">
                {/* Red Laser Scanning Line animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-pulse top-1/2 -translate-y-1/2" />
                
                {/* Corner Accents */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-indigo-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-indigo-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-indigo-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-indigo-400 rounded-br-lg" />

                <span className="text-[11px] font-medium text-white/90 bg-slate-900/80 px-2.5 py-1 rounded-full backdrop-blur-xs border border-white/10">
                  Posisikan Barcode di Sini
                </span>
              </div>
            </div>
          )}

          {/* Scanned Badge Toast */}
          {lastScanned && (
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-center">
              <div className="bg-emerald-600/95 text-white px-4 py-2 rounded-2xl shadow-lg border border-emerald-400/40 flex items-center gap-2 backdrop-blur-md animate-bounce">
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span className="text-xs font-bold font-mono">Barcode: {lastScanned}</span>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isInitializing && !errorMsg && (
            <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center gap-2 z-10">
              <RefreshCw className="w-7 h-7 text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-300">Menghubungkan ke kamera...</p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center z-10">
              <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
              <p className="text-sm font-semibold text-white mb-1">Kamera Tidak Dapat Dibuka</p>
              <p className="text-xs text-slate-400 max-w-xs mb-4">{errorMsg}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => startScanner({ facingMode: 'environment' })}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Coba Lagi
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Scan dari Foto
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            {/* Camera Selector (if multiple cameras exist, e.g. front/back) */}
            {cameras.length > 1 ? (
              <select
                value={selectedCameraId}
                onChange={(e) => handleCameraChange(e.target.value)}
                className="text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 max-w-[190px] truncate"
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Kamera ${c.id.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] text-slate-400">Kamera aktif</span>
            )}

            <div className="flex items-center gap-2">
              {/* Torch / Senter toggle */}
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                    torchOn
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                  title="Nyalakan Lampu Senter"
                >
                  <Flashlight className="w-4 h-4" />
                  <span className="text-[11px]">{torchOn ? 'Senter Aktif' : 'Senter'}</span>
                </button>
              )}

              {/* Upload photo fallback */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileScan}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
                title="Pilih foto barcode dari galeri perangkat"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px]">Foto Galeri</span>
              </button>
            </div>
          </div>

          {/* Manual Input Fallback */}
          <div className="flex gap-2 items-center pt-2 border-t border-slate-800/80">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualCode.trim()) {
                  e.preventDefault();
                  handleDecodedBarcode(manualCode.trim());
                  setManualCode('');
                }
              }}
              placeholder="Atau ketik barcode manual jika kamera bermasalah..."
              className="flex-1 text-xs px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              disabled={!manualCode.trim()}
              onClick={() => {
                if (manualCode.trim()) {
                  handleDecodedBarcode(manualCode.trim());
                  setManualCode('');
                }
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
