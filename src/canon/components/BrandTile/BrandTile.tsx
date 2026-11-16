import { cn } from '../../utils/cn';
import { Text } from '../../primitives';

/**
 * BRAND TILE — a third-party product's mark (a sales channel, a marketplace)
 * in a bordered, sunken square.
 *
 * The logo is an `<img>` served from `public/brand/`, NOT inline geometry: a
 * partner's mark keeps its own colours and must not follow the theme, which is
 * the opposite of a roster glyph. Raw colour therefore never enters `src/` —
 * it lives in the asset.
 *
 * Without a `src` it falls back to the name's initials, so a channel whose
 * mark has not been supplied yet is still identifiable rather than blank.
 */
const sizeMap = {
  sm: 'size-16',            // 32
  md: 'size-20',            // 40
  lg: 'size-brand-tile',    // 96 — chrome/brand-tile
} as const;

const padMap = { sm: 'p-2', md: 'p-3', lg: 'p-8' } as const;
const typeMap = { sm: 'label', md: 'label', lg: 'heading' } as const;

export type BrandTileSize = keyof typeof sizeMap;

export interface BrandTileProps {
  /** The product's name — the image's alt text, or the initials without one. */
  name: string;
  /** A `/brand/*.svg` path. */
  src?: string;
  size?: BrandTileSize;
  className?: string;
}

export function BrandTile({ name, src, size = 'lg', className }: BrandTileProps) {
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span
      className={cn(
        'inline-grid place-items-center flex-none overflow-hidden',
        'rounded-md border border-border-default bg-surface-sunken',
        sizeMap[size], padMap[size], className,
      )}
    >
      {src ? (
        <img src={src} alt={name} className="size-full object-contain" />
      ) : (
        <Text as="span" size={typeMap[size]} tone="secondary" title={name}>{initials}</Text>
      )}
    </span>
  );
}
