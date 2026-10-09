import React, { useState } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ChefHat,
  Receipt,
  UtensilsCrossed,
  Check,
  AlertCircle,
  FileText,
  ShoppingBag,
  ChevronDown,
  Sparkles,
  Clock,
  SlidersHorizontal,
  Printer,
  AlertTriangle,
  XCircle,
  X,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { MenuCategory, MenuItem, KOT } from '../types/pos';
import { SimpleMenuModal } from './SimpleMenuModal';
import { isMenuItemAvailableByTime } from '../utils/menuTiming';

export const MenuView: React.FC = () => {
  const {
    menuItems,
    tables,
    orders,
    kots,
    setKotToPrint,
    activeTableId,
    setActiveTableId,
    createOrGetOrderForTable,
    addItemToOrder,
    updateItemQuantity,
    removeItemFromOrder,
    sendKOT,
    makeTableUnoccupied,
    setActiveView,
    currentUser,
    toggleMenuItemAvailability,
    deleteMenuItem,
    printKOTThermal,
  } = usePOS();

  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemNoteInput, setItemNoteInput] = useState<{ [itemId: string]: string }>({});
  const [editingNoteFor, setEditingNoteFor] = useState<string | null>(null);
  const [isSendingKOT, setIsSendingKOT] = useState(false);
  const [isPrintingKOT, setIsPrintingKOT] = useState(false);
  const [kotStatusMsg, setKotStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [simulatedTime, setSimulatedTime] = useState<string | null>(null);

  // Owner menu management modal state
  const [isSimpleModalOpen, setIsSimpleModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<MenuItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [ownerNotice, setOwnerNotice] = useState<string | null>(null);
  const [isMakeUnoccupiedModalOpen, setIsMakeUnoccupiedModalOpen] = useState(false);

  // Active table
  const currentTableId = activeTableId || 1;
  const currentTable = tables.find((t) => t.id === currentTableId);

  // Active order for current table
  const activeOrder = orders.find((o) => o.tableId === currentTableId && o.status === 'active');
  const orderItems = activeOrder?.items || [];

  // Derive unique sections from menu items data structure
  const availableSections = Array.from(
    new Set(menuItems.map((m) => m.section || 'Food').filter(Boolean))
  );

  // Derive unique subcategories for currently selected section
  const availableSubcategories = Array.from(
    new Set(
      menuItems
        .filter((m) => selectedSection === 'All' || m.section === selectedSection)
        .flatMap((m) => [m.subcategory, m.category].filter(Boolean) as string[])
    )
  );

  // Normalize search query: case-insensitive, collapse multiple spaces, multi-token matching
  const normalizedSearch = searchQuery.trim().toLowerCase().replace(/\s+/g, ' ');
  const searchTokens = normalizedSearch ? normalizedSearch.split(' ') : [];

  // Filtered menu items reading from this data structure (Pure Vegetarian)
  const filteredMenuItems = menuItems.filter((item) => {
    // Only available and vegetarian items can be ordered
    if (!item.isAvailable || !item.isVeg) return false;
    if (item.category?.toLowerCase().includes('non-veg')) return false;
    if (item.subcategory?.toLowerCase().includes('non-veg')) return false;

    // Search query matching across name, category, subcategory, section, id, and description
    if (searchTokens.length > 0) {
      const searchableText = [
        item.name,
        item.category,
        item.subcategory,
        item.section,
        item.id,
        item.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesAllTokens = searchTokens.every((token) => searchableText.includes(token));
      if (!matchesAllTokens) return false;

      // When searching, respect selected section if specified
      if (selectedSection !== 'All' && item.section !== selectedSection) return false;

      // Respect subcategory if specified
      if (selectedCategory !== 'All') {
        const subcat = item.subcategory || item.category;
        const matchesCat =
          subcat === selectedCategory ||
          item.category === selectedCategory ||
          item.subcategory === selectedCategory;
        if (!matchesCat) return false;
      }

      return true;
    }

    // Normal browsing without search query
    if (selectedSection !== 'All' && item.section !== selectedSection) return false;
    const subcat = item.subcategory || item.category;
    if (
      selectedCategory !== 'All' &&
      subcat !== selectedCategory &&
      item.category !== selectedCategory &&
      item.subcategory !== selectedCategory
    ) {
      return false;
    }

    return true;
  });

  // Count search matches across all categories to help users when a category tab is currently active
  const crossCategoryMatchesCount =
    searchTokens.length > 0 && selectedCategory !== 'All'
      ? menuItems.filter((item) => {
          if (!item.isAvailable || !item.isVeg) return false;
          if (selectedSection !== 'All' && item.section !== selectedSection) return false;
          const searchableText = [
            item.name,
            item.category,
            item.subcategory,
            item.section,
            item.id,
            item.description,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return searchTokens.every((token) => searchableText.includes(token));
        }).length
      : 0;

  // Totals
  const subtotal = orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const totalItemCount = orderItems.reduce((sum, it) => sum + it.quantity, 0);

  // Unsent KOT items
  const unsentItemsCount = orderItems.reduce(
    (sum, it) => sum + (it.quantity - it.kotSentQuantity),
    0
  );

  const handleAddItem = (item: MenuItem) => {
    // Enforce availability timing
    const timingCheck = isMenuItemAvailableByTime(item, simulatedTime);
    if (!timingCheck.isAvailable) {
      setOwnerNotice(
        `Cannot add "${item.name}": available only during ${timingCheck.scheduleLabel}.`
      );
      setTimeout(() => setOwnerNotice(null), 3500);
      return;
    }
    addItemToOrder(currentTableId, item);
  };

  const handleSendKOT = () => {
    if (!activeOrder || orderItems.length === 0 || isSendingKOT) return;
    if (unsentItemsCount === 0) {
      setKotStatusMsg({
        type: 'error',
        text: 'All items are already in kitchen queue. Add more dishes first.',
      });
      setTimeout(() => setKotStatusMsg(null), 3500);
      return;
    }

    setIsSendingKOT(true);
    try {
      const res = sendKOT(activeOrder.id);
      if (res.success) {
        setKotStatusMsg({
          type: 'success',
          text: `KOT #${res.kotNumber} sent to kitchen (${unsentItemsCount} item${unsentItemsCount > 1 ? 's' : ''})!`,
        });
        setTimeout(() => setKotStatusMsg(null), 4500);
      } else {
        setKotStatusMsg({
          type: 'error',
          text: res.message || 'Unable to send KOT to kitchen.',
        });
        setTimeout(() => setKotStatusMsg(null), 3500);
      }
    } catch (err: any) {
      console.error('[MenuView] Error sending KOT:', err);
      setKotStatusMsg({
        type: 'error',
        text: err?.message || 'Error occurred while sending KOT.',
      });
      setTimeout(() => setKotStatusMsg(null), 3500);
    } finally {
      setIsSendingKOT(false);
    }
  };

  const handlePrintKOTForTable = async () => {
    if (!activeOrder || orderItems.length === 0 || isPrintingKOT) return;
    setIsPrintingKOT(true);
    console.info(`[MenuView] Print KOT requested for Table ${currentTableId} (Order #${activeOrder.orderNumber})`);

    try {
      const tableKots = kots.filter((k) => k.orderId === activeOrder.id);
      const targetKot = tableKots[tableKots.length - 1];
      if (targetKot) {
        setKotToPrint(targetKot);
        const res = await printKOTThermal(targetKot, { isReprint: Boolean(targetKot.isPrinted) });
        if (res.success) {
          setKotStatusMsg({
            type: 'success',
            text: `KOT #${targetKot.kotNumber} dispatched to printer!`,
          });
          setTimeout(() => setKotStatusMsg(null), 3500);
        } else {
          setKotStatusMsg({
            type: 'error',
            text: res.error || 'Failed to open KOT print dialog.',
          });
          setTimeout(() => setKotStatusMsg(null), 3500);
        }
      } else if (orderItems.length > 0) {
        const generatedKot: KOT = {
          id: `kot-gen-${activeOrder.id}`,
          kotNumber: activeOrder.orderNumber,
          orderId: activeOrder.id,
          tableId: activeOrder.tableId,
          waiterName: currentUser?.name || activeOrder.waiterName || 'Staff',
          items: activeOrder.items.map((it) => ({
            menuItemId: it.menuItemId,
            name: it.name,
            quantity: it.quantity,
            notes: it.notes,
            isVeg: it.isVeg,
          })),
          status: 'new',
          createdAt: activeOrder.createdAt,
        };
        setKotToPrint(generatedKot);
        const res = await printKOTThermal(generatedKot);
        if (res.success) {
          setKotStatusMsg({
            type: 'success',
            text: `KOT slip for Table ${currentTable?.name || currentTableId} dispatched to printer!`,
          });
          setTimeout(() => setKotStatusMsg(null), 3500);
        }
      }
    } catch (err: any) {
      console.error('[MenuView] Error printing KOT:', err);
      setKotStatusMsg({
        type: 'error',
        text: 'Failed to print KOT. Check printer connection.',
      });
      setTimeout(() => setKotStatusMsg(null), 3500);
    } finally {
      setIsPrintingKOT(false);
    }
  };

  const handleSaveNote = (orderItemId: string) => {
    // Note saved in state
    setEditingNoteFor(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Table Selector & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
        {/* Table Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-neutral-600" />
            <span className="text-xs font-semibold text-neutral-700">Ordering for:</span>
          </div>

          <div className="relative">
            <select
              value={currentTableId}
              onChange={(e) => {
                const newId = Number(e.target.value);
                setActiveTableId(newId);
                createOrGetOrderForTable(newId);
              }}
              className="appearance-none bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-bold py-1.5 pl-3 pr-8 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
            >
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.section}) - {t.status.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          <span
            className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
              currentTable?.status === 'occupied'
                ? 'bg-amber-100 text-amber-800'
                : currentTable?.status === 'billed'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {currentTable?.status.toUpperCase()}
          </span>

          {currentTable?.status === 'occupied' && (
            <button
              type="button"
              onClick={() => setIsMakeUnoccupiedModalOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-md transition-all cursor-pointer shadow-2xs"
              title="Make this table unoccupied and clear active order"
            >
              <XCircle className="w-3 h-3" />
              <span>Make Unoccupied</span>
            </button>
          )}
        </div>

        {/* Search Bar in Top Bar */}
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu items..."
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-neutral-50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-400 hover:text-neutral-700 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Owner Only: Add Menu Item & Manage Menu buttons */}
        {currentUser?.role === 'owner' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setItemToEdit(null);
                setIsSimpleModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Add Menu Item</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('menu_management')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Open Manage Menu Screen"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-600" />
              <span>Manage Menu</span>
            </button>
          </div>
        )}
      </div>

      {/* Owner Notification Toast */}
      {ownerNotice && (
        <div className="p-3 bg-neutral-900 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg border border-neutral-700 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{ownerNotice}</span>
        </div>
      )}

      {/* Main Split Layout: Menu Grid (Left) + Order Cart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Categories & Menu Grid */}
        <div className="lg:col-span-8 space-y-4">
          {/* Prominent Menu Item Search Input at top of menu */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs p-2.5">
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu items..."
                className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-neutral-50/50 hover:bg-neutral-50 font-medium placeholder:text-neutral-400 transition-colors"
                autoComplete="off"
                spellCheck={false}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4 bg-neutral-200 rounded-full p-0.5 text-neutral-600 hover:bg-neutral-300" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-neutral-500">
                <span>
                  Showing {filteredMenuItems.length} matching dish{filteredMenuItems.length !== 1 ? 'es' : ''} for "{searchQuery}"
                </span>
                {selectedCategory !== 'All' && crossCategoryMatchesCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('All')}
                    className="text-neutral-900 font-bold underline cursor-pointer"
                  >
                    View {crossCategoryMatchesCount} more in all categories
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Section & Subcategory Tabs & Diet Filter */}
          <div className="space-y-2">
            {/* Section Tabs (if multiple sections exist, e.g. Food, Beverages) */}
            {availableSections.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  Section:
                </span>
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-neutral-200 rounded-lg">
                  <button
                    onClick={() => {
                      setSelectedSection('All');
                      setSelectedCategory('All');
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      selectedSection === 'All'
                        ? 'bg-neutral-900 text-white shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    All Sections
                  </button>
                  {availableSections.map((sec) => (
                    <button
                      key={sec}
                      onClick={() => {
                        setSelectedSection(sec);
                        setSelectedCategory('All');
                      }}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        selectedSection === sec
                          ? 'bg-neutral-900 text-white shadow-2xs'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                      }`}
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subcategory Tabs & Diet Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Dynamic Subcategories */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-neutral-200 rounded-lg">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    selectedCategory === 'All'
                      ? 'bg-neutral-900 text-white shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  All ({selectedSection})
                </button>
                {availableSubcategories.map((subcat) => (
                  <button
                    key={subcat}
                    onClick={() => setSelectedCategory(subcat)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      selectedCategory === subcat
                        ? 'bg-neutral-900 text-white shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    {subcat}
                  </button>
                ))}
              </div>

              {/* Pure Veg Indicator */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>100% Pure Veg POS</span>
              </div>
            </div>
          </div>

          {/* Timing Status Bar for Time-Restricted Items (e.g. Soups) */}
          {(selectedCategory === 'Soups' ||
            selectedCategory === 'Munchies & Soups' ||
            filteredMenuItems.some((m) => m.availabilityTiming?.enabled)) && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-neutral-700 shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap">
                <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-semibold text-neutral-900">Soups Hours:</span>
                <span className="text-amber-900 font-medium bg-amber-100/80 border border-amber-200/60 px-2 py-0.5 rounded font-mono-numbers">
                  11:00 AM - 4:00 PM &amp; 7:00 PM - 11:30 PM
                </span>
                <span className="text-neutral-400">·</span>
                <span className="text-neutral-500">POS Time:</span>
                <span className="font-bold text-neutral-900 font-mono-numbers">
                  {simulatedTime
                    ? `${simulatedTime} (Simulated)`
                    : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-neutral-500 mr-0.5">Test Timing:</span>
                <button
                  type="button"
                  onClick={() => setSimulatedTime(null)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    simulatedTime === null
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                  }`}
                  title="Use real clock time"
                >
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedTime('12:30')}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    simulatedTime === '12:30'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white border border-neutral-300 text-emerald-800 hover:bg-neutral-100'
                  }`}
                  title="Test Lunch Window (12:30 PM - Available)"
                >
                  Lunch (12:30 PM)
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedTime('17:00')}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    simulatedTime === '17:00'
                      ? 'bg-rose-700 text-white'
                      : 'bg-white border border-neutral-300 text-rose-800 hover:bg-neutral-100'
                  }`}
                  title="Test Between Windows (5:00 PM - Outside Hours)"
                >
                  Tea (5:00 PM)
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatedTime('20:30')}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    simulatedTime === '20:30'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white border border-neutral-300 text-emerald-800 hover:bg-neutral-100'
                  }`}
                  title="Test Dinner Window (8:30 PM - Available)"
                >
                  Dinner (8:30 PM)
                </button>
              </div>
            </div>
          )}

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredMenuItems.map((item) => {
              // Check if item is already in active order
              const existingItem = orderItems.find((oi) => oi.menuItemId === item.id);
              const qtyInCart = existingItem ? existingItem.quantity : 0;
              const timingCheck = isMenuItemAvailableByTime(item, simulatedTime);
              const isTimeAvailable = timingCheck.isAvailable;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-neutral-200 hover:border-neutral-400 rounded-xl p-3.5 transition-all flex flex-col justify-between hover:shadow-xs group"
                >
                  <div>
                    {/* Header: Diet symbol & Section / Subcategory */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-3 h-3 rounded-sm border flex items-center justify-center p-0.5 ${
                            item.isVeg ? 'border-emerald-600' : 'border-rose-600'
                          }`}
                          title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          ></span>
                        </span>
                        <span className="text-[10px] text-neutral-500 font-semibold truncate max-w-[140px]">
                          {item.section} · {item.subcategory || item.category}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-neutral-900 font-mono-numbers">
                        ₹{item.price}
                      </span>
                    </div>

                    {/* Dish Name */}
                    <h3 className="text-xs font-bold text-neutral-900 group-hover:text-neutral-700 transition-colors">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Availability Timing Badge */}
                    {item.availabilityTiming?.enabled && (
                      <div
                        className={`flex items-center gap-1 text-[10px] border rounded px-1.5 py-0.5 mt-2 font-mono-numbers w-fit ${
                          isTimeAvailable
                            ? 'text-emerald-800 bg-emerald-50/80 border-emerald-200'
                            : 'text-rose-800 bg-rose-50/80 border-rose-200 font-semibold'
                        }`}
                      >
                        <Clock
                          className={`w-2.5 h-2.5 shrink-0 ${
                            isTimeAvailable ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        />
                        <span>
                          {isTimeAvailable
                            ? `Available (${timingCheck.scheduleLabel})`
                            : `Unavailable (${timingCheck.scheduleLabel})`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Add / Quantity buttons */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400">
                      {!isTimeAvailable
                        ? 'Outside Hours'
                        : qtyInCart > 0
                        ? `${qtyInCart} in order`
                        : 'Available'}
                    </span>

                    {!isTimeAvailable ? (
                      <button
                        type="button"
                        disabled
                        title={`Item only available during: ${timingCheck.scheduleLabel}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-neutral-400 bg-neutral-100 rounded-lg cursor-not-allowed border border-neutral-200 shadow-none"
                      >
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span>Unavailable</span>
                      </button>
                    ) : qtyInCart === 0 ? (
                      <button
                        onClick={() => handleAddItem(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-900 hover:text-white rounded-lg transition-colors shadow-2xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-neutral-900 text-white rounded-lg p-0.5">
                        <button
                          onClick={() => {
                            if (existingItem) {
                              updateItemQuantity(activeOrder!.id, existingItem.id, -1);
                            }
                          }}
                          className="p-1 hover:bg-neutral-800 rounded transition-colors text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold px-1.5 font-mono-numbers">
                          {qtyInCart}
                        </span>
                        <button
                          onClick={() => handleAddItem(item)}
                          className="p-1 hover:bg-neutral-800 rounded transition-colors text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Owner Only: Edit / Disable / Delete controls */}
                  {currentUser?.role === 'owner' && (
                    <div className="mt-2.5 pt-2 border-t border-dashed border-neutral-200 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        Owner:
                      </span>
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToEdit(item);
                            setIsSimpleModalOpen(true);
                          }}
                          className="px-2 py-0.5 text-[10px] font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMenuItemAvailability(item.id);
                            setOwnerNotice(
                              `"${item.name}" is now ${item.isAvailable ? 'Disabled' : 'Available'}.`
                            );
                            setTimeout(() => setOwnerNotice(null), 3000);
                          }}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                            item.isAvailable
                              ? 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                              : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                        >
                          {item.isAvailable ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete(item);
                          }}
                          className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Delete item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredMenuItems.length === 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center text-neutral-500 shadow-2xs">
              <Search className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="text-sm font-bold text-neutral-800">No items found</p>
              <p className="text-xs text-neutral-500 mt-1">
                {searchQuery
                  ? `No menu items match "${searchQuery}". Check the spelling, extra spaces, or search by category.`
                  : 'No menu items found matching the selected category.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedSection('All');
                  setSearchQuery('');
                }}
                className="mt-3 px-3.5 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Clear Search &amp; Show All Items
              </button>
            </div>
          )}
        </div>

        {/* Right: Active Table Order Cart (Sticky on Desktop) */}
        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-xl shadow-sm p-4 space-y-3 lg:sticky lg:top-20">
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-neutral-200">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-neutral-900">
                  {currentTable?.name || `Table ${currentTableId}`} Order
                </h2>
                <span className="text-[10px] text-neutral-500 font-mono">
                  {activeOrder ? `#${activeOrder.orderNumber}` : 'New'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Waiter: {currentUser?.name || 'Staff'} · {totalItemCount} items
              </p>
            </div>
            <span className="text-base font-bold text-neutral-900 font-mono-numbers">
              ₹{subtotal.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Immediate Quick Action Bar right near order items */}
          {orderItems.length > 0 && (
            <div className="grid grid-cols-2 gap-2 p-2 bg-neutral-50 rounded-xl border border-neutral-200">
              <button
                type="button"
                onClick={handleSendKOT}
                disabled={unsentItemsCount === 0 || isSendingKOT}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                  unsentItemsCount > 0
                    ? 'bg-purple-700 hover:bg-purple-800 text-white'
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed opacity-75'
                }`}
                title={
                  unsentItemsCount > 0
                    ? `Send ${unsentItemsCount} unsent item(s) to kitchen`
                    : 'All items already sent to kitchen'
                }
              >
                {isSendingKOT ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <ChefHat className="w-3.5 h-3.5" />
                    <span>Send KOT {unsentItemsCount > 0 ? `(${unsentItemsCount})` : ''}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrintKOTForTable}
                disabled={orderItems.length === 0 || isPrintingKOT}
                className="py-2 px-2.5 rounded-lg text-xs font-bold text-neutral-800 bg-white hover:bg-neutral-100 border border-neutral-300 flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Print KOT ticket directly for kitchen printer"
              >
                {isPrintingKOT ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-600" />
                    <span>Printing...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-3.5 h-3.5 text-neutral-700" />
                    <span>Print KOT</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* KOT Status / Feedback Banner */}
          {kotStatusMsg && (
            <div
              className={`p-2.5 text-xs rounded-xl flex items-center justify-between gap-2 border animate-in fade-in ${
                kotStatusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {kotStatusMsg.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{kotStatusMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setKotStatusMsg(null)}
                className="text-neutral-400 hover:text-neutral-700 text-xs px-1 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* Items List */}
          <div className="max-h-80 overflow-y-auto space-y-2.5 divide-y divide-neutral-100 pr-1">
            {orderItems.length === 0 ? (
              <div className="text-center py-10 text-neutral-400 text-xs">
                <ShoppingBag className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                <p className="font-medium text-neutral-600">No items added yet</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Click dishes from the menu on the left to add
                </p>
              </div>
            ) : (
              orderItems.map((item) => {
                const isSentToKitchen = item.kotSentQuantity >= item.quantity;
                const unsentQty = item.quantity - item.kotSentQuantity;

                return (
                  <div key={item.id} className="pt-2.5 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          ></span>
                          <span className="text-xs font-semibold text-neutral-900 leading-tight">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                          <span>₹{item.price} each</span>
                          <span>·</span>
                          {isSentToKitchen ? (
                            <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                              <ChefHat className="w-3 h-3" /> In Kitchen
                            </span>
                          ) : (
                            <span className="text-amber-700 font-medium">
                              {unsentQty} unsent to KOT
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Line Item Total */}
                      <span className="text-xs font-bold text-neutral-900 font-mono-numbers shrink-0">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>

                    {/* Quantity controls & Notes */}
                    <div className="flex items-center justify-between mt-2 pt-1">
                      <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5">
                        <button
                          onClick={() => updateItemQuantity(activeOrder!.id, item.id, -1)}
                          className="p-1 hover:bg-neutral-200 rounded text-neutral-700 transition-colors"
                          title="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold px-2 font-mono-numbers">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateItemQuantity(activeOrder!.id, item.id, 1)}
                          className="p-1 hover:bg-neutral-200 rounded text-neutral-700 transition-colors"
                          title="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {editingNoteFor === item.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={itemNoteInput[item.id] ?? item.notes ?? ''}
                              onChange={(e) =>
                                setItemNoteInput({ ...itemNoteInput, [item.id]: e.target.value })
                              }
                              placeholder="e.g. less spicy"
                              className="text-[11px] px-2 py-0.5 border border-neutral-300 rounded w-28"
                            />
                            <button
                              onClick={() => {
                                item.notes = itemNoteInput[item.id];
                                handleSaveNote(item.id);
                              }}
                              className="text-[10px] bg-neutral-900 text-white px-1.5 py-0.5 rounded font-semibold"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingNoteFor(item.id);
                              setItemNoteInput({
                                ...itemNoteInput,
                                [item.id]: item.notes || '',
                              });
                            }}
                            className="text-[11px] text-neutral-500 hover:text-neutral-900 underline"
                          >
                            {item.notes ? `Note: ${item.notes}` : '+ Add Note'}
                          </button>
                        )}

                        <button
                          onClick={() => removeItemFromOrder(activeOrder!.id, item.id)}
                          className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                          title="Remove Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Order Summary & Primary Action Buttons */}
          {orderItems.length > 0 && (
            <div className="pt-3 border-t border-neutral-200 space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal ({totalItemCount} items)</span>
                  <span className="font-mono-numbers">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-500 text-[11px]">
                  <span>Est. GST (5%)</span>
                  <span className="font-mono-numbers">₹{(subtotal * 0.05).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-neutral-900 pt-1 border-t border-neutral-100">
                  <span>Estimated Total</span>
                  <span className="font-mono-numbers">₹{(subtotal * 1.05).toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  {/* Send KOT Button */}
                  <button
                    type="button"
                    onClick={handleSendKOT}
                    disabled={unsentItemsCount === 0 || isSendingKOT}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer ${
                      unsentItemsCount > 0
                        ? 'bg-purple-700 hover:bg-purple-800 text-white'
                        : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                    }`}
                    title={
                      unsentItemsCount > 0
                        ? `Send ${unsentItemsCount} unsent items to kitchen`
                        : 'All items already sent to kitchen'
                    }
                  >
                    {isSendingKOT ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>Send KOT {unsentItemsCount > 0 ? `(${unsentItemsCount})` : ''}</span>
                      </>
                    )}
                  </button>

                  {/* Bill Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTableId(currentTableId);
                      setActiveView('billing');
                    }}
                    className="py-2 px-3 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Proceed to Bill</span>
                  </button>
                </div>

                {/* Print KOT Button */}
                <button
                  type="button"
                  onClick={handlePrintKOTForTable}
                  disabled={orderItems.length === 0 || isPrintingKOT}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold text-neutral-800 bg-white hover:bg-neutral-100 border border-neutral-300 flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Print KOT Ticket directly for kitchen printer"
                >
                  {isPrintingKOT ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-600" />
                      <span>Printing KOT...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-3.5 h-3.5 text-neutral-700" />
                      <span>Print KOT Slip</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Action Bar for Touchscreen / Tablet / Mobile Devices */}
      {orderItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xs border-t border-neutral-300 shadow-xl px-4 py-2.5 lg:hidden flex items-center justify-between gap-3 animate-in slide-in-from-bottom">
          <div className="min-w-0">
            <div className="text-xs font-bold text-neutral-900 truncate">
              {currentTable?.name || `Table ${currentTableId}`}: {totalItemCount} item{totalItemCount !== 1 ? 's' : ''}
            </div>
            <div className="text-xs font-extrabold text-neutral-900 font-mono-numbers">
              ₹{subtotal.toLocaleString('en-IN')}
              {unsentItemsCount > 0 && (
                <span className="ml-1 text-[10px] text-amber-700 font-normal">
                  ({unsentItemsCount} unsent)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSendKOT}
              disabled={unsentItemsCount === 0 || isSendingKOT}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer ${
                unsentItemsCount > 0
                  ? 'bg-purple-700 hover:bg-purple-800 text-white'
                  : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
              }`}
            >
              {isSendingKOT ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ChefHat className="w-3.5 h-3.5" />
              )}
              <span>Send KOT</span>
            </button>

            <button
              type="button"
              onClick={handlePrintKOTForTable}
              disabled={isPrintingKOT}
              className="py-2 px-2.5 rounded-lg text-xs font-bold text-neutral-800 bg-white border border-neutral-300 shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-40"
              title="Print KOT"
            >
              {isPrintingKOT ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-600" />
              ) : (
                <Printer className="w-3.5 h-3.5 text-neutral-700" />
              )}
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTableId(currentTableId);
                setActiveView('billing');
              }}
              className="py-2 px-3 rounded-lg text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Bill</span>
            </button>
          </div>
        </div>
      )}

      {/* Make Unoccupied Confirmation Modal */}
      {isMakeUnoccupiedModalOpen && currentTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-neutral-900 text-white">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold">Make Table Unoccupied</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMakeUnoccupiedModalOpen(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-neutral-900 mb-1">
                    {currentTable.name} ({currentTable.section})
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                    Are you sure you want to make this table unoccupied? The current unsaved/active order will be cleared.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMakeUnoccupiedModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    makeTableUnoccupied(currentTable.id);
                    setIsMakeUnoccupiedModalOpen(false);
                    setActiveView('tables');
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  Yes, Make Unoccupied
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
