import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User,
  UserRole,
  Table,
  TableStatus,
  MenuItem,
  Order,
  OrderItem,
  KOT,
  KOTItem,
  KOTStatus,
  Bill,
  PaymentMethod,
  RestaurantSettings,
  Subcategory,
  PrinterPaperWidth,
  PrinterMode,
  PrinterStatus,
  Floor,
} from '../types/pos';
import {
  INITIAL_USERS,
  INITIAL_SETTINGS,
  INITIAL_FLOORS,
  INITIAL_TABLES,
  INITIAL_MENU_ITEMS,
  INITIAL_ORDERS,
  INITIAL_KOTS,
  INITIAL_BILLS,
} from '../data/initialData';
import { hashPassword, verifyPassword, isOwner } from '../utils/security';
import { bluetoothPrinter } from '../utils/bluetoothPrinter';
import {
  generateBillReceiptBytes,
  generateKOTReceiptBytes,
  generateDiagnosticTestReceipt,
  generateSampleBillBytes,
  generateSampleKOTBytes,
} from '../utils/escpos';
import {
  printBillViaBrowser,
  printKOTViaBrowser,
  printSampleBillViaBrowser,
  printSampleKOTViaBrowser,
} from '../utils/printReceipt';

export type AppView =
  | 'dashboard'
  | 'tables'
  | 'menu'
  | 'orders'
  | 'kitchen'
  | 'billing'
  | 'reports'
  | 'users'
  | 'menu_management';

interface POSContextType {
  currentUser: User | null;
  authToken: string | null;
  login: (username: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  quickLogin: (role: UserRole) => Promise<void> | void;
  logout: () => void;
  deleteBill: (billId: string) => Promise<{ success: boolean; message?: string }>;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  hasPermission: (view: AppView) => boolean;

  // Users Management
  users: User[];
  addUser: (userData: {
    name: string;
    username: string;
    password: string;
    role: UserRole;
  }) => { success: boolean; message?: string };
  editUser: (
    userId: string,
    data: { name: string; username: string; role: UserRole }
  ) => { success: boolean; message?: string };
  toggleUserStatus: (userId: string) => { success: boolean; message?: string };
  resetUserPassword: (
    userId: string,
    newPassword: string
  ) => { success: boolean; message?: string };
  deleteUser: (userId: string) => { success: boolean; message?: string };
  
  // Floors Management (Owner Only)
  floors: Floor[];
  addFloor: (name: string) => Promise<{ success: boolean; message?: string; floor?: Floor }>;
  editFloor: (floorId: string, newName: string) => Promise<{ success: boolean; message?: string }>;

  // Data
  tables: Table[];
  addTable: (tableData: {
    name: string;
    capacity?: number;
    section?: string;
  }) => { success: boolean; message?: string; table?: Table };
  makeTableUnoccupied: (tableId: number) => boolean;
  menuItems: MenuItem[];
  orders: Order[];
  kots: KOT[];
  bills: Bill[];
  settings: RestaurantSettings;
  activeTableId: number | null;
  setActiveTableId: (id: number | null) => void;

  // Actions
  createOrGetOrderForTable: (tableId: number) => Order;
  addItemToOrder: (tableId: number, menuItem: MenuItem, notes?: string) => void;
  updateItemQuantity: (orderId: string, orderItemId: string, delta: number) => void;
  removeItemFromOrder: (orderId: string, orderItemId: string) => void;
  sendKOT: (orderId: string) => { success: boolean; kotNumber?: number; message?: string };
  updateKOTStatus: (kotId: string, status: KOTStatus) => void;
  
  // Billing
  generateBillForOrder: (
    orderId: string,
    discountType: 'percentage' | 'flat',
    discountValue: number
  ) => Bill;
  settleBill: (
    billIdOrBill: string | Bill,
    paymentMethod?: PaymentMethod,
    cashReceived?: number,
    changeGiven?: number
  ) => boolean;
  
  // Receipts & Thermal Printing
  billToPrint: Bill | null;
  setBillToPrint: (bill: Bill | null) => void;
  kotToPrint: KOT | null;
  setKotToPrint: (kot: KOT | null) => void;
  printerStatus: PrinterStatus;
  printerDeviceName: string | null;
  printerError: string | null;
  connectBluetoothPrinter: () => Promise<{ success: boolean; deviceName?: string; error?: string }>;
  disconnectBluetoothPrinter: () => void;
  reconnectBluetoothPrinter: () => Promise<{ success: boolean; deviceName?: string; error?: string }>;
  printBillThermal: (
    bill: Bill,
    options?: { forceSystemPrint?: boolean }
  ) => Promise<{ success: boolean; method: 'bluetooth' | 'system'; error?: string }>;
  printKOTThermal: (
    kot: KOT,
    options?: { forceSystemPrint?: boolean; isReprint?: boolean }
  ) => Promise<{ success: boolean; method: 'bluetooth' | 'system'; error?: string }>;
  testPrintThermal: (
    type: 'diagnostic' | 'bill' | 'kot'
  ) => Promise<{ success: boolean; method: 'bluetooth' | 'system'; error?: string }>;

  // Settings & Admin
  updateSettings: (newSettings: Partial<RestaurantSettings>) => void;
  toggleMenuItemAvailability: (menuItemId: string) => void;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => { success: boolean; message?: string; item?: MenuItem };
  editMenuItem: (menuItemId: string, updates: Partial<MenuItem>) => { success: boolean; message?: string };
  updateMenuItemPrice: (menuItemId: string, newPrice: number) => { success: boolean; message?: string };
  deleteMenuItem: (menuItemId: string) => { success: boolean; message?: string };
  categories: string[];
  subcategories: Subcategory[];
  addCategory: (categoryName: string) => { success: boolean; message?: string };
  renameCategory: (oldName: string, newName: string) => { success: boolean; message?: string };
  deleteCategory: (
    categoryName: string,
    actionOrReassignTo?: 'delete_items' | 'move_items' | string,
    targetCategory?: string,
    targetSubcategory?: string
  ) => { success: boolean; message?: string };
  addSubcategory: (categoryName: string, subcategoryName: string) => { success: boolean; message?: string };
  renameSubcategory: (categoryName: string, oldName: string, newName: string) => { success: boolean; message?: string };
  deleteSubcategory: (
    categoryName: string,
    subcategoryName: string,
    action: 'delete_items' | 'move_items',
    targetCategory?: string,
    targetSubcategory?: string
  ) => { success: boolean; message?: string };
  moveMenuItems: (
    itemIds: string[],
    targetCategory: string,
    targetSubcategory?: string
  ) => { success: boolean; count?: number; message?: string };
  loadMenuData: (items: any[]) => { success: boolean; count?: number; message?: string };
  resetMenuData: () => void;
  resetToDemoData: () => void;
}

const STORAGE_KEYS = {
  USER: 'my_pos_user',
  AUTH_TOKEN: 'my_pos_auth_token',
  USERS: 'my_pos_users_list',
  TABLES: 'my_pos_tables',
  MENU: 'my_pos_menu',
  CATEGORIES: 'my_pos_categories',
  SUBCATEGORIES: 'my_pos_subcategories',
  ORDERS: 'my_pos_orders',
  KOTS: 'my_pos_kots',
  BILLS: 'my_pos_bills',
  SETTINGS: 'my_pos_settings',
  FLOORS: 'my_pos_floors',
};

const POSContext = createContext<POSContextType | undefined>(undefined);

const FRESH_DAY_RESET_FLAG = 'pos_business_day_fresh_reset_v3';

// One-time fresh business day reset:
// Clears test demo orders, active orders, KOTs, and billing history so daily sales is ₹0
// Resets all tables to available/empty without deleting menu, users, or settings
try {
  const isFreshReset = localStorage.getItem(FRESH_DAY_RESET_FLAG);
  if (!isFreshReset) {
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.KOTS);
    localStorage.removeItem(STORAGE_KEYS.BILLS);

    const savedTables = localStorage.getItem(STORAGE_KEYS.TABLES);
    if (savedTables) {
      const parsedTables: Table[] = JSON.parse(savedTables);
      if (Array.isArray(parsedTables) && parsedTables.length > 0) {
        const cleaned = parsedTables.map((t) => ({
          ...t,
          status: 'available' as TableStatus,
          activeOrderId: undefined,
          occupiedSince: undefined,
        }));
        localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(cleaned));
      } else {
        localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(INITIAL_TABLES));
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(INITIAL_TABLES));
    }

    localStorage.setItem(FRESH_DAY_RESET_FLAG, 'true');
  }
} catch (e) {
  console.error(e);
}

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Users state
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      if (saved) {
        const parsed: any[] = JSON.parse(saved);
        // Ensure admin owner account exists and all users use salted passwordHash
        const upgraded: User[] = parsed.map((u) => {
          let hash = u.passwordHash;
          if (!hash && u.password) {
            hash = hashPassword(u.password);
          }
          if (!hash) {
            const foundInit = INITIAL_USERS.find(
              (init) => init.username.toLowerCase() === u.username.toLowerCase()
            );
            hash = foundInit?.passwordHash || hashPassword('123456');
          }
          return {
            id: String(u.id),
            username: String(u.username),
            name: String(u.name),
            passwordHash: hash,
            role: u.role,
            isActive: typeof u.isActive === 'boolean' ? u.isActive : true,
            createdAt: u.createdAt || new Date().toISOString(),
          };
        });

        const hasAdmin = upgraded.some((u) => u.username.toLowerCase() === 'admin');
        if (!hasAdmin) {
          return [INITIAL_USERS[0], ...upgraded];
        }
        return upgraded;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_USERS;
  });

  // Current user (defaults to the Owner account)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        const isOwnerAcc = isOwner(parsed);
        return {
          id: String(parsed.id || (isOwnerAcc ? 'usr-admin' : 'usr-staff')),
          username: String(parsed.username || (isOwnerAcc ? 'admin' : 'staff')),
          name: String(parsed.name || (isOwnerAcc ? 'PRIMECENTURY RESTAURANT & CAFE' : 'Staff')),
          passwordHash: parsed.passwordHash || '',
          role: isOwnerAcc ? ('owner' as UserRole) : (parsed.role as UserRole),
          isActive: typeof parsed.isActive === 'boolean' ? parsed.isActive : true,
          createdAt: parsed.createdAt || new Date().toISOString(),
        };
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_USERS[0];
  });

  // Authentic server session token
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return (
        localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
        sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
        null
      );
    } catch {
      return null;
    }
  });

  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [activeTableId, setActiveTableId] = useState<number | null>(1);
  const [billToPrint, setBillToPrint] = useState<Bill | null>(null);
  const [kotToPrint, setKotToPrint] = useState<KOT | null>(null);

  // Bluetooth Thermal Printer state
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>(bluetoothPrinter.getStatus());
  const [printerDeviceName, setPrinterDeviceName] = useState<string | null>(bluetoothPrinter.getDeviceName());
  const [printerError, setPrinterError] = useState<string | null>(bluetoothPrinter.getLastError());

  // Listen to Bluetooth printer status updates
  useEffect(() => {
    const unsubscribe = bluetoothPrinter.subscribe((status, name, error) => {
      setPrinterStatus(status);
      setPrinterDeviceName(name);
      setPrinterError(error || null);
    });
    return unsubscribe;
  }, []);

  // Synchronous cache for newly generated bills prior to state re-renders
  const pendingBillsRef = useRef<Map<string, Bill>>(new Map());

  // Floors State (Initial: Lower Hall and Upper Hall)
  const [floors, setFloors] = useState<Floor[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FLOORS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_FLOORS;
  });

  // Tables (starts with 12 available tables across Lower Hall & Upper Hall)
  const [tables, setTables] = useState<Table[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TABLES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Seamlessly assign existing tables to Lower Hall & Upper Hall while preserving table identities & orders
          const migrated = parsed.map((t: Table) => {
            let section = t.section;
            if (!section || section === 'Main Hall') {
              section = 'Lower Hall';
            } else if (section === 'Garden Terrace' || section === 'Family AC') {
              section = 'Upper Hall';
            }
            return {
              ...t,
              section,
            };
          });
          return migrated;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_TABLES;
  });

  // Menu normalization helper
  const normalizeMenuItem = (item: any): MenuItem => {
    let subcategory = String(item.subcategory || item.category || 'General').trim();
    let category = String(item.category || subcategory).trim();

    // Rename subcategory from 'North Indian Zayka' to 'Paneer Main Course' under 'Main Course & Gravies'
    if (
      subcategory.toLowerCase() === 'north indian zayka' ||
      category.toLowerCase() === 'north indian zayka'
    ) {
      category = 'Main Course & Gravies';
      subcategory = 'Paneer Main Course';
    }

    const section = String(
      item.section ||
      (subcategory.toLowerCase().includes('drink') || subcategory.toLowerCase().includes('beverage')
        ? 'Beverages'
        : 'Food')
    ).trim();

    let timing = item.availabilityTiming;
    if (!timing || typeof timing !== 'object') {
      timing = { enabled: false, label: 'All Day' };
    }

    return {
      id: String(item.id || `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`),
      section: section || 'Food',
      subcategory: subcategory || 'General',
      name: String(item.name || 'Dish Item').trim(),
      price: Number(item.price) || 0,
      isAvailable: typeof item.isAvailable === 'boolean' ? item.isAvailable : true,
      availabilityTiming: {
        enabled: Boolean(timing.enabled),
        startTime: timing.startTime || '',
        endTime: timing.endTime || '',
        days: Array.isArray(timing.days) ? timing.days : undefined,
        label: timing.label || (timing.enabled && timing.startTime && timing.endTime ? `${timing.startTime} - ${timing.endTime}` : 'All Day'),
        timeSlots: Array.isArray(timing.timeSlots) ? timing.timeSlots : undefined,
      },
      category: category || subcategory,
      isVeg: typeof item.isVeg === 'boolean' ? item.isVeg : true,
      description: item.description || '',
    };
  };

  const isNonVegText = (text?: string): boolean => {
    if (!text) return false;
    const lower = text.trim().toLowerCase();
    return lower === 'non-veg' || lower === 'non veg' || lower === 'nonveg';
  };

  // Menu Items (Pure Vegetarian Only)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MENU);
      if (saved) {
        const parsed: any[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const loaded = parsed
            .map(normalizeMenuItem)
            .filter((m) => m.isVeg && !isNonVegText(m.category) && !isNonVegText(m.subcategory));
          const loadedIds = new Set(loaded.map((m) => m.id));
          const missingInitial = INITIAL_MENU_ITEMS.filter(
            (item) => item.isVeg && !isNonVegText(item.category) && !loadedIds.has(item.id)
          );
          if (missingInitial.length > 0) {
            return [...loaded, ...missingInitial];
          }
          return loaded;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_MENU_ITEMS.filter((m) => m.isVeg && !isNonVegText(m.category));
  });

  // Categories (Owner Only can add, rename, delete)
  const [categories, setCategories] = useState<string[]>(() => {
    const defaultCats = [
      'Starters',
      'Chinese',
      'Beverages & Juices',
      'Main Course',
      'Main Course & Gravies',
      'South Indian & Breakfast',
      'Munchies & Soups',
      'Indian Appetizers',
      'Mushroom',
      'Mix Vegetable',
      'Paneer Main Course',
      'Veg Specials',
      'Veg Main Course',
      'Dal & Special Gravies',
      'Breads',
      'Breads & Rotis',
      'Rice',
      'Desserts',
      'Beverages',
    ];
    const fromItems = INITIAL_MENU_ITEMS.map((m) => m.category || m.subcategory).filter(Boolean) as string[];
    const combinedDefaults = Array.from(new Set([...defaultCats, ...fromItems])).filter(
      (c) => c.trim().toLowerCase() !== 'korma' && !isNonVegText(c)
    );

    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped = parsed
            .map((c) =>
              c.trim().toLowerCase() === 'north indian zayka' ? 'Paneer Main Course' : c
            )
            .filter((c) => c.trim().toLowerCase() !== 'korma' && !isNonVegText(c));
          // Merge to guarantee new category appears while preserving any user added categories
          return Array.from(new Set([...mapped, ...combinedDefaults]));
        }
      }
    } catch (e) {
      console.error(e);
    }
    return combinedDefaults;
  });

  const deriveInitialSubcategories = (): Subcategory[] => {
    const map = new Map<string, Subcategory>();
    INITIAL_MENU_ITEMS.filter((m) => m.isVeg && !isNonVegText(m.category)).forEach((m) => {
      const cat = m.category || m.subcategory || 'General';
      const sub = m.subcategory || cat;
      const key = `${cat}:::${sub}`.toLowerCase();
      if (!map.has(key) && !isNonVegText(cat) && !isNonVegText(sub)) {
        map.set(key, {
          id: `sub-${Math.random().toString(36).substring(2, 8)}`,
          name: sub,
          category: cat,
        });
      }
    });
    return Array.from(map.values());
  };

  // Subcategories
  const [subcategories, setSubcategories] = useState<Subcategory[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUBCATEGORIES);
      if (saved) {
        const parsed: Subcategory[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filteredSaved = parsed.filter(
            (s) => !isNonVegText(s.name) && !isNonVegText(s.category)
          );
          const existingKeys = new Set(filteredSaved.map((s) => `${s.category}:::${s.name}`.toLowerCase()));
          const newSubs = deriveInitialSubcategories().filter(
            (s) => !existingKeys.has(`${s.category}:::${s.name}`.toLowerCase())
          );
          return [...filteredSaved, ...newSubs];
        }
      }
    } catch (e) {
      console.error(e);
    }
    return deriveInitialSubcategories();
  });

  // Orders (Pure Vegetarian)
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (saved) {
        const parsed: Order[] = JSON.parse(saved);
        return parsed.map((ord) => ({
          ...ord,
          items: ord.items.filter((it) => it.isVeg && !it.name.toLowerCase().includes('chicken')),
        }));
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_ORDERS;
  });

  // KOTs (Pure Vegetarian)
  const [kots, setKots] = useState<KOT[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.KOTS);
      if (saved) {
        const parsed: KOT[] = JSON.parse(saved);
        return parsed.map((kot) => ({
          ...kot,
          items: kot.items.filter((it) => it.isVeg && !it.name.toLowerCase().includes('chicken')),
        }));
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_KOTS;
  });

  // Bills (Pure Vegetarian)
  const [bills, setBills] = useState<Bill[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BILLS);
      if (saved) {
        const parsed: Bill[] = JSON.parse(saved);
        return parsed.map((bill) => ({
          ...bill,
          items: bill.items.filter((it) => it.isVeg && !it.name.toLowerCase().includes('chicken')),
        }));
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_BILLS;
  });

  // Settings
  const [settings, setSettings] = useState<RestaurantSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_SETTINGS;
  });

  // Save to LocalStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUBCATEGORIES, JSON.stringify(subcategories));
  }, [subcategories]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.KOTS, JSON.stringify(kots));
  }, [kots]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Reconcile and self-heal tables: ensure any table linked to a paid or missing order is marked available
  useEffect(() => {
    setTables((prevTables) => {
      let changed = false;
      const reconciled = prevTables.map((t) => {
        if (t.activeOrderId) {
          const linkedOrder = orders.find((o) => o.id === t.activeOrderId);
          if (!linkedOrder || linkedOrder.status === 'paid') {
            changed = true;
            return {
              ...t,
              status: 'available' as TableStatus,
              activeOrderId: undefined,
              occupiedSince: undefined,
            };
          }
        }
        return t;
      });
      return changed ? reconciled : prevTables;
    });
  }, [orders]);

  // Migration effect: ensure any items or categories under 'North Indian Zayka' are renamed to 'Paneer Main Course' under 'Main Course & Gravies'
  useEffect(() => {
    setMenuItems((prev) => {
      let changed = false;
      const updated = prev.map((item) => {
        const isOldSubcat = item.subcategory?.trim().toLowerCase() === 'north indian zayka';
        const isOldCat = item.category?.trim().toLowerCase() === 'north indian zayka';
        if (isOldSubcat || isOldCat) {
          changed = true;
          return {
            ...item,
            category: 'Main Course & Gravies',
            subcategory: 'Paneer Main Course',
          };
        }
        return item;
      });
      return changed ? updated : prev;
    });

    setCategories((prev) => {
      let changed = false;
      const updated = prev.map((c) => {
        if (c.trim().toLowerCase() === 'north indian zayka') {
          changed = true;
          return 'Paneer Main Course';
        }
        return c;
      });
      if (!updated.includes('Paneer Main Course')) {
        updated.push('Paneer Main Course');
        changed = true;
      }
      return changed ? Array.from(new Set(updated)) : prev;
    });
  }, []);

  // Sync and validate server session token on app startup / page refresh
  useEffect(() => {
    if (!currentUser) return;
    const syncSession = async () => {
      try {
        const res = await fetch('/api/auth/validate-or-refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: authToken,
            userId: currentUser.id,
            username: currentUser.username,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            setAuthToken(data.token);
            try {
              localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
            } catch (e) {
              console.error(e);
            }
          }
          if (data.user) {
            const canonicalUser: User = {
              ...currentUser,
              ...data.user,
              role: isOwner(data.user) ? 'owner' : data.user.role,
            };
            setCurrentUser(canonicalUser);
            try {
              localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(canonicalUser));
            } catch (e) {
              console.error(e);
            }
          }
        }
      } catch (err) {
        console.error('Session sync error:', err);
      }
    };
    syncSession();
  }, [currentUser?.id, currentUser?.username]);

  // Sync historical bills to server storage if needed
  useEffect(() => {
    if (bills.length > 0) {
      fetch('/api/bills/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bills }),
      }).catch(() => {});
    }
  }, []);

  // Permissions helper - Strictly enforces OWNER-ONLY Daily Sales & Financial Reports
  const hasPermission = (view: AppView): boolean => {
    if (!currentUser) return false;
    // Trusted Owner has access to all screens including 'reports' (Daily Sales)
    if (isOwner(currentUser)) {
      return true;
    }
    const role = String(currentUser.role || '').toLowerCase().trim();
    switch (role) {
      case 'manager':
        return ['dashboard', 'tables', 'menu', 'orders', 'kitchen', 'billing'].includes(view);
      case 'cashier':
        return ['dashboard', 'tables', 'menu', 'orders', 'billing'].includes(view);
      case 'waiter':
        return ['dashboard', 'tables', 'menu', 'orders', 'kitchen'].includes(view);
      case 'kitchen':
        return view === 'kitchen';
      default:
        return false;
    }
  };

  // Auth - Verified through server token sessions with local fallback
  const login = async (
    username: string,
    pass: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanUsername = username.trim().toLowerCase();
    const cleanPass = pass.trim();

    // 1. Authenticate with backend server to receive verified token & role
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPass }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.token && data.user) {
        const canonicalRole = isOwner(data.user) ? 'owner' : data.user.role;
        const canonicalUser: User = {
          ...data.user,
          role: canonicalRole as UserRole,
        };
        setAuthToken(data.token);
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
        setCurrentUser(canonicalUser);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(canonicalUser));

        if (canonicalUser.role === 'kitchen') {
          setActiveView('kitchen');
        } else {
          setActiveView('dashboard');
        }
        return { success: true };
      } else if (res.status === 401 || res.status === 403) {
        return { success: false, message: data.error || 'Invalid username or password.' };
      }
    } catch {
      // Backend booting or offline fallback
    }

    // 2. Safe local fallback
    const found = users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (!found) {
      return { success: false, message: 'Invalid username or password.' };
    }

    if (!found.isActive) {
      return {
        success: false,
        message: 'This account has been disabled. Please contact the Owner.',
      };
    }

    const isMatch = verifyPassword(cleanPass, found.passwordHash || (found as any).password);
    if (!isMatch) {
      return { success: false, message: 'Invalid username or password.' };
    }

    const isOwnerAcc = isOwner(found);
    const cleanUser: User = {
      id: found.id,
      username: found.username,
      name: found.name,
      passwordHash: found.passwordHash,
      role: isOwnerAcc ? 'owner' : found.role,
      isActive: found.isActive,
      createdAt: found.createdAt,
    };

    setCurrentUser(cleanUser);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(cleanUser));

    if (cleanUser.role === 'kitchen') {
      setActiveView('kitchen');
    } else {
      setActiveView('dashboard');
    }
    return { success: true };
  };

  const quickLogin = async (role: UserRole) => {
    const defaultPasswords: Record<UserRole, string> = {
      owner: 'Kite@29',
      manager: 'mgr123',
      cashier: 'cash123',
      waiter: 'wait123',
      kitchen: 'kitchen123',
    };

    const targetUser = users.find((u) => u.role === role);
    if (targetUser) {
      const pass = defaultPasswords[role] || '123456';
      await login(targetUser.username, pass);
    }
  };

  const logout = () => {
    if (authToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      }).catch(() => {});
    }
    setAuthToken(null);
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
    } catch (e) {
      console.error(e);
    }
  };

  // Owner-only bill deletion method with backend enforcement & audit logging
  const deleteBill = async (
    billId: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser || !isOwner(currentUser)) {
      return {
        success: false,
        message: 'Permission Denied: Daily Sales and Bill Deletion are restricted exclusively to the Owner.',
      };
    }

    const billRecord = bills.find((b) => b.id === billId);

    try {
      let activeToken = authToken;
      if (!activeToken) {
        try {
          const authRes = await fetch('/api/auth/validate-or-refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, username: currentUser.username }),
          });
          if (authRes.ok) {
            const authData = await authRes.json();
            if (authData.token) {
              activeToken = authData.token;
              setAuthToken(authData.token);
              try {
                localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
              } catch (e) {
                console.error(e);
              }
            }
          }
        } catch {
          // Continue
        }
      }

      const res = await fetch(`/api/bills/${encodeURIComponent(billId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ bill: billRecord }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        // If 401 or 403 returned, try token auto-recovery once
        if (res.status === 401 || res.status === 403) {
          const authRes = await fetch('/api/auth/validate-or-refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, username: currentUser.username }),
          });
          if (authRes.ok) {
            const authData = await authRes.json();
            if (authData.token) {
              setAuthToken(authData.token);
              try {
                localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
              } catch (e) {
                console.error(e);
              }
              const retryRes = await fetch(`/api/bills/${encodeURIComponent(billId)}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${authData.token}`,
                },
                body: JSON.stringify({ bill: billRecord }),
              });
              const retryData = await retryRes.json();
              if (retryRes.ok && retryData.success) {
                setBills((prev) => {
                  const updated = prev.filter((b) => b.id !== billId);
                  try {
                    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(updated));
                  } catch (e) {
                    console.error(e);
                  }
                  return updated;
                });
                return {
                  success: true,
                  message: retryData.message || 'Bill deleted successfully and logged to owner audit ledger.',
                };
              }
            }
          }
        }

        return {
          success: false,
          message: data.error || data.message || 'Server rejected bill deletion request.',
        };
      }

      // Update local state and storage
      setBills((prev) => {
        const updated = prev.filter((b) => b.id !== billId);
        try {
          localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });

      return {
        success: true,
        message: data.message || 'Bill deleted successfully and logged to owner audit ledger.',
      };
    } catch {
      // Local removal if backend temporarily offline for verified owner
      if (isOwner(currentUser)) {
        setBills((prev) => {
          const updated = prev.filter((b) => b.id !== billId);
          try {
            localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
          return updated;
        });
        return { success: true, message: 'Bill removed from sales ledger.' };
      }
      return { success: false, message: 'Error deleting bill.' };
    }
  };

  // Floors Management Methods (Owner ONLY - Requirement 4)
  const addFloor = async (
    name: string
  ): Promise<{ success: boolean; message?: string; floor?: Floor }> => {
    if (!currentUser || !isOwner(currentUser)) {
      return { success: false, message: 'Permission Denied: Only the Owner can add floors.' };
    }

    const cleanName = name.trim();
    if (!cleanName) {
      return { success: false, message: 'Floor name cannot be empty.' };
    }

    if (floors.some((f) => f.name.toLowerCase() === cleanName.toLowerCase())) {
      return { success: false, message: `A floor named "${cleanName}" already exists.` };
    }

    try {
      const res = await fetch('/api/floors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ name: cleanName }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.error || 'Failed to add floor on server.' };
      }

      const updatedList: Floor[] = data.floors || [...floors, data.floor];
      setFloors(updatedList);
      try {
        localStorage.setItem(STORAGE_KEYS.FLOORS, JSON.stringify(updatedList));
      } catch (e) {
        console.error(e);
      }
      return { success: true, message: `Floor "${cleanName}" added successfully.`, floor: data.floor };
    } catch {
      // Local fallback
      const newFloor: Floor = {
        id: `floor-${Date.now()}`,
        name: cleanName,
        displayOrder: floors.length + 1,
      };
      const updatedList = [...floors, newFloor];
      setFloors(updatedList);
      try {
        localStorage.setItem(STORAGE_KEYS.FLOORS, JSON.stringify(updatedList));
      } catch (e) {
        console.error(e);
      }
      return { success: true, message: `Floor "${cleanName}" added locally.`, floor: newFloor };
    }
  };

  const editFloor = async (
    floorId: string,
    newName: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser || !isOwner(currentUser)) {
      return { success: false, message: 'Permission Denied: Only the Owner can edit floors.' };
    }

    const cleanName = newName.trim();
    if (!cleanName) {
      return { success: false, message: 'Floor name cannot be empty.' };
    }

    const targetFloor = floors.find((f) => f.id === floorId || f.name.toLowerCase() === floorId.toLowerCase());
    if (!targetFloor) {
      return { success: false, message: 'Floor not found.' };
    }

    const oldName = targetFloor.name;
    if (oldName.toLowerCase() === cleanName.toLowerCase()) {
      return { success: true, message: 'Floor name unchanged.' };
    }

    if (floors.some((f) => f.id !== targetFloor.id && f.name.toLowerCase() === cleanName.toLowerCase())) {
      return { success: false, message: `Another floor named "${cleanName}" already exists.` };
    }

    try {
      const res = await fetch(`/api/floors/${encodeURIComponent(targetFloor.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ name: cleanName }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, message: data.error || 'Failed to update floor on server.' };
      }

      // Update floors in state
      const updatedFloors = floors.map((f) => (f.id === targetFloor.id ? { ...f, name: cleanName } : f));
      setFloors(updatedFloors);
      try {
        localStorage.setItem(STORAGE_KEYS.FLOORS, JSON.stringify(updatedFloors));
      } catch (e) {
        console.error(e);
      }

      // Update tables associated with this floor while preserving table identities and active orders
      setTables((prev) => {
        const updated = prev.map((t) => (t.section === oldName ? { ...t, section: cleanName } : t));
        try {
          localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });

      return {
        success: true,
        message: `Floor renamed to "${cleanName}" successfully. All tables and active orders were preserved.`,
      };
    } catch {
      // Local fallback
      const updatedFloors = floors.map((f) => (f.id === targetFloor.id ? { ...f, name: cleanName } : f));
      setFloors(updatedFloors);
      try {
        localStorage.setItem(STORAGE_KEYS.FLOORS, JSON.stringify(updatedFloors));
      } catch (e) {
        console.error(e);
      }

      setTables((prev) => {
        const updated = prev.map((t) => (t.section === oldName ? { ...t, section: cleanName } : t));
        try {
          localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });

      return {
        success: true,
        message: `Floor renamed to "${cleanName}" locally. All tables and active orders were preserved.`,
      };
    }
  };

  // User Management Methods (Owner ONLY)
  const addUser = (userData: {
    name: string;
    username: string;
    password: string;
    role: UserRole;
  }): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'owner') {
      return { success: false, message: 'Permission Denied: ONLY the Owner can create staff users.' };
    }
    const cleanUsername = userData.username.trim().toLowerCase();
    if (!cleanUsername) {
      return { success: false, message: 'Username is required.' };
    }
    if (!userData.name.trim()) {
      return { success: false, message: 'Full name is required.' };
    }
    if (!userData.password.trim()) {
      return { success: false, message: 'Password is required.' };
    }
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return {
        success: false,
        message: `Username "${userData.username.trim()}" is already in use. Please choose another.`,
      };
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: userData.name.trim(),
      username: userData.username.trim(),
      passwordHash: hashPassword(userData.password.trim()),
      role: userData.role,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, newUser]);
    return { success: true };
  };

  const editUser = (
    userId: string,
    data: { name: string; username: string; role: UserRole }
  ): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'owner') {
      return { success: false, message: 'Permission Denied: ONLY the Owner can edit users or roles.' };
    }
    const cleanUsername = data.username.trim().toLowerCase();
    if (!cleanUsername) {
      return { success: false, message: 'Username is required.' };
    }
    if (!data.name.trim()) {
      return { success: false, message: 'Full name is required.' };
    }

    // Check if new username conflicts with another existing user
    const existing = users.find(
      (u) => u.id !== userId && u.username.toLowerCase() === cleanUsername
    );
    if (existing) {
      return {
        success: false,
        message: `Username "${data.username.trim()}" is already in use by another staff member.`,
      };
    }

    // Safety check: Cannot demote the last active owner
    const target = users.find((u) => u.id === userId);
    if (target?.role === 'owner' && data.role !== 'owner') {
      const otherOwners = users.filter(
        (u) => u.role === 'owner' && u.isActive && u.id !== userId
      );
      if (otherOwners.length === 0) {
        return { success: false, message: 'Cannot change the role of the only remaining active Owner.' };
      }
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        return {
          ...u,
          name: data.name.trim(),
          username: data.username.trim(),
          role: data.role,
        };
      })
    );

    // If current logged-in user was updated, keep currentUser state in sync
    if (currentUser?.id === userId) {
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              name: data.name.trim(),
              username: data.username.trim(),
              role: data.role,
            }
          : null
      );
    }

    return { success: true };
  };

  const toggleUserStatus = (userId: string): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'owner') {
      return { success: false, message: 'Permission Denied: ONLY the Owner can disable or enable users.' };
    }
    if (currentUser?.id === userId) {
      return { success: false, message: 'You cannot disable your own active account.' };
    }

    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, message: 'User not found.' };

    if (target.role === 'owner' && target.isActive) {
      const otherActiveOwners = users.filter(
        (u) => u.role === 'owner' && u.isActive && u.id !== userId
      );
      if (otherActiveOwners.length === 0) {
        return { success: false, message: 'Cannot disable the only active Owner account.' };
      }
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
    );
    return { success: true };
  };

  const resetUserPassword = (
    userId: string,
    newPassword: string
  ): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'owner') {
      return { success: false, message: 'Permission Denied: ONLY the Owner can change or reset user passwords.' };
    }
    if (!newPassword || newPassword.trim().length === 0) {
      return { success: false, message: 'New password cannot be empty.' };
    }

    const hashed = hashPassword(newPassword.trim());

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, passwordHash: hashed, password: undefined } : u))
    );

    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, passwordHash: hashed, password: undefined } : null));
    }

    return { success: true };
  };

  const deleteUser = (userId: string): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'owner') {
      return { success: false, message: 'Permission Denied: ONLY the Owner can delete users.' };
    }
    if (currentUser?.id === userId) {
      return { success: false, message: 'You cannot delete your own active account.' };
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, message: 'User not found.' };
    if (target.role === 'owner') {
      const otherOwners = users.filter((u) => u.role === 'owner' && u.id !== userId);
      if (otherOwners.length === 0) {
        return { success: false, message: 'Cannot delete the only Owner.' };
      }
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    return { success: true };
  };

  // Add Table (Owner/Admin Only)
  const addTable = (tableData: {
    name: string;
    capacity?: number;
    section?: 'Main Hall' | 'Garden Terrace' | 'Family AC' | string;
  }): { success: boolean; message?: string; table?: Table } => {
    const isOwnerOrAdmin = currentUser?.role === 'owner' || (currentUser as any)?.role === 'admin';
    if (!isOwnerOrAdmin) {
      return {
        success: false,
        message: 'Permission Denied: ONLY the Owner/Admin can add tables.',
      };
    }

    const trimmedName = tableData.name.trim();
    if (!trimmedName) {
      return {
        success: false,
        message: 'Table number or name is required.',
      };
    }

    // Prevent duplicate table numbers/names (case-insensitive)
    const isDuplicate = tables.some((t) => {
      const existing = t.name.trim().toLowerCase();
      const entered = trimmedName.toLowerCase();
      return (
        existing === entered ||
        existing === `table ${entered}` ||
        `table ${existing}` === entered
      );
    });

    if (isDuplicate) {
      return {
        success: false,
        message: `A table with number or name "${trimmedName}" already exists. Duplicate table names are prevented.`,
      };
    }

    const nextId = tables.length > 0 ? Math.max(...tables.map((t) => t.id)) + 1 : 1;
    const capacity =
      tableData.capacity && Number(tableData.capacity) > 0 ? Number(tableData.capacity) : 4;
    const section = (tableData.section as any) || (floors[0]?.name || 'Lower Hall');

    const newTable: Table = {
      id: nextId,
      name: trimmedName,
      capacity,
      section,
      status: 'available',
    };

    setTables((prev) => [...prev, newTable]);

    return {
      success: true,
      message: `Table "${trimmedName}" has been successfully added.`,
      table: newTable,
    };
  };

  // Make a table unoccupied / available manually without billing (cancels & clears active unsaved order)
  const makeTableUnoccupied = (tableId: number): boolean => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return false;

    const targetOrderId = table.activeOrderId;

    // 1. Clear any active/unsaved orders for this table without adding to sales history
    setOrders((prev) => {
      const updated = prev.filter(
        (o) => !(o.tableId === tableId && o.status !== 'paid') && (!targetOrderId || o.id !== targetOrderId)
      );
      try {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    // 2. Immediately mark table as available and clear occupied flags
    setTables((prev) => {
      const updated = prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'available' as TableStatus,
              activeOrderId: undefined,
              occupiedSince: undefined,
            }
          : t
      );
      try {
        localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    return true;
  };

  // Create or retrieve active order for table
  const createOrGetOrderForTable = (tableId: number): Order => {
    const existing = orders.find((o) => o.tableId === tableId && o.status === 'active');
    if (existing) return existing;

    const newOrderNumber =
      orders.length > 0 ? Math.max(...orders.map((o) => o.orderNumber)) + 1 : 1001;
    const newOrder: Order = {
      id: `ORD-${newOrderNumber}`,
      orderNumber: newOrderNumber,
      tableId,
      waiterName: currentUser?.name || 'Staff',
      status: 'active',
      createdAt: new Date().toISOString(),
      items: [],
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Update table status to occupied
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'occupied',
              activeOrderId: newOrder.id,
              occupiedSince: new Date().toISOString(),
            }
          : t
      )
    );

    return newOrder;
  };

  // Add Item to Table's active order
  const addItemToOrder = (tableId: number, menuItem: MenuItem, notes?: string) => {
    let targetOrder = orders.find((o) => o.tableId === tableId && o.status === 'active');
    if (!targetOrder) {
      targetOrder = createOrGetOrderForTable(tableId);
    }

    setOrders((prevOrders) =>
      prevOrders.map((ord) => {
        if (ord.id !== targetOrder!.id) return ord;

        // Check if item with same ID and notes already exists
        const existingItemIndex = ord.items.findIndex(
          (i) => i.menuItemId === menuItem.id && (i.notes || '') === (notes || '')
        );

        let updatedItems: OrderItem[];
        if (existingItemIndex >= 0) {
          updatedItems = ord.items.map((item, idx) =>
            idx === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else {
          const newItem: OrderItem = {
            id: `oi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            menuItemId: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
            isVeg: menuItem.isVeg ?? true,
            notes: notes?.trim() || undefined,
            kotSentQuantity: 0,
          };
          updatedItems = [...ord.items, newItem];
        }

        return { ...ord, items: updatedItems };
      })
    );

    // Ensure table is occupied
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: t.status === 'billed' ? 'billed' : 'occupied',
              activeOrderId: targetOrder!.id,
              occupiedSince: t.occupiedSince || new Date().toISOString(),
            }
          : t
      )
    );
  };

  // Update item quantity
  const updateItemQuantity = (orderId: string, orderItemId: string, delta: number) => {
    setOrders((prevOrders) =>
      prevOrders.map((ord) => {
        if (ord.id !== orderId) return ord;

        const updatedItems = ord.items
          .map((item) => {
            if (item.id !== orderItemId) return item;
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          })
          .filter(Boolean) as OrderItem[];

        return { ...ord, items: updatedItems };
      })
    );
  };

  // Remove item completely
  const removeItemFromOrder = (orderId: string, orderItemId: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((ord) => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          items: ord.items.filter((item) => item.id !== orderItemId),
        };
      })
    );
  };

  // Send KOT to Kitchen
  const sendKOT = (orderId: string): { success: boolean; kotNumber?: number; message?: string } => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { success: false, message: 'Order not found' };

    // Find unsent items or delta quantities
    const itemsToCook: KOTItem[] = [];

    order.items.forEach((item) => {
      const unsent = item.quantity - item.kotSentQuantity;
      if (unsent > 0) {
        itemsToCook.push({
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: unsent,
          notes: item.notes,
          isVeg: item.isVeg,
        });
      }
    });

    if (itemsToCook.length === 0) {
      return { success: false, message: 'All items are already sent to the kitchen.' };
    }

    const nextKotNumber =
      kots.length > 0 ? Math.max(...kots.map((k) => k.kotNumber)) + 1 : 201;

    const newKOT: KOT = {
      id: `KOT-${nextKotNumber}`,
      kotNumber: nextKotNumber,
      orderId: order.id,
      tableId: order.tableId,
      waiterName: currentUser?.name || order.waiterName,
      status: 'new',
      createdAt: new Date().toISOString(),
      items: itemsToCook,
    };

    setKots((prev) => [newKOT, ...prev]);

    // Update kotSentQuantity on order items
    setOrders((prevOrders) =>
      prevOrders.map((ord) => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          items: ord.items.map((it) => ({
            ...it,
            kotSentQuantity: it.quantity,
          })),
        };
      })
    );

    return { success: true, kotNumber: nextKotNumber };
  };

  // Update KOT Status (New -> Preparing -> Ready -> Served)
  const updateKOTStatus = (kotId: string, status: KOTStatus) => {
    setKots((prev) =>
      prev.map((k) => (k.id === kotId ? { ...k, status } : k))
    );
  };

  // Generate Bill for an Order
  const generateBillForOrder = (
    orderId: string,
    discountType: 'percentage' | 'flat',
    discountValue: number
  ): Bill => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    const subtotal = order.items.reduce((sum, it) => sum + it.price * it.quantity, 0);

    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = Math.round(((subtotal * discountValue) / 100) * 100) / 100;
    } else {
      discountAmount = Math.min(discountValue, subtotal);
    }

    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const cgstAmount = Math.round(((taxableAmount * settings.cgstRate) / 100) * 100) / 100;
    const sgstAmount = Math.round(((taxableAmount * settings.sgstRate) / 100) * 100) / 100;
    const grandTotal = Math.round(taxableAmount + cgstAmount + sgstAmount);

    const billNumber = `INV-${new Date().getFullYear()}-${String(bills.length + 41).padStart(4, '0')}`;

    const newBill: Bill = {
      id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      billNumber,
      orderId: order.id,
      tableId: order.tableId,
      items: [...order.items],
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      cgstRate: settings.cgstRate,
      sgstRate: settings.sgstRate,
      cgstAmount,
      sgstAmount,
      grandTotal,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      paidAt: new Date().toISOString(),
      cashierName: currentUser?.name || 'Cashier',
    };

    // Cache synchronously in ref so settleBill can immediately look it up
    pendingBillsRef.current.set(newBill.id, newBill);

    return newBill;
  };

  // Settle Bill: Record transaction in Sales History, mark order as paid, and immediately free the table
  const settleBill = (
    billIdOrBill: string | Bill,
    paymentMethod: PaymentMethod = 'cash',
    cashReceived?: number,
    changeGiven?: number
  ): boolean => {
    let targetBill: Bill | undefined;

    if (typeof billIdOrBill === 'object' && billIdOrBill !== null) {
      targetBill = {
        ...billIdOrBill,
        paymentMethod: paymentMethod || billIdOrBill.paymentMethod || 'cash',
        paymentStatus: 'paid',
        cashReceived: cashReceived !== undefined ? cashReceived : billIdOrBill.cashReceived,
        changeGiven: changeGiven !== undefined ? changeGiven : billIdOrBill.changeGiven,
        paidAt: new Date().toISOString(),
        cashierName: currentUser?.name || billIdOrBill.cashierName || 'Cashier',
      };
    } else {
      const billId = String(billIdOrBill);
      const existing = bills.find((b) => b.id === billId) || pendingBillsRef.current.get(billId);

      if (existing) {
        targetBill = {
          ...existing,
          paymentMethod: paymentMethod || existing.paymentMethod || 'cash',
          paymentStatus: 'paid',
          cashReceived: cashReceived !== undefined ? cashReceived : existing.cashReceived,
          changeGiven: changeGiven !== undefined ? changeGiven : existing.changeGiven,
          paidAt: new Date().toISOString(),
          cashierName: currentUser?.name || existing.cashierName || 'Cashier',
        };
      } else {
        // Fallback: check if billId is an orderId
        const linkedOrder = orders.find((o) => o.id === billId);
        if (linkedOrder) {
          const subtotal = linkedOrder.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
          const cgstAmount = Math.round(((subtotal * settings.cgstRate) / 100) * 100) / 100;
          const sgstAmount = Math.round(((subtotal * settings.sgstRate) / 100) * 100) / 100;
          const grandTotal = Math.round(subtotal + cgstAmount + sgstAmount);
          targetBill = {
            id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            billNumber: `INV-${new Date().getFullYear()}-${String(bills.length + 41).padStart(4, '0')}`,
            orderId: linkedOrder.id,
            tableId: linkedOrder.tableId,
            items: [...linkedOrder.items],
            subtotal,
            discountType: 'percentage',
            discountValue: 0,
            discountAmount: 0,
            cgstRate: settings.cgstRate,
            sgstRate: settings.sgstRate,
            cgstAmount,
            sgstAmount,
            grandTotal,
            paymentMethod: paymentMethod || 'cash',
            paymentStatus: 'paid',
            paidAt: new Date().toISOString(),
            cashierName: currentUser?.name || 'Cashier',
            cashReceived,
            changeGiven,
          };
        } else {
          // Fallback: check if billId is a tableId
          const tableNum = Number(billId);
          if (!isNaN(tableNum)) {
            const table = tables.find((t) => t.id === tableNum);
            const orderForTable = orders.find(
              (o) => o.id === table?.activeOrderId || (o.tableId === tableNum && o.status !== 'paid')
            );
            if (orderForTable) {
              const subtotal = orderForTable.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
              const cgstAmount = Math.round(((subtotal * settings.cgstRate) / 100) * 100) / 100;
              const sgstAmount = Math.round(((subtotal * settings.sgstRate) / 100) * 100) / 100;
              const grandTotal = Math.round(subtotal + cgstAmount + sgstAmount);
              targetBill = {
                id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                billNumber: `INV-${new Date().getFullYear()}-${String(bills.length + 41).padStart(4, '0')}`,
                orderId: orderForTable.id,
                tableId: orderForTable.tableId,
                items: [...orderForTable.items],
                subtotal,
                discountType: 'percentage',
                discountValue: 0,
                discountAmount: 0,
                cgstRate: settings.cgstRate,
                sgstRate: settings.sgstRate,
                cgstAmount,
                sgstAmount,
                grandTotal,
                paymentMethod: paymentMethod || 'cash',
                paymentStatus: 'paid',
                paidAt: new Date().toISOString(),
                cashierName: currentUser?.name || 'Cashier',
                cashReceived,
                changeGiven,
              };
            }
          }
        }
      }
    }

    if (!targetBill) {
      return false;
    }

    const finalBill = targetBill;

    // 1. Record completed transaction in Bills (Sales History & Daily Ledger)
    setBills((prev) => {
      const idx = prev.findIndex((b) => b.id === finalBill.id);
      let updated: Bill[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = finalBill;
      } else {
        updated = [finalBill, ...prev];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    // 2. Mark the order as paid (retains in Sales History & Orders Management, but clears active status)
    setOrders((prev) => {
      const updated = prev.map((o) => {
        if (o.id === finalBill.orderId || (o.tableId === finalBill.tableId && o.status !== 'paid')) {
          return {
            ...o,
            status: 'paid' as const,
          };
        }
        return o;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    // 3. Immediately mark that table as EMPTY / AVAILABLE and clear active order references
    setTables((prev) => {
      const updated = prev.map((t) => {
        if (t.id === finalBill.tableId || t.activeOrderId === finalBill.orderId) {
          return {
            ...t,
            status: 'available' as TableStatus,
            activeOrderId: undefined,
            occupiedSince: undefined,
          };
        }
        return t;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    // 4. Persist to backend server
    fetch('/api/bills/settle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(finalBill),
    }).catch(() => {});

    return true;
  };

  // Settings
  const updateSettings = (newSettings: Partial<RestaurantSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Bluetooth Thermal Printer Methods
  const connectBluetoothPrinter = async () => {
    const res = await bluetoothPrinter.connect();
    if (res.success && res.deviceName) {
      updateSettings({ savedBluetoothDeviceName: res.deviceName });
    }
    return res;
  };

  const disconnectBluetoothPrinter = () => {
    bluetoothPrinter.disconnect();
  };

  const reconnectBluetoothPrinter = async () => {
    return bluetoothPrinter.reconnect();
  };

  const printBillThermal = async (
    bill: Bill,
    options?: { forceSystemPrint?: boolean }
  ): Promise<{ success: boolean; method: 'bluetooth' | 'system'; error?: string }> => {
    const isDirectBt =
      !options?.forceSystemPrint &&
      (settings.printerMode === 'bluetooth' ||
        (settings.printerMode !== 'system' && bluetoothPrinter.getStatus() === 'connected'));

    // Record print status in bills ledger
    setBills((prev) => {
      const updated = prev.map((b) =>
        b.id === bill.id
          ? {
              ...b,
              isPrinted: true,
              printedAt: new Date().toISOString(),
              printCount: (b.printCount || 0) + 1,
            }
          : b
      );
      try {
        localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    if (isDirectBt) {
      if (bluetoothPrinter.getStatus() !== 'connected') {
        return {
          success: false,
          method: 'bluetooth',
          error: 'Bluetooth printer is disconnected. Please connect printer or use System Print.',
        };
      }

      const bytes = generateBillReceiptBytes(
        bill,
        settings,
        settings.printerPaperWidth || '80mm',
        Boolean(bill.isPrinted)
      );

      const res = await bluetoothPrinter.printBytes(bytes);
      if (!res.success) {
        return { success: false, method: 'bluetooth', error: res.error };
      }
      return { success: true, method: 'bluetooth' };
    }

    // System Print (dispatches browser print for wired USB/Windows printer and opens preview)
    const currentTable = tables.find((t) => t.id === bill.tableId);
    const tableName = currentTable?.name || `Table #${bill.tableId}`;
    setBillToPrint(bill);
    const browserRes = await printBillViaBrowser(bill, settings, tableName, {
      paperWidth: settings.printerPaperWidth || '80mm',
      isReprint: Boolean(bill.isPrinted || (bill.printCount && bill.printCount > 1)),
    });
    return { success: browserRes.success, method: 'system', error: browserRes.error };
  };

  const printKOTThermal = async (
    kot: KOT,
    options?: { forceSystemPrint?: boolean; isReprint?: boolean }
  ): Promise<{ success: boolean; method: 'bluetooth' | 'system'; error?: string }> => {
    const currentTable = tables.find((t) => t.id === kot.tableId);
    const tableName = currentTable?.name || `Table #${kot.tableId}`;

    const isDirectBt =
      !options?.forceSystemPrint &&
      (settings.printerMode === 'bluetooth' ||
        (settings.printerMode !== 'system' && bluetoothPrinter.getStatus() === 'connected'));

    // Update KOT print tracking to prevent accidental duplicates
    setKots((prev) => {
      const updated = prev.map((k) =>
        k.id === kot.id
          ? {
              ...k,
              isPrinted: true,
              printedAt: new Date().toISOString(),
              printCount: (k.printCount || 0) + 1,
            }
          : k
      );
      try {
        localStorage.setItem(STORAGE_KEYS.KOTS, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    if (isDirectBt) {
      if (bluetoothPrinter.getStatus() !== 'connected') {
        return {
          success: false,
          method: 'bluetooth',
          error: 'Bluetooth printer is disconnected. Please connect printer or use System Print.',
        };
      }

      const bytes = generateKOTReceiptBytes(
        kot,
        settings,
        tableName,
        settings.printerPaperWidth || '80mm',
        options?.isReprint || Boolean(kot.isPrinted)
      );

      const res = await bluetoothPrinter.printBytes(bytes);
      if (!res.success) {
        return { success: false, method: 'bluetooth', error: res.error };
      }
      return { success: true, method: 'bluetooth' };
    }

    // System Print (dispatches browser print for wired USB/Windows printer and opens preview)
    setKotToPrint(kot);
    const browserRes = await printKOTViaBrowser(kot, settings, tableName, {
      paperWidth: settings.printerPaperWidth || '80mm',
      isReprint: options?.isReprint || Boolean(kot.isPrinted),
    });
    return { success: browserRes.success, method: 'system', error: browserRes.error };
  };

  const testPrintThermal = async (
    type: 'diagnostic' | 'bill' | 'kot'
  ): Promise<{ success: boolean; method: 'bluetooth' | 'system'; error?: string }> => {
    const isDirectBt =
      settings.printerMode === 'bluetooth' ||
      (settings.printerMode !== 'system' && bluetoothPrinter.getStatus() === 'connected');

    if (isDirectBt) {
      if (bluetoothPrinter.getStatus() !== 'connected') {
        return {
          success: false,
          method: 'bluetooth',
          error: 'Bluetooth printer is not connected. Click "Connect Bluetooth Printer" first.',
        };
      }

      let bytes: Uint8Array;
      if (type === 'diagnostic') {
        bytes = generateDiagnosticTestReceipt(
          settings,
          settings.printerPaperWidth || '80mm',
          `Web Bluetooth (BLE) [${bluetoothPrinter.getDeviceName() || 'Thermal Printer'}]`
        );
      } else if (type === 'bill') {
        bytes = generateSampleBillBytes(settings, settings.printerPaperWidth || '80mm');
      } else {
        bytes = generateSampleKOTBytes(settings, settings.printerPaperWidth || '80mm');
      }

      const res = await bluetoothPrinter.printBytes(bytes);
      if (!res.success) {
        return { success: false, method: 'bluetooth', error: res.error };
      }
      return { success: true, method: 'bluetooth' };
    }

    // For system print test (browser print to USB or default printer without altering real business data)
    if (type === 'bill') {
      const res = await printSampleBillViaBrowser(settings, {
        paperWidth: settings.printerPaperWidth || '80mm',
      });
      return { success: res.success, method: 'system', error: res.error };
    } else if (type === 'kot') {
      const res = await printSampleKOTViaBrowser(settings, {
        paperWidth: settings.printerPaperWidth || '80mm',
      });
      return { success: res.success, method: 'system', error: res.error };
    } else {
      // Diagnostic test receipt via browser print
      const sampleBill: Bill = {
        id: `test-diag-${Date.now()}`,
        billNumber: 'TEST-DIAGNOSTIC',
        orderId: 'ORD-DIAG',
        tableId: 0,
        items: [
          { id: 'd1', menuItemId: 'd1', name: 'Windows Thermal Driver Alignment Test', price: 0, quantity: 1, isVeg: true, kotSentQuantity: 1 },
          { id: 'd2', menuItemId: 'd2', name: 'Thermal Font Test 58mm/80mm 123', price: 0, quantity: 1, isVeg: true, kotSentQuantity: 1 },
        ],
        subtotal: 0,
        discountType: 'flat',
        discountValue: 0,
        discountAmount: 0,
        cgstRate: 0,
        sgstRate: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        grandTotal: 0,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        paidAt: new Date().toISOString(),
        cashierName: 'Diagnostic Check',
        isPrinted: true,
      };
      const res = await printBillViaBrowser(sampleBill, settings, 'Test Station', {
        paperWidth: settings.printerPaperWidth || '80mm',
      });
      return { success: res.success, method: 'system', error: res.error };
    }
  };

  // Menu items management (ONLY Owner can modify menu items, prices, and categories)
  const toggleMenuItemAvailability = (menuItemId: string) => {
    if (currentUser?.role !== 'owner') return;
    setMenuItems((prev) =>
      prev.map((m) => (m.id === menuItemId ? { ...m, isAvailable: !m.isAvailable } : m))
    );
  };

  const addMenuItem = (
    item: Omit<MenuItem, 'id'>
  ): { success: boolean; message?: string; item?: MenuItem } => {
    if (currentUser?.role !== 'owner') {
      return { success: false, message: 'Permission Denied: ONLY the Owner can add menu items.' };
    }
    if (!item.name || !item.name.trim()) {
      return { success: false, message: 'Item name is required.' };
    }
    if (typeof item.price !== 'number' || isNaN(item.price) || item.price < 0) {
      return { success: false, message: 'Valid price in INR (₹) is required.' };
    }
    if (!item.section || !item.section.trim()) {
      return { success: false, message: 'Section is required (e.g. Food, Beverages).' };
    }
    if (!item.subcategory || !item.subcategory.trim()) {
      return { success: false, message: 'Subcategory is required.' };
    }

    const newItem: MenuItem = {
      ...item,
      id: `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      section: item.section.trim(),
      subcategory: item.subcategory.trim(),
      category: item.category || item.subcategory.trim(),
      name: item.name.trim(),
      price: Number(item.price),
      isAvailable: typeof item.isAvailable === 'boolean' ? item.isAvailable : true,
      availabilityTiming: item.availabilityTiming || { enabled: false, label: 'All Day' },
      isVeg: typeof item.isVeg === 'boolean' ? item.isVeg : true,
      description: item.description?.trim() || '',
    };

    setMenuItems((prev) => [...prev, newItem]);
    return { success: true, item: newItem };
  };

  const editMenuItem = (
    menuItemId: string,
    updates: Partial<MenuItem>
  ): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'owner') {
      return { success: false, message: 'Permission Denied: ONLY the Owner can edit menu items or categories.' };
    }
    const existing = menuItems.find((m) => m.id === menuItemId);
    if (!existing) {
      return { success: false, message: 'Menu item not found.' };
    }
    if (updates.name !== undefined && !updates.name.trim()) {
      return { success: false, message: 'Item name cannot be empty.' };
    }
    if (updates.price !== undefined && (isNaN(updates.price) || updates.price < 0)) {
      return { success: false, message: 'Price must be a valid positive amount in ₹.' };
    }

    setMenuItems((prev) =>
      prev.map((m) => {
        if (m.id !== menuItemId) return m;
        const subcategory =
          updates.subcategory !== undefined ? updates.subcategory.trim() : m.subcategory;
        return {
          ...m,
          ...updates,
          section: updates.section !== undefined ? updates.section.trim() : m.section,
          subcategory,
          category: updates.category || subcategory,
          name: updates.name !== undefined ? updates.name.trim() : m.name,
          price: updates.price !== undefined ? Number(updates.price) : m.price,
        };
      })
    );
    return { success: true };
  };

  const updateMenuItemPrice = (
    menuItemId: string,
    newPrice: number
  ): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'owner') {
      return { success: false, message: 'Permission Denied: ONLY the Owner can change prices.' };
    }
    if (isNaN(newPrice) || newPrice < 0) {
      return { success: false, message: 'Price must be a valid positive amount in ₹.' };
    }
    return editMenuItem(menuItemId, { price: newPrice });
  };

  const deleteMenuItem = (menuItemId: string): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'owner') {
      return { success: false, message: 'Permission Denied: ONLY the Owner can delete menu items.' };
    }
    const existing = menuItems.find((m) => m.id === menuItemId);
    if (!existing) {
      return { success: false, message: 'Menu item not found.' };
    }
    setMenuItems((prev) => prev.filter((m) => m.id !== menuItemId));
    return { success: true };
  };

  // Category Management Methods (Owner ONLY)
  const addCategory = (categoryName: string): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'owner') {
      return { success: false, message: 'Permission Denied: ONLY the Owner can create categories.' };
    }
    const cleanName = categoryName.trim();
    if (!cleanName) {
      return { success: false, message: 'Category name cannot be empty.' };
    }
    if (cleanName.toLowerCase() === 'korma') {
      return { success: false, message: 'Do not create a new Korma category. Use Main Course & Gravies with subcategory Veg Main Course.' };
    }
    if (isNonVegText(cleanName)) {
      return { success: false, message: 'Non-Veg categories cannot be created in this pure vegetarian POS.' };
    }
    if (categories.some((c) => c.toLowerCase() === cleanName.toLowerCase())) {
      return { success: false, message: `Category "${cleanName}" already exists.` };
    }
    setCategories((prev) => [...prev, cleanName]);
    return { success: true };
  };

  const renameCategory = (
    oldName: string,
    newName: string
  ): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'owner') {
      return { success: false, message: 'Permission Denied: ONLY the Owner can rename categories.' };
    }
    const cleanNew = newName.trim();
    if (!cleanNew) {
      return { success: false, message: 'New category name cannot be empty.' };
    }
    if (isNonVegText(cleanNew)) {
      return { success: false, message: 'Cannot rename to a Non-Veg category.' };
    }
    if (cleanNew.toLowerCase() === oldName.toLowerCase()) {
      return { success: true };
    }
    if (categories.some((c) => c.toLowerCase() === cleanNew.toLowerCase())) {
      return { success: false, message: `Category "${cleanNew}" already exists.` };
    }

    setCategories((prev) => prev.map((c) => (c === oldName ? cleanNew : c)));
    setSubcategories((prev) =>
      prev.map((s) => (s.category === oldName ? { ...s, category: cleanNew } : s))
    );
    // Cascade update to all menu items using this category
    setMenuItems((prev) =>
      prev.map((item) => {
        const itemCat = item.category || item.subcategory;
        if (itemCat === oldName || item.subcategory === oldName) {
          return {
            ...item,
            category: item.category === oldName ? cleanNew : item.category,
            subcategory: item.subcategory === oldName ? cleanNew : item.subcategory,
          };
        }
        return item;
      })
    );
    return { success: true };
  };

  const deleteCategory = (
    categoryName: string,
    actionOrReassignTo?: 'delete_items' | 'move_items' | string,
    targetCategory?: string,
    targetSubcategory?: string
  ): { success: boolean; message?: string } => {
    const isOwnerOrAdmin = currentUser?.role === 'owner' || (currentUser as any)?.role === 'admin';
    if (!isOwnerOrAdmin) {
      return { success: false, message: 'Permission Denied: Only the Owner/Admin role can delete a Category.' };
    }
    if (categories.length <= 1) {
      return { success: false, message: 'Cannot delete the only remaining category.' };
    }

    setCategories((prev) => prev.filter((c) => c !== categoryName));
    setSubcategories((prev) => prev.filter((s) => s.category !== categoryName));

    if (actionOrReassignTo === 'delete_items') {
      setMenuItems((prev) =>
        prev.filter((item) => {
          const itemCat = item.category || item.subcategory;
          return itemCat !== categoryName && item.subcategory !== categoryName;
        })
      );
    } else {
      const fallback =
        (actionOrReassignTo !== 'move_items' && actionOrReassignTo) ||
        targetCategory ||
        categories.find((c) => c !== categoryName) ||
        'General';
      const fallbackSub = targetSubcategory || fallback;

      // Cascade reassign menu items in this category
      setMenuItems((prev) =>
        prev.map((item) => {
          const itemCat = item.category || item.subcategory;
          if (itemCat === categoryName || item.subcategory === categoryName) {
            return {
              ...item,
              category: fallback,
              subcategory: item.subcategory === categoryName ? fallbackSub : item.subcategory,
            };
          }
          return item;
        })
      );
    }
    return { success: true };
  };

  const addSubcategory = (
    categoryName: string,
    subcategoryName: string
  ): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'owner') {
      return { success: false, message: 'Permission Denied: ONLY the Owner can add subcategories.' };
    }
    const cleanCat = categoryName.trim();
    const cleanSub = subcategoryName.trim();
    if (!cleanCat || !cleanSub) {
      return { success: false, message: 'Category and subcategory names are required.' };
    }
    if (isNonVegText(cleanSub) || isNonVegText(cleanCat)) {
      return { success: false, message: 'Non-Veg subcategories cannot be created in this pure vegetarian POS.' };
    }
    if (
      subcategories.some(
        (s) => s.category.toLowerCase() === cleanCat.toLowerCase() && s.name.toLowerCase() === cleanSub.toLowerCase()
      )
    ) {
      return { success: false, message: `Subcategory "${cleanSub}" already exists under "${cleanCat}".` };
    }
    const newSub: Subcategory = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: cleanSub,
      category: cleanCat,
    };
    setSubcategories((prev) => [...prev, newSub]);
    return { success: true };
  };

  const renameSubcategory = (
    categoryName: string,
    oldName: string,
    newName: string
  ): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'owner') {
      return { success: false, message: 'Permission Denied: ONLY the Owner can rename subcategories.' };
    }
    const cleanCat = categoryName.trim();
    const cleanOld = oldName.trim();
    const cleanNew = newName.trim();
    if (!cleanNew) {
      return { success: false, message: 'New subcategory name cannot be empty.' };
    }
    if (isNonVegText(cleanNew)) {
      return { success: false, message: 'Cannot rename to a Non-Veg subcategory.' };
    }
    if (cleanOld.toLowerCase() === cleanNew.toLowerCase()) {
      return { success: true };
    }
    if (
      subcategories.some(
        (s) => s.category.toLowerCase() === cleanCat.toLowerCase() && s.name.toLowerCase() === cleanNew.toLowerCase()
      )
    ) {
      return { success: false, message: `Subcategory "${cleanNew}" already exists under "${cleanCat}".` };
    }
    setSubcategories((prev) =>
      prev.map((s) =>
        s.category.toLowerCase() === cleanCat.toLowerCase() && s.name.toLowerCase() === cleanOld.toLowerCase()
          ? { ...s, name: cleanNew }
          : s
      )
    );
    // Cascade update to menu items
    setMenuItems((prev) =>
      prev.map((item) => {
        const itemCat = (item.category || item.subcategory || '').toLowerCase();
        const itemSub = (item.subcategory || '').toLowerCase();
        if (itemCat === cleanCat.toLowerCase() && itemSub === cleanOld.toLowerCase()) {
          return {
            ...item,
            subcategory: cleanNew,
          };
        }
        return item;
      })
    );
    return { success: true };
  };

  const deleteSubcategory = (
    categoryName: string,
    subcategoryName: string,
    action: 'delete_items' | 'move_items',
    targetCategory?: string,
    targetSubcategory?: string
  ): { success: boolean; message?: string } => {
    const isOwnerOrAdmin = currentUser?.role === 'owner' || (currentUser as any)?.role === 'admin';
    if (!isOwnerOrAdmin) {
      return { success: false, message: 'Permission Denied: Only the Owner/Admin role can delete a Subcategory.' };
    }
    const cleanCat = categoryName.trim();
    const cleanSub = subcategoryName.trim();

    setSubcategories((prev) =>
      prev.filter(
        (s) => !(s.category.toLowerCase() === cleanCat.toLowerCase() && s.name.toLowerCase() === cleanSub.toLowerCase())
      )
    );

    if (action === 'delete_items') {
      setMenuItems((prev) =>
        prev.filter(
          (item) =>
            !((item.category || item.subcategory || '').toLowerCase() === cleanCat.toLowerCase() &&
              (item.subcategory || '').toLowerCase() === cleanSub.toLowerCase())
        )
      );
    } else {
      const fallbackCat = targetCategory?.trim() || cleanCat;
      const fallbackSub = targetSubcategory?.trim() || fallbackCat;
      setMenuItems((prev) =>
        prev.map((item) => {
          if (
            (item.category || item.subcategory || '').toLowerCase() === cleanCat.toLowerCase() &&
            (item.subcategory || '').toLowerCase() === cleanSub.toLowerCase()
          ) {
            return {
              ...item,
              category: fallbackCat,
              subcategory: fallbackSub,
            };
          }
          return item;
        })
      );
    }
    return { success: true };
  };

  const moveMenuItems = (
    itemIds: string[],
    targetCategory: string,
    targetSubcategory?: string
  ): { success: boolean; count?: number; message?: string } => {
    if (currentUser?.role !== 'owner') {
      return { success: false, message: 'Permission Denied: ONLY the Owner can move items.' };
    }
    if (!itemIds || itemIds.length === 0) {
      return { success: false, message: 'No items selected.' };
    }
    const cleanCat = targetCategory.trim();
    const cleanSub = targetSubcategory ? targetSubcategory.trim() : cleanCat;
    const targetSet = new Set(itemIds);

    let count = 0;
    setMenuItems((prev) =>
      prev.map((item) => {
        if (targetSet.has(item.id)) {
          count++;
          return {
            ...item,
            category: cleanCat,
            subcategory: cleanSub,
          };
        }
        return item;
      })
    );
    return { success: true, count };
  };

  const loadMenuData = (items: any[]): { success: boolean; count?: number; message?: string } => {
    if (currentUser?.role !== 'owner') {
      return { success: false, message: 'Permission Denied: ONLY the Owner can load menu data.' };
    }
    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, message: 'Please provide a valid non-empty array of menu items.' };
    }
    try {
      const normalized = items.map((raw, idx) => {
        if (!raw.name) {
          throw new Error(`Item at position #${idx + 1} is missing an item name.`);
        }
        return normalizeMenuItem(raw);
      });
      setMenuItems(normalized);
      return { success: true, count: normalized.length };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to load menu data.' };
    }
  };

  const resetMenuData = () => {
    if (currentUser?.role !== 'owner') return;
    setMenuItems(INITIAL_MENU_ITEMS);
  };

  // Reset demo data
  const resetToDemoData = () => {
    setUsers(INITIAL_USERS);
    setTables(INITIAL_TABLES);
    setMenuItems(INITIAL_MENU_ITEMS);
    const defaultCats = [
      'Starters',
      'Chinese',
      'Beverages & Juices',
      'Main Course',
      'Breads',
      'Rice',
      'Desserts',
      'Beverages',
    ];
    const fromItems = INITIAL_MENU_ITEMS.map((m) => m.category || m.subcategory).filter(Boolean) as string[];
    setCategories(Array.from(new Set([...defaultCats, ...fromItems])));
    setSubcategories(deriveInitialSubcategories());
    setOrders(INITIAL_ORDERS);
    setKots(INITIAL_KOTS);
    setBills(INITIAL_BILLS);
    setSettings(INITIAL_SETTINGS);
    setActiveTableId(1);
    setActiveView('dashboard');
  };

  // Auto-verify and establish valid server session for authenticated user (e.g. Owner)
  useEffect(() => {
    let isMounted = true;
    const syncServerSession = async () => {
      try {
        const payload: any = {};
        if (authToken) payload.token = authToken;
        if (currentUser) {
          payload.userId = currentUser.id;
          payload.username = currentUser.username;
        }

        const res = await fetch('/api/auth/validate-or-refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.token && isMounted) {
            setAuthToken(data.token);
            try {
              localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
            } catch {}
          }
        }
      } catch {
        // Deferred if server starting
      }
    };

    syncServerSession();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, currentUser?.role]);

  return (
    <POSContext.Provider
      value={{
        currentUser,
        authToken,
        login,
        quickLogin,
        logout,
        deleteBill,
        activeView,
        setActiveView,
        hasPermission,
        users,
        addUser,
        editUser,
        toggleUserStatus,
        resetUserPassword,
        deleteUser,
        floors,
        addFloor,
        editFloor,
        tables,
        addTable,
        makeTableUnoccupied,
        menuItems,
        categories,
        subcategories,
        addCategory,
        renameCategory,
        deleteCategory,
        addSubcategory,
        renameSubcategory,
        deleteSubcategory,
        moveMenuItems,
        orders,
        kots,
        bills,
        settings,
        activeTableId,
        setActiveTableId,
        createOrGetOrderForTable,
        addItemToOrder,
        updateItemQuantity,
        removeItemFromOrder,
        sendKOT,
        updateKOTStatus,
        generateBillForOrder,
        settleBill,
        billToPrint,
        setBillToPrint,
        kotToPrint,
        setKotToPrint,
        printerStatus,
        printerDeviceName,
        printerError,
        connectBluetoothPrinter,
        disconnectBluetoothPrinter,
        reconnectBluetoothPrinter,
        printBillThermal,
        printKOTThermal,
        testPrintThermal,
        updateSettings,
        toggleMenuItemAvailability,
        addMenuItem,
        editMenuItem,
        updateMenuItemPrice,
        deleteMenuItem,
        loadMenuData,
        resetMenuData,
        resetToDemoData,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
