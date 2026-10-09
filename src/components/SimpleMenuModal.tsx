import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { MenuItem } from '../types/pos';
import { usePOS } from '../context/POSContext';

interface SimpleMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: MenuItem | null;
  onSaved?: (item: MenuItem) => void;
}

export const SimpleMenuModal: React.FC<SimpleMenuModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  onSaved,
}) => {
  const { menuItems, categories, addCategory, addMenuItem, editMenuItem } = usePOS();

  const [category, setCategory] = useState<string>('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const [subcategory, setSubcategory] = useState<string>('');
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  const [newSubcategoryInput, setNewSubcategoryInput] = useState('');

  const [name, setName] = useState('');
  const [price, setPrice] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Main Course subcategories explicitly defined
  const mainCourseSubcategories = useMemo(
    () => ['Mushroom', 'Paneer Main Course', 'Veg Main Course', 'Dal & Special Gravies'],
    []
  );

  // Derive unique subcategories from menu data
  const existingSubcategories = useMemo(() => {
    const isMainCourse =
      category.toLowerCase().includes('main course') ||
      category === 'Main Course & Gravies';

    if (isMainCourse) {
      return mainCourseSubcategories;
    }

    return Array.from(
      new Set(
        menuItems
          .map((m) => m.subcategory || m.category)
          .filter(
            (s): s is string =>
              typeof s === 'string' && s.trim().length > 0 && s.trim().toLowerCase() !== 'korma'
          )
      )
    );
  }, [category, menuItems, mainCourseSubcategories]);

  // Sync state when modal opens or editingItem changes
  useEffect(() => {
    if (editingItem) {
      const itemCat = editingItem.category || editingItem.subcategory || categories[0] || 'Starters';
      setCategory(itemCat);
      setIsCreatingCategory(false);
      setNewCategoryInput('');

      setSubcategory(editingItem.subcategory || itemCat);
      setIsCreatingSubcategory(false);
      setNewSubcategoryInput('');

      setName(editingItem.name || '');
      setPrice(String(editingItem.price || ''));
      setIsAvailable(typeof editingItem.isAvailable === 'boolean' ? editingItem.isAvailable : true);
    } else {
      const defaultCat = categories[0] || 'Starters';
      setCategory(defaultCat);
      setIsCreatingCategory(false);
      setNewCategoryInput('');

      setSubcategory(defaultCat.toLowerCase().includes('main course') ? 'Veg Main Course' : defaultCat);
      setIsCreatingSubcategory(false);
      setNewSubcategoryInput('');

      setName('');
      setPrice('');
      setIsAvailable(true);
    }
    setError(null);
  }, [editingItem, isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Resolve Category
    let resolvedCategory = category.trim();
    if (isCreatingCategory) {
      resolvedCategory = newCategoryInput.trim();
      if (!resolvedCategory) {
        setError('Please enter a category name.');
        return;
      }
      if (resolvedCategory.toLowerCase() === 'korma') {
        setError('Do not create a new Korma category. Use Main Course & Gravies with subcategory Veg Main Course.');
        return;
      }
      addCategory(resolvedCategory);
    }
    if (!resolvedCategory) {
      setError('Please select or create a category.');
      return;
    }

    // Resolve Subcategory
    let resolvedSubcategory = subcategory.trim();
    if (isCreatingSubcategory) {
      resolvedSubcategory = newSubcategoryInput.trim();
    }
    if (resolvedSubcategory.toLowerCase() === 'korma') {
      setError('Do not create a Korma category or subcategory. Use subcategory Veg Main Course.');
      return;
    }
    if (!resolvedSubcategory) {
      resolvedSubcategory = resolvedCategory;
    }

    // Validate Item Name
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Item Name is required.');
      return;
    }

    // Validate Price (₹)
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setError('Please enter a valid price in Indian Rupees (₹).');
      return;
    }

    const section =
      resolvedCategory.toLowerCase().includes('drink') ||
      resolvedCategory.toLowerCase().includes('beverage')
        ? 'Beverages'
        : 'Food';

    if (editingItem) {
      const res = editMenuItem(editingItem.id, {
        name: cleanName,
        category: resolvedCategory,
        subcategory: resolvedSubcategory,
        section,
        price: numericPrice,
        isAvailable,
      });

      if (res.success) {
        if (onSaved) {
          onSaved({
            ...editingItem,
            name: cleanName,
            category: resolvedCategory,
            subcategory: resolvedSubcategory,
            section,
            price: numericPrice,
            isAvailable,
          });
        }
        onClose();
      } else {
        setError(res.message || 'Failed to update menu item.');
      }
    } else {
      const res = addMenuItem({
        name: cleanName,
        category: resolvedCategory,
        subcategory: resolvedSubcategory,
        section,
        price: numericPrice,
        isAvailable,
      });

      if (res.success && res.item) {
        if (onSaved) {
          onSaved(res.item);
        }
        onClose();
      } else {
        setError(res.message || 'Failed to add menu item.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
            </h3>
            <p className="text-[11px] text-neutral-500">
              {editingItem
                ? 'Update dish details, price or availability.'
                : 'Create a new dish that immediately appears in the menu.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Category */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-neutral-800">
                Category <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingCategory(!isCreatingCategory);
                  setNewCategoryInput('');
                }}
                className="text-[11px] text-amber-700 hover:text-amber-800 font-bold cursor-pointer underline underline-offset-2"
              >
                {isCreatingCategory ? 'Choose Existing' : '+ Create Category'}
              </button>
            </div>

            {isCreatingCategory ? (
              <input
                type="text"
                required
                autoFocus
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="Enter new category name..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
              />
            ) : (
              <select
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setCategory(newCat);
                  if (!isCreatingSubcategory) {
                    if (
                      newCat.toLowerCase().includes('main course') ||
                      newCat === 'Main Course & Gravies'
                    ) {
                      setSubcategory('Veg Main Course');
                    } else {
                      setSubcategory(newCat);
                    }
                  }
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Subcategory */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-neutral-800">
                Subcategory <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingSubcategory(!isCreatingSubcategory);
                  setNewSubcategoryInput('');
                }}
                className="text-[11px] text-amber-700 hover:text-amber-800 font-bold cursor-pointer underline underline-offset-2"
              >
                {isCreatingSubcategory ? 'Choose Existing' : '+ New Subcategory'}
              </button>
            </div>

            {isCreatingSubcategory ? (
              <input
                type="text"
                autoFocus
                value={newSubcategoryInput}
                onChange={(e) => setNewSubcategoryInput(e.target.value)}
                placeholder="Enter new subcategory name..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
              />
            ) : existingSubcategories.length > 0 ? (
              <div className="relative">
                <input
                  type="text"
                  required
                  list="subcategories-datalist"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="Select or enter subcategory (e.g. Starters, Tandoori)"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
                />
                <datalist id="subcategories-datalist">
                  {existingSubcategories.map((sub) => (
                    <option key={sub} value={sub} />
                  ))}
                </datalist>
              </div>
            ) : (
              <input
                type="text"
                required
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="e.g. Starters, Tandoori, Gravy, Breads"
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 bg-white"
              />
            )}
          </div>

          {/* 3. Item Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1">
              Item Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Paneer Butter Masala, Garlic Naan"
              className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          {/* 4. Price (₹) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1">
              Price (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-neutral-600 text-xs">
                ₹
              </span>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 280"
                className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono-numbers font-bold"
              />
            </div>
            {editingItem && (
              <p className="text-[10px] text-neutral-500 mt-1">
                Current price: ₹{editingItem.price}. New orders will use the updated price. Past completed bills keep their original price.
              </p>
            )}
          </div>

          {/* 5. Available: Yes/No */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
              Available:
            </label>
            <div className="flex items-center gap-3">
              <label
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                  isAvailable
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <input
                  type="radio"
                  name="availabilityChoice"
                  checked={isAvailable === true}
                  onChange={() => setIsAvailable(true)}
                  className="accent-emerald-600"
                />
                <span>Yes (Available)</span>
              </label>

              <label
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                  !isAvailable
                    ? 'bg-neutral-100 text-neutral-800 border-neutral-300 shadow-2xs'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <input
                  type="radio"
                  name="availabilityChoice"
                  checked={isAvailable === false}
                  onChange={() => setIsAvailable(false)}
                  className="accent-neutral-900"
                />
                <span>No (Unavailable)</span>
              </label>
            </div>
          </div>

          {/* Buttons: [ SAVE ITEM ] [ CANCEL ] */}
          <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2.5">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-sm transition-colors cursor-pointer uppercase tracking-wider"
            >
              SAVE ITEM
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
