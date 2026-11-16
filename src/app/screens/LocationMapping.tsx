import { useEffect, useState } from 'react';
import {
  Banner, Modal, Select, Stack, Surface, Table, Text,
} from '@canon';
import type { TableColumn } from '@canon';
import { FLIPKART_LOCATIONS, ZOHO_LOCATIONS, useFlipkart } from '../data/flipkart';

/**
 * FLIPKART LOCATION → ZOHO WAREHOUSE. One table, used in two places: the
 * Locations section of Flipkart Configuration, and the "Map warehouses to
 * Flipkart locations" dialog on the eCommerce Flipkart card (the Shopify card's
 * "Select store ▾" panel).
 */
type FKLocation = (typeof FLIPKART_LOCATIONS)[number];
const DO_NOT_SYNC = { value: '', label: 'Do not sync this location' };

export function LocationMapping({ value, onChange }: {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const mapped = Object.values(value).filter(Boolean).length;
  const columns: TableColumn<FKLocation>[] = [
    {
      id: 'fk', header: 'Flipkart Location',
      cell: (l) => (
        <Stack gap={0}>
          <Text weight="medium">{l.name}</Text>
          <Text size="caption" tone="secondary">{l.id} · {l.kind}</Text>
        </Stack>
      ),
    },
    {
      id: 'zoho', header: 'Zoho Inventory Warehouse',
      cell: (l) => (
        <Select
          ariaLabel={`Zoho Inventory warehouse for ${l.name}`}
          options={[DO_NOT_SYNC, ...ZOHO_LOCATIONS]}
          value={value[l.id] ?? ''}
          placeholder="Do not sync this location"
          onChange={(v) => onChange({ ...value, [l.id]: v })}
        />
      ),
    },
  ];
  return (
    <Stack gap={4}>
      <Surface pad={0} radius="md" border="default" className="overflow-hidden">
        <Table caption="Flipkart location mapping" columns={columns} rows={FLIPKART_LOCATIONS}
          rowKey={(l) => l.id} placement="card" />
      </Surface>
      {mapped === 0 ? (
        <Banner tone="danger">Map at least one Flipkart location to keep stock in sync.</Banner>
      ) : (
        <Text size="caption" tone="secondary">{mapped} of {FLIPKART_LOCATIONS.length} locations will be synced.</Text>
      )}
    </Stack>
  );
}

export function MapWarehousesModal({ storeId, onClose, onSaved }: {
  storeId: string | null;
  onClose: () => void;
  onSaved: (storeName: string) => void;
}) {
  const { find, saveLocations } = useFlipkart();
  const store = storeId ? find(storeId) : undefined;
  const [value, setValue] = useState<Record<string, string>>({});
  useEffect(() => { if (store) setValue(store.config.locations); }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal
      open={Boolean(store)}
      title={`Map Warehouses — ${store?.account.storeName ?? ''}`}
      width="xl"
      onRequestClose={onClose}
      primaryAction={{
        label: 'Save',
        disabled: !Object.values(value).some(Boolean),
        onSelect: () => { if (store) { saveLocations(store.id, value); onSaved(store.account.storeName); } },
      }}
      secondaryAction={{ label: 'Cancel', onSelect: onClose }}
    >
      <Stack gap={6}>
        <Text tone="secondary">
          Map each Flipkart pickup location to the Zoho Inventory warehouse that holds its stock, so stock stays in sync on both platforms.
        </Text>
        <LocationMapping value={value} onChange={setValue} />
      </Stack>
    </Modal>
  );
}
