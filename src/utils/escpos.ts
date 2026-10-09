import { Bill, KOT, RestaurantSettings, PrinterPaperWidth } from '../types/pos';

/**
 * Standard ESC/POS Command Constants
 */
const ESC = 0x1b;
const GS = 0x1d;

export class EscPosBuilder {
  private buffer: number[] = [];
  private cols: number;

  constructor(paperWidth: PrinterPaperWidth = '80mm') {
    this.cols = paperWidth === '58mm' ? 32 : 48;
    this.init();
  }

  // Initialize printer
  init(): this {
    this.buffer.push(ESC, 0x40); // ESC @ (Initialize)
    return this;
  }

  // Alignment: 'left' | 'center' | 'right'
  align(alignment: 'left' | 'center' | 'right'): this {
    const code = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0;
    this.buffer.push(ESC, 0x61, code); // ESC a n
    return this;
  }

  // Bold mode
  bold(enable: boolean = true): this {
    this.buffer.push(ESC, 0x45, enable ? 1 : 0); // ESC E n
    return this;
  }

  // Text size: 'normal' | 'double_h' | 'double_w' | 'large'
  size(sizeType: 'normal' | 'double_h' | 'double_w' | 'large'): this {
    let n = 0x00;
    if (sizeType === 'double_h') n = 0x01;
    else if (sizeType === 'double_w') n = 0x10;
    else if (sizeType === 'large') n = 0x11;
    this.buffer.push(GS, 0x21, n); // GS ! n
    return this;
  }

  // Underline
  underline(enable: boolean = true): this {
    this.buffer.push(ESC, 0x2d, enable ? 1 : 0);
    return this;
  }

  // Inverted (white text on black)
  invert(enable: boolean = true): this {
    this.buffer.push(GS, 0x42, enable ? 1 : 0);
    return this;
  }

  // Feed n lines
  feed(lines: number = 1): this {
    this.buffer.push(ESC, 0x64, lines); // ESC d n
    return this;
  }

  // Partial cut / full cut
  cut(): this {
    this.feed(3);
    this.buffer.push(GS, 0x56, 66, 0); // GS V 66 0 (Feed and cut)
    return this;
  }

  // Print text line with CRLF
  line(text: string = ''): this {
    const encoded = this.encodeText(text);
    this.buffer.push(...encoded);
    this.buffer.push(0x0a); // LF
    return this;
  }

  // Print raw text without newline
  text(text: string): this {
    const encoded = this.encodeText(text);
    this.buffer.push(...encoded);
    return this;
  }

  // Horizontal divider line
  divider(char: string = '-'): this {
    const line = char.repeat(this.cols);
    return this.line(line);
  }

  // Double divider line
  doubleDivider(): this {
    return this.divider('=');
  }

  // Two columns left and right justified
  row(left: string, right: string): this {
    const space = this.cols - left.length - right.length;
    if (space <= 0) {
      // If exceeds, truncate left slightly or print in sequence
      const maxLeft = Math.max(1, this.cols - right.length - 1);
      const truncatedLeft = left.substring(0, maxLeft);
      const filler = ' '.repeat(Math.max(1, this.cols - truncatedLeft.length - right.length));
      return this.line(`${truncatedLeft}${filler}${right}`);
    }
    const filler = ' '.repeat(space);
    return this.line(`${left}${filler}${right}`);
  }

  // Three column layout (Item, Qty, Total)
  itemRow(name: string, qty: number, totalText: string): this {
    const qtyStr = `x${qty}`;
    const totalStr = totalText;
    
    // Width allocation
    const rightWidth = totalStr.length + 1;
    const qtyWidth = Math.max(4, qtyStr.length + 1);
    const nameWidth = this.cols - rightWidth - qtyWidth;

    let truncatedName = name;
    if (truncatedName.length > nameWidth) {
      truncatedName = truncatedName.substring(0, nameWidth);
    }

    const namePadded = truncatedName.padEnd(nameWidth, ' ');
    const qtyPadded = qtyStr.padStart(qtyWidth, ' ');
    const totalPadded = totalStr.padStart(rightWidth, ' ');

    return this.line(`${namePadded}${qtyPadded}${totalPadded}`);
  }

  // Encode clean ASCII / Latin-1 string
  private encodeText(text: string): number[] {
    // Replace Rupee symbol with "Rs." for 100% printer compatibility
    const sanitized = text
      .replace(/₹/g, 'Rs.')
      .replace(/•/g, '-')
      .replace(/[^\x20-\x7E\n\r]/g, ' '); // keep printable ASCII

    const bytes: number[] = [];
    for (let i = 0; i < sanitized.length; i++) {
      bytes.push(sanitized.charCodeAt(i) & 0xff);
    }
    return bytes;
  }

  // Return Uint8Array
  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Generate ESC/POS Bytes for a Hardware Diagnostic Test Slip
 */
export function generateDiagnosticTestReceipt(
  settings: RestaurantSettings,
  paperWidth: PrinterPaperWidth = '80mm',
  connectionType: string = 'Web Bluetooth (BLE)'
): Uint8Array {
  const p = new EscPosBuilder(paperWidth);
  const now = new Date();

  p.align('center')
    .size('double_h')
    .bold(true)
    .line(settings.name || 'PRIMECENTURY RESTAURANT')
    .size('normal')
    .bold(false)
    .line('THERMAL PRINTER TEST PAGE')
    .line('================================')
    .align('left')
    .feed(1)
    .row('Printer Connection:', connectionType)
    .row('Paper Width Format:', paperWidth === '58mm' ? '58mm (32 Cols)' : '80mm (48 Cols)')
    .row('Timestamp:', now.toLocaleTimeString())
    .row('Date:', now.toLocaleDateString())
    .row('Status:', 'ONLINE & READY')
    .feed(1)
    .divider()
    .align('center')
    .bold(true)
    .line('CHARACTER & FONT VERIFICATION')
    .bold(false)
    .align('left')
    .line('Normal Text: 1234567890 ABCDEF abcdef')
    .bold(true)
    .line('Bold Text: 1234567890 ABCDEF abcdef')
    .bold(false)
    .underline(true)
    .line('Underlined Text Check')
    .underline(false)
    .feed(1)
    .divider()
    .align('center')
    .bold(true)
    .line('*** PRINTER HARDWARE TEST PASSED ***')
    .line('Ready for Bills & Kitchen KOT Tickets')
    .feed(2)
    .cut();

  return p.build();
}

/**
 * Generate ESC/POS Bytes for a Real or Sample Customer Bill
 */
export function generateBillReceiptBytes(
  bill: Bill,
  settings: RestaurantSettings,
  paperWidth: PrinterPaperWidth = '80mm',
  isReprint: boolean = false
): Uint8Array {
  const p = new EscPosBuilder(paperWidth);

  // 1. Restaurant Header
  p.align('center')
    .size('large')
    .bold(true)
    .line(settings.name || 'PRIMECENTURY RESTAURANT')
    .size('normal')
    .bold(false);

  if (settings.tagline) {
    p.line(settings.tagline);
  }
  if (settings.address) {
    p.line(settings.address);
  }
  if (settings.phone) {
    p.line(`Ph: ${settings.phone}`);
  }
  if (settings.gstin || settings.fssai) {
    p.line(`GSTIN: ${settings.gstin || 'N/A'} | FSSAI: ${settings.fssai || 'N/A'}`);
  }

  if (isReprint || (bill.printCount && bill.printCount > 1)) {
    p.feed(1)
      .invert(true)
      .bold(true)
      .line(' *** DUPLICATE / REPRINT RECEIPT *** ')
      .invert(false)
      .bold(false);
  }

  p.feed(1).doubleDivider();

  // 2. Meta Information
  p.align('left')
    .row('Bill No:', bill.billNumber)
    .row('Table:', `Table ${bill.tableId}`)
    .row('Cashier:', bill.cashierName || 'Cashier')
    .row(
      'Date & Time:',
      new Date(bill.paidAt || Date.now()).toLocaleString('en-IN', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    )
    .divider();

  // 3. Items Header
  p.bold(true);
  if (paperWidth === '58mm') {
    p.row('Item (Qty)', 'Amount');
  } else {
    p.row('Item Description            Qty', 'Amount');
  }
  p.bold(false).divider();

  // Items
  bill.items.forEach((item) => {
    const lineTotal = `Rs.${(item.price * item.quantity).toFixed(2)}`;
    p.itemRow(item.name, item.quantity, lineTotal);
    if (item.notes) {
      p.line(`  * Note: ${item.notes}`);
    }
  });

  p.divider();

  // 4. Financial Calculations
  p.row('Subtotal:', `Rs.${bill.subtotal.toFixed(2)}`);

  if (bill.discountAmount && bill.discountAmount > 0) {
    const discLabel =
      bill.discountType === 'percentage'
        ? `Discount (${bill.discountValue}%):`
        : 'Discount (Flat):';
    p.row(discLabel, `-Rs.${bill.discountAmount.toFixed(2)}`);
  }

  if (bill.cgstAmount > 0 || bill.sgstAmount > 0) {
    p.row(`CGST (${bill.cgstRate}%):`, `Rs.${bill.cgstAmount.toFixed(2)}`);
    p.row(`SGST (${bill.sgstRate}%):`, `Rs.${bill.sgstAmount.toFixed(2)}`);
  }

  p.doubleDivider()
    .size('double_h')
    .bold(true)
    .row('GRAND TOTAL:', `Rs.${bill.grandTotal.toFixed(2)}`)
    .size('normal')
    .bold(false)
    .doubleDivider();

  // 5. Payment details
  p.row('Payment Mode:', (bill.paymentMethod || 'cash').toUpperCase());
  p.row('Payment Status:', (bill.paymentStatus || 'paid').toUpperCase());

  if (bill.paymentMethod === 'cash' && bill.cashReceived) {
    p.row('Cash Received:', `Rs.${bill.cashReceived.toFixed(2)}`);
    p.row('Change Returned:', `Rs.${(bill.changeGiven || 0).toFixed(2)}`);
  }

  // 6. Footer greeting
  p.feed(1)
    .align('center')
    .bold(true)
    .line('Thank you for dining with us!')
    .bold(false)
    .line('Please visit again')
    .feed(2)
    .cut();

  return p.build();
}

/**
 * Generate ESC/POS Bytes for a Kitchen Order Ticket (KOT)
 */
export function generateKOTReceiptBytes(
  kot: KOT,
  settings: RestaurantSettings,
  tableName: string,
  paperWidth: PrinterPaperWidth = '80mm',
  isReprint: boolean = false
): Uint8Array {
  const p = new EscPosBuilder(paperWidth);
  const now = new Date(kot.createdAt || Date.now());

  p.align('center')
    .size('large')
    .bold(true)
    .line('*** KITCHEN ORDER TICKET ***')
    .size('normal')
    .bold(false)
    .line(settings.name || 'PRIMECENTURY RESTAURANT');

  if (isReprint || (kot.printCount && kot.printCount > 1)) {
    p.feed(1)
      .invert(true)
      .bold(true)
      .line(' *** DUPLICATE / REPRINT KOT *** ')
      .invert(false)
      .bold(false);
  }

  p.doubleDivider();

  // Table prominence for kitchen staff
  p.align('center')
    .size('large')
    .bold(true)
    .line(tableName.toUpperCase())
    .size('normal')
    .bold(false)
    .doubleDivider();

  // Meta
  p.align('left')
    .row('KOT Number:', `#${kot.kotNumber}`)
    .row('Order ID:', kot.orderId)
    .row('Order Type:', 'DINE-IN')
    .row('Waiter:', kot.waiterName || 'Staff')
    .row('Date:', now.toLocaleDateString())
    .row('Time:', now.toLocaleTimeString())
    .divider();

  // Items for kitchen
  p.align('left').bold(true);
  p.row('Kitchen Dish Item', 'Quantity');
  p.bold(false).divider();

  kot.items.forEach((item) => {
    p.size('double_h').bold(true);
    p.row(item.name, `x${item.quantity}`);
    p.size('normal').bold(false);

    if (item.notes) {
      p.bold(true);
      p.line(`  >>> INSTRUCTION: ${item.notes}`);
      p.bold(false);
    }
    p.feed(0);
  });

  p.doubleDivider()
    .align('center')
    .line(`Total Items: ${kot.items.reduce((sum, it) => sum + it.quantity, 0)}`)
    .feed(2)
    .cut();

  return p.build();
}

/**
 * Generate Sample Customer Bill Bytes for Safe Testing
 */
export function generateSampleBillBytes(
  settings: RestaurantSettings,
  paperWidth: PrinterPaperWidth = '80mm'
): Uint8Array {
  const sampleBill: Bill = {
    id: `sample-bill-${Date.now()}`,
    billNumber: 'INV-2026-TEST',
    orderId: 'ORD-SAMPLE-01',
    tableId: 5,
    items: [
      {
        id: 'si-1',
        menuItemId: 'm-1',
        name: 'Paneer Tikka (Test)',
        price: 260,
        quantity: 1,
        isVeg: true,
        kotSentQuantity: 1,
      },
      {
        id: 'si-2',
        menuItemId: 'm-7',
        name: 'Dal Makhani (Test)',
        price: 240,
        quantity: 2,
        isVeg: true,
        kotSentQuantity: 2,
      },
      {
        id: 'si-3',
        menuItemId: 'm-bread',
        name: 'Butter Naan (Test)',
        price: 45,
        quantity: 4,
        isVeg: true,
        kotSentQuantity: 4,
      },
    ],
    subtotal: 920,
    discountType: 'percentage',
    discountValue: 10,
    discountAmount: 92,
    cgstRate: settings.cgstRate || 2.5,
    sgstRate: settings.sgstRate || 2.5,
    cgstAmount: 20.7,
    sgstAmount: 20.7,
    grandTotal: 869,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    paidAt: new Date().toISOString(),
    cashierName: 'POS Test Station',
    cashReceived: 1000,
    changeGiven: 131,
    isPrinted: true,
    printCount: 1,
  };

  return generateBillReceiptBytes(sampleBill, settings, paperWidth, false);
}

/**
 * Generate Sample Kitchen KOT Bytes for Safe Testing
 */
export function generateSampleKOTBytes(
  settings: RestaurantSettings,
  paperWidth: PrinterPaperWidth = '80mm'
): Uint8Array {
  const sampleKOT: KOT = {
    id: `sample-kot-${Date.now()}`,
    kotNumber: 999,
    orderId: 'ORD-SAMPLE-01',
    tableId: 5,
    waiterName: 'Test Server',
    status: 'new',
    createdAt: new Date().toISOString(),
    items: [
      {
        menuItemId: 'm-1',
        name: 'Paneer Tikka (Test)',
        quantity: 1,
        notes: 'Extra crispy, mild spice',
        isVeg: true,
      },
      {
        menuItemId: 'm-7',
        name: 'Dal Makhani (Test)',
        quantity: 2,
        isVeg: true,
      },
      {
        menuItemId: 'm-bread',
        name: 'Butter Naan (Test)',
        quantity: 4,
        notes: 'Serve piping hot',
        isVeg: true,
      },
    ],
    isPrinted: true,
    printCount: 1,
  };

  return generateKOTReceiptBytes(sampleKOT, settings, 'Table 5 (Sample)', paperWidth, false);
}
