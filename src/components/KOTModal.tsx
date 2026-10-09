import React, { useState } from 'react';
import {
  Printer,
  X,
  ChefHat,
  Bluetooth,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { KOT, PrinterPaperWidth } from '../types/pos';
import { usePOS } from '../context/POSContext';
import {
  printKOTViaBrowser,
  openReceiptInNewWindow,
  buildKOTReceiptHtml,
  isRunningInIframe,
} from '../utils/printReceipt';

interface KOTModalProps {
  kot: KOT;
  onClose: () => void;
}

export const KOTModal: React.FC<KOTModalProps> = ({ kot, onClose }) => {
  const {
    settings,
    tables,
    printerStatus,
    printerDeviceName,
    printKOTThermal,
    connectBluetoothPrinter,
  } = usePOS();

  const currentTable = tables.find((t) => t.id === kot.tableId);
  const tableName = currentTable?.name || `Table #${kot.tableId}`;

  const [paperWidth, setPaperWidth] = useState<PrinterPaperWidth>(
    settings.printerPaperWidth || '80mm'
  );
  const [isPrinting, setIsPrinting] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<{
    success: boolean;
    msg: string;
  } | null>(null);

  const isAlreadyPrinted = Boolean(kot.isPrinted || (kot.printCount && kot.printCount > 0));
  const inIframe = isRunningInIframe();

  const handleSystemPrint = async () => {
    setIsPrinting(true);
    setPrintFeedback(null);
    console.info(`[KOTModal] Invoking Windows Browser Print for KOT #${kot.kotNumber} (${paperWidth})`);

    try {
      const res = await printKOTViaBrowser(kot, settings, tableName, {
        paperWidth,
        isReprint: isAlreadyPrinted,
      });
      if (res.success) {
        setPrintFeedback({
          success: true,
          msg: inIframe
            ? `Print command sent for KOT #${kot.kotNumber} (${paperWidth}). If preview iframe suppressed dialog, click 'Open in New Tab & Print'.`
            : `Print dialog opened for KOT #${kot.kotNumber} (${paperWidth}). Sent to kitchen printer!`,
        });
      } else {
        setPrintFeedback({
          success: false,
          msg: res.error || 'Failed to open KOT print dialog. Try again.',
        });
      }
    } catch (err: any) {
      console.error('[KOTModal] Error during system print:', err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePopoutPrint = () => {
    console.info(`[KOTModal] Opening pop-out print window for KOT #${kot.kotNumber}`);
    const html = buildKOTReceiptHtml(kot, settings, tableName, {
      paperWidth,
      isReprint: isAlreadyPrinted,
    });
    const opened = openReceiptInNewWindow(html, `KOT #${kot.kotNumber} (${tableName})`);
    if (opened) {
      setPrintFeedback({
        success: true,
        msg: `Opened KOT #${kot.kotNumber} in clean window. Print dialog initiated!`,
      });
    } else {
      setPrintFeedback({
        success: false,
        msg: 'Pop-up window was blocked. Please allow popups for AI Studio preview or use the Print KOT button.',
      });
    }
  };

  const handleBluetoothPrint = async () => {
    setIsPrinting(true);
    setPrintFeedback(null);
    try {
      const res = await printKOTThermal(kot, {
        forceSystemPrint: false,
        isReprint: isAlreadyPrinted,
      });

      if (res.success) {
        setPrintFeedback({
          success: true,
          msg:
            res.method === 'bluetooth'
              ? `Printed KOT #${kot.kotNumber} via Bluetooth to ${printerDeviceName || 'Printer'}!`
              : 'KOT job dispatched to Windows Print Manager / Driver.',
        });
      } else {
        setPrintFeedback({
          success: false,
          msg: res.error || 'Bluetooth KOT print failed. Try System Print.',
        });
      }
    } catch (e: any) {
      setPrintFeedback({
        success: false,
        msg: e?.message || 'Error occurred during KOT print.',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const formattedDate = new Date(kot.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = new Date(kot.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden my-8">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold tracking-wide">
              KOT Ticket #{kot.kotNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Width Toggle */}
            <div className="flex items-center p-0.5 bg-neutral-800 rounded-md text-[11px]">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  paperWidth === '80mm'
                    ? 'bg-white text-neutral-900'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  paperWidth === '58mm'
                    ? 'bg-white text-neutral-900'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                58mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Duplicate warning notification if already printed */}
        {isAlreadyPrinted && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-[11px] flex items-center gap-2 print:hidden">
            <Copy className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              <strong>Note:</strong> This KOT was already printed {kot.printCount ? `(${kot.printCount}x)` : ''}.
              Printing now will produce a marked <em>Reprint</em> ticket.
            </span>
          </div>
        )}

        {/* Printable KOT Area - Standard Thermal Printer Layout */}
        <div
          className={`mx-auto p-5 bg-white text-neutral-900 font-mono-numbers text-xs leading-relaxed transition-all ${
            paperWidth === '58mm' ? 'max-w-[58mm] text-[10px]' : 'max-w-[80mm]'
          }`}
          id="printable-receipt"
          data-width={paperWidth}
        >
          {/* Header */}
          <div className="text-center pb-2 border-b-2 border-neutral-900">
            <h2 className="text-base font-black tracking-wider uppercase">*** KITCHEN ORDER TICKET ***</h2>
            <p className="text-xs font-bold text-neutral-800">{settings.name}</p>
          </div>

          {/* Duplicate / Reprint Banner */}
          {isAlreadyPrinted && (
            <div className="py-1 px-2 my-2 text-center bg-neutral-900 text-white font-black text-[10px] tracking-wider uppercase rounded">
              *** DUPLICATE / REPRINT KOT ***
            </div>
          )}

          {/* Meta Details */}
          <div className="py-2.5 border-b-2 border-dashed border-neutral-900 text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-black text-xl text-neutral-900">{tableName.toUpperCase()}</span>
              <span className="font-black text-sm bg-neutral-100 border border-neutral-900 px-2 py-0.5 rounded">
                KOT #{kot.kotNumber}
              </span>
            </div>
            <div className="flex justify-between text-neutral-800 font-semibold text-xs pt-1">
              <span>Order #: {kot.orderId}</span>
              <span>Type: Dine-In</span>
            </div>
            <div className="flex justify-between text-neutral-700 text-[11px]">
              <span>Date: {formattedDate}</span>
              <span>Time: {formattedTime}</span>
            </div>
            <div className="text-neutral-700 text-[11px]">
              Server / Waiter: <span className="font-bold text-neutral-900">{kot.waiterName}</span>
            </div>
          </div>

          {/* Items */}
          <div className="py-3 border-b-2 border-neutral-900">
            <div className="flex justify-between font-black text-xs pb-1 mb-2 border-b border-neutral-900 uppercase">
              <span>ITEM NAME</span>
              <span className="text-right">QTY</span>
            </div>
            <div className="space-y-2.5 pt-1">
              {kot.items.map((item, idx) => (
                <div key={idx} className="pb-2 border-b border-dashed border-neutral-200 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start text-xs">
                    <div className="font-black text-sm text-neutral-900 leading-snug flex-1 pr-2">
                      {item.name}
                    </div>
                    <span className="font-black text-base text-neutral-900 px-2 py-0.5 bg-neutral-100 border border-neutral-900 rounded shrink-0">
                      x{item.quantity}
                    </span>
                  </div>
                  {item.notes && (
                    <div className="mt-1 text-[11px] font-bold text-neutral-900 bg-neutral-100 p-1.5 rounded border border-neutral-400">
                      *** NOTE: {item.notes} ***
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 text-center text-xs text-neutral-700 space-y-0.5">
            <div className="font-bold">Total Items: {kot.items.reduce((s, it) => s + it.quantity, 0)}</div>
            <div className="text-[10px] uppercase font-semibold text-neutral-500">
              KOT #{kot.kotNumber} · Status: <span className="font-bold text-neutral-900">{kot.status.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons & Feedback */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 print:hidden space-y-2.5">
          {printFeedback && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 ${
                printFeedback.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {printFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{printFeedback.msg}</span>
              </div>
              <button
                type="button"
                onClick={() => setPrintFeedback(null)}
                className="text-neutral-400 hover:text-neutral-700 text-xs px-1"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {printerStatus === 'connected' ? (
              <button
                type="button"
                disabled={isPrinting}
                onClick={handleBluetoothPrint}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm uppercase tracking-wide cursor-pointer disabled:opacity-50"
              >
                <Bluetooth className="w-4 h-4 text-white" />
                <span>
                  {isAlreadyPrinted ? 'Reprint' : 'Print'} via BT ({printerDeviceName || 'Printer'})
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={connectBluetoothPrinter}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                title="Connect wireless Bluetooth thermal printer"
              >
                <Bluetooth className="w-4 h-4 text-blue-600" />
                <span>Connect BT</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSystemPrint}
              className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-lg transition-colors shadow-sm uppercase tracking-wide cursor-pointer ${
                printerStatus === 'connected'
                  ? 'text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-100'
                  : 'flex-1 text-white bg-neutral-900 hover:bg-neutral-800'
              }`}
              title="Print via Windows Print Manager / Driver (Ctrl+P)"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>
                {printerStatus === 'connected'
                  ? 'Driver Dialog'
                  : isAlreadyPrinted
                  ? 'Reprint KOT'
                  : 'Print KOT'}
              </span>
            </button>

            {/* Pop-out Print */}
            <button
              type="button"
              onClick={handlePopoutPrint}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-neutral-800 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
              title="Open KOT in new tab and print directly (bypasses iframe sandbox)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-neutral-600" />
              <span className="hidden sm:inline">New Tab</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-2.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
