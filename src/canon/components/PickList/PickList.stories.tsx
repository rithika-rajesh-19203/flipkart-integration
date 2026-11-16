import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { PickList } from './PickList';
import type { PickListOption } from './PickList';
import { Modal } from '../Modal/Modal';
import { Select } from '../Select/Select';
import { Checkbox } from '../Checkbox/Checkbox';
import { InputField } from '../InputField/InputField';
import { Stack } from '../../primitives';

/**
 * "Add Items in Bulk" — the catalogue left, the basket right. Review
 * in all four Pane × Brand combinations; the selected row's tint is
 * `surface/hover` precisely because `surface/selected` vanishes in Dark.
 *
 * What to check:
 * - **Click a row** — it tints, its text turns `primary/text`, a check appears,
 *   and the aside does NOT move (the check's slot is reserved on every row).
 * - **Tab into the list once**, then ↑ ↓ Home End to move and Space / Enter to
 *   toggle. The list is ONE tab stop.
 * - The count beside "Selected Items" is a polite live region.
 * - Each pane scrolls on its own; the actions never move.
 */
const meta = {
  title: 'Components/PickList', parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

const OPTIONS: PickListOption[] = [
  { id: 'a', label: 'A item', meta: 'SKU: SKU001  Rate: Rs.499.00', aside: { label: 'Stock on Hand', value: '909.00 pcs', positive: true } },
  { id: 'b', label: 'A-line dress-blue', meta: 'SKU: A-LINEDRESS-BLUE  Rate: Rs.100.00' },
  { id: 'c', label: 'A-line dress-green', meta: 'SKU: A-LINEDRESS-GREEN  Rate: Rs.100.00' },
  { id: 'd', label: 'A-line dress-red', meta: 'SKU: A-LINEDRESS-RED  Rate: Rs.100.00' },
  { id: 'e', label: 'A1 Chips', meta: 'Rate: Rs.100.00', aside: { label: 'Stock on Hand', value: '129.00 box', positive: true } },
  { id: 'f', label: 'AA', meta: 'Rate: Rs.100.00', aside: { label: 'Stock on Hand', value: '9.00 pcs', positive: true } },
  { id: 'g', label: 'Abstract Art ( Large )', meta: 'SKU: IHP6  Rate: Rs.2,500.00' },
  { id: 'h', label: 'Abstract Art ( Medium )', meta: 'SKU: IHP7  Rate: Rs.1,800.00' },
  { id: 'i', label: 'An item with a name long enough to wrap onto a second line in the left pane',
    meta: 'SKU: A-VERY-LONG-STOCK-KEEPING-UNIT-CODE  Rate: Rs.12,34,567.00',
    aside: { label: 'Stock on Hand', value: '0.00 pcs' } },
];

function Live({ start = [], options = OPTIONS, quantities = false }:
  { start?: string[]; options?: PickListOption[]; quantities?: boolean }) {
  const [selected, setSelected] = useState<string[]>(start);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sub, setSub] = useState(false);
  const [qty, setQty] = useState<Record<string, string>>({});
  const shown = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  const total = selected.reduce((n, id) => n + (Number(qty[id]) || 1), 0);
  return (
    <Modal open title="Add Items in Bulk" width="xl" flush onRequestClose={() => false}>
      <PickList
        label="Items"
        options={shown}
        selected={selected}
        onSelectedChange={setSelected}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Type to search or scan the barcode of the item"
        filters={(
          <Stack gap={4}>
            <Select aria-label="Category" placeholder="Category" value={category}
              onChange={setCategory}
              options={[{ value: 'apparel', label: 'Apparel' }, { value: 'art', label: 'Art' }]} />
            <Checkbox label="Include sub-categories" selection={sub ? 'checked' : 'unchecked'}
              onSelectionChange={(n) => setSub(n === 'checked')} />
          </Stack>
        )}
        summary={`Total Quantity: ${selected.length ? total : 0}`}
        renderSelected={quantities ? (id) => {
          const o = options.find((x) => x.id === id)!;
          return {
            label: o.label, meta: o.meta,
            control: (
              <InputField aria-label={`Quantity of ${o.label}`} format="decimal"
                value={qty[id] ?? '1'} onChange={(e) => setQty((q) => ({ ...q, [id]: e.target.value }))} />
            ),
          };
        } : undefined}
        primaryAction={{ label: 'Add Items', disabled: !selected.length, onSelect: () => {} }}
        secondaryAction={{ label: 'Cancel', onSelect: () => {} }}
      />
    </Modal>
  );
}

/** Nothing picked — the basket's empty state, and Add Items disabled. */
export const Empty: Story = { render: () => <Live /> };

/** Three picked. Hover a basket row's ✕ — it turns `danger`, and removes. */
export const Picked: Story = { render: () => <Live start={['a', 'd', 'e']} /> };

/** A quantity field in each basket row, and the summary counting them. */
export const WithQuantities: Story = { render: () => <Live start={['a', 'e']} quantities /> };

/** The longest realistic row: the name and the meta wrap, the aside does not. */
export const LongContent: Story = { render: () => <Live start={['i']} /> };

/** A search that matches nothing. */
export const NoMatches: Story = { render: () => <Live options={[]} /> };
