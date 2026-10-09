import { Bill, KOT, RestaurantSettings } from '../types/pos';

export interface PrintReceiptOptions {
  paperWidth?: '80mm' | '58mm';
  isReprint?: boolean;
}

/**
 * Builds clean, professional thermal receipt HTML for a Kitchen Order Ticket (KOT).
 * Formatted specifically for 58mm or 80mm ESC/POS thermal printers via Windows browser print.
 */
export function buildKOTReceiptHtml(
  kot: KOT,
  settings: RestaurantSettings,
  tableName: string,
  options?: PrintReceiptOptions
): string {
  const paperWidth = options?.paperWidth || settings.printerPaperWidth || '80mm';
  const isReprint = options?.isReprint || Boolean(kot.isPrinted || (kot.printCount && kot.printCount > 0));

  const formattedDate = new Date(kot.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = new Date(kot.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const totalItemsCount = kot.items.reduce((sum, it) => sum + it.quantity, 0);

  const itemsHtml = kot.items
    .map(
      (item) => `
      <div class="item-row">
        <div class="item-header">
          <span class="item-name">${escapeHtml(item.name)}</span>
          <span class="item-qty">x${item.quantity}</span>
        </div>
        ${
          item.notes
            ? `<div class="item-notes">*** NOTE: ${escapeHtml(item.notes)} ***</div>`
            : ''
        }
      </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>KOT #${kot.kotNumber} - ${escapeHtml(tableName)}</title>
  <style>
    @page {
      size: ${paperWidth === '58mm' ? '58mm auto' : '80mm auto'};
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
      color: #000000;
      background: #ffffff;
      width: ${paperWidth === '58mm' ? '54mm' : '76mm'};
      max-width: ${paperWidth === '58mm' ? '54mm' : '76mm'};
      margin: 0 auto;
      padding: 3mm 1mm;
      font-size: ${paperWidth === '58mm' ? '11px' : '13px'};
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: 900; }
    .header {
      text-align: center;
      padding-bottom: 4px;
      border-bottom: 2px solid #000;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .header h1 {
      font-size: ${paperWidth === '58mm' ? '14px' : '16px'};
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      word-break: break-word;
    }
    .header .sub {
      font-size: ${paperWidth === '58mm' ? '10px' : '11px'};
      font-weight: 700;
      word-break: break-word;
    }
    .banner {
      margin: 4px 0;
      padding: 3px 0;
      background: #000;
      color: #fff;
      font-weight: 900;
      font-size: 11px;
      text-align: center;
      letter-spacing: 0.5px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .meta-box {
      padding: 4px 0;
      border-bottom: 2px dashed #000;
      font-size: ${paperWidth === '58mm' ? '10.5px' : '11.5px'};
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .table-title {
      font-size: ${paperWidth === '58mm' ? '16px' : '19px'};
      font-weight: 900;
    }
    .kot-num {
      font-size: ${paperWidth === '58mm' ? '13px' : '15px'};
      font-weight: 900;
      padding: 1px 4px;
      border: 1px solid #000;
    }
    .items-box {
      padding: 4px 0;
      border-bottom: 2px solid #000;
    }
    .items-head {
      display: flex;
      justify-content: space-between;
      font-weight: 900;
      font-size: ${paperWidth === '58mm' ? '10.5px' : '11.5px'};
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
      margin-bottom: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .item-row {
      padding: 3px 0;
      border-bottom: 1px dashed #777;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .item-row:last-child {
      border-bottom: none;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 4px;
    }
    .item-name {
      font-weight: 900;
      font-size: ${paperWidth === '58mm' ? '11px' : '12.5px'};
      flex: 1;
      padding-right: 4px;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .item-qty {
      font-weight: 900;
      font-size: ${paperWidth === '58mm' ? '13px' : '14.5px'};
      padding: 0 4px;
      border: 1px solid #000;
      white-space: nowrap;
    }
    .item-notes {
      font-size: ${paperWidth === '58mm' ? '9.5px' : '10.5px'};
      font-weight: 800;
      margin-top: 2px;
      padding: 2px 4px;
      background: #eee;
      border: 1px solid #999;
      word-break: break-word;
    }
    .footer {
      padding-top: 4px;
      text-align: center;
      font-size: ${paperWidth === '58mm' ? '9.5px' : '10.5px'};
      font-weight: 700;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .cut-line {
      margin-top: 8px;
      text-align: center;
      font-size: 10px;
      border-top: 1px dashed #999;
      padding-top: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>*** KITCHEN ORDER TICKET ***</h1>
    <div class="sub">${escapeHtml(settings.name || 'RESTAURANT POS')}</div>
  </div>

  ${isReprint ? '<div class="banner">*** DUPLICATE / REPRINT KOT ***</div>' : ''}

  <div class="meta-box">
    <div class="meta-row" style="align-items: center;">
      <span class="table-title">${escapeHtml(tableName.toUpperCase())}</span>
      <span class="kot-num">KOT #${kot.kotNumber}</span>
    </div>
    <div class="meta-row" style="margin-top: 3px;">
      <span>Order #: ${escapeHtml(String(kot.orderId))}</span>
      <span>Type: Dine-In</span>
    </div>
    <div class="meta-row">
      <span>Date: ${formattedDate}</span>
      <span>Time: ${formattedTime}</span>
    </div>
    <div class="meta-row">
      <span>Server: ${escapeHtml(kot.waiterName || 'Staff')}</span>
      <span>Items: ${totalItemsCount}</span>
    </div>
  </div>

  <div class="items-box">
    <div class="items-head">
      <span>ITEM NAME</span>
      <span>QTY</span>
    </div>
    ${itemsHtml}
  </div>

  <div class="footer">
    <div>Total Items: ${totalItemsCount}</div>
    <div style="margin-top: 2px;">KOT #${kot.kotNumber} · Status: ${kot.status.toUpperCase()}</div>
  </div>

  <div class="cut-line">- - - - - - - - - - - - - - - - - - - -</div>
</body>
</html>`;
}

/**
 * Builds clean, professional thermal receipt HTML for a Customer Bill / Tax Invoice.
 * Formatted specifically for 58mm or 80mm ESC/POS thermal printers via Windows browser print.
 */
export function buildBillReceiptHtml(
  bill: Bill,
  settings: RestaurantSettings,
  tableName: string,
  options?: PrintReceiptOptions
): string {
  const paperWidth = options?.paperWidth || settings.printerPaperWidth || '80mm';
  const isReprint =
    options?.isReprint ||
    Boolean(bill.isPrinted || (bill.printCount && bill.printCount > 1));

  const formattedDateTime = new Date(bill.paidAt || Date.now()).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const isPaid = bill.paymentStatus === 'paid';

  const itemsRows = bill.items
    .map((item) => {
      const lineTotal = item.price * item.quantity;
      return `
      <tr>
        <td class="col-item">
          ${escapeHtml(item.name)}
          ${item.notes ? `<div class="item-notes">(${escapeHtml(item.notes)})</div>` : ''}
        </td>
        <td class="col-qty text-center">${item.quantity}</td>
        <td class="col-rate text-right">₹${item.price.toFixed(2)}</td>
        <td class="col-total text-right">₹${lineTotal.toFixed(2)}</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Bill #${bill.billNumber} - ${escapeHtml(settings.name || 'Bill')}</title>
  <style>
    @page {
      size: ${paperWidth === '58mm' ? '58mm auto' : '80mm auto'};
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
      color: #000000;
      background: #ffffff;
      width: ${paperWidth === '58mm' ? '54mm' : '76mm'};
      max-width: ${paperWidth === '58mm' ? '54mm' : '76mm'};
      margin: 0 auto;
      padding: 2.5mm 1.5mm;
      font-size: ${paperWidth === '58mm' ? '10px' : '11px'};
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow-wrap: break-word;
      word-break: break-word;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .bold { font-weight: 900; }
    .header {
      text-align: center;
      padding-bottom: 4px;
      border-bottom: 1px dashed #000;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .header h1 {
      font-size: ${paperWidth === '58mm' ? '13px' : '15px'};
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      text-transform: uppercase;
      word-break: break-word;
    }
    .header .tagline {
      font-size: ${paperWidth === '58mm' ? '9px' : '10px'};
      font-weight: 600;
      margin-bottom: 2px;
      word-break: break-word;
    }
    .header .address {
      font-size: ${paperWidth === '58mm' ? '8.5px' : '9.5px'};
      line-height: 1.25;
      margin-bottom: 2px;
      word-break: break-word;
    }
    .header .tax-info {
      font-size: ${paperWidth === '58mm' ? '9px' : '10px'};
      font-weight: 700;
      margin-top: 2px;
      word-break: break-word;
    }
    .banner {
      margin: 3px 0;
      padding: 2.5px 0;
      background: #000;
      color: #fff;
      font-weight: 900;
      font-size: 10px;
      text-align: center;
      letter-spacing: 0.5px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .meta-box {
      padding: 3.5px 0;
      border-bottom: 1px dashed #000;
      font-size: ${paperWidth === '58mm' ? '9.5px' : '10.5px'};
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1.5px;
      gap: 4px;
    }
    table.items-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      margin: 3px 0;
      border-bottom: 1px dashed #000;
      font-size: ${paperWidth === '58mm' ? '9.5px' : '11px'};
    }
    table.items-table th {
      border-bottom: 1px solid #000;
      padding: 3px 1px;
      font-weight: 900;
      text-transform: uppercase;
    }
    table.items-table td {
      padding: 2.5px 1px;
      vertical-align: top;
    }
    table.items-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .col-item {
      width: ${paperWidth === '58mm' ? '46%' : '48%'};
      font-weight: 700;
      word-break: break-word;
      overflow-wrap: break-word;
      white-space: normal;
      line-height: 1.25;
      padding-right: 3px;
    }
    .col-qty {
      width: 14%;
      font-weight: 800;
      white-space: nowrap;
      text-align: center;
    }
    .col-rate {
      width: 18%;
      white-space: nowrap;
      text-align: right;
    }
    .col-total {
      width: 20%;
      font-weight: 800;
      white-space: nowrap;
      text-align: right;
    }
    .item-notes {
      font-size: 9px;
      font-weight: normal;
      color: #333;
      margin-top: 1px;
      word-break: break-word;
    }
    .totals-box {
      padding: 3.5px 0;
      border-bottom: 1px dashed #000;
      font-size: ${paperWidth === '58mm' ? '9.5px' : '11px'};
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1.5px;
      gap: 4px;
    }
    .grand-total-row {
      display: flex;
      justify-content: space-between;
      margin-top: 3px;
      padding-top: 3px;
      border-top: 1.5px solid #000;
      font-size: ${paperWidth === '58mm' ? '12px' : '14px'};
      font-weight: 900;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .payment-box {
      padding: 3.5px 0;
      border-bottom: 1px dashed #000;
      font-size: ${paperWidth === '58mm' ? '9.5px' : '10.5px'};
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .status-badge {
      display: inline-block;
      padding: 0.5px 3.5px;
      font-weight: 900;
      border: 1px solid #000;
    }
    .footer {
      padding-top: 5px;
      text-align: center;
      font-size: ${paperWidth === '58mm' ? '8.5px' : '9.5px'};
      line-height: 1.3;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .cut-line {
      margin-top: 6px;
      text-align: center;
      font-size: 9px;
      border-top: 1px dashed #999;
      padding-top: 3px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(settings.name || 'PRIMECENTURY RESTAURANT & CAFE')}</h1>
    ${settings.tagline ? `<div class="tagline">${escapeHtml(settings.tagline)}</div>` : ''}
    <div class="address">${escapeHtml(settings.address || '')}</div>
    ${settings.phone ? `<div class="address">Ph: ${escapeHtml(settings.phone)}</div>` : ''}
    <div class="tax-info">
      ${settings.gstin ? `GSTIN: ${escapeHtml(settings.gstin)}` : ''}
      ${settings.gstin && settings.fssai ? ' · ' : ''}
      ${settings.fssai ? `FSSAI: ${escapeHtml(settings.fssai)}` : ''}
    </div>
  </div>

  ${isReprint ? '<div class="banner">*** DUPLICATE / REPRINT RECEIPT ***</div>' : ''}

  <div class="meta-box">
    <div class="meta-row">
      <span><strong>Bill No:</strong> ${escapeHtml(bill.billNumber)}</span>
      <span><strong>Table:</strong> ${escapeHtml(tableName)}</span>
    </div>
    <div class="meta-row">
      <span><strong>Date:</strong> ${formattedDateTime}</span>
      <span><strong>Cashier:</strong> ${escapeHtml(bill.cashierName || 'Cashier')}</span>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th class="text-left">Item</th>
        <th class="text-center">Qty</th>
        <th class="text-right">Rate</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="totals-box">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span class="bold">₹${bill.subtotal.toFixed(2)}</span>
    </div>

    ${
      bill.discountAmount && bill.discountAmount > 0
        ? `<div class="totals-row">
            <span>Discount (${bill.discountType === 'percentage' ? `${bill.discountValue}%` : 'Flat'}):</span>
            <span>-₹${bill.discountAmount.toFixed(2)}</span>
          </div>`
        : ''
    }

    ${
      bill.cgstAmount && bill.cgstAmount > 0
        ? `<div class="totals-row">
            <span>CGST (${bill.cgstRate}%):</span>
            <span>₹${bill.cgstAmount.toFixed(2)}</span>
          </div>`
        : ''
    }

    ${
      bill.sgstAmount && bill.sgstAmount > 0
        ? `<div class="totals-row">
            <span>SGST (${bill.sgstRate}%):</span>
            <span>₹${bill.sgstAmount.toFixed(2)}</span>
          </div>`
        : ''
    }

    <div class="grand-total-row">
      <span>GRAND TOTAL:</span>
      <span>₹${bill.grandTotal.toFixed(2)}</span>
    </div>
  </div>

  <div class="payment-box">
    <div class="meta-row">
      <span>Payment Mode: <strong>${escapeHtml(bill.paymentMethod.toUpperCase())}</strong></span>
      <span>Status: <span class="status-badge">${isPaid ? 'PAID' : 'UNPAID / ESTIMATE'}</span></span>
    </div>
    ${
      bill.paymentMethod === 'cash' && bill.cashReceived
        ? `<div class="meta-row" style="margin-top: 2px;">
            <span>Cash Tendered: ₹${bill.cashReceived.toFixed(2)}</span>
            <span>Change Returned: ₹${(bill.changeGiven || 0).toFixed(2)}</span>
          </div>`
        : ''
    }
  </div>

  <div class="footer">
    <div class="bold">Thank you for dining with us!</div>
    <div>Have a wonderful day & visit again!</div>
    <div style="font-size: 8.5px; margin-top: 2px; color: #444;">Standard Computer Generated Tax Invoice</div>
  </div>

  <div class="cut-line">- - - - - - - - - - - - - - - - - - - -</div>
</body>
</html>`;
}

/**
 * Detects whether the web application is running inside an iframe (such as Google AI Studio Preview).
 */
export function isRunningInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // Cross-origin access denial confirms iframe
  }
}

/**
 * Opens the receipt HTML in an isolated top-level tab/window and invokes native print.
 * This is 100% immune to iframe sandbox restrictions (e.g. Google AI Studio preview sandbox).
 */
export function openReceiptInNewWindow(html: string, jobTitle = 'Receipt'): boolean {
  try {
    console.group(`[POS Printer] Pop-out Window Print for "${jobTitle}"`);
    console.info('[POS Printer] Opening clean top-level window for direct POS80 printing...');
    const printWindow = window.open('', '_blank', 'width=450,height=650,menubar=no,toolbar=no,location=no,status=no');
    if (!printWindow) {
      console.warn('[POS Printer] Pop-up window was blocked by the browser. Please allow popups for AI Studio preview.');
      console.groupEnd();
      return false;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Trigger print once document has loaded
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
        console.info('[POS Printer] Print dialog triggered successfully in new window.');
      } catch (e) {
        console.error('[POS Printer] Failed to trigger print in new window:', e);
      }
      console.groupEnd();
    }, 250);

    return true;
  } catch (err) {
    console.error('[POS Printer] Error opening print window:', err);
    console.groupEnd();
    return false;
  }
}

/**
 * Universal browser-based print executor.
 * Safely prints the supplied receipt HTML document using window.print() on the active window.
 *
 * Key fixes for Windows POS80 thermal printers & Google AI Studio Preview:
 * 1. Initiates window.print() synchronously on the main window document to preserve the user's click gesture.
 * 2. Injects the thermal content into a dedicated container (#pos-print-container) so only the thermal ticket
 *    is printed, hiding all website UI via @media print CSS.
 * 3. Detects if running inside an iframe and provides detailed diagnostic logging.
 * 4. Never targets hidden child iframes that Chromium sandboxes block.
 */
export async function executeBrowserPrint(
  html: string,
  jobTitle = 'Receipt'
): Promise<{ success: boolean; inIframe: boolean; error?: string }> {
  const inIframe = isRunningInIframe();

  console.group(`[POS Printer Diagnostic] Print Job: "${jobTitle}"`);
  console.info(`[POS Printer] Timestamp: ${new Date().toISOString()}`);
  console.info(`[POS Printer] Execution Environment: ${inIframe ? 'EMBEDDED IFRAME (AI Studio Preview)' : 'STANDALONE WINDOW / TAB'}`);
  console.info(`[POS Printer] Target Window: Main application window (${window.location.origin})`);
  console.info(`[POS Printer] Browser User Agent: ${navigator.userAgent}`);

  try {
    // 1. Locate or create the dedicated print container in the main document
    let printContainer = document.getElementById('pos-print-container');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'pos-print-container';
      document.body.appendChild(printContainer);
    }

    // Extract body innerHTML and paperWidth from the generated HTML
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : html;
    const is58mm = html.includes('58mm') || html.includes('54mm');
    printContainer.setAttribute('data-width', is58mm ? '58mm' : '80mm');
    printContainer.innerHTML = bodyContent;

    console.info(`[POS Printer] Thermal receipt layout injected into #pos-print-container (${is58mm ? '58mm' : '80mm'}).`);
    console.info('[POS Printer] Initiating window.print() directly from user gesture...');

    // 2. Invoke window.print() directly on the current window context
    window.focus();
    window.print();

    console.info(`[POS Printer] window.print() executed for "${jobTitle}".`);
    if (inIframe) {
      console.info(
        '[POS Printer] Note: If the Windows print dialog did not appear, Google AI Studio preview\'s iframe sandbox may restrict modal dialogs. Use "Open in New Tab" or test in a separate browser tab to print directly to your POS-80 printer.'
      );
    }
    console.groupEnd();

    // Clean up container content after printing dialog finishes
    window.addEventListener(
      'afterprint',
      () => {
        try {
          if (printContainer) {
            printContainer.innerHTML = '';
          }
        } catch {
          // ignore
        }
      },
      { once: true }
    );

    return { success: true, inIframe };
  } catch (error: any) {
    const errorMsg = error?.message || 'Print dialog could not be opened.';
    console.error('[POS Printer] Error executing window.print():', error);
    console.groupEnd();
    return { success: false, inIframe, error: errorMsg };
  }
}

/**
 * Print a KOT ticket via Windows Browser Print (wired USB or system printer).
 */
export async function printKOTViaBrowser(
  kot: KOT,
  settings: RestaurantSettings,
  tableName: string,
  options?: PrintReceiptOptions
): Promise<{ success: boolean; inIframe: boolean; error?: string }> {
  const html = buildKOTReceiptHtml(kot, settings, tableName, options);
  return executeBrowserPrint(html, `KOT #${kot.kotNumber} (${tableName})`);
}

/**
 * Print a Customer Bill via Windows Browser Print (wired USB or system printer).
 */
export async function printBillViaBrowser(
  bill: Bill,
  settings: RestaurantSettings,
  tableName: string,
  options?: PrintReceiptOptions
): Promise<{ success: boolean; inIframe: boolean; error?: string }> {
  const html = buildBillReceiptHtml(bill, settings, tableName, options);
  return executeBrowserPrint(html, `Bill #${bill.billNumber}`);
}

/**
 * Generate and print a safe sample KOT (Requirement 5 & 9).
 * Does not create real kitchen orders or alter order records.
 */
export async function printSampleKOTViaBrowser(
  settings: RestaurantSettings,
  options?: PrintReceiptOptions
): Promise<{ success: boolean; inIframe: boolean; error?: string }> {
  const sampleKOT: KOT = {
    id: `sample-kot-${Date.now()}`,
    kotNumber: 101,
    orderId: 'SAMPLE-ORD-101',
    tableId: 3,
    waiterName: 'Demo Server',
    status: 'new',
    createdAt: new Date().toISOString(),
    items: [
      { menuItemId: 'm1', name: 'Paneer Butter Masala (Sample)', quantity: 2, isVeg: true, notes: 'Less spicy / extra butter' },
      { menuItemId: 'm2', name: 'Garlic Naan (Sample)', quantity: 4, isVeg: true },
      { menuItemId: 'm3', name: 'Crispy Corn Salt & Pepper', quantity: 1, isVeg: true, notes: 'Very crispy' },
    ],
    isPrinted: false,
    printCount: 0,
  };

  return printKOTViaBrowser(sampleKOT, settings, 'Table 3 (Sample)', options);
}

/**
 * Generate and print a safe sample customer bill (Requirement 5 & 9).
 * Does not create real orders, touch daily sales, or mark anything as paid.
 */
export async function printSampleBillViaBrowser(
  settings: RestaurantSettings,
  options?: PrintReceiptOptions
): Promise<{ success: boolean; inIframe: boolean; error?: string }> {
  const cgstRate = settings.cgstRate || 2.5;
  const sgstRate = settings.sgstRate || 2.5;
  const subtotal = 780;
  const discountAmount = 0;
  const taxable = subtotal - discountAmount;
  const cgstAmount = Math.round(((taxable * cgstRate) / 100) * 100) / 100;
  const sgstAmount = Math.round(((taxable * sgstRate) / 100) * 100) / 100;
  const grandTotal = Math.round(taxable + cgstAmount + sgstAmount);

  const sampleBill: Bill = {
    id: `sample-bill-${Date.now()}`,
    billNumber: 'INV-SAMPLE-2026',
    orderId: 'SAMPLE-ORD-101',
    tableId: 3,
    items: [
      { id: 'sb-1', menuItemId: 'm1', name: 'Paneer Butter Masala (Sample)', price: 280, quantity: 2, isVeg: true, kotSentQuantity: 2 },
      { id: 'sb-2', menuItemId: 'm2', name: 'Garlic Naan (Sample)', price: 55, quantity: 4, isVeg: true, kotSentQuantity: 4 },
    ],
    subtotal,
    discountType: 'percentage',
    discountValue: 0,
    discountAmount: 0,
    cgstRate,
    sgstRate,
    cgstAmount,
    sgstAmount,
    grandTotal,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    paidAt: new Date().toISOString(),
    cashierName: 'POS Cashier Station',
    cashReceived: 1000,
    changeGiven: 1000 - grandTotal,
    isPrinted: false,
    printCount: 0,
  };

  return printBillViaBrowser(sampleBill, settings, 'Table 3 (Sample)', options);
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
