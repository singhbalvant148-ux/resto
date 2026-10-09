import React, { useState } from 'react';
import {
  ClipboardList,
  Clock,
  Receipt,
  CheckCircle2,
  ChefHat,
  Search,
  ArrowRight,
  Eye,
  PlusCircle,
  X,
  Printer,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Order, OrderStatus, KOT } from '../types/pos';

export const OrdersView: React.FC = () => {
  const {
    orders,
    tables,
    setActiveTableId,
    setActiveView,
    sendKOT,
    setBillToPrint,
    bills,
    kots,
    setKotToPrint,
    printKOTThermal,
    printBillThermal,
  } = usePOS();

  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = order.orderNumber.toString().includes(q);
      const matchTable = `table ${order.tableId}`.includes(q);
      const matchWaiter = order.waiterName.toLowerCase().includes(q);
      const matchItems = order.items.some((it) => it.name.toLowerCase().includes(q));
      return matchNumber || matchTable || matchWaiter || matchItems;
    }
    return true;
  });

  const getTableSection = (tableId: number) => {
    return tables.find((t) => t.id === tableId)?.section || 'Main Hall';
  };

  const handleOpenMenuForOrder = (tableId: number) => {
    setActiveTableId(tableId);
    setActiveView('menu');
  };

  const handleOpenBillingForOrder = (tableId: number) => {
    setActiveTableId(tableId);
    setActiveView('billing');
  };

  const handlePrintKOTForOrder = async (order: Order) => {
    console.info(`[OrdersView] Print KOT requested for order #${order.orderNumber}`);
    const existing = kots.find((k) => k.orderId === order.id);
    const targetKot: KOT = existing || {
      id: `kot-gen-${order.id}`,
      kotNumber: order.orderNumber,
      orderId: order.id,
      tableId: order.tableId,
      waiterName: order.waiterName,
      items: order.items.map((it) => ({
        menuItemId: it.menuItemId,
        name: it.name,
        quantity: it.quantity,
        notes: it.notes,
        isVeg: it.isVeg,
      })),
      status: 'new',
      createdAt: order.createdAt,
    };
    setKotToPrint(targetKot);
    try {
      await printKOTThermal(targetKot);
    } catch (e) {
      console.error('[OrdersView] Error printing KOT:', e);
    }
  };

  const handleReprintBillForOrder = async (order: Order) => {
    console.info(`[OrdersView] Reprint Bill requested for order #${order.orderNumber}`);
    const matchedBill = bills.find((b) => b.orderId === order.id);
    if (matchedBill) {
      setBillToPrint(matchedBill);
      try {
        await printBillThermal(matchedBill);
      } catch (e) {
        console.error('[OrdersView] Error reprinting bill:', e);
      }
    } else {
      console.warn(`[OrdersView] No settled bill found for order #${order.orderNumber}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Orders Management
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Monitor all running table orders, items ordered, and checkout status
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                statusFilter === 'active'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Active ({orders.filter((o) => o.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('billed')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                statusFilter === 'billed'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Billed ({orders.filter((o) => o.status === 'billed').length})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                statusFilter === 'paid'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Paid ({orders.filter((o) => o.status === 'paid').length})
            </button>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Order #, Table, Waiter, or Dish name..."
          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
        />
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase text-[10px] font-semibold tracking-wider">
                <th className="px-4 py-3">Order No</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Waiter</th>
                <th className="px-4 py-3">Items Ordered</th>
                <th className="px-4 py-3 text-right">Order Total (₹)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Time Placed</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-neutral-400">
                    No orders match your filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const itemCount = order.items.reduce((s, it) => s + it.quantity, 0);
                  const orderTotal = order.items.reduce((s, it) => s + it.price * it.quantity, 0);
                  const unsentCount = order.items.reduce(
                    (s, it) => s + (it.quantity - it.kotSentQuantity),
                    0
                  );

                  return (
                    <tr key={order.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="px-4 py-3 font-bold text-neutral-900 font-mono-numbers">
                        #{order.orderNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-neutral-900">Table {order.tableId}</div>
                        <div className="text-[10px] text-neutral-400">{getTableSection(order.tableId)}</div>
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{order.waiterName}</td>
                      <td className="px-4 py-3 text-neutral-700">
                        <div className="font-medium">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate max-w-xs">
                          {order.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-neutral-900 font-mono-numbers text-sm">
                        ₹{orderTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {order.status === 'active' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3" /> Running
                          </span>
                        )}
                        {order.status === 'billed' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                            <Receipt className="w-3 h-3" /> Billed
                          </span>
                        )}
                        {order.status === 'paid' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Settled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-500 font-mono-numbers text-[11px]">
                        {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 rounded text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                            title="View Items Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintKOTForOrder(order)}
                            className="p-1.5 rounded text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                            title="Print KOT Slip"
                          >
                            <Printer className="w-4 h-4 text-neutral-700" />
                          </button>

                          {order.status === 'active' && (
                            <>
                              <button
                                onClick={() => handleOpenMenuForOrder(order.tableId)}
                                className="px-2 py-1 text-xs font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors"
                              >
                                Edit / Add
                              </button>
                              <button
                                onClick={() => handleOpenBillingForOrder(order.tableId)}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded transition-colors"
                              >
                                Bill
                              </button>
                            </>
                          )}

                          {order.status === 'billed' && (
                            <button
                              onClick={() => handleOpenBillingForOrder(order.tableId)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors"
                            >
                              Settle
                            </button>
                          )}

                          {order.status === 'paid' && (
                            <button
                              onClick={() => handleReprintBillForOrder(order)}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors"
                              title="Reprint Customer Bill Receipt"
                            >
                              Reprint Bill
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-neutral-50">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Order #{selectedOrder.orderNumber} (Table {selectedOrder.tableId})
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Waiter: {selectedOrder.waiterName} · Created{' '}
                  {new Date(selectedOrder.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-neutral-500 pb-1 border-b border-neutral-200">
                  <span className="col-span-6">Dish</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Price</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 text-xs items-center py-1">
                    <div className="col-span-6">
                      <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        ></span>
                        {item.name}
                      </div>
                      {item.notes && (
                        <div className="text-[10px] text-amber-700 italic pl-3.5">
                          Note: {item.notes}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-center font-bold font-mono-numbers">
                      {item.quantity}
                    </div>
                    <div className="col-span-2 text-right text-neutral-600 font-mono-numbers">
                      ₹{item.price}
                    </div>
                    <div className="col-span-2 text-right font-bold text-neutral-900 font-mono-numbers">
                      ₹{item.price * item.quantity}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-neutral-200 flex justify-between items-center">
                <span className="text-xs font-semibold text-neutral-700">Subtotal:</span>
                <span className="text-base font-bold text-neutral-900 font-mono-numbers">
                  ₹{selectedOrder.items.reduce((s, it) => s + it.price * it.quantity, 0)}
                </span>
              </div>
            </div>

            <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handlePrintKOTForOrder(selectedOrder)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-neutral-800 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-neutral-700" />
                <span>Print KOT Slip</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-lg cursor-pointer"
                >
                  Close
                </button>
                {selectedOrder.status === 'active' && (
                  <button
                    onClick={() => {
                      setActiveTableId(selectedOrder.tableId);
                      setActiveView('menu');
                      setSelectedOrder(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg cursor-pointer transition-colors"
                  >
                    Edit in Menu Cart
                  </button>
                )}
                {selectedOrder.status !== 'paid' && (
                  <button
                    onClick={() => {
                      setActiveTableId(selectedOrder.tableId);
                      setActiveView('billing');
                      setSelectedOrder(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Settle Bill</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
