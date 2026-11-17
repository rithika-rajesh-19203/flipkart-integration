import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Banner, Button, Checkbox, CreatePage, FormRow, FormSection, Icon, Inline, InputField, PageHeader, Radio,
  Select, Stack, Surface, Text,
} from '@canon';
import { useFlipkart } from '../data/flipkart';
import type { FlipkartConfig } from '../data/flipkart';
import { LocationMapping } from './LocationMapping';

/**
 * FLIPKART CONFIGURATION — the Flipkart counterpart of "Shopify Configuration",
 * in the same order: Products, Orders, "Choose which modules to sync",
 * Setup Warehouses, then Save / Cancel.
 *
 * Where Flipkart differs from Shopify, the option follows Flipkart:
 *   · no shipment emails and no archived orders — Flipkart masks buyer
 *     emails, and has no archive state;
 *   · "remitted taxes" is the TCS Flipkart collects under GST;
 *   · orders are chosen by who fulfils them (Seller / FBF);
 *   · Packages and Shipments carries Flipkart's rule as a note: a shipment
 *     whose sales order is not invoiced fails, and is pushed again from Sales Orders.
 *
 * Modules, once saved on, are locked on — as the reference's banner says.
 */
const MAP_ITEMS = [
  { value: 'sku', label: 'SKU (Seller SKU ID)' },
  { value: 'fsn', label: 'FSN (Flipkart Serial Number)' },
  { value: 'sku-name', label: 'SKU or Name' },
];
const VALUATION = [
  { value: 'fifo', label: 'FIFO (First In, First Out)' },
  { value: 'wac', label: 'Weighted Average Cost' },
];
const TAX_EXEMPTIONS = [
  { value: 'TAXEXCEPT', label: 'TAXEXCEPT' },
  { value: 'SEZ', label: 'SEZ – Special Economic Zone' },
];
const FREQUENCY = [
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '12h', label: '12 Hours' },
];
const MAP_CUSTOMERS = [
  { value: 'email-name', label: 'Email or Name' },
  { value: 'phone-name', label: 'Phone or Name' },
  { value: 'name', label: 'Name' },
];
const DEPOSIT = [
  { value: 'flipkart-clearing', label: 'Flipkart Clearing Account' },
  { value: 'hdfc-current', label: 'HDFC Bank – Current A/c' },
];

function Heading({ children }: { children: ReactNode }) {
  return <Stack gap={0} className="pb-8"><Text size="subheading">{children}</Text></Stack>;
}

/** Options that belong to the checkbox above — aligned to its label, not its box. */
function Nested({ children, gap = 6 }: { children: ReactNode; gap?: 4 | 6 | 8 }) {
  return <Stack gap={gap} className="ms-checkbox ps-4">{children}</Stack>;
}

/** A stacked label + control, for a field that lives inside a nested group. */
function InlineField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <Stack gap={3} className="max-w-sm">
      <Text weight="medium">{label}{required ? <Text as="span" tone="danger"> *</Text> : null}</Text>
      {children}
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
  const saved = store!.config;
  const [c, setC] = useState<FlipkartConfig>(() => saved);
  const [error, setError] = useState<string | undefined>();
  const [editMapping, setEditMapping] = useState(firstTime);
  const set = <K extends keyof FlipkartConfig>(k: K, v: FlipkartConfig[K]) => setC((p) => ({ ...p, [k]: v }));
  const tick = (k: keyof FlipkartConfig) => ({
    selection: (c[k] ? 'checked' : 'unchecked') as 'checked' | 'unchecked',
    onSelectionChange: (n: string) => set(k, (n === 'checked') as never),
  });
  //  A module that was saved on cannot be turned off again.
  const module = (k: keyof FlipkartConfig) => ({ ...tick(k), disabled: !firstTime && Boolean(saved[k]) });

  const save = () => {
    if (!c.importFrom) { setError('Choose the date to import Flipkart orders from.'); return; }
    if (!Object.values(c.locations).some(Boolean)) { setError(undefined); setEditMapping(true); return; }
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
                  <Stack gap={6}>
                    <Checkbox {...tick('syncStock')} label="Sync Stock"
                      description="Enable this to regularly update stock changes from Zoho Inventory to Flipkart." />
                    {c.syncStock ? (
                      <Nested>
                        <InlineField label="Buffer Stock">
                          <InputField aria-label="Buffer Stock" format="numeric" value={c.bufferStock}
                            onChange={(e) => set('bufferStock', e.target.value)} />
                          <Text size="caption" tone="secondary">Units held back from Flipkart for each item, so other channels are not oversold.</Text>
                        </InlineField>
                      </Nested>
                    ) : null}
                  </Stack>
                  <Checkbox {...tick('syncImages')} label="Sync Item Images"
                    description="Enable this to sync item images from Flipkart to Zoho Inventory." />
                  <Stack gap={6}>
                    <Checkbox {...tick('fetchStockCounts')} label="Fetch Stock Counts"
                      description="This updates your Flipkart stock counts with Zoho Inventory. This only happens once during the initial sync." />
                    {c.fetchStockCounts ? (
                      <Nested>
                        <Banner tone="info">
                          Items that do not exist in Zoho Inventory will be fetched automatically and the opening stock will be recorded as an inventory adjustment.
                        </Banner>
                      </Nested>
                    ) : null}
                  </Stack>
                  <Checkbox {...tick('syncAllLocations')} label="Activate Stock Syncing Across Flipkart Locations"
                    description="Enabling this will automatically sync inventory to all mapped Flipkart locations, including those previously disabled for the item being synced. Ensure your mapped locations are properly configured to support accurate inventory management." />
                </Stack>
              )}
            >
              <FormRow label="Map Items" required>
                {({ id, required }) => (
                  <Select id={id} required={required} options={MAP_ITEMS} value={c.mapItemsBy} onChange={(v) => set('mapItemsBy', v)} />
                )}
              </FormRow>
              <FormRow label="Inventory Valuation Method" required>
                {({ id, required }) => (
                  <Select id={id} required={required} options={VALUATION} value={c.valuation} onChange={(v) => set('valuation', v)} />
                )}
              </FormRow>
              <FormRow label="Tax Exemption">
                {({ id }) => (
                  <Select id={id} options={TAX_EXEMPTIONS} value={c.taxExemption} placeholder="Select a tax exemption"
                    onChange={(v) => set('taxExemption', v)} />
                )}
              </FormRow>
            </FormSection>

            {/* ── Orders ── */}
            <Stack gap={0} className="pt-6">
              <Heading>Orders</Heading>
            </Stack>
            <FormSection
              full={(
                <Stack gap={8}>
                  <Stack gap={4}>
                    <Stack gap={1}>
                      <Text weight="medium">Sync orders fulfilled by</Text>
                      <Text size="body-sm" tone="secondary">Choose which Flipkart orders to bring into Zoho Inventory.</Text>
                    </Stack>
                    <Checkbox {...tick('syncSellerFulfilled')} label="Seller (Non-FA)"
                      description="Orders you pack and hand over to Flipkart's logistics. Stock is committed from the mapped location." />
                    <Checkbox {...tick('syncFbf')} label="Flipkart Fulfilment (FBF)"
                      description="Orders shipped from Flipkart's fulfilment centres. Synced for reporting; stock moves only if the FBF location is mapped." />
                  </Stack>
                  <Checkbox {...tick('remittedTaxes')} label="Include TCS collected by Flipkart"
                    description="Tax collected at source by Flipkart on each order is fetched and mapped to the preferred tax authority in Zoho Inventory." />
                  <Stack gap={4}>
                    <Stack gap={1}>
                      <Text weight="medium">Sync Cancelled Orders</Text>
                      <Text size="body-sm" tone="secondary">Choose how you want to sync cancelled orders from Flipkart.</Text>
                    </Stack>
                    <Checkbox {...tick('syncPartialCancel')} label="Enable this to sync partially cancelled orders from Flipkart." />
                    <Checkbox {...tick('syncFullCancel')} label="Enable this to sync fully cancelled orders from Flipkart." />
                  </Stack>
                  <Checkbox {...tick('syncUpdatedOrders')} label="Sync Updated Sales Orders"
                    description="Changes made to synced orders in Flipkart will be automatically updated in Zoho Inventory." />
                  <Checkbox {...tick('sameOrderNumber')} label="Sync Sales Order with the same number as in Flipkart"
                    description="When enabled, the Sales Orders synced from Flipkart will retain the Flipkart Order ID as the Sales Order number instead of using the auto-generated number series." />

                  {/* ── Modules ── */}
                  <Stack gap={6} className="pt-4">
                    <Text weight="medium">Choose which modules to sync from Flipkart</Text>
                    <Banner tone="info">Once enabled and saved, you cannot disable or stop syncing these modules.</Banner>

                    <Stack gap={4}>
                      <Checkbox {...module('createInvoices')} label="Invoice" />
                      {c.createInvoices ? (
                        <Nested gap={4}>
                          <Checkbox {...module('syncSettlements')} label="Payments"
                            description="Flipkart's settlement payouts are recorded as payments against the invoices they settle." />
                          {c.syncSettlements ? (
                            <Nested gap={8}>
                              <InlineField label="Deposit To" required>
                                <Select ariaLabel="Deposit To" required options={DEPOSIT} value={c.depositTo} onChange={(v) => set('depositTo', v)} />
                              </InlineField>
                              <Checkbox {...tick('recordFees')} label="Record Flipkart fees as expenses"
                                description="Commission, fixed fee, collection fee and shipping fee deducted from each settlement are recorded as expenses." />
                            </Nested>
                          ) : null}
                        </Nested>
                      ) : null}
                    </Stack>

                    <Stack gap={4}>
                      <Checkbox selection="checked" disabled label="Packages and Shipments"
                        description="Always synced with orders." />
                      <Nested gap={4}>
                        <Banner tone={c.createInvoices ? 'info' : 'warning'}>
                          <Text as="span" size="body-sm" weight="semibold" tone="inherit">Note:</Text> Flipkart accepts a shipment only after its
                          sales order is invoiced. Shipments for sales orders without an invoice will fail to sync. Once the order is
                          invoiced, select it in Sales Orders and use Push Shipments to sync it again.
                          {c.createInvoices ? null : ' Turn on Invoice above, or every Flipkart shipment will fail.'}
                        </Banner>
                      </Nested>
                    </Stack>

                    <Stack gap={4}>
                      <Checkbox {...module('syncReturns')} label="Sales Return" />
                      {c.syncReturns ? (
                        <Nested gap={4}>
                          <Checkbox {...module('syncCreditNotes')} label="Credit Note" />
                          <Checkbox {...tick('restockReturns')} label="Add returned items back to stock"
                            description="Returned items in a sellable condition are received into the location the order shipped from." />
                        </Nested>
                      ) : null}
                    </Stack>
                  </Stack>

                  <Checkbox {...tick('sameInvoiceNumber')} label="Sync Invoice with the same number as in Flipkart"
                    description="When enabled, the Invoices synced from Flipkart will retain the same Invoice number as in Flipkart instead of using the auto-generated number series." />
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
              <FormRow label="Customer Mapping Preference">
                {({ id }) => (
                  <Stack gap={3}>
                    <Inline gap={10}>
                      <Text as="label" size="body-sm" className="inline-flex items-center gap-3 whitespace-nowrap">
                        <Radio id={id} name="fk-customer" checked={c.customerPref === 'single'} onChange={() => set('customerPref', 'single')} />
                        Single Customer
                      </Text>
                      <Text as="label" size="body-sm" className="inline-flex items-center gap-3 whitespace-nowrap">
                        <Radio name="fk-customer" checked={c.customerPref === 'individual'} onChange={() => set('customerPref', 'individual')} />
                        Custom
                      </Text>
                    </Inline>
                    {c.customerPref === 'single' ? (
                      <Text size="caption" tone="secondary">All orders are recorded against one customer, &quot;Flipkart Customer&quot;.</Text>
                    ) : null}
                  </Stack>
                )}
              </FormRow>
              {c.customerPref === 'individual' ? (
                <FormRow label="Map Customers" required>
                  {({ id, required }) => (
                    <Select id={id} required={required} options={MAP_CUSTOMERS} value={c.mapCustomersBy} onChange={(v) => set('mapCustomersBy', v)} />
                  )}
                </FormRow>
              ) : null}
            </FormSection>

            {/* ── Setup Warehouses ── */}
            <Stack gap={0} className="pt-6">
              <Heading>Setup Warehouses</Heading>
              <Stack gap={8}>
                {!firstTime && !editMapping ? (
                  <Surface tone="sunken" pad={10} radius="md">
                    <Inline gap={8} align="center">
                      <Text size="body-sm">Your warehouse mapping is set as below</Text>
                      <Text as="a" href="#" tone="link" size="body-sm" className="inline-flex items-center gap-2"
                        onClick={() => setEditMapping(true)}>
                        <Icon name="edit" size="sm" /> Edit Mapping
                      </Text>
                    </Inline>
                  </Surface>
                ) : null}
                <LocationMapping value={c.locations} onChange={(v) => set('locations', v)} disabled={!editMapping} />
              </Stack>
            </Stack>
          </Stack>
        </CreatePage>
      </Surface>
    </Surface>
  );
}
