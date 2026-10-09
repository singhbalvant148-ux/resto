import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Tag,
  ShieldAlert,
  Layers,
  FolderPlus,
  Settings2,
  Check,
  FileJson,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { MenuItem, MenuAvailabilityTiming } from '../types/pos';
import { SimpleMenuModal } from './SimpleMenuModal';
import { isOwner } from '../utils/security';

export const MenuManagementView: React.FC = () => {
  const {
    menuItems,
    categories,
    subcategories,
    addCategory,
    renameCategory,
    deleteCategory,
    addSubcategory,
    deleteSubcategory,
    addMenuItem,
    editMenuItem,
    updateMenuItemPrice,
    deleteMenuItem,
    toggleMenuItemAvailability,
    loadMenuData,
    currentUser,
    setActiveView,
  } = usePOS();

  // Strict Owner-only permission guard
  if (!isOwner(currentUser)) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center max-w-lg mx-auto shadow-2xs my-12 animate-in fade-in zoom-in-95">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-neutral-900">Owner Access Required</h2>
        <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
          ONLY the Restaurant Owner has permission to add menu items, edit details, change prices, delete items, enable/disable items, or manage categories.
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          Managers, cashiers, and waiters can view the live menu and take orders in the Menu & Order section.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            onClick={() => setActiveView('menu')}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Go to Menu & Order
          </button>
        </div>
      </div>
    );
  }

  // Filter and search state
  const isOwnerOrAdmin = isOwner(currentUser);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Available' | 'Disabled'>('All');

  // Modals state
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [priceEditingItem, setPriceEditingItem] = useState<MenuItem | null>(null);
  const [newPriceInput, setNewPriceInput] = useState<string>('');
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

  // Category management modals state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null);
  const [renamingCategoryName, setRenamingCategoryName] = useState<string | null>(null);
  const [renamedCategoryInput, setRenamedCategoryInput] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [categoryReassignTarget, setCategoryReassignTarget] = useState<string>('');

  // Subcategory management state
  const [newSubcategoryInputs, setNewSubcategoryInputs] = useState<{ [cat: string]: string }>({});
  const [expandedCategories, setExpandedCategories] = useState<{ [cat: string]: boolean }>({});
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<{ category: string; subcategory: string } | null>(null);
  const [subDeleteAction, setSubDeleteAction] = useState<'move_items' | 'delete_items'>('move_items');
  const [subReassignCategory, setSubReassignCategory] = useState<string>('');
  const [subReassignSubcategory, setSubReassignSubcategory] = useState<string>('');

  // Notifications
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Filtered menu items
  const filteredItems = menuItems.filter((item) => {
    const itemCat = item.category || item.subcategory || 'General';
    if (
      selectedCategoryFilter !== 'All' &&
      itemCat !== selectedCategoryFilter &&
      item.category !== selectedCategoryFilter &&
      item.subcategory !== selectedCategoryFilter
    ) {
      return false;
    }
    if (statusFilter === 'Available' && !item.isAvailable) return false;
    if (statusFilter === 'Disabled' && item.isAvailable) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.subcategory && item.subcategory.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Count metrics
  const totalCount = menuItems.length;
  const availableCount = menuItems.filter((m) => m.isAvailable).length;
  const disabledCount = totalCount - availableCount;

  // Open Add Item modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsAddItemModalOpen(true);
  };

  // Open Edit Item modal
  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setIsAddItemModalOpen(false);
  };

  // Open Quick Price Edit modal
  const handleOpenPriceModal = (item: MenuItem) => {
    setPriceEditingItem(item);
    setNewPriceInput(String(item.price));
  };

  // Submit Quick Price Change
  const handleSavePriceChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceEditingItem) return;

    const parsedPrice = parseFloat(newPriceInput);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return;
    }

    const res = updateMenuItemPrice(priceEditingItem.id, parsedPrice);
    if (res.success) {
      showNotice(`Price for "${priceEditingItem.name}" updated to ₹${parsedPrice}. Applied to all new orders.`);
      setPriceEditingItem(null);
    }
  };

  // Submit Item Deletion
  const handleConfirmDeleteItem = () => {
    if (!itemToDelete) return;
    const name = itemToDelete.name;
    const res = deleteMenuItem(itemToDelete.id);
    if (res.success) {
      showNotice(`Item "${name}" has been deleted from the menu.`);
      setItemToDelete(null);
    }
  };

  // Toggle item availability
  const handleToggleAvailability = (item: MenuItem) => {
    toggleMenuItemAvailability(item.id);
    showNotice(`"${item.name}" is now ${item.isAvailable ? 'Disabled (hidden from ordering)' : 'Available for ordering'}.`);
  };

  // Create Category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setNewCategoryError(null);
    if (!newCategoryName.trim()) {
      setNewCategoryError('Category name is required.');
      return;
    }

    const res = addCategory(newCategoryName.trim());
    if (res.success) {
      showNotice(`Category "${newCategoryName.trim()}" created successfully!`);
      setNewCategoryName('');
      setIsAddCategoryModalOpen(false);
    } else {
      setNewCategoryError(res.message || 'Failed to create category.');
    }
  };

  // Rename Category
  const handleSaveRenameCategory = (oldName: string) => {
    if (!renamedCategoryInput.trim()) return;
    const res = renameCategory(oldName, renamedCategoryInput.trim());
    if (res.success) {
      showNotice(`Category "${oldName}" renamed to "${renamedCategoryInput.trim()}".`);
      setRenamingCategoryName(null);
      setRenamedCategoryInput('');
    } else {
      showNotice(res.message || 'Failed to rename category.');
    }
  };

  // Delete Category (Owner/Admin Only)
  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const res = deleteCategory(categoryToDelete, categoryReassignTarget || undefined);
    if (res.success) {
      showNotice(`Category "${categoryToDelete}" deleted.`);
      setCategoryToDelete(null);
      setCategoryReassignTarget('');
    } else {
      showNotice(res.message || 'Failed to delete category.');
    }
  };

  // Add Subcategory under Category
  const handleCreateSubcategory = (categoryName: string) => {
    const subName = (newSubcategoryInputs[categoryName] || '').trim();
    if (!subName) return;
    const res = addSubcategory(categoryName, subName);
    if (res.success) {
      showNotice(`Subcategory "${subName}" created under "${categoryName}".`);
      setNewSubcategoryInputs((prev) => ({ ...prev, [categoryName]: '' }));
    } else {
      showNotice(res.message || 'Failed to add subcategory.');
    }
  };

  // Delete Subcategory (Owner/Admin Only)
  const handleConfirmDeleteSubcategory = () => {
    if (!subcategoryToDelete) return;
    const res = deleteSubcategory(
      subcategoryToDelete.category,
      subcategoryToDelete.subcategory,
      subDeleteAction,
      subReassignCategory || subcategoryToDelete.category,
      subReassignSubcategory || undefined
    );
    if (res.success) {
      showNotice(`Subcategory "${subcategoryToDelete.subcategory}" deleted.`);
      setSubcategoryToDelete(null);
      setSubReassignCategory('');
      setSubReassignSubcategory('');
    } else {
      showNotice(res.message || 'Failed to delete subcategory.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white text-xs font-semibold rounded-xl shadow-xl border border-neutral-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              Manage Menu
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 bg-neutral-900 text-white rounded-md uppercase tracking-wider">
              Owner Only
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Full owner menu control: add & edit dishes, set ₹ prices, manage categories, and toggle item availability.
          </p>
        </div>

        {/* Clear Primary Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* [ + Add Category ] button */}
          <button
            type="button"
            onClick={() => {
              setNewCategoryName('');
              setNewCategoryError(null);
              setIsAddCategoryModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-neutral-800 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-amber-600" />
            <span>+ Add Category</span>
          </button>

          {/* [ Manage Categories ] button */}
          <button
            type="button"
            onClick={() => setIsManageCategoriesOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Rename or delete existing categories"
          >
            <Settings2 className="w-4 h-4 text-neutral-600" />
            <span>Manage Categories</span>
          </button>

          {/* [ + Add Menu Item ] button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
            Total Dishes
          </div>
          <div className="text-xl font-extrabold text-neutral-900 mt-1 font-mono-numbers">
            {totalCount}
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
            Available (Active)
          </div>
          <div className="text-xl font-extrabold text-emerald-800 mt-1 font-mono-numbers">
            {availableCount}
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
            Disabled (Hidden)
          </div>
          <div className="text-xl font-extrabold text-neutral-600 mt-1 font-mono-numbers">
            {disabledCount}
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
            Categories
          </div>
          <div className="text-xl font-extrabold text-neutral-900 mt-1 font-mono-numbers">
            {categories.length}
          </div>
        </div>
      </div>

      {/* Categories Filter Tabs with Add Category shortcut */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            Filter by Category:
          </span>
          <button
            onClick={() => setIsManageCategoriesOpen(true)}
            className="text-[11px] text-neutral-600 hover:text-neutral-900 font-semibold underline underline-offset-2 cursor-pointer"
          >
            Edit / Rename Categories
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-neutral-200 rounded-xl">
          <button
            onClick={() => setSelectedCategoryFilter('All')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              selectedCategoryFilter === 'All'
                ? 'bg-neutral-900 text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            All Categories ({totalCount})
          </button>

          {categories.map((cat) => {
            const catCount = menuItems.filter(
              (m) => m.category === cat || m.subcategory === cat || (m.category || m.subcategory) === cat
            ).length;
            const isSelected = selectedCategoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {catCount}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => {
              setNewCategoryName('');
              setNewCategoryError(null);
              setIsAddCategoryModalOpen(true);
            }}
            className="px-2.5 py-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors flex items-center gap-1 border border-dashed border-neutral-300 cursor-pointer ml-1"
            title="Create a new category"
          >
            <Plus className="w-3.5 h-3.5 text-amber-600" />
            <span>Category</span>
          </button>
        </div>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-neutral-200 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dish name, subcategory, description..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-neutral-50"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
          {(['All', 'Available', 'Disabled'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-neutral-900 shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items List / Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-2">
              <Search className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-neutral-800">No dishes match your filter</p>
            <p className="text-xs text-neutral-500 mt-1">
              Try searching for something else or add a new menu item.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Menu Item</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Item Name & Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Subcategory</th>
                  <th className="py-3 px-4">Price (₹)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Serving Timing</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredItems.map((item) => {
                  const currentCategory = item.category || item.subcategory || 'General';
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-neutral-50/70 transition-colors ${
                        !item.isAvailable ? 'bg-neutral-50/40 text-neutral-500' : ''
                      }`}
                    >
                      {/* Name & Veg/Non-Veg */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center p-0.5 shrink-0 mt-0.5 ${
                              item.isVeg ? 'border-emerald-600' : 'border-rose-600'
                            }`}
                            title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                            />
                          </span>
                          <div>
                            <div className="font-bold text-neutral-900 text-xs">
                              {item.name}
                            </div>
                            {item.description && (
                              <div className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 text-neutral-800 rounded font-semibold text-[11px]">
                          <Tag className="w-3 h-3 text-neutral-500" />
                          {currentCategory}
                        </span>
                      </td>

                      {/* Subcategory */}
                      <td className="py-3 px-4">
                        <span className="text-neutral-700 font-medium">
                          {item.subcategory || 'General'}
                        </span>
                      </td>

                      {/* Price in ₹ */}
                      <td className="py-3 px-4 font-mono-numbers">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-neutral-900">
                            ₹{item.price}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenPriceModal(item)}
                            className="text-[10px] text-neutral-500 hover:text-neutral-900 px-1.5 py-0.5 border border-neutral-200 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                            title="Quick edit price in ₹"
                          >
                            ₹ Edit
                          </button>
                        </div>
                      </td>

                      {/* Available / Unavailable */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            item.isAvailable
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-neutral-100 text-neutral-600 border border-neutral-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isAvailable ? 'bg-emerald-600' : 'bg-neutral-400'
                            }`}
                          />
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </td>

                      {/* Optional Timing */}
                      <td className="py-3 px-4 font-mono-numbers text-[11px] text-neutral-600">
                        {item.availabilityTiming?.enabled ? (
                          <div className="flex items-center gap-1 text-amber-800 bg-amber-50/80 border border-amber-200 rounded px-1.5 py-0.5 w-fit">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>
                              {item.availabilityTiming.label ||
                                `${item.availabilityTiming.startTime} - ${item.availabilityTiming.endTime}`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-400">All Day</span>
                        )}
                      </td>

                      {/* Action buttons: [ Edit ] [ Disable / Enable ] [ Delete ] */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* [ Edit ] */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-neutral-800 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-neutral-600" />
                            <span>Edit</span>
                          </button>

                          {/* [ Disable ] or [ Enable ] */}
                          <button
                            type="button"
                            onClick={() => handleToggleAvailability(item)}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer ${
                              item.isAvailable
                                ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300'
                                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300'
                            }`}
                          >
                            {item.isAvailable ? 'Disable' : 'Enable'}
                          </button>

                          {/* [ Delete ] */}
                          <button
                            type="button"
                            onClick={() => setItemToDelete(item)}
                            className="inline-flex items-center p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md border border-neutral-200 hover:border-rose-200 transition-colors cursor-pointer"
                            title="Delete item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* OWNER MENU ITEM SIMPLE FORM MODAL                         */}
      {/* ========================================================= */}
      <SimpleMenuModal
        isOpen={isAddItemModalOpen || !!editingItem}
        onClose={() => {
          setIsAddItemModalOpen(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
        onSaved={(savedItem) => {
          showNotice(`Item "${savedItem.name}" saved successfully at ₹${savedItem.price}!`);
          setIsAddItemModalOpen(false);
          setEditingItem(null);
        }}
      />

      {/* ========================================================= */}
      {/* MODAL 3: QUICK EDIT PRICE (₹)                              */}
      {/* ========================================================= */}
      {priceEditingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  ₹
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Edit Price</h3>
                  <p className="text-[11px] text-neutral-500 truncate max-w-[240px]">
                    {priceEditingItem.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPriceEditingItem(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePriceChange} className="space-y-4 mt-4">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
                  Current Price
                </div>
                <div className="text-lg font-bold text-neutral-900 font-mono-numbers mt-0.5">
                  ₹{priceEditingItem.price}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Enter New Price in Indian Rupees (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center font-bold text-neutral-600 text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    autoFocus
                    value={newPriceInput}
                    onChange={(e) => setNewPriceInput(e.target.value)}
                    placeholder="Enter new amount"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono-numbers font-bold"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 leading-relaxed">
                ℹ️ <strong>Pricing policy:</strong> This new price will be saved and used immediately for all <strong>new orders</strong>. Existing completed bills and history keep their original billed price.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setPriceEditingItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Save New Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: + ADD CATEGORY                                    */}
      {/* ========================================================= */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Create New Category</h3>
                  <p className="text-[11px] text-neutral-500">
                    Add a new category to organize your menu items.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4 mt-4">
              {newCategoryError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{newCategoryError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Mocktails, Desserts, Tandoori Breads"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="text-[11px] text-neutral-500">
                Current categories: {categories.join(', ')}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  + Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: MANAGE CATEGORIES (Rename & Delete)               */}
      {/* ========================================================= */}
      {isManageCategoriesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Manage Categories</h3>
                  <p className="text-[11px] text-neutral-500">
                    Create, rename, or delete menu categories.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsManageCategoriesOpen(false);
                  setRenamingCategoryName(null);
                  setCategoryToDelete(null);
                }}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Quick Add within Modal */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name..."
                  className="flex-1 px-3 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <button
                  type="button"
                  onClick={(e) => handleCreateCategory(e)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  + Add
                </button>
              </div>

              {/* Categories & Subcategories List */}
              <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden">
                {categories.map((cat) => {
                  const count = menuItems.filter(
                    (m) => (m.category || m.subcategory) === cat
                  ).length;
                  const isRenaming = renamingCategoryName === cat;
                  const catSubs = subcategories.filter(
                    (s) => s.category.toLowerCase() === cat.toLowerCase()
                  );
                  const isExpanded = expandedCategories[cat] !== false;

                  return (
                    <div key={cat} className="bg-white">
                      {/* Category Header Row */}
                      <div className="p-3 flex items-center justify-between hover:bg-neutral-50/70 transition-colors text-xs border-b border-neutral-100 last:border-b-0">
                        {isRenaming ? (
                          <div className="flex items-center gap-2 flex-1 mr-2">
                            <input
                              type="text"
                              autoFocus
                              value={renamedCategoryInput}
                              onChange={(e) => setRenamedCategoryInput(e.target.value)}
                              className="flex-1 px-2.5 py-1 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRenameCategory(cat)}
                              className="px-2.5 py-1 text-[11px] font-bold text-white bg-neutral-900 rounded-md cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setRenamingCategoryName(null)}
                              className="px-2 py-1 text-[11px] text-neutral-500 hover:bg-neutral-100 rounded-md cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCategories((prev) => ({
                                  ...prev,
                                  [cat]: !isExpanded,
                                }))
                              }
                              className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 cursor-pointer"
                              title="Toggle Subcategories"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <div>
                              <span className="font-bold text-neutral-900">{cat}</span>
                              <span className="ml-2 text-[10px] text-neutral-500">
                                ({count} {count === 1 ? 'dish' : 'dishes'} · {catSubs.length} subcategories)
                              </span>
                            </div>
                          </div>
                        )}

                        {!isRenaming && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingCategoryName(cat);
                                setRenamedCategoryInput(cat);
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors cursor-pointer"
                            >
                              Rename
                            </button>

                            {/* Delete Category Button: Owner/Admin Only */}
                            {isOwnerOrAdmin ? (
                              <button
                                type="button"
                                disabled={categories.length <= 1}
                                onClick={() => {
                                  setCategoryToDelete(cat);
                                  const other = categories.find((c) => c !== cat) || '';
                                  setCategoryReassignTarget(other);
                                }}
                                className={`p-1 rounded-md transition-colors cursor-pointer ${
                                  categories.length <= 1
                                    ? 'opacity-30 cursor-not-allowed text-neutral-400'
                                    : 'text-neutral-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title="Delete category (Owner/Admin only)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="p-1 rounded-md opacity-25 cursor-not-allowed text-neutral-400"
                                title="Only Owner/Admin role can delete a Category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Subcategories Subsection */}
                      {isExpanded && (
                        <div className="bg-neutral-50/80 px-4 py-2.5 border-t border-neutral-100 space-y-2">
                          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                            Subcategories in {cat}
                          </div>

                          {catSubs.length === 0 ? (
                            <div className="text-[11px] text-neutral-400 italic py-1">
                              No subcategories added yet.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {catSubs.map((sub) => {
                                const subDishCount = menuItems.filter(
                                  (m) =>
                                    (m.category?.toLowerCase() === cat.toLowerCase() ||
                                      m.subcategory?.toLowerCase() === sub.name.toLowerCase()) &&
                                    m.subcategory?.toLowerCase() === sub.name.toLowerCase()
                                ).length;

                                return (
                                  <div
                                    key={sub.id || `${cat}-${sub.name}`}
                                    className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-neutral-200 text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-neutral-800">{sub.name}</span>
                                      <span className="text-[10px] text-neutral-400">
                                        ({subDishCount} {subDishCount === 1 ? 'dish' : 'dishes'})
                                      </span>
                                    </div>

                                    {/* Delete Subcategory Button: Owner/Admin Only */}
                                    {isOwnerOrAdmin ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSubcategoryToDelete({ category: cat, subcategory: sub.name });
                                          const otherSub = catSubs.find((s) => s.name !== sub.name)?.name || 'General';
                                          setSubDeleteAction('move_items');
                                          setSubReassignCategory(cat);
                                          setSubReassignSubcategory(otherSub);
                                        }}
                                        className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Delete subcategory (Owner/Admin only)"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled
                                        className="p-1 rounded opacity-25 cursor-not-allowed text-neutral-400"
                                        title="Only Owner/Admin role can delete a Subcategory"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Quick Add Subcategory */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <input
                              type="text"
                              value={newSubcategoryInputs[cat] || ''}
                              onChange={(e) =>
                                setNewSubcategoryInputs((prev) => ({ ...prev, [cat]: e.target.value }))
                              }
                              placeholder={`Add subcategory under ${cat}...`}
                              className="flex-1 px-2.5 py-1 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleCreateSubcategory(cat)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors cursor-pointer"
                            >
                              + Add Sub
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsManageCategoriesOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: DELETE CATEGORY CONFIRMATION (Owner/Admin Only)   */}
      {/* ========================================================= */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-900">
                Confirm Delete Category &quot;{categoryToDelete}&quot;?
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-900 text-white rounded">
                Owner/Admin
              </span>
            </div>
            <p className="text-xs text-neutral-700 mt-2 font-medium leading-relaxed">
              ⚠️ Are you sure you want to delete this category? Accidental deletion is prevented. This action requires explicit confirmation.
            </p>
            <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
              All dishes currently in this category will be safely reassigned to the selected category below:
            </p>

            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Reassign existing dishes to:
              </label>
              <select
                value={categoryReassignTarget}
                onChange={(e) => setCategoryReassignTarget(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white"
              >
                {categories
                  .filter((c) => c !== categoryToDelete)
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Confirm Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 8: DELETE SUBCATEGORY CONFIRMATION (Owner/Admin Only)*/}
      {/* ========================================================= */}
      {subcategoryToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-900">
                Confirm Delete Subcategory &quot;{subcategoryToDelete.subcategory}&quot;?
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-900 text-white rounded">
                Owner/Admin
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Parent Category: <strong>{subcategoryToDelete.category}</strong>
            </p>
            <p className="text-xs text-neutral-700 mt-2 font-medium leading-relaxed">
              ⚠️ Are you sure you want to delete this subcategory? Accidental deletion is prevented. Please select what to do with existing dishes in this subcategory:
            </p>

            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-neutral-800 cursor-pointer">
                <input
                  type="radio"
                  name="subDeleteAction"
                  value="move_items"
                  checked={subDeleteAction === 'move_items'}
                  onChange={() => setSubDeleteAction('move_items')}
                  className="text-neutral-900"
                />
                <span>Safely reassign dishes to another subcategory:</span>
              </label>

              {subDeleteAction === 'move_items' && (
                <div className="pl-6 space-y-1">
                  <select
                    value={subReassignSubcategory}
                    onChange={(e) => setSubReassignSubcategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="General">General</option>
                    {subcategories
                      .filter(
                        (s) =>
                          !(
                            s.category.toLowerCase() === subcategoryToDelete.category.toLowerCase() &&
                            s.name.toLowerCase() === subcategoryToDelete.subcategory.toLowerCase()
                          )
                      )
                      .map((s) => (
                        <option key={s.id || `${s.category}-${s.name}`} value={s.name}>
                          {s.category} → {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs font-medium text-rose-700 cursor-pointer pt-1">
                <input
                  type="radio"
                  name="subDeleteAction"
                  value="delete_items"
                  checked={subDeleteAction === 'delete_items'}
                  onChange={() => setSubDeleteAction('delete_items')}
                  className="text-rose-600"
                />
                <span>Delete all dishes in this subcategory</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setSubcategoryToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSubcategory}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Confirm Delete Subcategory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 7: DELETE ITEM CONFIRMATION                          */}
      {/* ========================================================= */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">
              Delete Menu Item?
            </h3>
            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
              Are you sure you want to delete <strong>&quot;{itemToDelete.name}&quot;</strong> (₹{itemToDelete.price})? This will remove it from the menu.
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">
              Historical completed bills that contained this dish will remain safe and unaffected.
            </p>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteItem}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
