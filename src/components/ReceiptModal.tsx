import React, { useState } from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  Bluetooth,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Bill } from '../types/pos';
import { usePOS } from '../context/POSContext';
import {
  printBillViaBrowser,
  openReceiptInNewWindow,
  buildBillReceiptHtml,
  isRunningInIframe,
} from '../utils/printReceipt';

interface ReceiptModalProps {
  bill: Bill;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ bill, onClose }) => {
  const {
    settings,
    tables,
    printerStatus,
    printerDeviceName,
    printBillThermal,
    connectBluetoothPrinter,
  } = usePOS();

  const currentTable = tables.find((t) => t.id === bill.tableId);
  const tableName = currentTable?.name || `Table ${bill.tableId}`;
  const [receiptWidth, setReceiptWidth] = useState<'80mm' | '58mm'>(
    settings.printerPaperWidth || '80mm'
  );
  const [isPrinting, setIsPrinting] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  const inIframe = isRunningInIframe();

  const handleSystemPrint = async () => {
    setIsPrinting(true);
    setPrintFeedback(null);
    console.info(`[ReceiptModal] Invoking Windows Browser Print for Bill #${bill.billNumber} (${receiptWidth})`);

    try {
      const res = await printBillViaBrowser(bill, settings, tableName, {
        paperWidth: receiptWidth,
        isReprint: Boolean(bill.isPrinted || (bill.printCount && bill.printCount > 1)),
      });
      if (res.success) {
        setPrintFeedback({
          success: true,
          msg: inIframe
            ? `Print command sent for Bill #${bill.billNumber} (${receiptWidth}). If preview iframe suppressed the dialog, use 'Open in New Tab & Print'.`
            : `Print dialog opened for Bill #${bill.billNumber} (${receiptWidth}). Sent to printer!`,
        });
      } else {
        setPrintFeedback({
          success: false,
          msg: res.error || 'Failed to open print dialog. Try again.',
        });
      }
    } catch (err: any) {
      console.error('[ReceiptModal] Error during system print:', err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePopoutPrint = () => {
    console.info(`[ReceiptModal] Opening pop-out print window for Bill #${bill.billNumber}`);
    const html = buildBillReceiptHtml(bill, settings, tableName, {
      paperWidth: receiptWidth,
      isReprint: Boolean(bill.isPrinted || (bill.printCount && bill.printCount > 1)),
    });
    const opened = openReceiptInNewWindow(html, `Bill #${bill.billNumber}`);
    if (opened) {
      setPrintFeedback({
        success: true,
        msg: `Opened Bill #${bill.billNumber} in clean window. Print dialog initiated!`,
      });
    } else {
      setPrintFeedback({
        success: false,
        msg: 'Pop-up was blocked. Please allow popups for AI Studio preview or use the Print Receipt button.',
      });
    }
  };

  const handleBluetoothPrint = async () => {
    setIsPrinting(true);
    setPrintFeedback(null);
    try {
      const res = await printBillThermal(bill, { forceSystemPrint: false });
      if (res.success) {
        setPrintFeedback({
          success: true,
          msg:
            res.method === 'bluetooth'
              ? `Printed via Bluetooth to ${printerDeviceName || 'Printer'}!`
              : 'Dispatched to Windows Print Manager.',
        });
      } else {
        setPrintFeedback({
          success: false,
          msg: res.error || 'Failed to print. Please use System Print dialog.',
        });
      }
    } catch (e: any) {
      setPrintFeedback({ success: false, msg: e?.message || 'Print transmission error.' });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden my-8">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold tracking-wide">
              Thermal Receipt ({receiptWidth})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 58mm / 80mm Paper Width Toggle */}
            <div className="flex items-center p-0.5 bg-neutral-800 rounded-md text-[11px]">
              <button
                type="button"
                onClick={() => setReceiptWidth('80mm')}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  receiptWidth === '80mm'
                    ? 'bg-white text-neutral-900'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setReceiptWidth('58mm')}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  receiptWidth === '58mm'
                    ? 'bg-white text-neutral-900'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                58mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Area */}
        <div
          className={`mx-auto p-5 bg-white text-neutral-950 font-mono-numbers text-xs leading-relaxed transition-all ${
            receiptWidth === '58mm' ? 'max-w-[58mm] text-[10px]' : 'max-w-[80mm]'
          }`}
          id="printable-receipt"
          data-width={receiptWidth}
        >
          {/* 1. Restaurant Header */}
          <div className="text-center pb-3 border-b border-dashed border-neutral-400">
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-neutral-900">
              {settings.name || 'PRIMECENTURY RESTAURANT & CAFE'}
            </h2>
            {settings.tagline && (
              <p className="text-[10px] text-neutral-600 mt-0.5">{settings.tagline}</p>
            )}
            <p className="text-[10px] text-neutral-600 mt-1 max-w-xs mx-auto leading-tight">
              {settings.address}
            </p>
            <p className="text-[10px] text-neutral-600 mt-0.5">Ph: {settings.phone}</p>
            <div className="flex justify-center gap-2 text-[10px] text-neutral-700 mt-1 font-semibold">
              <span>GSTIN: {settings.gstin}</span>
              <span>·</span>
              <span>FSSAI: {settings.fssai}</span>
            </div>
          </div>

          {(bill.isPrinted || (bill.printCount && bill.printCount > 1)) && (
            <div className="py-1 px-2 my-2 text-center bg-neutral-900 text-white font-bold text-[10px] tracking-wider uppercase rounded">
              *** DUPLICATE / REPRINT RECEIPT ***
            </div>
          )}

          {/* 2. Bill Meta Information */}
          <div className="py-2.5 border-b border-dashed border-neutral-400 space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-neutral-600">Bill No:</span>
              <span className="font-bold text-neutral-900">{bill.billNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-600">Table:</span>
              <span className="font-bold text-neutral-900">{tableName}</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-neutral-600">Date & Time:</span>
              <span>
                {new Date(bill.paidAt).toLocaleString('en-IN', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-neutral-600">Cashier:</span>
              <span>{bill.cashierName}</span>
            </div>
          </div>

          {/* 3. Items, Quantity, Item Price & Line Total */}
          <div className="py-2.5 border-b border-dashed border-neutral-400">
            <div className="grid grid-cols-12 text-[10px] font-bold text-neutral-800 uppercase pb-1 mb-1 border-b border-neutral-300">
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">Total</span>
            </div>
            <div className="space-y-1.5 pt-0.5">
              {bill.items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 text-[11px] items-start">
                  <div className="col-span-6 font-medium text-neutral-900 pr-1 break-words leading-tight">
                    <span>{item.name}</span>
                    {item.notes && (
                      <div className="text-[9.5px] text-neutral-500 font-normal mt-0.5 break-words">
                        ({item.notes})
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 text-center text-neutral-700">{item.quantity}</div>
                  <div className="col-span-2 text-right text-neutral-700">₹{item.price}</div>
                  <div className="col-span-2 text-right font-bold text-neutral-950">
                    ₹{item.price * item.quantity}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Subtotal, Discount, Tax Breakdown & Grand Total */}
          <div className="py-2.5 border-b border-dashed border-neutral-400 text-[11px] space-y-1">
            <div className="flex justify-between text-neutral-700">
              <span>Subtotal:</span>
              <span>₹{bill.subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-neutral-700">
              <span>
                Discount {bill.discountAmount > 0 && bill.discountType === 'percentage' ? `(${bill.discountValue}%)` : ''}:
              </span>
              <span className={bill.discountAmount > 0 ? 'text-neutral-900 font-semibold' : ''}>
                {bill.discountAmount > 0 ? `- ₹${bill.discountAmount.toFixed(2)}` : '₹0.00'}
              </span>
            </div>

            <div className="flex justify-between text-neutral-700">
              <span>CGST ({bill.cgstRate}%):</span>
              <span>₹{bill.cgstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-700">
              <span>SGST ({bill.sgstRate}%):</span>
              <span>₹{bill.sgstAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-xs sm:text-sm font-black text-neutral-950 pt-2 border-t-2 border-neutral-900">
              <span>GRAND TOTAL:</span>
              <span className="text-sm sm:text-base font-black">₹{bill.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* 5. Payment Method & PAID Status */}
          <div className="py-2.5 border-b border-dashed border-neutral-400 text-[11px] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-neutral-600">Payment Mode:</span>
              <span className="font-bold uppercase px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-900">
                {bill.paymentMethod}
              </span>
            </div>

            {bill.paymentMethod === 'cash' && bill.cashReceived && (
              <>
                <div className="flex justify-between text-neutral-700">
                  <span>Cash Received:</span>
                  <span>₹{bill.cashReceived.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-700">
                  <span>Change Returned:</span>
                  <span>₹{(bill.changeGiven || 0).toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center pt-0.5">
              <span className="text-neutral-600">Payment Status:</span>
              {bill.paymentStatus === 'paid' ? (
                <span className="font-black text-emerald-800 uppercase flex items-center gap-1 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  PAID
                </span>
              ) : (
                <span className="font-black text-amber-800 uppercase flex items-center gap-1 text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  UNPAID / ESTIMATE
                </span>
              )}
            </div>
          </div>

          {/* 6. Thank You Message */}
          <div className="pt-3 pb-1 text-center text-[10px] text-neutral-600 space-y-1">
            <p className="font-black text-neutral-900 text-[11px] uppercase tracking-wide">
              Thank You for Dining With Us!
            </p>
            <p>Please Visit Again</p>
            <p className="text-[9px] text-neutral-400 pt-1">
              *** Thermal POS Receipt ***
            </p>
          </div>
        </div>

        {/* Action Buttons (Hidden during printing) */}
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
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm uppercase tracking-wide cursor-pointer disabled:opacity-50"
              >
                <Bluetooth className="w-4 h-4 text-white" />
                <span>
                  {bill.isPrinted || (bill.printCount && bill.printCount > 1) ? 'Reprint' : 'Print'} via Bluetooth ({printerDeviceName || 'Printer'})
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={connectBluetoothPrinter}
                className="inline-flex items-center gap-1.5 px-3 py-3 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                title="Connect wireless Bluetooth thermal printer"
              >
                <Bluetooth className="w-4 h-4 text-blue-600" />
                <span>Connect BT</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSystemPrint}
              className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold rounded-xl transition-colors shadow-sm uppercase tracking-wide cursor-pointer ${
                printerStatus === 'connected'
                  ? 'text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-100'
                  : 'flex-1 text-white bg-neutral-900 hover:bg-neutral-800'
              }`}
              title="Print via Windows Print Manager / Driver (Ctrl+P)"
            >
              <Printer className="w-4 h-4 text-emerald-500" />
              <span>
                {printerStatus === 'connected'
                  ? 'Driver Dialog'
                  : bill.isPrinted || (bill.printCount && bill.printCount > 1)
                  ? 'Reprint Receipt'
                  : 'Print Receipt'}
              </span>
            </button>

            {/* Pop-out Print (guaranteed top-level window print) */}
            <button
              type="button"
              onClick={handlePopoutPrint}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-semibold text-neutral-800 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
              title="Open receipt in new tab and print directly (bypasses iframe sandbox)"
            >
              <ExternalLink className="w-4 h-4 text-neutral-600" />
              <span className="hidden sm:inline">New Tab</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-3 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
