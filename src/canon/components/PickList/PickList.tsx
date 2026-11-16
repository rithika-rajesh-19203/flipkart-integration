import { useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Icon } from '../../icons';
import { Text } from '../../primitives';
import { Button } from '../Button/Button';
import { InputField } from '../InputField/InputField';
import { cn } from '../../utils/cn';

/**
 * PICK LIST — pick many things from a long list, see what you picked beside
 * it. "Add Items in Bulk": the catalogue on the left, the basket on the right.
 *
 * Not `MiniList`: that is a NAVIGATION control — its selection is the record
 * being read and it drives a route. A pick list's selection is the answer the
 * dialog is collecting, and clicking a row toggles it rather than going
 * anywhere. Not a `Checkbox` stack either: the source draws no boxes — the row
 * itself is the control, and a selected row says so with a tint, the
 * `primary/text` label and a check.
 *
 * Meant to be the body of a `<Modal flush>`. It owns its own scrolling — each
 * pane scrolls on its own, like `SplitView` — and its own actions, which sit
 * under the BASKET because that is what they act on.
 */
export interface PickListOption {
  id: string;
  label: string;
  /** The quieter second line — SKU, rate. Wraps; never truncated. */
  meta?: string;
  /**
   * A figure on the row's trailing side — "Stock on Hand / 909.00 pcs". The
   * value is `success` text when `positive`, the source's green.
   */
  aside?: { label: string; value: string; positive?: boolean };
}

export interface PickListAction {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export interface PickListProps {
  /** Names the listbox — "Items". */
  label: string;
  options: PickListOption[];
  /** Ids, in the order they were picked. Controlled. */
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  /** The search field. Filtering `options` is the caller's — it knows the data. */
  query: string;
  onQueryChange: (next: string) => void;
  searchPlaceholder?: string;
  /** Above the search: a category select, a "sub-categories" checkbox. */
  filters?: ReactNode;
  /** When `options` is empty — "No items match". */
  emptyOptions?: ReactNode;

  /** The basket's heading. Defaults to "Selected Items". */
  selectedTitle?: string;
  /** The basket header's trailing text — "Total Quantity: 12". */
  summary?: ReactNode;
  /** When nothing is picked. */
  emptySelected?: ReactNode;
  /**
   * How a picked row reads in the basket. Defaults to the option's label and
   * meta; `control` is where a quantity field goes.
   */
  renderSelected?: (id: string) => { label: string; meta?: string; control?: ReactNode };

  primaryAction: PickListAction;
  secondaryAction?: PickListAction;
  className?: string;
}

//  The same inset ring the rail and the bar use: focus paints no fill, so a
//  keyboard user sees a ring and not a phantom hover.
const RING = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring';

export function PickList({
  label, options, selected, onSelectedChange, query, onQueryChange,
  searchPlaceholder = 'Type to search', filters, emptyOptions,
  selectedTitle = 'Selected Items', summary, emptySelected, renderSelected,
  primaryAction, secondaryAction, className,
}: PickListProps) {
  const titleId = useId();
  const picked = new Set(selected);
  //  ONE tab stop for the whole list, arrows inside it — the listbox pattern.
  //  Thirty rows as thirty tab stops would make the basket unreachable.
  const [cursor, setCursor] = useState(0);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const at = Math.min(cursor, Math.max(options.length - 1, 0));

  const toggle = (id: string) => onSelectedChange(
    picked.has(id) ? selected.filter((x) => x !== id) : [...selected, id],
  );
  const move = (to: number) => {
    const next = Math.max(0, Math.min(options.length - 1, to));
    setCursor(next);
    rowRefs.current[next]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent, i: number, id: string) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(i + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); move(0); }
    else if (e.key === 'End') { e.preventDefault(); move(options.length - 1); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(id); }
  };

  const byId = new Map(options.map((o) => [o.id, o]));
  const describe = (id: string) => renderSelected?.(id)
    ?? { label: byId.get(id)?.label ?? id, meta: byId.get(id)?.meta };

  return (
    //  A fixed height, not the content's: two independently scrolling panes
    //  need a box to scroll inside, and a dialog that grows with every pick
    //  moves its own actions out from under the pointer.
    <div className={cn('flex h-picklist max-h-full min-h-0', className)}>
      {/* ── THE CATALOGUE ─────────────────────────────────────────────── */}
      <section aria-label={label}
        className="flex flex-col flex-1 min-w-0 border-e border-border-divider">
        <div className="flex flex-none flex-col gap-6 p-10 bg-surface-hover">
          {filters}
          <InputField
            aria-label={`Search ${label.toLowerCase()}`}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>

        {options.length ? (
          <ul
            role="listbox"
            aria-label={label}
            aria-multiselectable
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain m-0 p-2 list-none"
          >
            {options.map((o, i) => {
              const on = picked.has(o.id);
              return (
                <li
                  key={o.id}
                  ref={(el) => { rowRefs.current[i] = el; }}
                  role="option"
                  aria-selected={on}
                  tabIndex={i === at ? 0 : -1}
                  onClick={() => { setCursor(i); toggle(o.id); }}
                  onKeyDown={(e) => onKeyDown(e, i, o.id)}
                  className={cn(
                    'flex items-center gap-8 px-8 py-6 rounded-md cursor-pointer outline-none',
                    'transition-colors duration-150 motion-reduce:transition-none',
                    //  `surface/hover`, NOT `surface/selected`: CLAUDE.md — the
                    //  selected role is 1.02:1 in Dark. The check and the
                    //  label colour carry the state; the tint only groups.
                    on ? 'bg-surface-hover' : 'hover:bg-surface-hover',
                    RING,
                  )}
                >
                  <span className="flex flex-col gap-1 flex-1 min-w-0">
                    <Text as="span" size="body-lg" tone={on ? 'link' : 'default'}>{o.label}</Text>
                    {o.meta ? (
                      <Text as="span" size="body" tone={on ? 'link' : 'secondary'}>{o.meta}</Text>
                    ) : null}
                  </span>
                  {o.aside ? (
                    <span className="flex flex-none flex-col items-end gap-1">
                      <Text as="span" size="body" tone="secondary">{o.aside.label}</Text>
                      <Text as="span" size="body-lg" tone={o.aside.positive ? 'success' : 'default'}>
                        {o.aside.value}
                      </Text>
                    </span>
                  ) : null}
                  {/* The slot is RESERVED on every row, so ticking one never
                      shifts its aside sideways. */}
                  <span aria-hidden className="grid flex-none place-items-center size-10">
                    {on ? <Icon name="check-circle" size="lg" tone="primary" /> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="grid flex-1 place-items-center p-10 text-center">
            <Text tone="secondary">{emptyOptions ?? 'Nothing matches.'}</Text>
          </div>
        )}
      </section>

      {/* ── THE BASKET ────────────────────────────────────────────────── */}
      <section aria-labelledby={titleId} className="flex flex-col flex-1 min-w-0">
        <div className="flex flex-none items-center gap-5 px-10 py-8 border-b border-border-divider">
          <Text as="h3" id={titleId} size="title" weight="medium">{selectedTitle}</Text>
          {/* `aria-live`: the count is the only feedback a screen-reader user
              gets that a click in the OTHER pane did something. */}
          <span aria-live="polite" className={cn(
            'grid place-items-center min-w-15 h-15 px-4 box-border rounded-full',
            'border border-border-default')}>
            <Text as="span" size="body-lg">{selected.length}</Text>
            <span className="sr-only"> selected</span>
          </span>
          {summary ? (
            <span className="ms-auto"><Text as="span" size="body-lg">{summary}</Text></span>
          ) : null}
        </div>

        {selected.length ? (
          <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain m-0 p-0 list-none">
            {selected.map((id) => {
              const d = describe(id);
              return (
                <li key={id}
                  className="flex items-center gap-6 px-10 py-5 border-b border-border-divider">
                  <span className="flex flex-col gap-1 flex-1 min-w-0">
                    <Text as="span" size="body-lg">{d.label}</Text>
                    {d.meta ? <Text as="span" size="body" tone="secondary">{d.meta}</Text> : null}
                  </span>
                  {d.control ? <span className="flex-none">{d.control}</span> : null}
                  <button
                    type="button"
                    aria-label={`Remove ${d.label}`}
                    onClick={() => toggle(id)}
                    className={cn(
                      'grid flex-none place-items-center size-12 p-0 rounded-sm',
                      'border-0 bg-transparent cursor-pointer text-icon-default',
                      'hover:bg-surface-hover hover:text-danger-default',
                      RING,
                    )}
                  >
                    <Icon name="close" size="sm" tone="inherit" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="grid flex-1 place-items-center p-10 text-center">
            <Text size="body-lg">{emptySelected ?? 'Click the item names from the left pane to select them'}</Text>
          </div>
        )}

        <div className="flex flex-none items-center gap-5 h-modal-footer px-10 border-t border-border-divider">
          <Button disabled={primaryAction.disabled} onClick={primaryAction.onSelect}>
            {primaryAction.label}
          </Button>
          {secondaryAction ? (
            <Button emphasis="secondary" disabled={secondaryAction.disabled} onClick={secondaryAction.onSelect}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
