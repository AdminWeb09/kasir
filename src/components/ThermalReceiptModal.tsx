import React, { useState } from 'react';
import { Transaction, StoreSettings } from '../types';
import { formatRupiah, formatDateTime } from '../utils/helpers';
import { Printer, X, Check, Copy } from 'lucide-react';

interface ThermalReceiptModalProps {
  transaction: Transaction | null;
  settings: StoreSettings;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  transaction,
  settings,
  onClose,
}) => {
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>(settings.paper_size || '58mm');
  const [copied, setCopied] = useState(false);

  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyInvoice = () => {
    navigator.clipboard.writeText(transaction.invoice_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      {/* Container - Hidden in print, only receipt preview is printed via .print-area */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 no-print">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Cetak Nota Kasir</h3>
            <p className="text-xs text-slate-500 font-mono">{transaction.invoice_number}</p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Paper Size Selector */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setPaperSize('58mm')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperSize === '58mm' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('80mm')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperSize === '80mm' ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                80mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Scrollable Body Preview */}
        <div className="p-6 overflow-y-auto bg-slate-100/70 flex justify-center flex-1">
          {/* Printable Area Target */}
          <div className={`print-area ${paperSize === '58mm' ? 'receipt-58mm' : 'receipt-80mm'} bg-white p-4 shadow-sm border border-slate-200 font-mono text-slate-900 leading-tight`}>
            {/* Store Header */}
            <div className="text-center pb-2 border-b border-dashed border-slate-400">
              <h2 className="text-sm font-bold uppercase tracking-wider">{settings.store_name}</h2>
              <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{settings.address}</p>
              <p className="text-[10px] text-slate-600">Telp: {settings.phone}</p>
            </div>

            {/* Meta Info */}
            <div className="py-2 text-[10px] border-b border-dashed border-slate-400 space-y-0.5">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-semibold">{transaction.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{formatDateTime(transaction.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{transaction.user_name}</span>
              </div>
              {transaction.customer_name && (
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span>{transaction.customer_name}</span>
                </div>
              )}
              {transaction.status === 'void' && (
                <div className="mt-1 text-center font-bold text-red-600 border border-red-600 py-0.5">
                  *** TRANSAKSI DIBATALKAN (VOID) ***
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-1.5 text-[10px]">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-medium text-slate-900 truncate">{item.product_name}</div>
                  <div className="flex justify-between text-slate-600 pl-2">
                    <span>
                      {item.quantity} x {formatRupiah(item.sell_price)}
                    </span>
                    <span className="font-semibold text-slate-900 font-mono-numbers">
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono-numbers">{formatRupiah(transaction.subtotal)}</span>
              </div>
              {transaction.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Diskon:</span>
                  <span className="font-mono-numbers">-{formatRupiah(transaction.discount_amount)}</span>
                </div>
              )}
              {transaction.tax_amount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>PPN ({transaction.tax_percent}%):</span>
                  <span className="font-mono-numbers">{formatRupiah(transaction.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                <span>TOTAL:</span>
                <span className="font-mono-numbers">{formatRupiah(transaction.total_amount)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="capitalize">Bayar ({transaction.payment_method}):</span>
                <span className="font-mono-numbers">{formatRupiah(transaction.cash_received)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Kembali:</span>
                <span className="font-mono-numbers">{formatRupiah(transaction.change_amount)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 text-center text-[9px] text-slate-500 space-y-1 leading-normal">
              <p>{settings.receipt_footer}</p>
              {/* Simulated barcode graphic */}
              <div className="pt-2 flex flex-col items-center">
                <div className="h-6 w-36 bg-gradient-to-r from-black via-slate-700 to-black flex items-center justify-center tracking-widest text-[8px] text-white font-mono opacity-80">
                  ||||| | |||| || |||
                </div>
                <span className="text-[8px] tracking-wider mt-0.5">{transaction.invoice_number}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3 no-print">
          <button
            onClick={handleCopyInvoice}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Tersalin' : 'Salin No. Nota'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Nota ({paperSize})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
