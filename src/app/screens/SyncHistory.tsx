import {
  Divider, Icon, Inline, PageHeader, Select, Surface, Table, Text,
} from '@canon';
import type { TableColumn } from '@canon';
import { SYNC_TYPES, fmtDateTime, useFlipkart } from '../data/flipkart';
import type { SyncRun, SyncType } from '../data/flipkart';

/**
 * SYNC HISTORY — every run for one Flipkart store, the counterpart of
 * Shopify's Sync History.
 *
 * Opened two ways, and they are the same page: the header clock shows every
 * type ("Sync History"); a card's clock arrives pre-filtered to its type
 * ("Sales Order Sync History"). The title follows the Sync Type filter, so
 * changing the filter on either is the same as having arrived the other way.
 *
 * The counts are the way in to the records: Records Synced opens the
 * established records, Failures opens the failed ones with their reasons.
 */
export type StatusFilter = 'success' | 'failure' | 'both' | 'all';
export interface HistoryFilter { status: StatusFilter; type: SyncType | 'all' }

const STATUS_OPTIONS = [
  { value: 'success', label: 'Success' },
  { value: 'failure', label: 'Failure' },
  { value: 'both', label: 'Success and Failures' },
  { value: 'all', label: 'All Records' },
];
const TYPE_OPTIONS = [
  { value: 'all', label: 'All Records' },
  ...(Object.keys(SYNC_TYPES) as SyncType[]).map((t) => ({ value: t, label: SYNC_TYPES[t].filter })),
];

const matches = (r: SyncRun, f: HistoryFilter) => {
  if (f.type !== 'all' && r.type !== f.type) return false;
  if (f.status === 'success') return r.failed.length === 0 && r.synced.length > 0;
  if (f.status === 'failure') return r.failed.length > 0;
  if (f.status === 'both') return r.failed.length + r.synced.length > 0;
  return true;
};

export interface SyncHistoryProps {
  storeId: string;
  filter: HistoryFilter;
  onFilterChange: (f: HistoryFilter) => void;
  onBack: () => void;
  onOpenRecords: (runId: string, kind: 'synced' | 'failed') => void;
  onExport: (format: string) => void;
}

export function SyncHistory({ storeId, filter, onFilterChange, onBack, onOpenRecords, onExport }: SyncHistoryProps) {
  const { find } = useFlipkart();
  const store = find(storeId);
  if (!store) return null;

  const rows = store.history.filter((r) => matches(r, filter));
  const title = filter.type === 'all' ? 'Sync History' : `${SYNC_TYPES[filter.type].history} Sync History`;

  const count = (n: number, run: SyncRun, kind: 'synced' | 'failed') => (n > 0
    ? <Text as="a" href="#" tone="link" weight="medium" onClick={() => onOpenRecords(run.id, kind)}>{n}</Text>
    : <Text>0</Text>);

  const columns: TableColumn<SyncRun>[] = [
    { id: 'at', header: 'Sync Date & Time', cell: (r) => <Text>{fmtDateTime(r.at)}</Text> },
    { id: 'type', header: 'Sync Type', cell: (r) => <Text>{SYNC_TYPES[r.type].run}</Text> },
    { id: 'interval', header: 'Sync Interval', cell: (r) => <Text tone={r.interval ? 'default' : 'tertiary'}>{r.interval || '—'}</Text> },
    { id: 'synced', header: 'Records Synced', cell: (r) => count(r.synced.length, r, 'synced') },
    { id: 'failed', header: 'Failures', cell: (r) => count(r.failed.length, r, 'failed') },
    { id: 'total', header: 'Total Records', cell: (r) => <Text>{r.synced.length + r.failed.length}</Text> },
  ];

  return (
    <Surface tone="sunken" pad={4} radius="none" className="flex flex-col flex-1 min-h-0">
      <Surface tone="default" pad={0} radius="card" border="default" className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <PageHeader
          type="detail" title={title} subtitle={`Flipkart – ${store.account.storeName}`}
          parent={{ label: 'Connect Flipkart', href: '#' }} onBack={onBack}
          menuCta={{
            label: 'Export',
            onSelect: () => onExport('CSV'),
            entries: [
              { id: 'csv', label: 'Export as CSV', onSelect: () => onExport('CSV') },
              { id: 'xlsx', label: 'Export as XLSX', onSelect: () => onExport('XLSX') },
            ],
          }}
        />

        <Surface tone="sunken" pad={0} radius="none" className="px-10 py-4 border-b border-border-divider">
          <Inline gap={6} align="center" wrap>
            <Text size="overline" tone="secondary" className="whitespace-nowrap">View by:</Text>
            <Inline gap={3} align="center">
              <Text tone="secondary" className="whitespace-nowrap">Status:</Text>
              <Select ariaLabel="Status" searchable className="w-filter-field" options={STATUS_OPTIONS}
                value={filter.status} onChange={(v) => onFilterChange({ ...filter, status: v as StatusFilter })} />
            </Inline>
            <Divider orientation="vertical" />
            <Inline gap={3} align="center">
              <Text tone="secondary" className="whitespace-nowrap">Sync Type:</Text>
              <Select ariaLabel="Sync Type" searchable className="w-filter-field" options={TYPE_OPTIONS}
                value={filter.type} onChange={(v) => onFilterChange({ ...filter, type: v as HistoryFilter['type'] })} />
            </Inline>
          </Inline>
        </Surface>

        <Surface tone="sunken" pad={0} radius="none" className="px-10 py-4">
          <Inline gap={3} align="center">
            <Icon name="alert-circle" size="sm" tone="muted" />
            <Text size="body-sm" tone="secondary">
              <Text as="span" size="body-sm" weight="semibold">Note:</Text> Successfully synced record histories older than one month
              and failed record histories older than two months will be deleted.
            </Text>
          </Inline>
        </Surface>

        <Table
          caption={`${title} — ${rows.length} runs`}
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          placement="page"
          className="flex-1 min-h-0"
          empty={<Text tone="secondary">No sync runs match these filters yet.</Text>}
        />
      </Surface>
    </Surface>
  );
}
