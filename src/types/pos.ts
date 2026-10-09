export type UserRole = 'owner' | 'manager' | 'cashier' | 'waiter' | 'kitchen';

export interface User {
  id: string;
  username: string;
  name: string;
  passwordHash: string;
  password?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export type TableStatus = 'available' | 'occupied' | 'billed';

export interface Floor {
  id: string;
  name: string;
  displayOrder?: number;
}

export interface Table {
  id: number;
  name: string;
  capacity: number;
  section: string; // Floor / section name e.g. 'Lower Hall', 'Upper Hall'
  floorId?: string;
  status: TableStatus;
  activeOrderId?: string;
  occupiedSince?: string;
}

export type MenuCategory = 'Starters' | 'Main Course' | 'Breads' | 'Rice' | 'Drinks' | string;

export interface Subcategory {
  id: string;
  name: string;
  category: string;
}

export interface MenuTimeSlot {
  startTime: string; // "11:00"
  endTime: string;   // "16:00"
  label?: string;
}

export interface MenuAvailabilityTiming {
  enabled: boolean;
  startTime?: string;
  endTime?: string;
  days?: string[];
  label?: string;
  timeSlots?: MenuTimeSlot[];
}

export interface MenuItem {
  id: string;
  section: string;
  subcategory: string;
  name: string;
  price: number;
  isAvailable: boolean;
  availabilityTiming?: MenuAvailabilityTiming;
  category?: MenuCategory;
  isVeg?: boolean;
  description?: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
  notes?: string;
  kotSentQuantity: number;
}

export type OrderStatus = 'active' | 'billed' | 'paid' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: number;
  tableId: number;
  waiterName: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  notes?: string;
}

export type KOTStatus = 'new' | 'preparing' | 'ready' | 'served';

export interface KOTItem {
  menuItemId: string;
  name: string;
  quantity: number;
  notes?: string;
  isVeg: boolean;
}

export interface KOT {
  id: string;
  kotNumber: number;
  orderId: string;
  tableId: number;
  waiterName: string;
  items: KOTItem[];
  status: KOTStatus;
  createdAt: string;
  isPrinted?: boolean;
  printedAt?: string;
  printCount?: number;
}

export type PaymentMethod = 'cash' | 'upi' | 'card';

export interface Bill {
  id: string;
  billNumber: string;
  orderId: string;
  tableId: number;
  items: OrderItem[];
  subtotal: number;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  discountAmount: number;
  cgstRate: number;
  sgstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'unpaid';
  paidAt: string;
  cashierName: string;
  cashReceived?: number;
  changeGiven?: number;
  isPrinted?: boolean;
  printedAt?: string;
  printCount?: number;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  voidReason?: string;
}

export type PrinterPaperWidth = '58mm' | '80mm';
export type PrinterMode = 'bluetooth' | 'system' | 'auto';
export type PrinterStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface RestaurantSettings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  gstin: string;
  fssai: string;
  cgstRate: number; // e.g. 2.5 for 2.5%
  sgstRate: number; // e.g. 2.5 for 2.5%
  upiId: string;
  printerPaperWidth?: PrinterPaperWidth;
  printerMode?: PrinterMode;
  savedBluetoothDeviceName?: string;
}
