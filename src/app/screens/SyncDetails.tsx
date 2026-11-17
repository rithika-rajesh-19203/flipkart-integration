import {
  Banner, PageHeader, StatusBadge, Surface, Table, Text,
} from '@canon';
import type { StatusBadgeStatus, TableColumn } from '@canon';
import { SYNC_TYPES, fmtDateTime, useFlipkart } from '../data/flipkart';
import type { FailedRecord, SyncedRecord } from '../data/flipkart';

/**
 * SYNC DETAILS — the records behind one run's count, the counterpart of
 * "Shopify - Established Sync Details".
 *
 *   synced → the records created or updated in Zoho Inventory (or pushed to
 *            Flipkart, for stock), with each one's identifying number as a link.
 *   failed → the Flipkart references that did not sync, with the reason, so
 *            the fix is obvious before the next run retries them.
 *
 * Columns follow the run's type: a sales order run lists Sales Order# /
 * Flipkart Order ID / Status; a stock run lists Item / Location / Quantity.
 */
const STATUS: Record<string, StatusBadgeStatus> = {
  Confirmed: 'accepted', Mapped: 'success', Sent: 'submitted', Delivered: 'success', Received: 'success',
};

export interface SyncDetailsProps {
  storeId: string;
  runId: string;
  kind: 'synced' | 'failed';
  onBack: () => void;
  onOutside: () => void;
}

export function SyncDetails({ storeId, runId, kind, onBack, onOutside }: SyncDetailsProps) {
  const { find } = useFlipkart();
  const store = find(storeId);
  const run = store?.history.find((r) => r.id === runId);
  if (!store || !run) return null;

  const meta = SYNC_TYPES[run.type];
  const [colA, colB, colC] = meta.columns;
  const numericC = run.type === 'stock' || run.type === 'settlements';
  const linkA = run.type !== 'items' && run.type !== 'stock';

  const syncedColumns: TableColumn<SyncedRecord & { id: string }>[] = [
    {
      id: 'a', header: colA,
      cell: (r) => (linkA
        ? <Text as="a" href="#" tone="link" weight="medium" onClick={onOutside}>{r.a}</Text>
        : <Text weight="medium">{r.a}</Text>),
    },
    { id: 'b', header: colB, cell: (r) => <Text>{r.b}</Text> },
    {
      id: 'c', header: colC, align: numericC ? 'end' : undefined,
      cell: (r) => (numericC ? <Text>{r.c}</Text> : <StatusBadge status={STATUS[r.c] ?? 'success'}>{r.c}</StatusBadge>),
    },
  ];
  const failedColumns: TableColumn<FailedRecord & { id: string }>[] = [
    { id: 'ref', header: run.type === 'items' || run.type === 'stock' ? 'SKU' : run.type === 'shipments' ? 'Sales Order#' : 'Flipkart Reference#', cell: (r) => <Text weight="medium">{r.reference}</Text> },
    { id: 'reason', header: 'Reason', cell: (r) => <Text tone="danger">{r.reason}</Text> },
    {
      id: 'status', header: 'Status',
      cell: (r) => (r.retry === 'synced' ? <StatusBadge status="success">Pushed again</StatusBadge>
        : r.retry === 'failed' ? <StatusBadge status="failed">Failed again</StatusBadge>
          : <StatusBadge status="failed">Failed</StatusBadge>),
    },
  ];

  const title = `Flipkart - ${kind === 'synced' ? 'Established' : 'Failed'} Sync Details`;
  const subtitle = `${meta.run} · ${fmtDateTime(run.at)} · ${store.account.storeName}`;

  return (
    <Surface tone="sunken" pad={4} radius="none" className="flex flex-col flex-1 min-h-0">
      <Surface tone="default" pad={0} radius="card" border="default" className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <PageHeader type="detail" title={title} subtitle={subtitle}
          parent={{ label: 'Sync History', href: '#' }} onBack={onBack} />
        {kind === 'failed' ? (
          <Surface pad={0} radius="none" className="px-10 pt-6">
            <Banner tone="warning">
              {run.type === 'shipments'
                ? 'Invoice the sales orders below, then select them in Sales → Sales Orders and use Push Shipments to sync their shipments again.'
                : 'Fix the reasons below in Zoho Inventory or Flipkart Seller Hub. Failed records are retried on the next sync.'}
            </Banner>
          </Surface>
        ) : null}
        {kind === 'synced' ? (
          <Table caption={title} columns={syncedColumns} rows={run.synced.map((r, i) => ({ ...r, id: `${i}` }))}
            rowKey={(r) => r.id} placement="page" className="flex-1 min-h-0" />
        ) : (
          <Table caption={title} columns={failedColumns} rows={run.failed.map((r, i) => ({ ...r, id: `${i}` }))}
            rowKey={(r) => r.id} placement="page" className="flex-1 min-h-0" />
        )}
      </Surface>
    </Surface>
  );
}
