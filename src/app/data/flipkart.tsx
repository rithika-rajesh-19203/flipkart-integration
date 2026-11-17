import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * FLIPKART INTEGRATION — the prototype's one store.
 *
 *   1. eCommerce → Marketplace      the channel cards
 *   2. Flipkart → Set Up Now        the organisation's one store, named after it
 *   3. Flipkart Configuration       products, orders, modules, warehouses
 *   4. Connect Flipkart             the store's sync cards, configure, disconnect
 *   5. Sync History                 every run, filterable by status and type
 *   6. Sync Details                 the records behind a run's synced / failed count
 *
 * Every screen reads and writes here, so each step sees what the one before it did.
 */

/* ── Reference data ───────────────────────────────────────────────────────── */

export const ZOHO_LOCATIONS = [
  { value: 'blr-main', label: 'Bengaluru – Head Office' },
  { value: 'blr-wh2', label: 'Bengaluru – Hosur Road Warehouse' },
  { value: 'che-wh', label: 'Chennai – Ambattur Warehouse' },
  { value: 'mum-wh', label: 'Mumbai – Bhiwandi Warehouse' },
];

export const FLIPKART_LOCATIONS = [
  { id: 'LOC6f3c1a', name: 'Seller Warehouse – Bengaluru', kind: 'Seller fulfilled', suggested: 'blr-wh2' },
  { id: 'LOC92be04', name: 'Seller Warehouse – Chennai', kind: 'Seller fulfilled', suggested: 'che-wh' },
  { id: 'FBF-BLR-01', name: 'Flipkart Fulfilment Centre – Malur', kind: 'Flipkart fulfilled (FBF)', suggested: '' },
];

export const GSTINS = [
  { value: '29AAACR4849R1ZK', label: '29AAACR4849R1ZK — Karnataka' },
  { value: '33AAACR4849R1ZM', label: '33AAACR4849R1ZM — Tamil Nadu' },
  { value: '27AAACR4849R1ZO', label: '27AAACR4849R1ZO — Maharashtra' },
];

/* ── Sync types ───────────────────────────────────────────────────────────── */

/** What a sync run moved. One entry per Sync Type filter option. */
export type SyncType = 'items' | 'orders' | 'stock' | 'invoices' | 'shipments' | 'returns' | 'settlements';

export const SYNC_TYPES: Record<SyncType, {
  run: string;            // the run's name in the history table
  filter: string;         // the Sync Type filter option
  history: string;        // "<history> Sync History" — the page title from a card
  columns: [string, string, string];
}> = {
  items: { run: 'Item Fetch', filter: 'Items', history: 'Item', columns: ['Item Name', 'SKU / FSN', 'Status'] },
  orders: { run: 'Sales Order Fetch', filter: 'Sales Orders', history: 'Sales Order', columns: ['Sales Order#', 'Flipkart Order ID', 'Status'] },
  stock: { run: 'Stock Update', filter: 'Stock Adjusted', history: 'Stock', columns: ['Item Name', 'Location', 'Quantity Pushed'] },
  invoices: { run: 'Invoice Fetch', filter: 'Invoices', history: 'Invoice', columns: ['Invoice#', 'Flipkart Order ID', 'Status'] },
  shipments: { run: 'Shipment Status', filter: 'Shipment Status', history: 'Shipment', columns: ['Shipment#', 'Tracking ID', 'Status'] },
  returns: { run: 'Sales Return Fetch', filter: 'Sales Returns', history: 'Sales Return', columns: ['Sales Return#', 'Flipkart Return ID', 'Status'] },
  settlements: { run: 'Settlement Fetch', filter: 'Settlements', history: 'Settlement', columns: ['Payment#', 'Settlement ID', 'Amount'] },
};

/** The five cards on the store page, and which history each one opens. */
export type FlowKind = 'listings' | 'orders' | 'stock' | 'returns' | 'settlements';
export const FLOW_TYPE: Record<FlowKind, SyncType> = {
  listings: 'items', orders: 'orders', stock: 'stock', returns: 'returns', settlements: 'settlements',
};

/* ── Types ────────────────────────────────────────────────────────────────── */

/** The organisation. Flipkart allows one store per organisation, named after it. */
export const ORG_NAME = 'The Retail Store Inc';

/* ── Sales orders — Sales → Sales Orders ───────────────────────────────────── */

export interface SalesOrder {
  id: string;
  date: string;
  /** The sales order number, as Flipkart orders arrive with it. */
  number: string;
  /** The Flipkart order ID. */
  reference: string;
  customer: string;
  status: 'confirmed' | 'closed';
  invoiced: boolean;
  paid: boolean;
}

const SO_SEED: [string, string, 'confirmed' | 'closed'][] = [
  ['21/10/2026', '1114', 'confirmed'], ['21/10/2026', '1113', 'closed'], ['21/10/2026', '1111', 'closed'],
  ['21/10/2026', '1110', 'closed'], ['16/10/2026', '1109', 'closed'], ['14/10/2026', '1108', 'confirmed'],
  ['14/10/2026', '1107', 'confirmed'], ['13/10/2026', '1106', 'confirmed'], ['13/10/2026', '1105', 'confirmed'],
  ['13/10/2026', '1104', 'closed'], ['13/10/2026', '1103', 'confirmed'], ['24/09/2026', '1102', 'closed'],
  ['07/09/2026', '1097', 'closed'],
];
export const INITIAL_SALES_ORDERS: SalesOrder[] = SO_SEED.map(([date, number, status], i) => ({
  id: `so-${number}`, date, number,
  reference: `OD${String(4293817 + i * 7919).padStart(7, '0')}${String(100000000 + i * 37).slice(1)}`,
  customer: 'Flipkart Customer', status,
  //  Closed orders were invoiced and paid; confirmed ones are not invoiced yet —
  //  which is exactly what makes their shipments fail on Flipkart.
  invoiced: status === 'closed', paid: status === 'closed',
}));
export const NOT_INVOICED = 'Sales order is not invoiced. Flipkart accepts a shipment only after its sales order is invoiced.';

export interface FlipkartAccount {
  storeName: string;
  appId: string;
  sellerId: string;
  gstin: string;
  connectedOn: string;
}

export interface FlipkartConfig {
  locations: Record<string, string>;
  mapItemsBy: string;
  valuation: string;
  syncStock: boolean;
  bufferStock: string;
  fetchStockCounts: boolean;
  importMissing: boolean;
  importFrom: string;
  frequency: string;
  customerPref: 'single' | 'individual';
  syncSellerFulfilled: boolean;
  syncFbf: boolean;
  createInvoices: boolean;
  syncReturns: boolean;
  restockReturns: boolean;
  syncSettlements: boolean;
  depositTo: string;
  recordFees: boolean;
  taxExemption: string;
  syncImages: boolean;
  syncAllLocations: boolean;
  mapCustomersBy: string;
  remittedTaxes: boolean;
  syncPartialCancel: boolean;
  syncFullCancel: boolean;
  syncUpdatedOrders: boolean;
  sameOrderNumber: boolean;
  syncCreditNotes: boolean;
  sameInvoiceNumber: boolean;
}

export interface SyncedRecord { a: string; b: string; c: string }
export interface FailedRecord {
  reference: string;
  reason: string;
  /** Set once a later Push Shipments retried this record: how that went. */
  retry?: 'synced' | 'failed';
}

export interface SyncRun {
  id: string;
  at: Date;
  type: SyncType;
  interval: string;
  synced: SyncedRecord[];
  failed: FailedRecord[];
}

export interface FlipkartStore {
  id: string;
  account: FlipkartAccount;
  config: FlipkartConfig;
  /** Set once configuration is saved; until then the store is a draft. */
  active: boolean;
  running: Partial<Record<FlowKind, boolean>>;
  history: SyncRun[];
}

/* ── Formatting ───────────────────────────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
/** 12 Nov 2026 04:04 AM — the history table's format. */
export const fmtDateTime = (d: Date) => {
  const h = d.getHours() % 12 || 12;
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${pad(h)}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
};
/** 12 Nov 2026 04:04 — a card's "Last Sync". */
export const fmtShort = (d: Date) => `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* ── Record generators — believable rows for each sync type ─────────────── */

const PRODUCTS = [
  ['Ceramic Ribbed Plate', 'CRP-1001', 'PLTGH8Y2KZ'], ['Stoneware Mug – Teal', 'SWM-2210', 'MUGFZ7Q3XA'],
  ['Electric Kettle 1.5L', 'EK-1500', 'EKTGB9N4WD'], ['Bamboo Serving Tray', 'BST-0420', 'TRYHC2M8PL'],
  ['Cotton Table Runner', 'CTR-0090', 'RUNFJ5K1QS'], ['Glass Storage Jar 1L', 'GSJ-1000', 'JARGD3V6TE'],
  ['Cast Iron Skillet 10"', 'CIS-1010', 'SKLHB4X9RM'], ['Linen Napkin Set', 'LNS-0604', 'NAPFE8T2UY'],
];
const LOCS = ['Bengaluru – Hosur Road Warehouse', 'Chennai – Ambattur Warehouse'];
const FAIL_REASONS: Record<SyncType, string[]> = {
  items: ['SKU on the Flipkart listing matches more than one item in Zoho Inventory.', 'Listing has no SKU (Seller SKU ID) to map by.'],
  orders: ['Tax rate on the order is not configured for Karnataka (IGST 12%).', 'Item for SKU EK-1500 is inactive in Zoho Inventory.'],
  stock: ['Flipkart rejected the update: listing is blocked for QC.'],
  invoices: ['Sales order is not yet confirmed; the invoice will be created on the next sync.'],
  shipments: [NOT_INVOICED],
  returns: ['Original sales order was not synced, so the return cannot be matched.'],
  settlements: ['Settlement amount does not match the open invoice balance.'],
};

let seq = 1;
const nextNo = (prefix: string, base: number) => `${prefix}-${String(base + seq++).padStart(5, '0')}`;
const fkOrder = () => `OD${Math.floor(1e17 + Math.random() * 9e17)}`.slice(0, 20);

function synced(type: SyncType, n: number): SyncedRecord[] {
  return Array.from({ length: n }, (_, i) => {
    const p = PRODUCTS[i % PRODUCTS.length];
    switch (type) {
      case 'items': return { a: p[0], b: `${p[1]} / ${p[2]}`, c: 'Mapped' };
      case 'orders': return { a: nextNo('SO', 30), b: fkOrder(), c: 'Confirmed' };
      case 'stock': return { a: p[0], b: LOCS[i % 2], c: String(12 + ((i * 7) % 40)) };
      case 'invoices': return { a: nextNo('INV', 120), b: fkOrder(), c: 'Sent' };
      case 'shipments': return { a: nextNo('SH', 10), b: `FMPP${Math.floor(1e9 + Math.random() * 9e9)}`, c: 'Delivered' };
      case 'returns': return { a: nextNo('RMA', 0), b: `R${Math.floor(1e11 + Math.random() * 9e11)}`, c: 'Received' };
      default: return { a: nextNo('PAY', 200), b: `NEFT-FK-${Math.floor(1e6 + Math.random() * 9e6)}`, c: `₹${(18000 + i * 3450).toLocaleString('en-IN')}.00` };
    }
  });
}
const UNINVOICED = SO_SEED.filter(([, , st]) => st === 'confirmed').map(([, n]) => n);
function failed(type: SyncType, n: number): FailedRecord[] {
  return Array.from({ length: n }, (_, i) => ({
    reference: type === 'items' || type === 'stock' ? PRODUCTS[(i + 3) % PRODUCTS.length][1]
      : type === 'shipments' ? UNINVOICED[i % UNINVOICED.length] : fkOrder(),
    reason: FAIL_REASONS[type][i % FAIL_REASONS[type].length],
  }));
}

let runSeq = 1;
function makeRun(type: SyncType, at: Date, ok: number, bad: number, from?: Date): SyncRun {
  const interval = type === 'stock' ? ''
    : from ? `${fmtDateTime(from)} - ${fmtDateTime(at)}` : `All your records till ${fmtDateTime(at)}`;
  return { id: `run-${runSeq++}`, at, type, interval, synced: synced(type, ok), failed: failed(type, bad) };
}

/** The initial sync a newly saved store runs — what "within 30 minutes" produced. */
function initialHistory(c: FlipkartConfig): SyncRun[] {
  const now = Date.now();
  const ago = (m: number) => new Date(now - m * 60000);
  const runs = [
    makeRun('items', ago(26), 12, 1),
    makeRun('stock', ago(24), 3, 0),
    makeRun('orders', ago(22), 4, 1),
    ...(c.createInvoices ? [makeRun('invoices', ago(22), 2, 1)] : []),
    makeRun('shipments', ago(20), 2, 1),
    ...(c.syncReturns ? [makeRun('returns', ago(18), 1, 0)] : []),
    makeRun('stock', ago(9), 1, 0),
    makeRun('stock', ago(6), 1, 0),
    makeRun('stock', ago(3), 2, 1),
  ];
  return runs.sort((x, y) => y.at.getTime() - x.at.getTime());
}

/* ── The store ────────────────────────────────────────────────────────────── */

export const DEFAULT_CONFIG: FlipkartConfig = {
  locations: Object.fromEntries(FLIPKART_LOCATIONS.filter((l) => l.suggested).map((l) => [l.id, l.suggested])),
  mapItemsBy: 'sku',
  valuation: 'fifo',
  syncStock: true,
  bufferStock: '0',
  fetchStockCounts: true,
  importMissing: true,
  importFrom: '',
  frequency: '1h',
  customerPref: 'single',
  syncSellerFulfilled: true,
  syncFbf: false,
  createInvoices: true,
  syncReturns: true,
  restockReturns: true,
  syncSettlements: false,
  depositTo: 'flipkart-clearing',
  recordFees: true,
  taxExemption: '',
  syncImages: true,
  syncAllLocations: false,
  mapCustomersBy: 'email-name',
  remittedTaxes: false,
  syncPartialCancel: true,
  syncFullCancel: true,
  syncUpdatedOrders: false,
  sameOrderNumber: false,
  syncCreditNotes: true,
  sameInvoiceNumber: false,
};

/** What a manual sync "finds", so the history has a new row to show. */
const MANUAL: Record<FlowKind, [number, number]> = {
  listings: [6, 0], orders: [3, 1], stock: [4, 0], returns: [1, 0], settlements: [2, 0],
};

interface Store {
  marketplacesEnabled: boolean;
  enableMarketplaces: () => void;
  stores: FlipkartStore[];
  activeStores: FlipkartStore[];
  find: (id: string) => FlipkartStore | undefined;
  /** Adds a draft store and returns its id. */
  connect: (a: Omit<FlipkartAccount, 'sellerId' | 'connectedOn'>) => string;
  saveConfig: (id: string, c: FlipkartConfig) => void;
  saveLocations: (id: string, locations: Record<string, string>) => void;
  disconnect: (id: string) => void;
  /** Drops a store that was never configured — Cancel on its first configuration. */
  discardDraft: (id: string) => void;
  syncNow: (id: string, kind: FlowKind) => void;
  salesOrders: SalesOrder[];
  /** Convert to Invoice — marks the orders invoiced. */
  invoiceOrders: (ids: string[]) => void;
  /**
   * Push Shipments — one Shipment Status run for the chosen orders. An invoiced
   * order's shipment syncs; an uninvoiced one fails with the reason. Earlier
   * failures for the same orders are marked with this push's outcome.
   */
  pushShipments: (storeId: string, ids: string[]) => { pushed: number; failed: number };
  lastSync: (s: FlipkartStore, type: SyncType) => Date | undefined;
}

const Ctx = createContext<Store | null>(null);

export function FlipkartProvider({ children }: { children: ReactNode }) {
  const [marketplacesEnabled, setEnabled] = useState(false);
  const [stores, setStores] = useState<FlipkartStore[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(INITIAL_SALES_ORDERS);

  const store = useMemo<Store>(() => {
    const patch = (id: string, fn: (s: FlipkartStore) => FlipkartStore) =>
      setStores((all) => all.map((s) => (s.id === id ? fn(s) : s)));
    return {
      marketplacesEnabled,
      enableMarketplaces: () => setEnabled(true),
      stores,
      activeStores: stores.filter((s) => s.active),
      find: (id) => stores.find((s) => s.id === id),
      connect: (a) => {
        const id = `fk-${Date.now()}`;
        const sellerId = Math.random().toString(16).slice(2, 18).padEnd(16, '0');
        setStores((all) => [...all, {
          id, active: false, running: {}, history: [],
          account: { ...a, sellerId, connectedOn: isoDay(new Date()) },
          config: { ...DEFAULT_CONFIG, importFrom: isoDay(new Date()) },
        }]);
        return id;
      },
      saveConfig: (id, c) => patch(id, (s) => ({
        ...s, config: c, active: true,
        history: s.active ? s.history : initialHistory(c),
      })),
      saveLocations: (id, locations) => patch(id, (s) => ({ ...s, config: { ...s.config, locations } })),
      disconnect: (id) => setStores((all) => all.filter((s) => s.id !== id)),
      discardDraft: (id) => setStores((all) => all.filter((s) => s.id !== id || s.active)),
      salesOrders,
      invoiceOrders: (ids) => setSalesOrders((all) => all.map((o) => (ids.includes(o.id) ? { ...o, invoiced: true } : o))),
      pushShipments: (storeId, ids) => {
        const orders = salesOrders.filter((o) => ids.includes(o.id));
        const ok = orders.filter((o) => o.invoiced);
        const bad = orders.filter((o) => !o.invoiced);
        const outcome = new Map(orders.map((o) => [o.number, o.invoiced ? 'synced' as const : 'failed' as const]));
        patch(storeId, (s) => {
          const history = s.history.map((r) => (r.type !== 'shipments' ? r : {
            ...r,
            failed: r.failed.map((f) => (!f.retry && outcome.has(f.reference) ? { ...f, retry: outcome.get(f.reference) } : f)),
          }));
          const at = new Date();
          const run: SyncRun = {
            id: `run-${runSeq++}`, at, type: 'shipments', interval: `Pushed from Sales Orders · ${orders.length} selected`,
            synced: ok.map(() => ({ a: nextNo('SH', 10), b: `FMPP${Math.floor(1e9 + Math.random() * 9e9)}`, c: 'Shipped' })),
            failed: bad.map((o) => ({ reference: o.number, reason: NOT_INVOICED })),
          };
          return { ...s, history: [run, ...history] };
        });
        return { pushed: ok.length, failed: bad.length };
      },
      syncNow: (id, kind) => {
        patch(id, (s) => ({ ...s, running: { ...s.running, [kind]: true } }));
        window.setTimeout(() => {
          patch(id, (s) => {
            const type = FLOW_TYPE[kind];
            const prev = s.history.find((r) => r.type === type)?.at;
            const [ok, bad] = MANUAL[kind];
            return {
              ...s,
              running: { ...s.running, [kind]: false },
              history: [makeRun(type, new Date(), ok, bad, prev), ...s.history],
            };
          });
        }, 1600);
      },
      lastSync: (s, type) => s.history.find((r) => r.type === type)?.at,
    };
  }, [marketplacesEnabled, stores, salesOrders]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useFlipkart() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useFlipkart outside FlipkartProvider');
  return s;
}
