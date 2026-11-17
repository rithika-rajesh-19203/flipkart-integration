import { useEffect, useState } from 'react';
import {
  Banner, Button, Icon, Inline, Modal, Select, Stack, Text,
} from '@canon';
import { FLIPKART_LOCATIONS, ZOHO_LOCATIONS, useFlipkart } from '../data/flipkart';

/**
 * ZOHO WAREHOUSE → FLIPKART LOCATION, as rows — the shape of Shopify
 * Configuration's "Setup Warehouses": a mapping mode, then one row per pair
 * (Zoho Inventory Warehouse, the direction stock flows, Flipkart Location, ✕),
 * then Add Mapping while unmapped Flipkart locations remain.
 *
 * Used in two places: the Setup Warehouses section of Flipkart Configuration,
 * and the "Map warehouses to Flipkart locations" dialog on the eCommerce card.
 *
 * The value stays keyed by Flipkart location (`{ [flipkartId]: zohoValue }`):
 * each Flipkart location takes stock from exactly one warehouse, so a key per
 * Flipkart location makes a duplicate impossible rather than validated.
 */
const MODES = [
  { value: 'custom', label: 'Custom Warehouse Mapping' },
  { value: 'all', label: 'All Warehouses to one Flipkart location' },
];

export function LocationMapping({ value, onChange, disabled }: {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState('custom');
  //  Rows in the order the user made them; a row may be half-filled.
  const pairs = Object.entries(value);
  const unused = FLIPKART_LOCATIONS.filter((l) => !(l.id in value));
  const mapped = pairs.filter(([, z]) => z).length;
  const headTone = disabled ? 'tertiary' : 'default';

  const setRow = (oldId: string, fkId: string, zoho: string) => {
    const next: Record<string, string> = {};
    pairs.forEach(([k, v]) => { if (k === oldId) next[fkId] = zoho; else next[k] = v; });
    onChange(next);
  };
  const remove = (id: string) => onChange(Object.fromEntries(pairs.filter(([k]) => k !== id)));
  const add = () => { if (unused[0]) onChange({ ...value, [unused[0].id]: '' }); };

  return (
    <Stack gap={8}>
      <Inline gap={10} align="center">
        <Text tone={disabled ? 'tertiary' : 'danger'} className="w-filter-field">Map Locations of Zoho Inventory*</Text>
        <Stack gap={0} className="w-1/3">
          <Select ariaLabel="Map Locations of Zoho Inventory" options={MODES} value={mode} onChange={setMode} disabled={disabled} />
        </Stack>
      </Inline>

      <Stack gap={6} className="max-w-3xl">
        <Inline gap={6} className="pb-4 border-b border-border-divider">
          <Stack gap={0} grow><Text weight="medium" tone={headTone}>Zoho Inventory Warehouse</Text></Stack>
          {/* spacers the width of the arrow and the ✕, so the headings sit over their selects */}
          <Stack gap={0} className="w-icon-md shrink-0" />
          <Stack gap={0} grow><Text weight="medium" tone={headTone}>Flipkart Location</Text></Stack>
          <Stack gap={0} className="w-button-md shrink-0" />
        </Inline>

        {pairs.map(([fkId, zoho]) => {
          const fk = FLIPKART_LOCATIONS.find((l) => l.id === fkId);
          const fkOptions = FLIPKART_LOCATIONS.filter((l) => l.id === fkId || !(l.id in value))
            .map((l) => ({ value: l.id, label: l.name, description: `${l.id} · ${l.kind}` }));
          return (
            <Inline key={fkId} gap={6} align="center">
              <Stack gap={0} grow>
                <Select ariaLabel={`Zoho Inventory warehouse for ${fk?.name ?? fkId}`} options={ZOHO_LOCATIONS}
                  value={zoho} placeholder="Select a warehouse" disabled={disabled}
                  onChange={(v) => setRow(fkId, fkId, v)} />
              </Stack>
              <Icon name="arrow-right" size="md" tone="muted" />
              <Stack gap={0} grow>
                <Select ariaLabel="Flipkart location" options={fkOptions} value={fkId} disabled={disabled}
                  onChange={(v) => setRow(fkId, v, zoho)} />
              </Stack>
              <Button emphasis="secondary" intent="danger" icon="close" label={`Remove ${fk?.name ?? 'mapping'}`}
                disabled={disabled || pairs.length === 1} onClick={() => remove(fkId)} />
            </Inline>
          );
        })}

        {!disabled && unused.length > 0 ? (
          <Inline>
            <Button emphasis="secondary" icon="plus" onClick={add}>Add Mapping</Button>
          </Inline>
        ) : null}
      </Stack>

      {!disabled && mapped === 0 ? (
        <Banner tone="danger">Map at least one Flipkart location to keep stock in sync.</Banner>
      ) : null}
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
