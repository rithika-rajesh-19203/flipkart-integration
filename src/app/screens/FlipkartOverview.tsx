import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Banner, BrandTile, Button, Divider, Icon, Inline, Modal, PageHeader, Stack, StatusBadge, Surface, Text,
} from '@canon';
import {
  FLIPKART_LOCATIONS, FLOW_TYPE, SYNC_TYPES, ZOHO_LOCATIONS, fmtShort, useFlipkart,
} from '../data/flipkart';
import type { FlowKind, SyncType } from '../data/flipkart';

/**
 * CONNECT FLIPKART — one store's page, the Flipkart counterpart of
 * "Connect Shopify".
 *
 * Header: back, the title with the store it belongs to, then the store's whole
 * Sync History (the clock) and Configure ▾.
 *
 * One card per flow, read left to right as source → destination. Each card has
 * its own clock — "<Sales Order> Sync History", the same page pre-filtered to
 * that type — beside Sync Manually, and says when it last ran.
 */
const FREQ_LABEL: Record<string, string> = { '15m': '15 minutes', '1h': '1 hour', '4h': '4 hours', '12h': '12 hours' };

const FK = { src: '/brand/flipkart.svg', name: 'Flipkart', where: 'Flipkart' };
const ZI = { src: '/brand/zoho-inventory.svg', name: 'Zoho Inventory', where: 'Zoho Inventory' };

function End({ src, name, title, where }: { src: string; name: string; title: string; where: string }) {
  return (
    <Inline gap={5} align="center">
      <BrandTile name={name} src={src} size="md" />
      <Stack gap={0}>
        <Text size="body-lg" weight="semibold">{title}</Text>
        <Text size="body-sm" tone="secondary">in {where}</Text>
      </Stack>
    </Inline>
  );
}

interface FlowProps {
  from: typeof FK; fromTitle: string;
  to: typeof FK; toTitle: string;
  active: boolean;
  actions: ReactNode;
  footer: ReactNode;
  children?: ReactNode;
}

function Flow({ from, fromTitle, to, toTitle, active, actions, footer, children }: FlowProps) {
  return (
    <Surface pad={0} radius="card" border="default" className="overflow-hidden">
      <Stack gap={0} className="px-12 pt-12 pb-8">
        <Inline gap={8} align="center" justify="between" wrap className="pb-8">
          <Inline gap={0} align="center" className="grid grid-cols-2 flex-1 max-w-2xl">
            <Inline gap={4} align="center" justify="between" className="pe-12">
              <End {...from} title={fromTitle} />
              <Icon name="chevron-right" size="md" tone="muted" />
            </Inline>
            <End {...to} title={toTitle} />
          </Inline>
          <Inline gap={4} align="center">
            {active ? null : <StatusBadge status="inactive">Inactive</StatusBadge>}
            {actions}
          </Inline>
        </Inline>
        <Divider />
        <Stack gap={0} className="pt-6">{footer}</Stack>
      </Stack>
      {children}
    </Surface>
  );
}

export interface FlipkartOverviewProps {
  storeId: string;
  onBack: () => void;
  onConfigure: () => void;
  onHistory: (type?: SyncType) => void;
  onDisconnected: (storeName: string) => void;
  onMapWarehouses: () => void;
  onOutside: () => void;
}

export function FlipkartOverview({
  storeId, onBack, onConfigure, onHistory, onDisconnected, onMapWarehouses, onOutside,
}: FlipkartOverviewProps) {
  const { find, syncNow, disconnect, lastSync } = useFlipkart();
  const [confirm, setConfirm] = useState(false);
  const store = find(storeId);
  if (!store) return null;
  const { account, config } = store;

  const footer = (kind: FlowKind, idle = 'Initial sync will begin within 30 minutes') => {
    if (store.running[kind]) return <Text size="body-sm" tone="info">Syncing with Flipkart…</Text>;
    const at = lastSync(store, FLOW_TYPE[kind]);
    return at
      ? <Text size="body-sm" tone="secondary">Last Sync : {fmtShort(at)}</Text>
      : <Text size="body-sm" tone="success">{idle}</Text>;
  };
  const actions = (kind: FlowKind, enabled = true) => {
    const type = FLOW_TYPE[kind];
    return (
      <>
        <Button emphasis="secondary" icon="history" label={`${SYNC_TYPES[type].history} Sync History`}
          title={`${SYNC_TYPES[type].history} Sync History`} onClick={() => onHistory(type)} />
        {enabled ? (
          <Button emphasis="secondary" disabled={store.running[kind]} onClick={() => syncNow(store.id, kind)}>
            {store.running[kind] ? 'Syncing…' : 'Sync Manually'}
          </Button>
        ) : (
          <Button emphasis="secondary" onClick={onConfigure}>Configure</Button>
        )}
      </>
    );
  };

  const locName = (v: string) => ZOHO_LOCATIONS.find((l) => l.value === v)?.label ?? '';
  const mapped = FLIPKART_LOCATIONS.filter((l) => config.locations[l.id]);
  const ordersOn = config.syncSellerFulfilled || config.syncFbf;
  const alsoSynced = ['Packages and Shipments', ...(config.createInvoices ? ['Invoices'] : []), ...(config.syncReturns ? ['Sales Returns'] : [])];

  return (
    <Surface tone="sunken" pad={4} radius="none" className="flex flex-col flex-1 min-h-0">
      <Surface tone="default" pad={0} radius="card" border="default" className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <PageHeader
          type="detail" title="Connect Flipkart" subtitle={`Flipkart – ${account.storeName}`}
          parent={{ label: 'eCommerce', href: '#' }} onBack={onBack}
          trailing={[{ id: 'history', label: 'Sync History', icon: 'history', onSelect: () => onHistory() }]}
          menuCta={{
            label: 'Configure',
            onSelect: onConfigure,
            entries: [
              { id: 'configure', label: 'Edit Configuration', onSelect: onConfigure },
              { id: 'warehouses', label: 'Map Warehouses', onSelect: onMapWarehouses },
              { id: 'history', label: 'View Sync History', onSelect: () => onHistory() },
              { separator: true },
              { id: 'disconnect', label: 'Disconnect', tone: 'danger', onSelect: () => setConfirm(true) },
            ],
          }}
        />

        <Stack gap={0} className="flex-1 min-h-0 overflow-y-auto">
          <Stack gap={0} className="p-10">
            <Surface tone="sunken" pad={10} radius="card" border="default">
              <Inline gap={10} align="center" justify="between">
                <Inline gap={10} align="center">
                  <Inline gap={4} align="center">
                    <BrandTile name="Zoho Inventory" src="/brand/zoho-inventory.svg" size="md" />
                    <Icon name="settings" size="sm" tone="primary" />
                    <BrandTile name="Flipkart" src="/brand/flipkart.svg" size="md" />
                  </Inline>
                  <Stack gap={2}>
                    <Text size="subheading">Flipkart Seller Integration</Text>
                    <Text size="body-sm" tone="secondary">
                      Orders sync every {FREQ_LABEL[config.frequency]} and stock updates are pushed to Flipkart as they happen.
                      Choose when imports happen, map warehouses and set customer preferences from Configure.
                    </Text>
                  </Stack>
                </Inline>
                <Button onClick={onOutside}>Learn More</Button>
              </Inline>
            </Surface>
          </Stack>

          <Surface tone="sunken" pad={0} radius="none" className="px-10 py-12">
            <Stack gap={6}>
              <Text size="subheading" weight="regular">Account Information</Text>
              <Inline gap={20} wrap>
                {[
                  { label: 'Store Name', value: account.storeName },
                  { label: 'Seller ID', value: account.sellerId },
                  { label: 'GSTIN', value: account.gstin },
                  { label: 'Order Sync Start Date', value: config.importFrom },
                ].map((f) => (
                  <Stack key={f.label} gap={2}>
                    <Text size="body-sm" tone="secondary">{f.label}</Text>
                    <Text size="body-lg">{f.value}</Text>
                  </Stack>
                ))}
              </Inline>
            </Stack>
          </Surface>

          <Stack gap={8} className="p-10 max-w-6xl">
            <Flow from={FK} fromTitle="Listings" to={ZI} toTitle="Items" active
              actions={actions('listings')} footer={footer('listings')} />

            <Flow from={FK} fromTitle="Orders" to={ZI} toTitle="Sales Order" active={ordersOn}
              actions={actions('orders', ordersOn)} footer={footer('orders')}
            >
              <Surface tone="sunken" pad={10} radius="none">
                <Stack gap={4}>
                  <Inline gap={4} align="center">
                    <Icon name="info" size="md" tone="primary" />
                    <Text size="body-sm">Sales orders from Flipkart will be automatically synced. As part of this sync, the following modules will be synced:</Text>
                  </Inline>
                  <Inline gap={10} className="ps-12">
                    {alsoSynced.map((m) => <Text key={m} size="body-sm" weight="medium">• {m}</Text>)}
                  </Inline>
                </Stack>
              </Surface>
            </Flow>

            <Flow from={ZI} fromTitle="Stock" to={FK} toTitle="Inventory" active={config.syncStock}
              actions={actions('stock', config.syncStock)}
              footer={(
                <Stack gap={1}>
                  {footer('stock', 'Stock updates are pushed as they happen')}
                  <Text size="caption" tone="secondary">
                    {config.syncStock
                      ? `From ${mapped.map((l) => locName(config.locations[l.id])).join(', ')}${Number(config.bufferStock) > 0 ? ` · ${config.bufferStock} units held back as buffer` : ''}`
                      : 'Stock is not being pushed to Flipkart.'}
                  </Text>
                </Stack>
              )}
            />

            <Flow from={FK} fromTitle="Returns" to={ZI} toTitle="Sales Returns" active={config.syncReturns}
              actions={actions('returns', config.syncReturns)}
              footer={config.syncReturns ? footer('returns') : <Text size="body-sm" tone="secondary">Turn on Sync Returns in Configure to record Flipkart returns.</Text>}
            />

            <Flow from={FK} fromTitle="Settlements" to={ZI} toTitle="Payments Received" active={config.syncSettlements}
              actions={actions('settlements', config.syncSettlements)}
              footer={config.syncSettlements ? footer('settlements', 'Settlements sync after each Flipkart payout cycle') : <Text size="body-sm" tone="secondary">Turn on Sync Settlements in Configure to reconcile Flipkart payouts.</Text>}
            />
          </Stack>
        </Stack>
      </Surface>

      <Modal
        open={confirm}
        title="Disconnect Flipkart store?"
        width="sm"
        onRequestClose={() => setConfirm(false)}
        primaryAction={{ label: 'Disconnect', onSelect: () => { setConfirm(false); disconnect(store.id); onDisconnected(account.storeName); } }}
        secondaryAction={{ label: 'Cancel', onSelect: () => setConfirm(false) }}
      >
        <Stack gap={6}>
          <Text>Orders, stock and returns will stop syncing with {account.storeName}.</Text>
          <Banner tone="info">Items, sales orders and returns already synced stay in Zoho Inventory.</Banner>
        </Stack>
      </Modal>
    </Surface>
  );
}
