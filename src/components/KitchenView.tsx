import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Clock,
  Printer,
  CheckCircle2,
  Flame,
  Bell,
  Check,
  Utensils,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { KOT, KOTStatus } from '../types/pos';

export const KitchenView: React.FC = () => {
  const { kots, updateKOTStatus, currentUser, tables, printKOTThermal } = usePOS();
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'preparing' | 'ready'>('all');

  const handlePrintKOT = async (kot: KOT) => {
    console.info(`[KitchenView] Print KOT requested for KOT #${kot.kotNumber} (Order #${kot.orderId})`);
    try {
      await printKOTThermal(kot, { isReprint: Boolean(kot.isPrinted) });
    } catch (err) {
      console.error('[KitchenView] Error printing KOT:', err);
    }
  };

  // Filter KOTs
  const activeKOTs = kots.filter((k) => k.status !== 'served');
  const filteredKOTs = activeKOTs.filter((k) => {
    if (statusFilter !== 'all' && k.status !== statusFilter) return false;
    return true;
  });

  const newCount = kots.filter((k) => k.status === 'new').length;
  const preparingCount = kots.filter((k) => k.status === 'preparing').length;
  const readyCount = kots.filter((k) => k.status === 'ready').length;

  const getElapsedTime = (isoString: string) => {
    const diffMin = Math.max(
      0,
      Math.floor((Date.now() - new Date(isoString).getTime()) / 60000)
    );
    if (diffMin < 1) return 'Just now';
    return `${diffMin} min ago`;
  };

  const handleNextStatus = (kot: KOT) => {
    if (kot.status === 'new') {
      updateKOTStatus(kot.id, 'preparing');
    } else if (kot.status === 'preparing') {
      updateKOTStatus(kot.id, 'ready');
    } else if (kot.status === 'ready') {
      updateKOTStatus(kot.id, 'served');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                Kitchen Display System (KDS / KOT)
              </h1>
              <p className="text-xs text-neutral-500">
                Live food preparation monitor · Showing {activeKOTs.length} active tickets
              </p>
            </div>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-lg text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
              statusFilter === 'all'
                ? 'bg-neutral-900 text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All Active ({activeKOTs.length})
          </button>
          <button
            onClick={() => setStatusFilter('new')}
            className={`px-3 py-1.5 font-semibold rounded-md transition-colors flex items-center gap-1 ${
              statusFilter === 'new'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            New ({newCount})
          </button>
          <button
            onClick={() => setStatusFilter('preparing')}
            className={`px-3 py-1.5 font-semibold rounded-md transition-colors flex items-center gap-1 ${
              statusFilter === 'preparing'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Preparing ({preparingCount})
          </button>
          <button
            onClick={() => setStatusFilter('ready')}
            className={`px-3 py-1.5 font-semibold rounded-md transition-colors flex items-center gap-1 ${
              statusFilter === 'ready'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Ready ({readyCount})
          </button>
        </div>
      </div>

      {/* KOT Cards Grid */}
      {filteredKOTs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-neutral-400">
          <ChefHat className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
          <h3 className="text-sm font-semibold text-neutral-700">No Kitchen Orders in this queue</h3>
          <p className="text-xs text-neutral-400 mt-1">
            New orders sent from Menu & Order will automatically arrive here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredKOTs.map((kot) => {
            const isNew = kot.status === 'new';
            const isPreparing = kot.status === 'preparing';
            const isReady = kot.status === 'ready';

            let headerBg = 'bg-rose-500 text-white';
            let cardBorder = 'border-rose-300 hover:border-rose-400';
            if (isPreparing) {
              headerBg = 'bg-amber-500 text-white';
              cardBorder = 'border-amber-300 hover:border-amber-400';
            } else if (isReady) {
              headerBg = 'bg-emerald-600 text-white';
              cardBorder = 'border-emerald-300 hover:border-emerald-400';
            }

            return (
              <div
                key={kot.id}
                className={`bg-white rounded-xl border ${cardBorder} shadow-2xs overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md`}
              >
                {/* KOT Header */}
                <div className={`px-4 py-3 ${headerBg} flex items-center justify-between`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm tracking-wide">KOT #{kot.kotNumber}</span>
                      <span className="text-[11px] bg-black/20 px-2 py-0.5 rounded-full font-semibold">
                        {tables.find((t) => t.id === kot.tableId)?.name || `Table ${kot.tableId}`}
                      </span>
                      {kot.isPrinted && (
                        <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-white/90 font-medium flex items-center gap-0.5" title={`Printed ${kot.printCount || 1} time(s)`}>
                          <Printer className="w-2.5 h-2.5" />
                          <span>Printed</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] opacity-90 mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getElapsedTime(kot.createdAt)}
                      </span>
                      <span>·</span>
                      <span>Waiter: {kot.waiterName}</span>
                    </div>
                  </div>

                  {/* Print KOT */}
                  <button
                    onClick={() => handlePrintKOT(kot)}
                    className="p-1.5 rounded-md hover:bg-black/20 transition-colors text-white"
                    title="Print KOT Slip"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>

                {/* Items List */}
                <div className="p-4 flex-1 space-y-2.5 max-h-64 overflow-y-auto">
                  {kot.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-2 pb-2 border-b border-neutral-100 last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          ></span>
                          <span className="text-xs font-bold text-neutral-900 leading-tight">
                            {item.name}
                          </span>
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-amber-800 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded mt-1">
                            Note: {item.notes}
                          </div>
                        )}
                      </div>

                      {/* Quantity in bold highlight */}
                      <span className="font-extrabold text-sm text-neutral-900 px-2 py-0.5 bg-neutral-100 rounded font-mono-numbers shrink-0">
                        x{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bottom Status Stepper Action & Print KOT */}
                <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintKOT(kot)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-neutral-800 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                    title={kot.isPrinted ? 'Reprint KOT Ticket' : 'Print KOT Ticket'}
                  >
                    <Printer className="w-3.5 h-3.5 text-neutral-700" />
                    <span>{kot.isPrinted ? 'Reprint KOT' : 'Print KOT'}</span>
                  </button>

                  <div className="flex items-center gap-1.5 ml-auto">
                    {isNew && (
                      <button
                        onClick={() => handleNextStatus(kot)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>Start Cooking</span>
                      </button>
                    )}

                    {isPreparing && (
                      <button
                        onClick={() => handleNextStatus(kot)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Ready</span>
                      </button>
                    )}

                    {isReady && (
                      <button
                        onClick={() => handleNextStatus(kot)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Mark Served</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
