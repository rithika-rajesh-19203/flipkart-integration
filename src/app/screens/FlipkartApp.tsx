import { useCallback, useEffect, useState } from 'react';
import {
  AppShell, Banner, Icon, Nav, TopBar,
} from '@canon';
import type { NavNode } from '@canon';
import { useFlipkart } from '../data/flipkart';
import { Connecting } from './Connecting';
import { FlipkartConfiguration } from './FlipkartConfiguration';
import { FlipkartConnectModal } from './FlipkartConnectModal';
import { FlipkartOverview } from './FlipkartOverview';
import { MapWarehousesModal } from './LocationMapping';
import { Marketplace } from './Marketplace';
import { SyncDetails } from './SyncDetails';
import { SyncHistory } from './SyncHistory';
import type { HistoryFilter } from './SyncHistory';

/**
 * FLIPKART INTEGRATION — the prototype's router.
 *
 *   marketplace     Settings → Integrations & Marketplace → eCommerce ("Marketplace")
 *     (modal)       Flipkart → Set Up Now → Connect your Flipkart Seller Account
 *   connecting      the full-page hand-off while the account is linked
 *   configure       Flipkart Configuration → Save
 *   overview        Connect Flipkart — one store's sync cards, Configure, Disconnect
 *   history         Sync History — every run, by status and type (or one card's type)
 *   details         Established / Failed Sync Details — the records behind a count
 *
 * All of it lives in the light settings shell, as in the reference recording.
 * Anything outside the flow raises a "Not a part of this prototype" toast and
 * leaves the page where it was.
 */
type Route =
  | { page: 'marketplace' }
  | { page: 'connecting'; storeId: string }
  | { page: 'configure'; storeId: string }
  | { page: 'overview'; storeId: string }
  | { page: 'history'; storeId: string }
  | { page: 'details'; storeId: string; runId: string; kind: 'synced' | 'failed' };

const OUTSIDE = 'Not a part of this prototype';
const TOAST_MS = 2600;
const INVENTORY_MARK = <Icon name="inventory" size="xl" tone="inherit" />;

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
  const { connect, find, discardDraft } = useFlipkart();
  const [route, setRoute] = useState<Route>({ page: 'marketplace' });
  //  Lives here, not on the page: Back from a run's records lands on the same filters.
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>({ status: 'both', type: 'all' });
  const [connectOpen, setConnectOpen] = useState(false);
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
  const connectingId = route.page === 'connecting' ? route.storeId : '';
  const toConfigure = useCallback(() => setRoute({ page: 'configure', storeId: connectingId }), [connectingId]);

  //  The hand-off is a full page with no chrome, as in the reference.
  if (route.page === 'connecting') return <Connecting onDone={toConfigure} />;

  const openHistory = (storeId: string, type: HistoryFilter['type'] = 'all') => {
    setHistoryFilter({ status: 'both', type });
    go({ page: 'history', storeId });
  };

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
        onSetUpFlipkart={() => setConnectOpen(true)}
        onOpenStore={(storeId) => go({ page: 'overview', storeId })}
        onMapWarehouses={setMapStoreId}
        onSynced={(t) => say(t, 'info')}
        onOutside={outside}
      />
    );
  }

  const toast = outsideAt ? (
    <Banner tone="info" placement="toast" onDismiss={() => setOutsideAt(0)}>{OUTSIDE}</Banner>
  ) : flash ? (
    <Banner tone={flash.tone} placement="toast" onDismiss={() => setFlash(null)}>{flash.text}</Banner>
  ) : null;

  return (
    <AppShell
      nav={(
        <Nav
          tone="surface"
          items={[]}
          sections={SETTINGS_SECTIONS}
          currentId="s-ecommerce"
          onNavigate={(id) => { if (id === 's-ecommerce') go({ page: 'marketplace' }); else outside(); }}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          product={{
            name: 'All Settings', subtitle: 'The Retail Store Inc', mark: INVENTORY_MARK,
            onBack: outside, backLabel: 'Back to Inventory',
          }}
          label="Settings"
        />
      )}
      topBar={(
        <TopBar
          tone="surface"
          search={{ scope: 'Settings', value: query, onValueChange: setQuery, onSubmit: outside, onScopeOpen: outside }}
          actions={[{ id: 'close', label: 'Close Settings', icon: 'close', labelled: true, intent: 'danger', onSelect: outside }]}
        />
      )}
    >
      {body}
      {toast}
      <FlipkartConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnect={(v) => { setConnectOpen(false); go({ page: 'connecting', storeId: connect(v) }); }}
      />
      <MapWarehousesModal
        storeId={mapStoreId}
        onClose={() => setMapStoreId(null)}
        onSaved={(name) => { setMapStoreId(null); say(`Warehouse mapping saved for ${name}.`); }}
      />
    </AppShell>
  );
}
