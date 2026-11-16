import type { SelectOption } from '../Select/Select';
import type { InputFormat } from '../InputField/InputField';

export type ProductCellKind = 'input' | 'select' | 'read-only';

export interface ProductColumn {
  id: string;
  label: string;
  kind: ProductCellKind;
  /** px. User-resizable unless `resizable: false`. */
  width: number;
  min: number;
  /** EXACTLY ONE column absorbs the slack. §4.2 — and it still needs `min`. */
  flex?: boolean;
  align?: 'start' | 'center';
  resizable?: boolean;
  /** `kind: 'select'` only. */
  options?: SelectOption[];
  placeholder?: string;
  /**
   * `kind: 'input'` only. What the cell will accept — Qty and Discount are
   * `numeric`, Rate is `decimal`. Filtered on the way in, so a paste cannot get
   * past it either.
   *
   * §4.1's left alignment is about where the CARET goes; this is about what it
   * can put there. A grid whose Qty column accepts "3 boxes" produces a total
   * of NaN, and the first place anyone sees that is the totals card.
   */
  format?: InputFormat;
  /** Renders `text/secondary` regular rather than `text/default` medium. */
  muted?: boolean;
  /**
   * A text action stacked UNDER the column's label — "Copy to all". Any column
   * having one makes the whole head `pt-head-tall` (48), and the lane controls
   * move down with it via `pt-spacer-tall`, so they stay on their rows.
   *
   * The table only renders it. What the action does to the rows is the
   * screen's, the same way sorting is the screen's on `Table`.
   */
  headerAction?: { label: string; onSelect: () => void; disabled?: boolean };
  /**
   * `kind: 'input'` only. A text action at the END of the cell, beside the
   * value, inside the fixed 34 row — "Select Batches" on a Quantity cell.
   * Return `null` for a row that has none (an untracked item).
   *
   * `tone` says what the action's state is, not how it looks: `attention` is
   * work still to do (a warning glyph), `done` is work that is complete (a
   * tick). Both are `text/primary-text`, because both are links.
   */
  cellAction?: (row: ProductRow) => ProductCellAction | null;
}

export interface ProductCellAction {
  label: string;
  tone?: 'attention' | 'done';
  onSelect: () => void;
}

export interface ProductRow {
  id: string;
  kind: 'item' | 'group';
  /** Group rows only. */
  label?: string;
  /** Item rows only, keyed by column id. */
  values?: Record<string, string>;
}

export interface TotalRow {
  id: string;
  label: string;
  kind: 'static' | 'editable' | 'emphasis';
  amount: string;
  input?: string;
}
