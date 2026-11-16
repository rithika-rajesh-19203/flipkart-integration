import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Banner, Button, Checkbox, CreatePage, FormRow, FormSection, Inline, InputField, PageHeader, Radio,
  Select, Stack, Surface, Text,
} from '@canon';
import { useFlipkart } from '../data/flipkart';
import type { FlipkartConfig } from '../data/flipkart';
import { LocationMapping } from './LocationMapping';

/**
 * FLIPKART CONFIGURATION — the Flipkart counterpart of "Shopify Configuration".
 *
 * Same shape as the reference — Products, Orders, Returns & Payments, then
 * SETUP WAREHOUSES at the bottom (where Shopify Configuration puts it), then
 * Save / Cancel. Flipkart stock is per pickup location, and a location with no
 * Zoho warehouse behind it cannot be synced. Flipkart-fulfilled (FBF) stock is
 * held by Flipkart, so it may map to a location or be left out.
 *
 * Customer mapping defaults to a single "Flipkart Customer": Flipkart masks
 * buyer contact details, so per-buyer customers would be one-order contacts
 * keyed on a shipping name.
 */
const MAP_ITEMS = [
  { value: 'sku', label: 'SKU (Seller SKU ID)' },
  { value: 'fsn', label: 'FSN (Flipkart Serial Number)' },
  { value: 'name', label: 'Item Name' },
];
const VALUATION = [
  { value: 'fifo', label: 'FIFO (First In, First Out)' },
  { value: 'wac', label: 'Weighted Average Cost' },
];
const FREQUENCY = [
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '12h', label: '12 Hours' },
];
const DEPOSIT = [
  { value: 'flipkart-clearing', label: 'Flipkart Clearing Account' },
  { value: 'hdfc-current', label: 'HDFC Bank – Current A/c' },
];

function Heading({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <Stack gap={1} className="pb-8">
      <Text size="subheading">{children}</Text>
      {hint ? <Text size="body-sm" tone="secondary">{hint}</Text> : null}
    </Stack>
  );
}

export interface FlipkartConfigurationProps {
  storeId: string;
  onBack: () => void;
  onSaved: () => void;
}

export function FlipkartConfiguration({ storeId, onBack, onSaved }: FlipkartConfigurationProps) {
  const { find, saveConfig } = useFlipkart();
  const store = find(storeId);
  const account = store?.account;
  const firstTime = !store?.active;
  const [c, setC] = useState<FlipkartConfig>(() => store!.config);
  const [error, setError] = useState<string | undefined>();
  const set = <K extends keyof FlipkartConfig>(k: K, v: FlipkartConfig[K]) => setC((p) => ({ ...p, [k]: v }));
  const tick = (k: keyof FlipkartConfig) => ({
    selection: (c[k] ? 'checked' : 'unchecked') as 'checked' | 'unchecked',
    onSelectionChange: (n: string) => set(k, (n === 'checked') as never),
  });

  const save = () => {
    if (!c.importFrom) { setError('Choose the date to import Flipkart orders from.'); return; }
    if (!Object.values(c.locations).some(Boolean)) { setError(undefined); return; }
    saveConfig(storeId, c);
    onSaved();
  };

  return (
    <Surface tone="sunken" pad={4} radius="none" className="flex flex-col flex-1 min-h-0">
      <Surface tone="default" pad={0} radius="card" border="default" className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <PageHeader type="detail" title="Flipkart Configuration" subtitle={account ? `Flipkart – ${account.storeName}` : undefined}
          parent={{ label: firstTime ? 'eCommerce' : 'Connect Flipkart', href: '#' }} onBack={onBack} />
        <CreatePage
          footer={(
            <>
              <Button onClick={save}>Save</Button>
              <Button emphasis="secondary" onClick={onBack}>Cancel</Button>
            </>
          )}
        >
          <Stack gap={0} className="max-w-5xl">
            {account && firstTime ? (
              <Stack gap={0} className="pb-12">
                <Banner tone="success">
                  {account.storeName} is connected. Choose how Flipkart and Zoho Inventory should work together, then save to start the first sync.
                </Banner>
              </Stack>
            ) : null}

            {/* ── Products ── */}
            <Heading>Products</Heading>
            <FormSection
              full={(
                <Stack gap={8}>
                  <Stack gap={8}>
                    <Checkbox {...tick('syncStock')} label="Sync Stock"
                      description="Regularly push stock changes in the mapped Zoho Inventory locations to Flipkart." />
                    {c.syncStock ? (
                      //  A nested `last` section, so this row sits on the same
                      //  half-width 2 + 3 + 1 tracks as Map Items by above it.
                      <FormSection last>
                        <FormRow label="Buffer Stock">
                          {({ id }) => (
                            <Stack gap={2}>
                              <InputField id={id} format="numeric" value={c.bufferStock}
                                onChange={(e) => set('bufferStock', e.target.value)} />
                              <Text size="caption" tone="secondary">Units held back from Flipkart for each item, so other channels are not oversold.</Text>
                            </Stack>
                          )}
                        </FormRow>
                      </FormSection>
                    ) : null}
                  </Stack>
                  <Checkbox {...tick('fetchStockCounts')} label="Fetch Stock Counts"
                    description="Bring in Flipkart's stock counts once, during the initial sync." />
                  <Checkbox {...tick('importMissing')} label="Create items for unmatched listings"
                    description="Listings that do not match an item in Zoho Inventory are created as new items, and their opening stock is recorded as an inventory adjustment." />
                </Stack>
              )}
            >
              <FormRow label="Map Items by" required>
                {({ id, required }) => (
                  <Select id={id} required={required} options={MAP_ITEMS} value={c.mapItemsBy} onChange={(v) => set('mapItemsBy', v)} />
                )}
              </FormRow>
              <FormRow label="Inventory Valuation Method" required>
                {({ id, required }) => (
                  <Select id={id} required={required} options={VALUATION} value={c.valuation} onChange={(v) => set('valuation', v)} />
                )}
              </FormRow>
            </FormSection>

            {/* ── Orders ── */}
            <Stack gap={0} className="pt-16">
              <Heading>Orders</Heading>
            </Stack>
            <FormSection
              full={(
                <Stack gap={8}>
                  <Stack gap={4}>
                    <Text weight="medium">Sync orders fulfilled by</Text>
                    <Checkbox {...tick('syncSellerFulfilled')} label="Seller (Non-FA)"
                      description="Orders you pack and hand over to Flipkart's logistics. Stock is committed from the mapped location." />
                    <Checkbox {...tick('syncFbf')} label="Flipkart Fulfilment (FBF)"
                      description="Orders shipped from Flipkart's fulfilment centres. Synced for reporting; stock moves only if the FBF location is mapped." />
                  </Stack>
                  <Checkbox {...tick('createInvoices')} label="Create invoices for delivered orders"
                    description="An invoice is created when Flipkart marks the order delivered, using the GSTIN chosen while connecting." />
                </Stack>
              )}
            >
              <FormRow label="Import Orders From" required error={error}>
                {({ id, required, describedBy }) => (
                  <InputField id={id} type="date" required={required} aria-required={required || undefined}
                    aria-describedby={describedBy} error={Boolean(error)} value={c.importFrom}
                    onChange={(e) => { set('importFrom', e.target.value); setError(undefined); }} />
                )}
              </FormRow>
              <FormRow label="Sync Frequency" required>
                {({ id, required }) => (
                  <Select id={id} required={required} options={FREQUENCY} value={c.frequency} onChange={(v) => set('frequency', v)} />
                )}
              </FormRow>
              <FormRow label="Customer Mapping">
                {({ id }) => (
                  <Stack gap={3}>
                    <Inline gap={10}>
                      <Text as="label" size="body-sm" className="inline-flex items-center gap-3 whitespace-nowrap">
                        <Radio id={id} name="fk-customer" checked={c.customerPref === 'single'} onChange={() => set('customerPref', 'single')} />
                        Single Customer
                      </Text>
                      <Text as="label" size="body-sm" className="inline-flex items-center gap-3 whitespace-nowrap">
                        <Radio name="fk-customer" checked={c.customerPref === 'individual'} onChange={() => set('customerPref', 'individual')} />
                        Individual Customers
                      </Text>
                    </Inline>
                    <Text size="caption" tone="secondary">
                      {c.customerPref === 'single'
                        ? 'All orders are recorded against one customer, "Flipkart Customer".'
                        : 'A customer is created from each order\'s shipping name and address. Flipkart masks buyer emails and phone numbers.'}
                    </Text>
                  </Stack>
                )}
              </FormRow>
            </FormSection>

            {/* ── Returns & payments ── */}
            <Stack gap={0} className="pt-16">
              <Heading>Returns &amp; Payments</Heading>
            </Stack>
            {/* Two groups, each a parent toggle with its options nested under it —
                indented by the checkbox + its gap, so they align to the parent's label. */}
            <Stack gap={12}>
              <Stack gap={6}>
                <Checkbox {...tick('syncReturns')} label="Sync Returns"
                  description="Customer returns and courier returns (RTO) on Flipkart are recorded as sales returns against the original sales order." />
                {c.syncReturns ? (
                  <Stack gap={6} className="ms-checkbox ps-4">
                    <Checkbox {...tick('restockReturns')} label="Add returned items back to stock"
                      description="Returned items in a sellable condition are received into the location the order shipped from." />
                  </Stack>
                ) : null}
              </Stack>

              <Stack gap={6}>
                <Checkbox {...tick('syncSettlements')} label="Sync Settlements"
                  description="Flipkart's settlement payouts are recorded as payments against the invoices they settle." />
                {c.syncSettlements ? (
                  <Stack gap={8} className="ms-checkbox ps-4">
                    <Stack gap={3} className="max-w-sm">
                      <Text weight="medium">
                        Deposit To <Text as="span" tone="danger">*</Text>
                      </Text>
                      <Select ariaLabel="Deposit To" required options={DEPOSIT} value={c.depositTo} onChange={(v) => set('depositTo', v)} />
                      <Text size="caption" tone="secondary">The account settlement payouts are deposited into.</Text>
                    </Stack>
                    <Checkbox {...tick('recordFees')} label="Record Flipkart fees as expenses"
                      description="Commission, fixed fee, collection fee and shipping fee deducted from each settlement are recorded as expenses." />
                  </Stack>
                ) : null}
              </Stack>
            </Stack>

            {/* ── Setup Warehouses ── last, as in the Shopify reference */}
            <Stack gap={0} className="mt-16 pt-16 border-t border-border-divider">
              <Heading hint="Stock is synced per Flipkart pickup location. Map each one to the Zoho Inventory warehouse that holds its stock.">
                Setup Warehouses
              </Heading>
              <LocationMapping value={c.locations} onChange={(v) => set('locations', v)} />
            </Stack>
          </Stack>
        </CreatePage>
      </Surface>
    </Surface>
  );
}
