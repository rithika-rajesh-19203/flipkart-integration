import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ProductTable } from './ProductTable';
import type { ProductColumn, ProductRow, TotalRow } from './types';
import { Stack, Text } from '../../primitives';

/**
 * The editable line-item grid. **Not `Table`** — that one is read-only, and §1
 * is explicit that one component must not do both jobs: *a data table's row
 * click navigates; a product table's row click puts a cursor in a cell.*
 *
 * Three findings from the md reproduce exactly against our own tokens:
 *
 * · **`surface/raised` cannot raise anything.** In Light it aliases
 *   `base/white`, the same alias as `surface/default`, so a lifted row would be
 *   a no-op; in Dark it aliases `neutral/1900`, the same as `surface/hover`, so
 *   a lifted row would be indistinguishable from a hovered one. The lift is a
 *   1px `primary/default` inset border instead. Open item 47.
 * · **`text/placeholder` is 2.85:1** — exactly the md's figure, and below what
 *   1.4.3 asks of text. It is never the only copy in a cell.
 * · **`surface/hover` is 1.07:1 in Dark.** The row tint is effectively
 *   invisible there, so the lane controls appearing are what actually signal
 *   the hover — reinforcement, not the signal.
 */
const meta = {
  title: 'Components/ProductTable', component: ProductTable,
  parameters: { layout: 'fullscreen' },
  args: { columns: [], rows: [], onRowsChange: () => {} },
} satisfies Meta<typeof ProductTable>;
export default meta;
type Story = StoryObj<typeof meta>;

const PRODUCTS = [
  { value: 'a4', label: 'A4 Copier Paper' },
  { value: 'toner', label: 'Toner Cartridge' },
  { value: 'binder', label: 'Ring Binder' },
];
const CATEGORIES = [
  { value: 'stationery', label: 'Stationery' },
  { value: 'consumables', label: 'Consumables' },
];

const COLUMNS: ProductColumn[] = [
  { id: 'product', label: 'Product', kind: 'select', width: 300, min: 120, options: PRODUCTS, placeholder: 'Select Product' },
  { id: 'description', label: 'Description', kind: 'input', width: 200, min: 120, placeholder: 'Description' },
  //  §4.1 — Qty, Rate and Discount are LEFT-aligned. That is deliberate for an
  //  editable grid: the caret lands where the eye already is, and a
  //  right-aligned input whose value grows leftward is disorienting while
  //  typing. The totals card right-aligns, because those are read, not typed.
  { id: 'qty', label: 'Qty', kind: 'input', width: 200, min: 80, format: 'numeric', placeholder: '0' },
  { id: 'rate', label: 'Rate', kind: 'input', width: 200, min: 80, format: 'decimal', placeholder: '0.00' },
  { id: 'category', label: 'Category', kind: 'select', width: 215, min: 120, options: CATEGORIES, placeholder: 'Select Category' },
  //  Exactly one flexible column, and it still needs a real min — §4.2.
  { id: 'discount', label: 'Discount', kind: 'input', width: 126, min: 80, flex: true, resizable: false, format: 'numeric', placeholder: '0' },
];

const ROWS: ProductRow[] = [
  { id: '1', kind: 'item', values: { product: 'a4', description: 'A4 80gsm, 500 sheets', qty: '20', rate: '240.00', category: 'stationery', discount: '5' } },
  { id: 'g1', kind: 'group', label: 'Item Header' },
  { id: '2', kind: 'item', values: { product: 'toner', description: 'Black, high yield', qty: '4', rate: '3,150.00', category: 'consumables', discount: '0' } },
  { id: '3', kind: 'item', values: { product: '', description: '', qty: '', rate: '', category: '', discount: '' } },
];

const TOTALS: TotalRow[] = [
  { id: 'sub', label: 'Sub Total', kind: 'static', amount: '₹17,400.00' },
  { id: 'disc', label: 'Discount', kind: 'editable', input: '5', amount: '−₹870.00' },
  { id: 'ship', label: 'Shipping Charges', kind: 'editable', input: '0', amount: '₹0.00' },
  { id: 'total', label: 'Total', kind: 'emphasis', amount: '₹16,530.00' },
];

/**
 * **The host body needs `padding-inline: 20px 30px`, not `20px 20px`** — §2.1.
 * The right lane is 30 and a symmetric body clips the delete control by 10. The
 * wrapper below is that host.
 */
function Host({ rows: initial = ROWS, totals = TOTALS as TotalRow[] | undefined, copyAll = false }) {
  const [rows, setRows] = useState(initial);
  //  The table renders the action; what it does is the host's. Here: the first
  //  line's category into every line, disabled while that line has none.
  const first = rows.find((r) => r.kind === 'item')?.values?.category ?? '';
  const columns = copyAll
    ? COLUMNS.map((c) => (c.id === 'category' ? {
      ...c,
      headerAction: {
        label: 'Copy to all',
        disabled: !first,
        onSelect: () => setRows((rs) => rs.map((r) => (r.kind === 'item' ? { ...r, values: { ...r.values, category: first } } : r))),
      },
    } : c))
    : COLUMNS;
  return (
    <div className="bg-surface-default ps-10 pe-15 py-16">
      <ProductTable
        title="Add Products"
        columns={columns}
        rows={rows}
        onRowsChange={setRows}
        totals={totals}
        onAddRow={() => setRows((r) => [...r, { id: String(Date.now()), kind: 'item', values: {} }])}
        onAddGroup={() => setRows((r) => [...r, { id: String(Date.now()), kind: 'group', label: 'Item Header' }])}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Host /> };

/**
 * §15 — the head band is already meaningful, so the empty state is one 34px row
 * of copy rather than an illustration. The lanes are present but empty.
 */
export const Empty: Story = { render: () => <Host rows={[]} totals={undefined} /> };

/**
 * §11 — a group row is one full-width cell: no dividers, no index, but the rail
 * `⋯` stays so the group can be renamed or removed. **The index counts across
 * the break** — 1, *Item Header*, 2, 3 — because those are the document's line
 * numbers.
 */
export const GroupRows: Story = { render: () => <Host /> };

/**
 * **Try the keyboard.** Tab to a row's grip: Space lifts it, ↑ ↓ move it, Space
 * drops, Escape cancels, and every move is announced through a polite live
 * region. Tab to a column boundary: it is a `role="separator"` with
 * `aria-valuenow` in px, and ← → resize by 8.
 */
export const Keyboard: Story = { render: () => <Host /> };

/**
 * `headerAction` — a text action under a column's label. The head grows to
 * `pt-head-tall` and the lane controls move down with it; hover a row and check
 * its delete control still sits on it. **Copy to all** writes the first line's Category into every line; clear
 * the first line's Category and it disables.
 */
export const HeaderAction: Story = { render: () => <Host copyAll /> };

/** The first line has no value, so there is nothing to copy. */
export const HeaderActionDisabled: Story = {
  render: () => <Host copyAll rows={[ROWS[3], ROWS[0], ROWS[2]]} />,
};

/**
 * `cellAction` — a text action at the end of an input cell, inside the 34 row.
 * Qty is the case: a batch-tracked line says **Select Batches** until its picks
 * add up, then shows a tick and how many. `attention` and `done` are states, not
 * colours: the glyph carries them and the label stays a link.
 */
export const CellAction: Story = {
  render: () => {
    function Demo() {
      const [rows, setRows] = useState<ProductRow[]>([
        { id: '1', kind: 'item', values: { product: 'a4', qty: '10' } },
        { id: '2', kind: 'item', values: { product: 'toner', qty: '4' } },
        { id: '3', kind: 'item', values: { product: 'stapler', qty: '2' } },
      ]);
      const [done, setDone] = useState<Record<string, boolean>>({ 2: true });
      const columns: ProductColumn[] = [
        COLUMNS[0],
        {
          ...COLUMNS[2], width: 240,
          cellAction: (r) => (r.id === '3' ? null : {
            label: done[r.id] ? '2 batches' : 'Select Batches',
            tone: done[r.id] ? 'done' : 'attention',
            onSelect: () => setDone((d) => ({ ...d, [r.id]: !d[r.id] })),
          }),
        },
        { ...COLUMNS[4], flex: true },
      ];
      return (
        <div className="bg-surface-default ps-10 pe-15 py-16">
          <ProductTable title="Select Items" columns={columns} rows={rows} onRowsChange={setRows}
            onAddRow={() => setRows((r) => [...r, { id: String(Date.now()), kind: 'item', values: {} }])} />
        </div>
      );
    }
    return <Demo />;
  },
};

/**
 * The two footers that are not the full split button. **No `onAddGroup`**: a
 * plain Add New Row — a split button whose other entry is a dead Add Header is
 * a menu of nothing. **No `onAddRow`**: no add control at all, for rows that
 * arrive some other way (picked serials). And `emptyText` for the copy.
 */
export const FooterVariants: Story = {
  render: () => {
    function Demo() {
      const [a, setA] = useState<ProductRow[]>([ROWS[0]]);
      const [b, setB] = useState<ProductRow[]>([]);
      return (
        <div className="bg-surface-default ps-10 pe-15 py-16">
          <Stack gap={16}>
            <ProductTable title="Rows only" columns={COLUMNS.slice(0, 3).map((c, i) => (i === 2 ? { ...c, flex: true } : c))}
              rows={a} onRowsChange={setA}
              onAddRow={() => setA((r) => [...r, { id: String(Date.now()), kind: 'item', values: {} }])} />
            <ProductTable title="No add control"
              columns={[{ id: 'serial', label: 'Serial Numbers', kind: 'read-only', width: 300, min: 160, flex: true }]}
              rows={b} onRowsChange={setB} emptyText="No serial number has been added." />
          </Stack>
        </div>
      );
    }
    return <Demo />;
  },
};

export const Dark: Story = {
  render: () => (
    <div data-theme="dark">
      <Stack gap={0}>
        <Text size="overline" tone="secondary" className="ps-10 pt-8 bg-surface-default block">dark</Text>
        <Host copyAll />
      </Stack>
    </div>
  ),
};
