import React, { useState, useEffect } from 'react';
import {
  Receipt,
  IndianRupee,
  Percent,
  CreditCard,
  QrCode,
  Banknote,
  Printer,
  CheckCircle2,
  AlertCircle,
  Tag,
  Settings,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { PaymentMethod, Bill } from '../types/pos';
import { ReceiptModal } from './ReceiptModal';

export const BillingView: React.FC = () => {
  const {
    tables,
    orders,
    activeTableId,
    setActiveTableId,
    settings,
    updateSettings,
    generateBillForOrder,
    settleBill,
    currentUser,
    printBillThermal,
  } = usePOS();

  // Find tables with active or billed orders
  const billableTables = tables.filter((t) => {
    if (t.status === 'available') return false;
    const order = orders.find((o) => o.id === t.activeOrderId && o.status !== 'paid');
    return Boolean(order && order.items.length > 0);
  });

  const selectedTableId = activeTableId && billableTables.some((t) => t.id === activeTableId)
    ? activeTableId
    : (billableTables[0]?.id || 1);

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const selectedOrder = orders.find(
    (o) => o.id === selectedTable?.activeOrderId && o.status !== 'paid'
  );

  // Billing state
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [customCgstRate, setCustomCgstRate] = useState<number>(settings.cgstRate);
  const [customSgstRate, setCustomSgstRate] = useState<number>(settings.sgstRate);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [settledBill, setSettledBill] = useState<Bill | null>(null);
  const [isEditingTax, setIsEditingTax] = useState<boolean>(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  // Direct Print Bill handler
  const handlePrintBill = async () => {
    if (!selectedOrder) return;
    console.info(`[BillingView] PRINT BILL requested for order #${selectedOrder.orderNumber} (Table ${selectedTableId})`);

    // Create current thermal bill preview for 58mm/80mm printing
    const previewBill: Bill = {
      id: `bill-print-${Date.now()}`,
      billNumber: `INV-${new Date().getFullYear()}-${String(selectedOrder.orderNumber).padStart(4, '0')}`,
      orderId: selectedOrder.id,
      tableId: selectedTableId,
      items: [...items],
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      cgstRate: customCgstRate,
      sgstRate: customSgstRate,
      cgstAmount,
      sgstAmount,
      grandTotal,
      paymentMethod,
      paymentStatus: 'unpaid',
      paidAt: new Date().toISOString(),
      cashierName: currentUser?.name || 'Cashier',
      cashReceived: paymentMethod === 'cash' ? cashNum : undefined,
      changeGiven: paymentMethod === 'cash' ? changeToReturn : undefined,
    };

    try {
      await printBillThermal(previewBill);
    } catch (err) {
      console.error('[BillingView] Error invoking bill print:', err);
    }
  };

  // Subtotal calculation
  const items = selectedOrder?.items || [];
  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  // Discount calculation
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = Math.round(((subtotal * discountValue) / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(discountValue, subtotal);
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const cgstAmount = Math.round(((taxableAmount * customCgstRate) / 100) * 100) / 100;
  const sgstAmount = Math.round(((taxableAmount * customSgstRate) / 100) * 100) / 100;
  const grandTotal = Math.round(taxableAmount + cgstAmount + sgstAmount);

  // Cash change calculation
  const cashNum = parseFloat(cashTendered) || 0;
  const changeToReturn = Math.max(0, cashNum - grandTotal);

  const handleSettleAndPrint = () => {
    setBillingError(null);
    if (!selectedOrder) return;

    // Validate cash received if cash payment method
    if (paymentMethod === 'cash' && cashTendered.trim() !== '' && cashNum < grandTotal) {
      setBillingError(
        `Cash received (₹${cashNum.toFixed(2)}) is less than total bill (₹${grandTotal.toFixed(2)}). Please collect full amount before settling.`
      );
      return;
    }

    // Temporarily update settings rates if edited
    if (customCgstRate !== settings.cgstRate || customSgstRate !== settings.sgstRate) {
      updateSettings({ cgstRate: customCgstRate, sgstRate: customSgstRate });
    }

    const newBill = generateBillForOrder(selectedOrder.id, discountType, discountValue);

    const effectiveCashReceived =
      paymentMethod === 'cash' ? (cashNum > 0 ? cashNum : grandTotal) : undefined;
    const effectiveChangeGiven =
      paymentMethod === 'cash' ? Math.max(0, (effectiveCashReceived || 0) - grandTotal) : undefined;

    const finalBill: Bill = {
      ...newBill,
      cgstRate: customCgstRate,
      sgstRate: customSgstRate,
      cgstAmount,
      sgstAmount,
      grandTotal,
      paymentMethod,
      paymentStatus: 'paid',
      cashReceived: effectiveCashReceived,
      changeGiven: effectiveChangeGiven,
      paidAt: new Date().toISOString(),
      cashierName: currentUser?.name || 'Cashier',
    };

    const success = settleBill(
      finalBill,
      paymentMethod,
      effectiveCashReceived,
      effectiveChangeGiven
    );

    if (success) {
      // Open receipt modal immediately
      setSettledBill(finalBill);
      setCashTendered('');
      setBillingError(null);
    } else {
      setBillingError('Failed to settle bill. Please check order and table details.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Billing & Checkout Counter
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Calculate subtotal, GST, discounts, and accept Cash, UPI, or Card payments
          </p>
        </div>

        {/* Table Selector & Prominent PRINT BILL Button */}
        {billableTables.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-600">Select Table:</span>
              <div className="relative">
                <select
                  value={selectedTableId}
                  onChange={(e) => setActiveTableId(Number(e.target.value))}
                  className="appearance-none bg-white font-bold text-neutral-900 text-xs py-2 pl-3 pr-8 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 shadow-2xs"
                >
                  {billableTables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.section})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Prominent Header PRINT BILL Button */}
            <button
              type="button"
              onClick={handlePrintBill}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-sm transition-all uppercase tracking-wider cursor-pointer"
              title="Print 58mm or 80mm thermal bill receipt"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>PRINT BILL</span>
            </button>
          </div>
        )}
      </div>

      {billableTables.length === 0 || !selectedOrder || items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-neutral-400">
          <Receipt className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
          <h3 className="text-base font-semibold text-neutral-800">No tables pending billing</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            All tables are currently free or have no active items. Start taking an order from the Table Map or Menu.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Itemized Bill Details */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  {selectedTable?.name} Invoice Details
                </h2>
                <p className="text-xs text-neutral-500">
                  Order #{selectedOrder.orderNumber} · Waiter: {selectedOrder.waiterName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintBill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Print Thermal Receipt"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PRINT BILL</span>
                </button>
                <span className="text-xs font-semibold px-2 py-1 bg-amber-100 text-amber-900 rounded-lg">
                  Unpaid Bill
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 text-[10px] uppercase font-bold">
                    <th className="pb-2">Dish Item</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Rate</th>
                    <th className="pb-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {items.map((item) => (
                    <tr key={item.id} className="py-2">
                      <td className="py-2.5">
                        <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          ></span>
                          <span>{item.name}</span>
                        </div>
                        {item.notes && (
                          <div className="text-[10px] text-amber-700 italic pl-3.5">
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 text-center font-bold font-mono-numbers text-neutral-800">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 text-right font-mono-numbers text-neutral-600">
                        ₹{item.price}
                      </td>
                      <td className="py-2.5 text-right font-bold font-mono-numbers text-neutral-900">
                        ₹{item.price * item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Configurable Taxes Banner */}
            <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-neutral-600" />
                  Tax & GST Configuration
                </span>
                <button
                  onClick={() => setIsEditingTax(!isEditingTax)}
                  className="text-[11px] font-semibold text-neutral-800 hover:underline"
                >
                  {isEditingTax ? 'Done' : 'Change Tax %'}
                </button>
              </div>

              {isEditingTax ? (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-200">
                  <div>
                    <label className="block text-[10px] font-medium text-neutral-600 mb-0.5">
                      CGST Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={customCgstRate}
                      onChange={(e) => setCustomCgstRate(Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs border border-neutral-300 rounded font-mono-numbers"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-neutral-600 mb-0.5">
                      SGST Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={customSgstRate}
                      onChange={(e) => setCustomSgstRate(Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs border border-neutral-300 rounded font-mono-numbers"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex justify-between text-[11px] text-neutral-500">
                  <span>Current: CGST {customCgstRate}% + SGST {customSgstRate}% (Total {customCgstRate + customSgstRate}%)</span>
                  <span>GSTIN: {settings.gstin}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Calculations & Payment Method */}
          <div className="lg:col-span-5 space-y-5">
            {/* Discount & Calculations Card */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Discounts & Totals
              </h3>

              {/* Discount Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Apply Discount
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center p-0.5 bg-neutral-100 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`px-2.5 py-1 font-semibold rounded-md transition-colors ${
                        discountType === 'percentage'
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-600'
                      }`}
                    >
                      % Percent
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('flat')}
                      className={`px-2.5 py-1 font-semibold rounded-md transition-colors ${
                        discountType === 'flat'
                          ? 'bg-neutral-900 text-white'
                          : 'text-neutral-600'
                      }`}
                    >
                      ₹ Flat
                    </button>
                  </div>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value)))}
                      placeholder={discountType === 'percentage' ? 'e.g. 10' : 'e.g. 50'}
                      className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono-numbers"
                    />
                  </div>
                </div>

                {/* Quick discount chips */}
                <div className="flex items-center gap-1.5 mt-2">
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setDiscountType('percentage');
                        setDiscountValue(pct);
                      }}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-neutral-100 hover:bg-neutral-200 rounded text-neutral-700 transition-colors"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Calculation Summary */}
              <div className="space-y-2 pt-3 border-t border-neutral-200 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-mono-numbers font-medium">₹{subtotal.toFixed(2)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount</span>
                    <span className="font-mono-numbers">- ₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-neutral-600">
                  <span>CGST ({customCgstRate}%)</span>
                  <span className="font-mono-numbers">₹{cgstAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-neutral-600">
                  <span>SGST ({customSgstRate}%)</span>
                  <span className="font-mono-numbers">₹{sgstAmount.toFixed(2)}</span>
                </div>

                {/* Grand Total */}
                <div className="flex justify-between items-baseline pt-3 border-t-2 border-neutral-900">
                  <span className="text-sm font-bold text-neutral-900 uppercase">Grand Total:</span>
                  <span className="text-2xl font-black text-neutral-900 font-mono-numbers">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Modes Card */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Payment Method
              </h3>

              {/* 3 Payment Mode Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    paymentMethod === 'cash'
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-xs font-bold">Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    paymentMethod === 'upi'
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="text-xs font-bold">UPI QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    paymentMethod === 'card'
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50 text-neutral-700'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs font-bold">Card</span>
                </button>
              </div>

              {/* Payment Specific Input Sections */}
              {paymentMethod === 'cash' && (
                <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Cash Received (₹)
                    </label>
                    <input
                      type="number"
                      placeholder={`Enter amount (e.g. ₹${Math.ceil(grandTotal / 100) * 100})`}
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono-numbers"
                    />
                  </div>

                  {cashNum > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-200 text-xs">
                      <span className="text-neutral-600 font-medium">Change to Return:</span>
                      <span
                        className={`text-base font-bold font-mono-numbers ${
                          changeToReturn >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {cashNum < grandTotal
                          ? `Needs ₹${(grandTotal - cashNum).toFixed(2)} more`
                          : `₹${changeToReturn.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'upi' && (
                <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-center space-y-2">
                  <div className="w-32 h-32 mx-auto bg-white p-2 rounded-lg border border-neutral-300 flex items-center justify-center shadow-2xs">
                    <QrCode className="w-24 h-24 text-neutral-900" />
                  </div>
                  <div className="text-xs">
                    <div className="font-bold text-neutral-900">Scan UPI QR to Pay</div>
                    <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                      VPA: {settings.upiId}
                    </div>
                    <div className="text-sm font-extrabold text-neutral-900 font-mono-numbers mt-1">
                      Pay Exact: ₹{grandTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-neutral-700 shrink-0" />
                  <div>
                    <div className="font-semibold text-neutral-900">Card POS Terminal</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      Swipe/Tap card for ₹{grandTotal.toFixed(2)} on POS terminal, then click Mark Paid.
                    </div>
                  </div>
                </div>
              )}

              {/* Prominent PRINT BILL Button */}
              <button
                type="button"
                onClick={handlePrintBill}
                className="w-full py-3.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>PRINT BILL (₹{grandTotal.toFixed(2)})</span>
              </button>

              {billingError && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{billingError}</span>
                </div>
              )}

              {/* Settle & Print Primary Button */}
              <button
                type="button"
                onClick={handleSettleAndPrint}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Bill as Paid & Settle (₹{grandTotal.toFixed(2)})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Receipt Modal after Settlement */}
      {settledBill && (
        <ReceiptModal
          bill={settledBill}
          onClose={() => {
            setSettledBill(null);
            // reset tender
            setCashTendered('');
          }}
        />
      )}
    </div>
  );
};
