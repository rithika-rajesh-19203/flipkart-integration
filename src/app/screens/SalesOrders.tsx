import { useState } from 'react';
import {
  ActionBar, Avatar, Inline, PageChrome, PageHeader, StatusBadge, Surface, Table, Text,
} from '@canon';
import type { TableColumn } from '@canon';
import { useFlipkart } from '../data/flipkart';
import type { SalesOrder } from '../data/flipkart';

/**
 * SALES → SALES ORDERS — the list view, composed the way every list view is
 * (CLAUDE.md "Every list view is the same list view"): PageChrome around the
 * header, the ActionBar swapped in while rows are ticked, a bounded Surface so
 * the table scrolls and the chrome stays put.
 *
 * The reason it is in this prototype is one bulk action: **Push Shipments**, in
 * the ⋯ menu. It manually syncs the selected orders' shipments to Flipkart — the
 * way back for a shipment that failed because its sales order was not
 * invoiced. Invoice the order (Convert to Invoice works here), tick it, push.
 *
 * The bar keeps the reference's order: Bulk Update, the PDF / print / mail
 * trio, Convert to Invoice, Mark as Confirmed, Mark shipment as fulfilled, and
 * everything else — Push Shipments first — behind the ⋯.
 */
const VIEWS = [
  { id: 'all', label: 'All Sales Orders' },
  { id: 'flipkart', label: 'Flipkart Orders' },
];

export interface SalesOrdersProps {
  onNotify: (text: string, tone?: 'success' | 'info') => void;
  onOutside: () => void;
}

export function SalesOrders({ onNotify, onOutside }: SalesOrdersProps) {
  const { salesOrders, activeStores, invoiceOrders, pushShipments } = useFlipkart();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMenu, setViewMenu] = useState(false);
  const ids = [...selected];
  const n = ids.length;
  const clear = () => setSelected(new Set());

  const push = () => {
    const store = activeStores[0];
    if (!store) {
      onNotify('Connect Flipkart in Settings → eCommerce before pushing shipments.', 'info');
      return;
    }
    const { pushed, failed } = pushShipments(store.id, ids);
    clear();
    if (failed === 0) {
      onNotify(`${pushed} shipment${pushed === 1 ? '' : 's'} pushed to Flipkart.`);
    } else {
      onNotify(
        `${pushed} shipment${pushed === 1 ? '' : 's'} pushed to Flipkart. ${failed} failed — the sales order is not invoiced. See Shipment Sync History.`,
        'info',
      );
    }
  };

  const toInvoice = () => {
    invoiceOrders(ids);
    clear();
    onNotify(`${n} sales order${n === 1 ? '' : 's'} converted to invoice${n === 1 ? '' : 's'}.`);
  };

  const columns: TableColumn<SalesOrder>[] = [
    { id: 'date', header: 'Date', cell: (o) => <Text>{o.date}</Text> },
    {
      id: 'number', header: 'Sales Order#',
      cell: (o) => <Text as="a" href="#" tone="link" weight="medium" onClick={onOutside}>{o.number}</Text>,
    },
    { id: 'reference', header: 'Reference#', cell: (o) => <Text>{o.reference}</Text> },
    {
      id: 'customer', header: 'Customer Name',
      cell: (o) => (
        <Inline gap={4} align="center">
          <Avatar name={o.customer} size="sm" />
          <Text>{o.customer}</Text>
        </Inline>
      ),
    },
    {
      id: 'status', header: 'Order Status',
      cell: (o) => (o.status === 'closed'
        ? <StatusBadge status="success">Closed</StatusBadge>
        : <StatusBadge status="submitted">Confirmed</StatusBadge>),
    },
    {
      id: 'invoiced', header: 'Invoiced',
      cell: (o) => (o.invoiced
        ? <StatusBadge status="submitted">Invoiced</StatusBadge>
        : <StatusBadge status="draft">Not Invoiced</StatusBadge>),
    },
    {
      id: 'payment', header: 'Payment',
      cell: (o) => (o.paid
        ? <StatusBadge status="success">Paid</StatusBadge>
        : <StatusBadge status="draft">Unpaid</StatusBadge>),
    },
  ];

  return (
    <>
      <PageChrome bar={n > 0 ? (
        <ActionBar
          count={n} total={salesOrders.length}
          primary={{ id: 'bulk', label: 'Bulk Update', onSelect: onOutside }}
          iconActions={[
            { id: 'pdf', label: 'Download PDF', icon: 'pdf', onSelect: onOutside },
            { id: 'print', label: 'Print', icon: 'print', onSelect: onOutside },
            { id: 'mail', label: 'Email', icon: 'mail', onSelect: onOutside },
          ]}
          actions={[
            { id: 'invoice', label: 'Convert to Invoice', onSelect: toInvoice },
            { id: 'confirm', label: 'Mark as Confirmed', onSelect: onOutside },
            { id: 'fulfilled', label: 'Mark shipment as fulfilled', onSelect: onOutside },
            { id: 'push', label: 'Push Shipments', onSelect: push },
            { id: 'backorder', label: 'Backorder', onSelect: onOutside },
            { id: 'dropship', label: 'Dropship', onSelect: onOutside },
            { id: 'picklist', label: 'Generate picklist', onSelect: onOutside },
            { id: 'quick-ship', label: 'Create Quick Shipments', onSelect: onOutside },
            { id: 'merge', label: 'Merge Sales Orders', onSelect: onOutside },
            { id: 'cancel-items', label: 'Bulk Cancel Items', onSelect: onOutside },
            { id: 'reopen-items', label: 'Bulk reopen canceled items', onSelect: onOutside },
            { id: 'delete', label: 'Delete', onSelect: onOutside },
          ]}
          maxVisible={3}
          onToggleAll={(all) => setSelected(all ? new Set(salesOrders.map((o) => o.id)) : new Set())}
          onClear={clear}
        />
      ) : undefined}
      >
        <PageHeader
          type="list" title="All Sales Orders"
          views={VIEWS} onViewChange={() => { setViewMenu(false); onOutside(); }}
          viewMenuOpen={viewMenu} onViewMenuToggle={() => setViewMenu((o) => !o)}
          cta={{ label: 'New', icon: 'plus', onSelect: onOutside }}
          trailing={[{ id: 'more', label: 'More actions', icon: 'more', onSelect: onOutside }]}
        />
      </PageChrome>

      <Surface tone="default" pad={0} radius="none" className="flex-1 min-h-0">
        <Table
          caption="All Sales Orders"
          columns={columns}
          rows={salesOrders}
          rowKey={(o) => o.id}
          placement="page"
          selection={{
            selected, onChange: setSelected, allLabel: 'Select all sales orders',
            rowLabel: (o) => `Select sales order ${o.number}`,
          }}
          className="flex-1 min-h-0"
        />
      </Surface>
    </>
  );
}
