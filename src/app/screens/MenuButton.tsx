import { useRef, useState } from 'react';
import { Button, Menu } from '@canon';
import type { MenuEntry } from '@canon';

/**
 * A button that opens a menu — the Flipkart card's "Sync Manually ▾".
 * Composed from `Button` + `Menu`, which already owns focus,
 * Escape and click-outside.
 */
export function MenuButton({ label, entries, emphasis = 'secondary' }: {
  label: string; entries: MenuEntry[]; emphasis?: 'primary' | 'secondary';
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const wrap = (e: MenuEntry): MenuEntry => ('separator' in e ? e : {
    ...e,
    onSelect: e.onSelect ? () => { close(); e.onSelect?.(); } : undefined,
    children: e.children?.map((c) => wrap(c) as typeof c),
  });
  return (
    <>
      <Button ref={ref} emphasis={emphasis} iconRight="caret-down" aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen((o) => !o)}>
        {label}
      </Button>
      <Menu anchor={ref.current} open={open} onClose={close} label={label} align="start" entries={entries.map(wrap)} />
    </>
  );
}
