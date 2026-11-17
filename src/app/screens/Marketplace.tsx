import { useState } from 'react';
import {
  Banner, BrandTile, Button, Icon, Inline, InputField, PageHeader, Stack, StatusBadge, Surface, Text,
} from '@canon';
import type { MenuEntry } from '@canon';
import { useFlipkart } from '../data/flipkart';
import type { FlowKind } from '../data/flipkart';
import { MenuButton } from './MenuButton';

const SYNC_ENTRIES: { kind: FlowKind; label: string }[] = [
  { kind: 'listings', label: 'Listings → Items' },
  { kind: 'orders', label: 'Orders → Sales Orders' },
  { kind: 'stock', label: 'Stock → Flipkart' },
  { kind: 'returns', label: 'Returns → Sales Returns' },
  { kind: 'settlements', label: 'Settlements → Payments' },
];

/**
 * SETTINGS → INTEGRATIONS & MARKETPLACE → eCOMMERCE ("Marketplace").
 *
 * One card per marketplace — logo, name with "Integration Built by Zoho",
 * what it does, Set Up Now and Learn More — as in the reference. Flipkart is
 * the new one, so it sits first with a "New" badge until it is connected.
 * An organisation has ONE Flipkart store, so once it is connected the card
 * offers Sync Manually ▾, View Details and the warehouse-mapping panel — no
 * Add Store, and no store picker anywhere.
 */
interface Channel {
  id: string;
  name: string;
  src?: string;
  blurb: string;
  note?: string;
  learnMore?: boolean;
}

const blurb = (store: string) => `Integrate your ${store} store with Zoho Inventory to bridge the gap between your sales channel and inventory management giving you the ability to tackle any number of online orders with ease. You can keep your stock in continuous sync in both the platforms with this integration.`;

const CHANNELS: Channel[] = [
  {
    id: 'flipkart', name: 'Flipkart', src: `${import.meta.env.BASE_URL}brand/flipkart.svg`, learnMore: true,
    blurb: 'Connect your Flipkart Seller account to bring listings, orders, returns and settlements into Zoho Inventory, and keep stock on Flipkart in sync with what you have on hand.',
    note: 'You\'ll need a Flipkart Seller Hub account with Developer Access. The GSTIN on the seller account must be one of this organisation\'s GSTINs.',
  },
  { id: 'amazon-us', name: 'Amazon US', blurb: blurb('Amazon US'), learnMore: true },
  { id: 'unicommerce', name: 'Unicommerce', blurb: blurb('Unicommerce') },
  { id: 'etsy', name: 'Etsy', blurb: blurb('Etsy'), learnMore: true },
];

export interface MarketplaceProps {
  /** Set Up Now — straight into the organisation's store configuration. */
  onSetUpFlipkart: () => void;
  onOpenStore: (id: string) => void;
  onMapWarehouses: (id: string) => void;
  onSynced: (text: string) => void;
  onOutside: () => void;
}

export function Marketplace({ onSetUpFlipkart, onOpenStore, onMapWarehouses, onSynced, onOutside }: MarketplaceProps) {
  const { activeStores, syncNow } = useFlipkart();
  const [query, setQuery] = useState('');

  const store = activeStores[0];
  const syncEntries: MenuEntry[] = store ? SYNC_ENTRIES.map(({ kind, label }) => ({
    id: kind, label,
    onSelect: () => { syncNow(store.id, kind); onSynced(`Sync started for ${store.account.storeName}.`); },
  })) : [];

  const visible = CHANNELS.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Surface tone="sunken" pad={4} radius="none" className="flex flex-col flex-1 min-h-0">
      <Surface tone="default" pad={0} radius="card" border="default"
        className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <PageHeader type="create" title="Marketplace" />

        <Stack gap={8} className="flex-1 min-h-0 overflow-y-auto p-10">
          <Inline justify="end" className="max-w-5xl">
            <Stack gap={0} className="w-1/3">
              <InputField
                icon="search" placeholder="Search your apps" aria-label="Search your apps"
                value={query} onChange={(e) => setQuery(e.target.value)}
              />
            </Stack>
          </Inline>

          {visible.length === 0 ? (
            <Text tone="secondary">No apps match “{query}”.</Text>
          ) : null}

          {visible.map((c) => {
            const isFlipkart = c.id === 'flipkart';
            const connected = isFlipkart && Boolean(store);
            return (
              <Surface key={c.id} pad={6} radius="card" border="default" className="max-w-5xl">
                <Inline gap={10} align="stretch">
                  <Surface tone="sunken" pad={10} radius="md" className="flex items-center justify-center">
                    <BrandTile name={c.name} src={c.src} />
                  </Surface>
                  <Stack gap={5} grow className="py-4 pe-6">
                    <Inline gap={4} align="center" wrap>
                      <Text size="heading">{c.name}</Text>
                      <Surface tone="sunken" pad={0} radius="sm" className="px-3 py-1">
                        <Text size="body-sm" className="italic">
                          Integration Built by <Text as="span" size="body-sm" weight="semibold">Zoho</Text>
                        </Text>
                      </Surface>
                      {isFlipkart && !connected ? <StatusBadge status="submitted">New</StatusBadge> : null}
                      {connected ? <StatusBadge status="success">Connected</StatusBadge> : null}
                    </Inline>
                    <Text size="body-sm">{c.blurb}</Text>

                    {!connected && c.note ? <Banner tone="warning">{c.note}</Banner> : null}

                    <Inline justify="between" align="center">
                      {connected ? (
                        <Inline gap={4}>
                          <MenuButton label="Sync Manually" entries={syncEntries} />
                          <Button emphasis="secondary" onClick={() => onOpenStore(store.id)}>View Details</Button>
                        </Inline>
                      ) : (
                        <Button onClick={isFlipkart ? onSetUpFlipkart : onOutside}>Set Up Now</Button>
                      )}
                      {c.learnMore ? (
                        <Inline gap={2} align="center">
                          <Icon name="info" size="md" tone="muted" />
                          <Text as="a" href="#" tone="secondary" onClick={onOutside}>Learn More</Text>
                        </Inline>
                      ) : null}
                    </Inline>
                  </Stack>
                </Inline>

                {connected ? (
                  <Stack gap={6} className="pt-8">
                    <Surface tone="sunken" pad={10} radius="md">
                      <Inline gap={10} align="center" justify="between">
                        <Stack gap={2}>
                          <Text size="subheading">Map warehouses to Flipkart locations</Text>
                          <Text size="body-sm" tone="secondary">
                            Map a pickup location from Flipkart to a warehouse in Zoho Inventory to keep your stock in sync on both platforms.
                          </Text>
                        </Stack>
                        <Button onClick={() => onMapWarehouses(store.id)}>Map Warehouses</Button>
                      </Inline>
                    </Surface>
                  </Stack>
                ) : null}
              </Surface>
            );
          })}
        </Stack>
      </Surface>
    </Surface>
  );
}
