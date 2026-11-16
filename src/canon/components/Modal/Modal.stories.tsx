import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from '../Button/Button';
import { ProductTable } from '../ProductTable/ProductTable';
import type { ProductColumn, ProductRow } from '../ProductTable/types';
import { Stack, Text } from '../../primitives';

/**
 * §2.14 — and the source is the only component in the whole file with **no
 * binding at all**: 36 solid paints, *100% literal hex*, plus four raw
 * gradients. Nothing about looking at it says so.
 */
const meta = {
  title: 'Components/Modal', component: Modal,
  parameters: { layout: 'centered' },
  args: { open: false, onRequestClose: () => {}, title: 'Modal', children: null },
} satisfies Meta<typeof Modal>;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ long, footer = true }: { long?: boolean; footer?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Stack gap={6} align="center">
      <Button onClick={() => setOpen(true)}>Open the modal</Button>
      <Modal
        open={open} onRequestClose={() => setOpen(false)} title="Rearrange the Columns"
        primaryAction={footer ? { label: 'Save', onSelect: () => setOpen(false) } : undefined}
        secondaryAction={footer ? { label: 'Close', onSelect: () => setOpen(false) } : undefined}
      >
        <Stack gap={6} className="py-6 px-10">
          {Array.from({ length: long ? 40 : 3 }, (_, i) => (
            <Text key={i} tone="secondary">Line {i + 1} of the body.</Text>
          ))}
        </Stack>
      </Modal>
    </Stack>
  );
}

/**
 * **A NATIVE `<dialog>`, and that is the whole point.**
 *
 * **Press Escape.** It closes, and focus goes back to the button that opened it
 * — §2.14.8 calls focus management *"the single most-missed requirement in a
 * modal"*, and `showModal()` does both without a line of JavaScript. It also
 * makes everything behind it inert and puts the card in the **top layer**, which
 * no `z-index` anywhere can lose a fight with.
 *
 * **Tab around.** Focus never leaves the card. Not a hand-rolled trap — the
 * browser's.
 *
 * **Click the dim area.** It closes, because this dialog is dismissible. The
 * scrim is `::backdrop` painted with `overlay/scrim`, which §2.14.6 notes is the
 * **first role in the system with an alpha channel** — deliberately, because a
 * scrim has to dim what is behind it and so cannot alias an opaque primitive.
 */
export const Default: Story = { render: () => <Demo /> };

/**
 * **THE CARD HUGS; THE BODY SCROLLS.**
 *
 * §2.14.2: every variant in the source was **800 × 600 FIXED while its contents
 * hugged**. One carried roughly **260px of empty white** below its text, another
 * a **405px empty creative area**. Nothing overflowed and nothing errored — the
 * frame was simply bigger than the thing inside it, and had been since someone
 * drew the artboard.
 *
 * Forty lines here: the header and footer stay put and only the middle moves.
 */
export const LongBody: Story = { render: () => <Demo long /> };

/**
 * **NO FOOTER.** An announcement needs no action row, and §2.14's own `Got it`
 * is a caller's button rather than a built-in.
 *
 * Look at the card's edge while you are here: **one** radius, **one** border,
 * **one** shadow. The source had radii 16, 11 and 10, two borders and two
 * shadows for a single card, and the visible result was *"the line across the
 * middle of the top-aligned variant"* — a divider nobody designed, and which did
 * not appear in the other three.
 */
export const NoFooter: Story = { render: () => <Demo footer={false} /> };

/**
 * `reserveEndLane` — `padding-inline: 20px 30px`, for a `ProductTable` in the
 * dialog. Its delete control hangs in a 30 lane outside the card; at 20/20 the
 * body's `overflow-x: hidden` clips it by 10. Hover a row: the × must be whole.
 */
export const ReserveEndLane: Story = {
  render: () => {
    function Demo() {
      const [open, setOpen] = useState(true);
      const [rows, setRows] = useState<ProductRow[]>([
        { id: '1', kind: 'item', values: { batch: 'b1', qty: '6' } },
        { id: '2', kind: 'item', values: { batch: '', qty: '' } },
      ]);
      const columns: ProductColumn[] = [
        { id: 'batch', label: 'Batch Reference#*', kind: 'select', width: 360, min: 200, flex: true, placeholder: 'Select Batch',
          options: [{ value: 'b1', label: '23 b1', description: '40 pcs in Available' }, { value: 'b2', label: '23 b2', description: '30 pcs in Available' }] },
        { id: 'qty', label: 'Quantity Out*', kind: 'input', width: 160, min: 100, format: 'numeric', placeholder: '0' },
      ];
      return (
        <>
          <Button onClick={() => setOpen(true)}>Open</Button>
          <Modal open={open} title="Select Batches" width="lg" reserveEndLane onRequestClose={() => setOpen(false)}
            primaryAction={{ label: 'Save', onSelect: () => setOpen(false) }}
            secondaryAction={{ label: 'Cancel', onSelect: () => setOpen(false) }}>
            <ProductTable columns={columns} rows={rows} onRowsChange={setRows}
              onAddRow={() => setRows((r) => [...r, { id: String(Date.now()), kind: 'item', values: {} }])} />
          </Modal>
        </>
      );
    }
    return <Demo />;
  },
};
