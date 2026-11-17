import { useEffect, useState } from 'react';
import {
  AppShell, Banner, Icon, Nav, TopBar,
} from '@canon';
import type { NavNode } from '@canon';
import { GSTINS, ORG_NAME, useFlipkart } from '../data/flipkart';
import { FlipkartConfiguration } from './FlipkartConfiguration';
import { FlipkartOverview } from './FlipkartOverview';
import { MapWarehousesModal } from './LocationMapping';
import { Marketplace } from './Marketplace';
import { SalesOrders } from './SalesOrders';
import { SyncDetails } from './SyncDetails';
import { SyncHistory } from './SyncHistory';
import type { HistoryFilter } from './SyncHistory';

/**
 * FLIPKART INTEGRATION — the prototype's router.
 *
 *   marketplace     Settings → Integrations & Marketplace → eCommerce ("Marketplace")
 *   configure       Set Up Now → Flipkart Configuration → Save. One store per
 *                   organisation, named after it — so there is nothing to ask first.
 *   overview        Connect Flipkart — one store's sync cards, Configure, Disconnect
 *   history         Sync History — every run, by status and type (or one card's type)
 *   details         Established / Failed Sync Details — the records behind a count
 *   sales-orders    Sales → Sales Orders, in the Inventory shell. Tick orders,
 *                   ⋯ → Push Shipments to sync their shipments to Flipkart by hand.
 *
 * Settings lives in the light settings shell, as in the reference recording;
 * "Back to Inventory" and Close Settings lead to Sales Orders, and the bar's
 * settings gear leads back.
 * Anything outside the flow raises a "Not a part of this prototype" toast and
 * leaves the page where it was.
 */
type Route =
  | { page: 'marketplace' }
  | { page: 'configure'; storeId: string }
  | { page: 'overview'; storeId: string }
  | { page: 'history'; storeId: string }
  | { page: 'details'; storeId: string; runId: string; kind: 'synced' | 'failed' }
  | { page: 'sales-orders' };

const OUTSIDE = 'Not a part of this prototype';
const TOAST_MS = 2600;
const INVENTORY_MARK = <Icon name="inventory" size="xl" tone="inherit" />;

/** The Inventory app's rail — the rows the reference shows. */
const INVENTORY_NAV: NavNode[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'items', label: 'Items', icon: 'items', children: [{ id: 'all-items', label: 'Items' }] },
  { id: 'inventory', label: 'Inventory', icon: 'inventory', children: [{ id: 'adjustments', label: 'Inventory Adjustments' }] },
  {
    id: 'sales', label: 'Sales', icon: 'sales',
    children: [
      { id: 'customers', label: 'Customers' },
      { id: 'retainer-invoices', label: 'Retainer Invoices' },
      { id: 'sales-orders', label: 'Sales Orders' },
      { id: 'invoices', label: 'Invoices' },
      { id: 'sales-receipts', label: 'Sales Receipts' },
      { id: 'delivery-challans', label: 'Delivery Challans' },
      { id: 'payments-received', label: 'Payments Received' },
      { id: 'sales-returns', label: 'Sales Returns' },
      { id: 'credit-notes', label: 'Credit Notes' },
      { id: 'eway-bills', label: 'e-Way Bills' },
    ],
  },
  { id: 'purchases', label: 'Purchases', icon: 'purchases', children: [{ id: 'purchase-orders', label: 'Purchase Orders' }] },
  { id: 'reports', label: 'Reports', icon: 'reports' },
  { id: 'documents', label: 'Documents', icon: 'documents' },
];

const SETTINGS_SECTIONS: { header: string; items: NavNode[] }[] = [
  {
    header: 'Organization Settings',
    items: [
      { id: 's-org', label: 'Organization', children: [{ id: 's-profile', label: 'Profile' }, { id: 's-branding', label: 'Branding' }] },
      { id: 's-users', label: 'Users & Roles', children: [{ id: 's-users-list', label: 'Users' }, { id: 's-roles', label: 'Roles' }] },
      { id: 's-tax', label: 'Taxes & Compliance', children: [{ id: 's-taxes', label: 'Taxes' }] },
      { id: 's-setup', label: 'Setup & Configurations', children: [{ id: 's-general-setup', label: 'General' }] },
      { id: 's-custom', label: 'Customization', children: [{ id: 's-pdf', label: 'PDF Templates' }] },
      { id: 's-auto', label: 'Automation', children: [{ id: 's-workflows', label: 'Workflow Rules' }] },
    ],
  },
  {
    header: 'Module Settings',
    items: [
      { id: 's-general', label: 'General', children: [{ id: 's-customers', label: 'Customers and Vendors' }] },
      { id: 's-inventory', label: 'Inventory', children: [{ id: 's-items', label: 'Items' }] },
      { id: 's-payments', label: 'Online Payments', children: [{ id: 's-gateways', label: 'Payment Gateways' }] },
      { id: 's-sales', label: 'Sales', children: [{ id: 's-sales-orders', label: 'Sales Orders' }] },
      { id: 's-purchases', label: 'Purchases', children: [{ id: 's-bills', label: 'Bills' }] },
      { id: 's-custom-modules', label: 'Custom Modules', children: [{ id: 's-modules', label: 'Modules' }] },
    ],
  },
  {
    header: 'Extension and Developer Data',
    items: [
      {
        id: 's-integrations', label: 'Integrations & Marketplace',
        children: [
          { id: 's-zoho-apps', label: 'Zoho Apps' },
          { id: 's-whatsapp', label: 'WhatsApp' },
          { id: 's-sms', label: 'SMS Integrations' },
          { id: 's-shipping', label: 'Shipping' },
          { id: 's-shopping-cart', label: 'Shopping Cart' },
          { id: 's-ecommerce', label: 'eCommerce' },
          { id: 's-accounting', label: 'Accounting' },
          { id: 's-marketing', label: 'Sales & Marketing' },
        ],
      },
      { id: 's-developer', label: 'Developer Data', children: [{ id: 's-api', label: 'API Usage' }] },
    ],
  },
];

export function FlipkartApp() {
  const { connect, find, discardDraft, stores } = useFlipkart();
  const [route, setRoute] = useState<Route>({ page: 'marketplace' });
  //  Lives here, not on the page: Back from a run's records lands on the same filters.
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>({ status: 'both', type: 'all' });
  const [mapStoreId, setMapStoreId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [flash, setFlash] = useState<{ tone: 'success' | 'info'; text: string } | null>(null);
  const [outsideAt, setOutsideAt] = useState(0);
  const outside = () => setOutsideAt((n) => n + 1);

  useEffect(() => {
    if (!outsideAt) return undefined;
    const t = window.setTimeout(() => setOutsideAt(0), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [outsideAt]);
  useEffect(() => {
    if (!flash) return undefined;
    const t = window.setTimeout(() => setFlash(null), 3200);
    return () => window.clearTimeout(t);
  }, [flash]);

  const go = (r: Route) => { setRoute(r); setOutsideAt(0); };
  const say = (text: string, tone: 'success' | 'info' = 'success') => setFlash({ tone, text });
  //  Set Up Now: the organisation's one store, straight into its configuration.
  const setUp = () => {
    const existing = stores[0];
    go({ page: 'configure', storeId: existing ? existing.id : connect({ storeName: ORG_NAME, appId: '', gstin: GSTINS[0].value }) });
  };

  const openHistory = (storeId: string, type: HistoryFilter['type'] = 'all') => {
    setHistoryFilter({ status: 'both', type });
    go({ page: 'history', storeId });
  };

  const toast = outsideAt ? (
    <Banner tone="info" placement="toast" onDismiss={() => setOutsideAt(0)}>{OUTSIDE}</Banner>
  ) : flash ? (
    <Banner tone={flash.tone} placement="toast" onDismiss={() => setFlash(null)}>{flash.text}</Banner>
  ) : null;

  if (route.page === 'sales-orders') {
    return (
      <AppShell
        nav={(
          //  Keyed: the settings rail and this one sit in the same slot, and Nav
          //  opens the current branch only when it mounts.
          <Nav
            key="inventory"
            items={INVENTORY_NAV}
            currentId="sales-orders"
            onNavigate={(id) => { if (id !== 'sales-orders') outside(); }}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            product={{ name: 'Inventory', mark: INVENTORY_MARK }}
            label="Inventory"
          />
        )}
        topBar={(
          <TopBar
            search={{ scope: 'Sales Orders', value: query, onValueChange: setQuery, onSubmit: outside, onScopeOpen: outside }}
            org={{ name: ORG_NAME, onOpen: outside }}
            actions={[
              { id: 'new', label: 'Create new', icon: 'plus', filled: true, onSelect: outside },
              { id: 'users', label: 'Invite users', icon: 'users', onSelect: outside },
              { id: 'bell', label: 'Notifications', icon: 'bell', onSelect: outside },
              { id: 'settings', label: 'Settings', icon: 'settings', onSelect: () => go({ page: 'marketplace' }) },
            ]}
            account={{ name: ORG_NAME, initials: 'RS', onOpen: outside }}
            apps={{ onOpen: outside }}
          />
        )}
      >
        <SalesOrders onNotify={say} onOutside={outside} />
        {toast}
      </AppShell>
    );
  }

  let body;
  if (route.page === 'configure') {
    const { storeId } = route;
    const wasActive = Boolean(find(storeId)?.active);
    body = (
      <FlipkartConfiguration
        key={storeId}
        storeId={storeId}
        onBack={() => {
          if (wasActive) go({ page: 'overview', storeId });
          else { discardDraft(storeId); go({ page: 'marketplace' }); }
        }}
        onSaved={() => { go({ page: 'overview', storeId }); say('Your marketplace preferences have been saved.'); }}
      />
    );
  } else if (route.page === 'overview' && find(route.storeId)) {
    const { storeId } = route;
    body = (
      <FlipkartOverview
        storeId={storeId}
        onBack={() => go({ page: 'marketplace' })}
        onConfigure={() => go({ page: 'configure', storeId })}
        onHistory={(type) => openHistory(storeId, type ?? 'all')}
        onMapWarehouses={() => setMapStoreId(storeId)}
        onDisconnected={(name) => { go({ page: 'marketplace' }); say(`${name} has been disconnected.`, 'info'); }}
        onOutside={outside}
      />
    );
  } else if (route.page === 'history' && find(route.storeId)) {
    const { storeId } = route;
    body = (
      <SyncHistory
        storeId={storeId}
        filter={historyFilter}
        onFilterChange={setHistoryFilter}
        onBack={() => go({ page: 'overview', storeId })}
        onOpenRecords={(runId, kind) => go({ page: 'details', storeId, runId, kind })}
        onExport={(f) => say(`Sync history exported as ${f}.`)}
      />
    );
  } else if (route.page === 'details' && find(route.storeId)) {
    const { storeId } = route;
    body = (
      <SyncDetails
        storeId={storeId} runId={route.runId} kind={route.kind}
        onBack={() => go({ page: 'history', storeId })}
        onOutside={outside}
      />
    );
  } else {
    body = (
      <Marketplace
        onSetUpFlipkart={setUp}
        onOpenStore={(storeId) => go({ page: 'overview', storeId })}
        onMapWarehouses={setMapStoreId}
        onSynced={(t) => say(t, 'info')}
        onOutside={outside}
      />
    );
  }

  return (
    <AppShell
      nav={(
        <Nav
          key="settings"
          tone="surface"
          items={[]}
          sections={SETTINGS_SECTIONS}
          currentId="s-ecommerce"
          onNavigate={(id) => { if (id === 's-ecommerce') go({ page: 'marketplace' }); else outside(); }}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          product={{
            name: 'All Settings', subtitle: ORG_NAME, mark: INVENTORY_MARK,
            onBack: () => go({ page: 'sales-orders' }), backLabel: 'Back to Inventory',
          }}
          label="Settings"
        />
      )}
      topBar={(
        <TopBar
          tone="surface"
          search={{ scope: 'Settings', value: query, onValueChange: setQuery, onSubmit: outside, onScopeOpen: outside }}
          actions={[{ id: 'close', label: 'Close Settings', icon: 'close', labelled: true, intent: 'danger', onSelect: () => go({ page: 'sales-orders' }) }]}
        />
      )}
    >
      {body}
      {toast}
      <MapWarehousesModal
        storeId={mapStoreId}
        onClose={() => setMapStoreId(null)}
        onSaved={(name) => { setMapStoreId(null); say(`Warehouse mapping saved for ${name}.`); }}
      />
    </AppShell>
  );
}
