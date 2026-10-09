import React, { useState } from 'react';
import {
  UtensilsCrossed,
  Users,
  Clock,
  PlusCircle,
  Receipt,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  ChefHat,
  X,
  Edit2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Table, TableStatus, Floor } from '../types/pos';
import { isOwner as checkIsOwner } from '../utils/security';

export const TablesView: React.FC = () => {
  const {
    tables,
    orders,
    kots,
    floors,
    addFloor,
    editFloor,
    setActiveTableId,
    setActiveView,
    createOrGetOrderForTable,
    addTable,
    makeTableUnoccupied,
    currentUser,
  } = usePOS();

  const isOwner = Boolean(currentUser && checkIsOwner(currentUser));

  const [statusFilter, setStatusFilter] = useState<'all' | TableStatus>('all');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [tableToMakeUnoccupied, setTableToMakeUnoccupied] = useState<Table | null>(null);

  // Add Table Modal State (Owner Only)
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [tableNameInput, setTableNameInput] = useState('');
  const [tableCapacityInput, setTableCapacityInput] = useState(4);
  const [tableSectionInput, setTableSectionInput] = useState(floors[0]?.name || 'Lower Hall');
  const [addTableError, setAddTableError] = useState('');

  // Add Floor Modal State (Owner Only)
  const [isAddFloorModalOpen, setIsAddFloorModalOpen] = useState(false);
  const [newFloorNameInput, setNewFloorNameInput] = useState('');
  const [addFloorError, setAddFloorError] = useState('');

  // Edit Floor Modal State (Owner Only)
  const [floorToEdit, setFloorToEdit] = useState<Floor | null>(null);
  const [editFloorNameInput, setEditFloorNameInput] = useState('');
  const [editFloorError, setEditFloorError] = useState('');

  // Global Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const availableCount = tables.filter((t) => t.status === 'available').length;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const billedCount = tables.filter((t) => t.status === 'billed').length;

  // Filtered tables based on status and floor
  const filteredTables = tables.filter((table) => {
    if (statusFilter !== 'all' && table.status !== statusFilter) return false;
    if (selectedFloor !== 'all' && table.section !== selectedFloor) return false;
    return true;
  });

  const handleTableClick = (tableId: number) => {
    setActiveTableId(tableId);
    createOrGetOrderForTable(tableId);
    setActiveView('menu');
  };

  const handleBillingClick = (e: React.MouseEvent, tableId: number) => {
    e.stopPropagation();
    setActiveTableId(tableId);
    setActiveView('billing');
  };

  // Add Table Handlers
  const handleOpenAddTableModal = () => {
    const numbersInNames = tables
      .map((t) => {
        const m = t.name.match(/\d+/);
        return m ? parseInt(m[0], 10) : 0;
      })
      .filter((n) => !isNaN(n) && n > 0);
    const nextNum = numbersInNames.length > 0 ? Math.max(...numbersInNames) + 1 : tables.length + 1;

    setTableNameInput(`Table ${nextNum}`);
    setTableCapacityInput(4);
    setTableSectionInput(selectedFloor !== 'all' ? selectedFloor : (floors[0]?.name || 'Lower Hall'));
    setAddTableError('');
    setIsAddTableModalOpen(true);
  };

  const handleAddTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddTableError('');

    if (!isOwner) {
      setAddTableError('Permission Denied: ONLY the Owner can add new tables.');
      return;
    }

    const cleanName = tableNameInput.trim();
    if (!cleanName) {
      setAddTableError('Please enter a table number or name.');
      return;
    }

    const res = addTable({
      name: cleanName,
      capacity: tableCapacityInput,
      section: tableSectionInput,
    });

    if (!res.success) {
      setAddTableError(res.message || 'Failed to add table.');
      return;
    }

    triggerNotification('success', res.message || `Table "${cleanName}" added successfully.`);
    setIsAddTableModalOpen(false);
  };

  // Floor Handlers (Owner Only)
  const handleOpenAddFloor = () => {
    setNewFloorNameInput('');
    setAddFloorError('');
    setIsAddFloorModalOpen(true);
  };

  const handleAddFloorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFloorError('');

    const cleanName = newFloorNameInput.trim();
    if (!cleanName) {
      setAddFloorError('Floor name cannot be empty.');
      return;
    }

    const res = await addFloor(cleanName);
    if (!res.success) {
      setAddFloorError(res.message || 'Could not add floor.');
      return;
    }

    triggerNotification('success', res.message || `Floor "${cleanName}" added successfully.`);
    setIsAddFloorModalOpen(false);
    setSelectedFloor(cleanName);
  };

  const handleOpenEditFloor = (floor: Floor, e: React.MouseEvent) => {
    e.stopPropagation();
    setFloorToEdit(floor);
    setEditFloorNameInput(floor.name);
    setEditFloorError('');
  };

  const handleEditFloorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!floorToEdit) return;
    setEditFloorError('');

    const cleanName = editFloorNameInput.trim();
    if (!cleanName) {
      setEditFloorError('Floor name cannot be empty.');
      return;
    }

    const res = await editFloor(floorToEdit.id, cleanName);
    if (!res.success) {
      setEditFloorError(res.message || 'Could not rename floor.');
      return;
    }

    triggerNotification('success', res.message || `Floor renamed to "${cleanName}" successfully.`);
    if (selectedFloor === floorToEdit.name) {
      setSelectedFloor(cleanName);
    }
    setFloorToEdit(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between p-3.5 border rounded-xl text-xs shadow-xs animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header and Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Table &amp; Floor Management ({tables.length} Tables)
            </h1>

            {/* Owner-Only Floor & Table Management Actions */}
            {isOwner && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAddFloor}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Add a new dining floor (Owner Only)"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>+ Add Floor</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddTableModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-sm transition-colors cursor-pointer"
                  title="Add a new table (Owner Only)"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Add Table</span>
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time floor map grouped by dining areas. Click any table to start or modify orders.
            {isOwner ? ' (Owner Floor & Table configuration active)' : ' (Floor configuration managed by Owner)'}
          </p>
        </div>

        {/* Status badges summary */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-lg text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All ({tables.length})
            </button>
            <button
              onClick={() => setStatusFilter('available')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                statusFilter === 'available'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Available ({availableCount})
            </button>
            <button
              onClick={() => setStatusFilter('occupied')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                statusFilter === 'occupied'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Occupied ({occupiedCount})
            </button>
            <button
              onClick={() => setStatusFilter('billed')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                statusFilter === 'billed'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Billed ({billedCount})
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FLOOR SELECTOR TABS (Lower Hall, Upper Hall, etc.)            */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 pb-2">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-neutral-500 font-semibold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Dining Floors:</span>
          </span>

          <button
            onClick={() => setSelectedFloor('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedFloor === 'all'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            All Floors ({tables.length})
          </button>

          {floors.map((floor) => {
            const floorTableCount = tables.filter((t) => t.section === floor.name).length;
            const isSelected = selectedFloor === floor.name;

            return (
              <div
                key={floor.id}
                className={`group inline-flex items-center rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedFloor(floor.name)}
                  className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
                >
                  <span>{floor.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-neutral-700 text-neutral-200'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {floorTableCount}
                  </span>
                </button>

                {/* Owner-Only Edit Floor Button */}
                {isOwner && (
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditFloor(floor, e)}
                    className={`p-1.5 border-l transition-colors rounded-r-lg ${
                      isSelected
                        ? 'border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800'
                        : 'border-neutral-200 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100'
                    }`}
                    title={`Rename floor "${floor.name}" (Owner Only)`}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Table count indicator */}
        <span className="text-[11px] text-neutral-500 hidden sm:inline">
          Showing {filteredTables.length} {filteredTables.length === 1 ? 'table' : 'tables'}
        </span>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TABLES DISPLAY GROUPED BY SELECTED FLOOR                     */}
      {/* ------------------------------------------------------------- */}
      {filteredTables.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center shadow-2xs">
          <UtensilsCrossed className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-neutral-900">No tables match current filters</h3>
          <p className="text-xs text-neutral-500 mt-1">
            {selectedFloor !== 'all'
              ? `There are no tables on ${selectedFloor} with status "${statusFilter}".`
              : 'Try changing the status or floor filters above.'}
          </p>
          {isOwner && selectedFloor !== 'all' && (
            <button
              onClick={handleOpenAddTableModal}
              className="mt-4 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              + Add Table to {selectedFloor}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* If 'all' is selected, display tables grouped by floor */}
          {(selectedFloor === 'all' ? floors : floors.filter((f) => f.name === selectedFloor)).map(
            (floor) => {
              const floorTables = filteredTables.filter((t) => t.section === floor.name);
              if (floorTables.length === 0 && selectedFloor === 'all') return null;

              return (
                <div key={floor.id} className="space-y-3">
                  {/* Floor Subheading */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-neutral-600" />
                        <span>{floor.name}</span>
                      </h2>
                      <span className="text-[11px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                        {floorTables.length} Tables ·{' '}
                        {floorTables.filter((t) => t.status === 'occupied').length} Occupied
                      </span>
                    </div>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditFloor(floor, e)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 px-2 py-1 rounded hover:bg-neutral-100 transition-colors"
                        title="Rename this floor"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Rename Floor</span>
                      </button>
                    )}
                  </div>

                  {/* Tables Grid for this Floor */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {floorTables.map((table) => {
                      const activeOrder = orders.find(
                        (o) => o.id === table.activeOrderId && o.status !== 'paid'
                      );
                      const itemCount = activeOrder
                        ? activeOrder.items.reduce((sum, it) => sum + it.quantity, 0)
                        : 0;
                      const orderTotal = activeOrder
                        ? activeOrder.items.reduce((sum, it) => sum + it.price * it.quantity, 0)
                        : 0;

                      // Kitchen tickets for this table
                      const tableKOTs = kots.filter(
                        (k) => k.tableId === table.id && k.status !== 'served'
                      );

                      const isOccupied = table.status === 'occupied';
                      const isBilled = table.status === 'billed';
                      const isAvailable = table.status === 'available';

                      return (
                        <div
                          key={table.id}
                          onClick={() => handleTableClick(table.id)}
                          className={`group relative rounded-xl border p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between h-56 hover:shadow-md ${
                            isAvailable
                              ? 'bg-white border-neutral-200 hover:border-emerald-500/70'
                              : isOccupied
                              ? 'bg-amber-50/40 border-amber-300 hover:border-amber-500'
                              : 'bg-blue-50/40 border-blue-300 hover:border-blue-500'
                          }`}
                        >
                          {/* Top Row: Name, Floor Badge, and Status Badge */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-base font-bold text-neutral-900">
                                  {table.name}
                                </span>
                                <span className="text-[10px] text-neutral-600 font-medium px-1.5 py-0.5 bg-neutral-100 rounded">
                                  {table.section}
                                </span>
                              </div>

                              {/* Status Indicator */}
                              {isAvailable && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                  Available
                                </span>
                              )}
                              {isOccupied && (
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                                    Occupied
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTableToMakeUnoccupied(table);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-md transition-all cursor-pointer shadow-2xs"
                                    title="Make this table unoccupied and clear active order"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    <span>Clear</span>
                                  </button>
                                </div>
                              )}
                              {isBilled && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                                  <Receipt className="w-3 h-3" />
                                  Billed
                                </span>
                              )}
                            </div>

                            {/* Capacity Info */}
                            <div className="flex items-center gap-1 text-xs text-neutral-500 mb-3">
                              <Users className="w-3.5 h-3.5" />
                              <span>{table.capacity} Guests</span>
                            </div>

                            {/* Active Order / Items Preview */}
                            {activeOrder && activeOrder.items.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs font-semibold text-neutral-800 truncate">
                                  {itemCount} {itemCount === 1 ? 'item' : 'items'} running
                                </div>
                                <div className="text-[11px] text-neutral-500 truncate">
                                  {activeOrder.items
                                    .slice(0, 2)
                                    .map((it) => `${it.quantity}x ${it.name}`)
                                    .join(', ')}
                                  {activeOrder.items.length > 2 && '...'}
                                </div>
                              </div>
                            )}

                            {isAvailable && (
                              <div className="text-xs text-neutral-400 mt-2">
                                Empty · Ready for guests
                              </div>
                            )}
                          </div>

                          {/* Bottom Row: Financials and Action Controls */}
                          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                            {/* Running Total or Free indicator */}
                            <div>
                              {activeOrder && orderTotal > 0 ? (
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                                    Current Bill
                                  </div>
                                  <div className="text-sm font-bold text-neutral-900 font-mono-numbers">
                                    ₹{orderTotal.toLocaleString('en-IN')}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-neutral-400">No active bill</div>
                              )}
                            </div>

                            {/* Quick Action Button */}
                            <div className="flex items-center gap-1.5">
                              {/* KOT Count Badge if any */}
                              {tableKOTs.length > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-200"
                                  title={`${tableKOTs.length} Active KOT tickets in kitchen`}
                                >
                                  <ChefHat className="w-3 h-3" />
                                  <span>{tableKOTs.length}</span>
                                </span>
                              )}

                              {isOccupied && (
                                <button
                                  type="button"
                                  onClick={(e) => handleBillingClick(e, table.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                                  title="Proceed to checkout and bill settlement"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>Bill</span>
                                </button>
                              )}

                              {isAvailable && (
                                <span className="text-xs font-semibold text-emerald-700 group-hover:underline">
                                  + Order
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD FLOOR (Owner Only - Requirement 4)                 */}
      {/* ------------------------------------------------------------- */}
      {isAddFloorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Add New Dining Floor</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Create a new floor or dining zone (e.g. Rooftop, Terrace, Lounge)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddFloorModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFloorSubmit} className="p-5 space-y-4">
              {addFloorError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{addFloorError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Floor Name *
                </label>
                <input
                  type="text"
                  required
                  value={newFloorNameInput}
                  onChange={(e) => setNewFloorNameInput(e.target.value)}
                  placeholder="e.g. Rooftop Terrace, Private Dining Hall"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  autoFocus
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Floor names must be distinct to prevent accidental duplication.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsAddFloorModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs transition-colors"
                >
                  Create Floor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT FLOOR (Owner Only - Requirement 4)                */}
      {/* ------------------------------------------------------------- */}
      {floorToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-600" />
                  <span>Rename Floor: {floorToEdit.name}</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Update the floor name. Existing tables and orders will be preserved.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFloorToEdit(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditFloorSubmit} className="p-5 space-y-4">
              {editFloorError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editFloorError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  New Floor Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFloorNameInput}
                  onChange={(e) => setEditFloorNameInput(e.target.value)}
                  placeholder="Enter new floor name"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  autoFocus
                />
              </div>

              {/* Data Safety Notice */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                <strong>Data Safety:</strong> Renaming this floor will preserve all associated tables ({tables.filter((t) => t.section === floorToEdit.name).length} tables), active orders, and dining history.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setFloorToEdit(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD TABLE (Owner Only)                                 */}
      {/* ------------------------------------------------------------- */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  <span>Add New Dining Table</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Expand floor seating by adding a new table to a selected floor
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTableModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTableSubmit} className="p-5 space-y-4">
              {addTableError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{addTableError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Table Name / Number *
                </label>
                <input
                  type="text"
                  required
                  value={tableNameInput}
                  onChange={(e) => setTableNameInput(e.target.value)}
                  placeholder="e.g. Table 13"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Guest Seating Capacity (Seats)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={tableCapacityInput}
                  onChange={(e) => setTableCapacityInput(parseInt(e.target.value, 10) || 2)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Floor / Dining Section *
                </label>
                <select
                  value={tableSectionInput}
                  onChange={(e) => setTableSectionInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  {floors.map((fl) => (
                    <option key={fl.id} value={fl.name}>
                      {fl.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs transition-colors"
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation to Make Table Unoccupied */}
      {tableToMakeUnoccupied && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-neutral-100 flex items-center gap-2.5 text-rose-700 bg-rose-50/50">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-neutral-900">
                Clear &amp; Make {tableToMakeUnoccupied.name} Unoccupied?
              </h3>
            </div>
            <div className="p-5 space-y-3 text-xs text-neutral-600">
              <p>
                This will release <span className="font-bold text-neutral-900">{tableToMakeUnoccupied.name}</span> and mark its status as <span className="font-semibold text-emerald-700">Available</span>.
              </p>
            </div>
            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTableToMakeUnoccupied(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  makeTableUnoccupied(tableToMakeUnoccupied.id);
                  setTableToMakeUnoccupied(null);
                  triggerNotification('success', `${tableToMakeUnoccupied.name} is now available.`);
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Clear Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
