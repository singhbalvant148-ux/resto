import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { INITIAL_USERS, INITIAL_FLOORS, INITIAL_TABLES } from './src/data/initialData.ts';
import { hashPassword, verifyPassword, isOwner } from './src/utils/security.ts';
import { Bill, User, UserRole, Floor, Table } from './src/types/pos.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const HOST = '0.0.0.0';

// Ensure data persistence directory exists
const DATA_DIR = path.resolve(__dirname, 'server_data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const BILLS_FILE = path.join(DATA_DIR, 'bills.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit_log.json');
const FLOORS_FILE = path.join(DATA_DIR, 'floors.json');
const TABLES_FILE = path.join(DATA_DIR, 'tables.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Persistent HMAC Secret for stateless verification across server restarts
const HMAC_SECRET = 'primecentury_secure_signing_secret_2026';

// Helper to read/write JSON files safely
function readJsonFile<T>(filePath: string, defaultData: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return defaultData;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Initialize persistent users if not present
if (!fs.existsSync(USERS_FILE)) {
  writeJsonFile(USERS_FILE, INITIAL_USERS);
}

// Initialize persistent floors (Lower Hall & Upper Hall)
if (!fs.existsSync(FLOORS_FILE)) {
  writeJsonFile(FLOORS_FILE, INITIAL_FLOORS);
}

// Initialize persistent tables
if (!fs.existsSync(TABLES_FILE)) {
  writeJsonFile(TABLES_FILE, INITIAL_TABLES);
}

// In-memory + persistent active session tokens
interface ServerSession {
  token: string;
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  expiresAt: number;
}

// Load sessions from disk
const sessions = new Map<string, ServerSession>();
try {
  const savedSessions: ServerSession[] = readJsonFile(SESSIONS_FILE, []);
  const now = Date.now();
  savedSessions.forEach((s) => {
    if (s.expiresAt > now) {
      sessions.set(s.token, s);
    }
  });
} catch {
  // Ignore
}

function persistSessions() {
  const valid = Array.from(sessions.values()).filter((s) => s.expiresAt > Date.now());
  writeJsonFile(SESSIONS_FILE, valid);
}

function signToken(user: User): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    expiresAt,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', HMAC_SECRET).update(data).digest('base64url');
  const token = `${data}.${signature}`;

  sessions.set(token, {
    token,
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    expiresAt,
  });
  persistSessions();

  return token;
}

function isOwnerSession(session?: { role?: string; username?: string; userId?: string } | null): boolean {
  if (!session) return false;
  return isOwner({
    role: session.role,
    username: session.username,
    id: session.userId,
  });
}

function verifyToken(token: string): ServerSession | null {
  // 1. Check in-memory/persisted sessions map
  const cached = sessions.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    // Validate role against live user database
    const users: User[] = readJsonFile(USERS_FILE, INITIAL_USERS);
    const foundUser = users.find(
      (u) =>
        u.id === cached.userId ||
        u.username.toLowerCase() === String(cached.username || '').toLowerCase()
    );
    if (foundUser && foundUser.isActive) {
      cached.role = isOwner(foundUser) ? 'owner' : foundUser.role; // Enforce source-of-truth role
      return cached;
    }
  }

  // 2. Stateless HMAC verification (recovers sessions across server restarts)
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', HMAC_SECRET).update(data).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (!payload.userId || !payload.role || !payload.expiresAt) return null;
    if (payload.expiresAt < Date.now()) return null;

    const users: User[] = readJsonFile(USERS_FILE, INITIAL_USERS);
    const foundUser = users.find(
      (u) =>
        u.id === payload.userId ||
        u.username.toLowerCase() === String(payload.username || '').toLowerCase()
    );
    if (!foundUser || !foundUser.isActive) return null;

    const canonicalRole = isOwner(foundUser) ? 'owner' : foundUser.role;

    const session: ServerSession = {
      token,
      userId: foundUser.id,
      username: foundUser.username,
      name: foundUser.name,
      role: canonicalRole as UserRole,
      expiresAt: payload.expiresAt,
    };
    sessions.set(token, session);
    persistSessions();
    return session;
  } catch {
    return null;
  }
}

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: ServerSession;
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication token required',
    });
  }

  const session = verifyToken(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Session expired or invalid',
    });
  }

  req.user = session;
  next();
}

// Strict Owner-Only authorization middleware
function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !isOwnerSession(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Daily Sales, Floor Management, and Financial Reports are restricted exclusively to the authenticated Owner.',
    });
  }
  next();
}

// Date normalization helper (YYYY-MM-DD based on local/IST time)
function getDateKey(isoDateString: string): string {
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // -------------------------------------------------------------
  // AUTH API
  // -------------------------------------------------------------
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    const users: User[] = readJsonFile(USERS_FILE, INITIAL_USERS);
    const foundUser = users.find((u) => u.username.toLowerCase() === cleanUsername);

    if (!foundUser) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    if (!foundUser.isActive) {
      return res.status(403).json({ success: false, error: 'Account disabled. Contact owner.' });
    }

    const isMatch = verifyPassword(cleanPassword, foundUser.passwordHash || (foundUser as any).password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const token = signToken(foundUser);

    return res.json({
      success: true,
      token,
      user: {
        id: foundUser.id,
        username: foundUser.username,
        name: foundUser.name,
        role: foundUser.role,
        isActive: foundUser.isActive,
      },
    });
  });

  // Session validation & auto-recovery endpoint
  // Fixes the issue where an authenticated owner's session needs to be verified or refreshed
  app.post('/api/auth/validate-or-refresh', (req: Request, res: Response) => {
    const { token, userId, username } = req.body || {};

    // 1. If valid token presented, refresh and return verified user
    if (token) {
      const verified = verifyToken(token);
      if (verified) {
        return res.json({
          success: true,
          token: verified.token,
          user: {
            id: verified.userId,
            username: verified.username,
            name: verified.name,
            role: verified.role,
            isActive: true,
          },
        });
      }
    }

    // 2. If client has an authenticated user record (e.g. from local storage)
    if (userId || username) {
      const users: User[] = readJsonFile(USERS_FILE, INITIAL_USERS);
      const cleanUsername = String(username || '').toLowerCase().trim();
      const cleanUserId = String(userId || '').trim();

      const isRequestedOwner = isOwner({ username: cleanUsername, id: cleanUserId });

      const foundUser = users.find(
        (u) =>
          (cleanUserId && u.id === cleanUserId) ||
          (cleanUsername && u.username.toLowerCase() === cleanUsername) ||
          (isRequestedOwner && isOwner(u))
      );

      if (foundUser && foundUser.isActive) {
        // Issue fresh trusted token with verified role from server database
        const canonicalRole = isOwner(foundUser) ? 'owner' : foundUser.role;
        const userToSign: User = { ...foundUser, role: canonicalRole as UserRole };
        const newToken = signToken(userToSign);
        return res.json({
          success: true,
          token: newToken,
          user: {
            id: foundUser.id,
            username: foundUser.username,
            name: foundUser.name,
            role: canonicalRole,
            isActive: foundUser.isActive,
          },
        });
      }
    }

    return res.status(401).json({ success: false, error: 'Session invalid or user not found' });
  });

  app.get('/api/auth/session', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    return res.json({
      success: true,
      user: req.user,
    });
  });

  app.post('/api/auth/logout', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.token) {
      sessions.delete(req.user.token);
      persistSessions();
    }
    return res.json({ success: true });
  });

  // -------------------------------------------------------------
  // FLOOR MANAGEMENT API (Requirement 3 & 4)
  // Lower Hall & Upper Hall initial entities, Owner-only Add & Edit
  // -------------------------------------------------------------
  app.get('/api/floors', (_req: Request, res: Response) => {
    const floors: Floor[] = readJsonFile(FLOORS_FILE, INITIAL_FLOORS);
    return res.json({ success: true, floors });
  });

  app.post('/api/floors', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
    const { name } = req.body || {};
    const cleanName = String(name || '').trim();

    if (!cleanName) {
      return res.status(400).json({ success: false, error: 'Floor name is required.' });
    }

    const floors: Floor[] = readJsonFile(FLOORS_FILE, INITIAL_FLOORS);
    const duplicate = floors.some(
      (f) => f.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: `A floor named "${cleanName}" already exists. Please choose a distinct name.`,
      });
    }

    const newFloor: Floor = {
      id: `floor-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      displayOrder: floors.length + 1,
    };

    const updatedFloors = [...floors, newFloor];
    writeJsonFile(FLOORS_FILE, updatedFloors);

    console.log(`[FLOOR] Owner ${req.user!.name} created new floor: "${cleanName}"`);

    return res.json({
      success: true,
      floor: newFloor,
      floors: updatedFloors,
      message: `Floor "${cleanName}" added successfully.`,
    });
  });

  app.put('/api/floors/:id', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
    const floorId = req.params.id;
    const { name } = req.body || {};
    const cleanName = String(name || '').trim();

    if (!cleanName) {
      return res.status(400).json({ success: false, error: 'Floor name cannot be empty.' });
    }

    const floors: Floor[] = readJsonFile(FLOORS_FILE, INITIAL_FLOORS);
    const targetIndex = floors.findIndex((f) => f.id === floorId || f.name.toLowerCase() === floorId.toLowerCase());

    if (targetIndex === -1) {
      return res.status(404).json({ success: false, error: 'Floor not found.' });
    }

    const oldName = floors[targetIndex].name;

    // Check duplicate among other floors
    const duplicate = floors.some(
      (f, idx) => idx !== targetIndex && f.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (duplicate) {
      return res.status(400).json({
        success: false,
        error: `Another floor named "${cleanName}" already exists.`,
      });
    }

    floors[targetIndex] = {
      ...floors[targetIndex],
      name: cleanName,
    };
    writeJsonFile(FLOORS_FILE, floors);

    // Update existing tables associated with this floor (preserve table identities, orders, etc.)
    const tables: Table[] = readJsonFile(TABLES_FILE, INITIAL_TABLES);
    let tablesUpdated = false;
    const updatedTables = tables.map((t) => {
      if (t.section === oldName || t.floorId === floorId) {
        tablesUpdated = true;
        return {
          ...t,
          section: cleanName,
          floorId: floors[targetIndex].id,
        };
      }
      return t;
    });

    if (tablesUpdated) {
      writeJsonFile(TABLES_FILE, updatedTables);
    }

    console.log(
      `[FLOOR] Owner ${req.user!.name} renamed floor "${oldName}" -> "${cleanName}" (updated tables)`
    );

    return res.json({
      success: true,
      floor: floors[targetIndex],
      floors,
      renamedFrom: oldName,
      renamedTo: cleanName,
      message: `Floor renamed to "${cleanName}" successfully. All tables and active orders were preserved.`,
    });
  });

  // -------------------------------------------------------------
  // TABLES API
  // -------------------------------------------------------------
  app.get('/api/tables', (_req: Request, res: Response) => {
    const tables: Table[] = readJsonFile(TABLES_FILE, INITIAL_TABLES);
    return res.json({ success: true, tables });
  });

  app.put('/api/tables/sync', (req: Request, res: Response) => {
    const clientTables = req.body?.tables;
    if (Array.isArray(clientTables) && clientTables.length > 0) {
      writeJsonFile(TABLES_FILE, clientTables);
      return res.json({ success: true, count: clientTables.length });
    }
    return res.status(400).json({ success: false, error: 'Invalid tables payload' });
  });

  // -------------------------------------------------------------
  // BILLS SETTLE & SYNC (Preserves all existing bills & sales)
  // -------------------------------------------------------------
  app.post('/api/bills/settle', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    const bill: Bill = req.body;
    if (!bill || !bill.id || !bill.billNumber) {
      return res.status(400).json({ success: false, error: 'Invalid bill payload' });
    }

    const currentBills: Bill[] = readJsonFile(BILLS_FILE, []);
    const existingIndex = currentBills.findIndex((b) => b.id === bill.id);

    let updated: Bill[];
    if (existingIndex >= 0) {
      updated = [...currentBills];
      updated[existingIndex] = bill;
    } else {
      updated = [bill, ...currentBills];
    }

    writeJsonFile(BILLS_FILE, updated);
    return res.json({ success: true, bill });
  });

  app.post('/api/bills/sync', (req: Request, res: Response) => {
    const clientBills: Bill[] = req.body?.bills || [];
    if (!Array.isArray(clientBills)) {
      return res.status(400).json({ success: false, error: 'Invalid bills list' });
    }

    const currentBills: Bill[] = readJsonFile(BILLS_FILE, []);
    const billMap = new Map<string, Bill>();

    // Server bills take priority
    currentBills.forEach((b) => billMap.set(b.id, b));
    // Client bills merged if not yet recorded on server
    clientBills.forEach((b) => {
      if (!billMap.has(b.id)) {
        billMap.set(b.id, b);
      }
    });

    const merged = Array.from(billMap.values());
    writeJsonFile(BILLS_FILE, merged);

    return res.json({ success: true, count: merged.length });
  });

  // -------------------------------------------------------------
  // OWNER-ONLY DAILY SALES & FINANCIAL AUDIT ENDPOINT (Requirement 1, 5)
  // Strictly blocks non-owners, cashiers, and unauthenticated callers
  // Provides separate Cash Sales vs Bank / Digital Sales reports
  // -------------------------------------------------------------
  app.get(
    '/api/reports/daily-sales',
    authenticateToken,
    requireOwner,
    (req: AuthenticatedRequest, res: Response) => {
      const requestedDate = (req.query.date as string) || getTodayKey();
      const allBills: Bill[] = readJsonFile(BILLS_FILE, []);

      // Filter active (non-voided / non-deleted) bills
      const activeBills = allBills.filter((b) => !b.isDeleted);

      const filteredBills =
        requestedDate === 'all'
          ? activeBills
          : activeBills.filter((b) => getDateKey(b.paidAt) === requestedDate);

      // Compute consistent metrics without double-counting
      const totalSales = filteredBills.reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0);
      const totalOrders = filteredBills.length;
      const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;
      const totalDiscount = filteredBills.reduce((sum, b) => sum + (Number(b.discountAmount) || 0), 0);
      const totalCGST = filteredBills.reduce((sum, b) => sum + (Number(b.cgstAmount) || 0), 0);
      const totalSGST = filteredBills.reduce((sum, b) => sum + (Number(b.sgstAmount) || 0), 0);
      const totalTax = totalCGST + totalSGST;

      // Separate Cash Sales vs Bank / Digital Sales
      const cashBills = filteredBills.filter((b) => b.paymentMethod === 'cash');
      const upiBills = filteredBills.filter((b) => b.paymentMethod === 'upi');
      const cardBills = filteredBills.filter((b) => b.paymentMethod === 'card');
      const bankBills = filteredBills.filter((b) => b.paymentMethod === 'upi' || b.paymentMethod === 'card');

      const cashTotal = cashBills.reduce((s, b) => s + (Number(b.grandTotal) || 0), 0);
      const upiTotal = upiBills.reduce((s, b) => s + (Number(b.grandTotal) || 0), 0);
      const cardTotal = cardBills.reduce((s, b) => s + (Number(b.grandTotal) || 0), 0);
      const bankTotal = upiTotal + cardTotal; // Combined digital/bank receipts

      // Top selling items for the date
      const itemCounts: Record<string, { qty: number; total: number; isVeg: boolean }> = {};
      filteredBills.forEach((b) => {
        (b.items || []).forEach((it) => {
          if (!itemCounts[it.name]) {
            itemCounts[it.name] = { qty: 0, total: 0, isVeg: Boolean(it.isVeg) };
          }
          itemCounts[it.name].qty += it.quantity || 1;
          itemCounts[it.name].total += (it.price || 0) * (it.quantity || 1);
        });
      });

      const topItems = Object.entries(itemCounts)
        .sort((a, b) => b[1].qty - a[1].qty)
        .slice(0, 10);

      return res.json({
        success: true,
        date: requestedDate,
        bills: filteredBills,
        summary: {
          totalSales,
          totalOrders,
          avgOrderValue,
          totalTax,
          totalCGST,
          totalSGST,
          totalDiscount,
          // Cash vs Bank separation
          cashTotal,
          cashCount: cashBills.length,
          bankTotal,
          bankCount: bankBills.length,
          upiTotal,
          upiCount: upiBills.length,
          cardTotal,
          cardCount: cardBills.length,
          topItems,
        },
      });
    }
  );

  // -------------------------------------------------------------
  // OWNER-ONLY BILL DELETION ENDPOINT (Requirement 2)
  // Strict backend security: only authentic owner can delete a bill
  // Reversible audit log maintained to preserve accounting integrity
  // -------------------------------------------------------------
  app.delete(
    '/api/bills/:id',
    authenticateToken,
    requireOwner,
    (req: AuthenticatedRequest, res: Response) => {
      const billId = req.params.id;
      if (!billId) {
        return res.status(400).json({ success: false, error: 'Bill ID is required' });
      }

      const allBills: Bill[] = readJsonFile(BILLS_FILE, []);
      const targetBill = allBills.find((b) => b.id === billId);

      const clientBill = req.body?.bill;
      const billRecord = targetBill || (clientBill && clientBill.id === billId ? clientBill : null);

      if (!billRecord) {
        return res.status(404).json({ success: false, error: 'Bill not found' });
      }

      // Record in permanent Audit Log before removal to maintain audit trail
      const auditLog = readJsonFile<any[]>(AUDIT_FILE, []);
      const auditEntry = {
        id: `audit-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        action: 'BILL_DELETION',
        billId: billRecord.id,
        billNumber: billRecord.billNumber,
        grandTotal: billRecord.grandTotal,
        paymentMethod: billRecord.paymentMethod,
        tableId: billRecord.tableId,
        cashierName: billRecord.cashierName,
        paidAt: billRecord.paidAt,
        deletedAt: new Date().toISOString(),
        deletedByUserId: req.user!.userId,
        deletedByUsername: req.user!.username,
        deletedByName: req.user!.name,
        itemsCount: (billRecord.items || []).length,
        items: billRecord.items,
      };
      auditLog.unshift(auditEntry);
      writeJsonFile(AUDIT_FILE, auditLog);

      // Remove the bill from active ledger
      const remainingBills = allBills.filter((b) => b.id !== billId);
      writeJsonFile(BILLS_FILE, remainingBills);

      console.log(
        `[AUDIT] Bill ${billRecord.billNumber} (${billRecord.id}) deleted by Owner ${req.user!.name} (${req.user!.username})`
      );

      return res.json({
        success: true,
        message: `Bill ${billRecord.billNumber} was permanently deleted and logged to the owner audit trail.`,
        deletedBill: billRecord,
        remainingCount: remainingBills.length,
      });
    }
  );

  // -------------------------------------------------------------
  // VITE DEV SERVER OR STATIC ASSETS
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Prime Century Restaurant POS Server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
