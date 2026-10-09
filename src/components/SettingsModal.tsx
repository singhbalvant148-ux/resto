import React, { useState } from 'react';
import {
  Settings,
  X,
  Save,
  RotateCcw,
  AlertTriangle,
  Printer,
  Bluetooth,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  ExternalLink,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { bluetoothPrinter } from '../utils/bluetoothPrinter';
import { PrinterPaperWidth, PrinterMode, Bill, KOT } from '../types/pos';
import {
  isRunningInIframe,
  openReceiptInNewWindow,
  buildBillReceiptHtml,
  buildKOTReceiptHtml,
} from '../utils/printReceipt';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const {
    settings,
    updateSettings,
    resetToDemoData,
    printerStatus,
    printerDeviceName,
    printerError,
    connectBluetoothPrinter,
    disconnectBluetoothPrinter,
    reconnectBluetoothPrinter,
    testPrintThermal,
  } = usePOS();

  const [formData, setFormData] = useState({
    name: settings.name,
    tagline: settings.tagline,
    address: settings.address,
    phone: settings.phone,
    gstin: settings.gstin,
    fssai: settings.fssai,
    cgstRate: settings.cgstRate,
    sgstRate: settings.sgstRate,
    upiId: settings.upiId,
    printerPaperWidth: (settings.printerPaperWidth || '80mm') as PrinterPaperWidth,
    printerMode: (settings.printerMode || 'auto') as PrinterMode,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const isBrowserSupported = bluetoothPrinter.isSupported();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ...formData,
      cgstRate: Number(formData.cgstRate) || 0,
      sgstRate: Number(formData.sgstRate) || 0,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleReset = () => {
    resetToDemoData();
    setShowResetConfirm(false);
    onClose();
  };

  const inIframe = isRunningInIframe();

  const handleTestPrint = async (type: 'diagnostic' | 'bill' | 'kot') => {
    setIsTesting(true);
    setTestResult(null);
    console.info(`[SettingsModal] Executing test print: type=${type}`);
    try {
      const res = await testPrintThermal(type);
      if (res.success) {
        setTestResult({
          success: true,
          message:
            res.method === 'bluetooth'
              ? `Printed successfully to "${printerDeviceName || 'Bluetooth Printer'}" via direct BLE ESC/POS!`
              : inIframe
              ? 'Print job initiated via Windows Print Manager. Note: If preview iframe suppressed the dialog, use "Pop-out Tab" to test directly.'
              : 'Print job dispatched via Windows System Printer / Browser print dialog.',
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Failed to print test ticket. Please check connection.',
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e?.message || 'Error occurred while testing printer.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestPrintPopout = (type: 'bill' | 'kot') => {
    console.info(`[SettingsModal] Executing pop-out test print: type=${type}`);
    const paperWidth = settings.printerPaperWidth || '80mm';

    if (type === 'bill') {
      const sampleBill: Bill = {
        id: `sample-bill-${Date.now()}`,
        billNumber: 'INV-SAMPLE-2026',
        orderId: 'SAMPLE-ORD-101',
        tableId: 3,
        items: [
          { id: 'sb-1', menuItemId: 'm1', name: 'Paneer Butter Masala (Sample)', price: 280, quantity: 2, isVeg: true, kotSentQuantity: 2 },
          { id: 'sb-2', menuItemId: 'm2', name: 'Garlic Naan (Sample)', price: 55, quantity: 4, isVeg: true, kotSentQuantity: 4 },
        ],
        subtotal: 780,
        discountType: 'percentage',
        discountValue: 0,
        discountAmount: 0,
        cgstRate: settings.cgstRate || 2.5,
        sgstRate: settings.sgstRate || 2.5,
        cgstAmount: 19.5,
        sgstAmount: 19.5,
        grandTotal: 819,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        paidAt: new Date().toISOString(),
        cashierName: 'POS Cashier Station',
        cashReceived: 1000,
        changeGiven: 181,
        isPrinted: true,
      };
      const html = buildBillReceiptHtml(sampleBill, settings, 'Table 3 (Sample)', { paperWidth });
      const opened = openReceiptInNewWindow(html, 'Sample Bill Test');
      if (opened) {
        setTestResult({ success: true, message: 'Sample Bill opened in clean window. Print dialog initiated!' });
      } else {
        setTestResult({ success: false, message: 'Pop-up was blocked. Please allow popups for AI Studio preview.' });
      }
    } else {
      const sampleKOT: KOT = {
        id: `sample-kot-${Date.now()}`,
        kotNumber: 101,
        orderId: 'SAMPLE-ORD-101',
        tableId: 3,
        waiterName: 'Demo Server',
        status: 'new',
        createdAt: new Date().toISOString(),
        items: [
          { menuItemId: 'm1', name: 'Paneer Butter Masala (Sample)', quantity: 2, isVeg: true, notes: 'Less spicy / extra butter' },
          { menuItemId: 'm2', name: 'Garlic Naan (Sample)', quantity: 4, isVeg: true },
          { menuItemId: 'm3', name: 'Crispy Corn Salt & Pepper', quantity: 1, isVeg: true, notes: 'Very crispy' },
        ],
        isPrinted: false,
      };
      const html = buildKOTReceiptHtml(sampleKOT, settings, 'Table 3 (Sample)', { paperWidth });
      const opened = openReceiptInNewWindow(html, 'Sample KOT Test');
      if (opened) {
        setTestResult({ success: true, message: 'Sample KOT opened in clean window. Print dialog initiated!' });
      } else {
        setTestResult({ success: false, message: 'Pop-up was blocked. Please allow popups for AI Studio preview.' });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-neutral-700" />
            <h2 className="text-base font-semibold text-neutral-900">POS & Restaurant Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Restaurant Details */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
              Restaurant Profile
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Restaurant Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-neutral-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">UPI ID (VPA)</label>
                <input
                  type="text"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  placeholder="name@upi"
                />
              </div>
            </div>
          </div>

          {/* Taxes & Legal Identifiers */}
          <div className="pt-2 border-t border-neutral-200">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
              GST & Tax Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  CGST Rate (%) <span className="text-neutral-400 font-normal">(e.g. 2.5%)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="28"
                  value={formData.cgstRate}
                  onChange={(e) => setFormData({ ...formData, cgstRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono-numbers"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  SGST Rate (%) <span className="text-neutral-400 font-normal">(e.g. 2.5%)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="28"
                  value={formData.sgstRate}
                  onChange={(e) => setFormData({ ...formData, sgstRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono-numbers"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono-numbers uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">FSSAI License No</label>
                <input
                  type="text"
                  value={formData.fssai}
                  onChange={(e) => setFormData({ ...formData, fssai: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono-numbers"
                />
              </div>
            </div>
            <p className="text-[11px] text-neutral-500 mt-2">
              Standard Indian restaurant GST is 5% total (2.5% CGST + 2.5% SGST without input tax credit).
            </p>
          </div>

          {/* Thermal Receipt & Bluetooth Printer Settings */}
          <div className="pt-3 border-t border-neutral-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-neutral-700" />
                  Thermal Printer & Bluetooth Settings
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Configure direct Bluetooth (Chrome/Edge on Windows) or Windows Printer Driver
                </p>
              </div>

              {/* Real Connection Status Indicator */}
              <div className="flex items-center gap-2">
                {printerStatus === 'connected' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Connected: {printerDeviceName || 'BLE Printer'}</span>
                  </span>
                )}
                {printerStatus === 'connecting' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg">
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                    <span>Connecting...</span>
                  </span>
                )}
                {printerStatus === 'error' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-300 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Printer Error</span>
                  </span>
                )}
                {printerStatus === 'disconnected' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-600 bg-neutral-100 border border-neutral-300 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-neutral-400"></span>
                    <span>Disconnected</span>
                  </span>
                )}
              </div>
            </div>

            {/* Error Message display if any */}
            {printerError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{printerError}</span>
              </div>
            )}

            {/* Bluetooth Connect / Disconnect Buttons */}
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-neutral-800 block">
                    Bluetooth Wireless Connection
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    Pair directly with wireless 58mm/80mm ESC/POS thermal printers via Web Bluetooth
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {printerStatus !== 'connected' ? (
                    <button
                      type="button"
                      onClick={connectBluetoothPrinter}
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      <Bluetooth className="w-4 h-4" />
                      <span>Connect Bluetooth Printer</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={reconnectBluetoothPrinter}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg transition-colors cursor-pointer"
                        title="Reconnect current printer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reconnect</span>
                      </button>
                      <button
                        type="button"
                        onClick={disconnectBluetoothPrinter}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:text-white bg-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <span>Disconnect</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Thermal Paper Width & Mode Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-200">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Thermal Paper Width
                  </label>
                  <select
                    value={formData.printerPaperWidth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        printerPaperWidth: e.target.value as PrinterPaperWidth,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white font-medium focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="80mm">80 mm (Standard POS / 48 columns)</option>
                    <option value="58mm">58 mm (Mini Pocket POS / 32 columns)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Printing Mode Preference
                  </label>
                  <select
                    value={formData.printerMode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        printerMode: e.target.value as PrinterMode,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white font-medium focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="auto">Auto (Use Bluetooth if connected, else System Driver)</option>
                    <option value="bluetooth">Direct Web Bluetooth (BLE ESC/POS)</option>
                    <option value="system">Windows Printer Driver / System Print (Browser Dialog)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Test Actions (Safe Testing - Requirement 5) */}
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-800 block">
                    Safe Test Printing (No Customer Orders Created)
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    Verify alignment, formatting, and fonts on your printer
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
                  {printerStatus === 'connected' ? 'Mode: Direct BLE' : 'Mode: System Driver'}
                </span>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 animate-in fade-in ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestResult(null)}
                    className="text-neutral-400 hover:text-neutral-700 text-xs px-1"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={() => handleTestPrint('diagnostic')}
                  className="px-3 py-2 text-xs font-bold text-neutral-800 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Prints hardware diagnostic slip with font tests"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span>Test Diagnostic</span>
                </button>

                <button
                  type="button"
                  disabled={isTesting}
                  onClick={() => handleTestPrint('bill')}
                  className="px-3 py-2 text-xs font-bold text-neutral-800 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Prints a sample customer bill receipt without touching orders or daily sales"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Test Bill (System)</span>
                </button>

                <button
                  type="button"
                  disabled={isTesting}
                  onClick={() => handleTestPrint('kot')}
                  className="px-3 py-2 text-xs font-bold text-neutral-800 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Prints a sample kitchen ticket without creating kitchen orders"
                >
                  <Printer className="w-3.5 h-3.5 text-purple-600" />
                  <span>Test KOT (System)</span>
                </button>
              </div>

              {/* Popout test buttons for testing outside AI Studio iframe sandbox */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-200 text-xs">
                <span className="text-[11px] text-neutral-500 font-medium">Bypass iframe sandbox:</span>
                <button
                  type="button"
                  onClick={() => handleTestPrintPopout('bill')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-md transition-colors cursor-pointer"
                  title="Open and print sample bill in a clean new window"
                >
                  <ExternalLink className="w-3 h-3 text-neutral-600" />
                  <span>Sample Bill (New Tab)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestPrintPopout('kot')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-md transition-colors cursor-pointer"
                  title="Open and print sample KOT in a clean new window"
                >
                  <ExternalLink className="w-3 h-3 text-neutral-600" />
                  <span>Sample KOT (New Tab)</span>
                </button>
              </div>
            </div>

            {/* Windows PC & Bluetooth Classic Technical Guidance Box */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-blue-950">
                <Info className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>Windows PC & Bluetooth Thermal Printer Setup Guide</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-blue-800 leading-normal">
                <li>
                  <strong>Supported Browsers:</strong> Direct Bluetooth connection works in <em>Google Chrome</em> and <em>Microsoft Edge</em> on Windows 10/11.
                </li>
                <li>
                  <strong>Bluetooth BLE GATT Printers:</strong> Pair directly using the "Connect Bluetooth Printer" button above. Chrome/Edge will display the Bluetooth discovery dialog.
                </li>
                <li>
                  <strong>Bluetooth Classic (SPP) Printers:</strong> Bluetooth Classic RFCOMM printers do not support Web Bluetooth GATT. Pair your printer in <em>Windows Settings → Bluetooth</em>, install the POS printer driver (or Generic / Text Only), and select <strong>Windows Printer Driver</strong> mode to print via standard browser printing.
                </li>
              </ul>
            </div>
          </div>

          {/* Reset Demo Data option */}
          <div className="pt-3 border-t border-neutral-200">
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset All Sample Data to Default
              </button>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Reset all tables, orders, KOTs, and bills to fresh initial state?</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-2.5 py-1 text-xs font-semibold bg-rose-600 text-white rounded hover:bg-rose-700"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-2.5 py-1 text-xs font-medium bg-white text-neutral-600 rounded border border-neutral-300 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
            {savedSuccess ? (
              <span className="text-xs font-medium text-emerald-600">Settings saved successfully!</span>
            ) : (
              <span className="text-xs text-neutral-400">Updates apply immediately to bills & receipts</span>
            )}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
