import { useEffect, useRef, useState } from 'react';
import {
  BrandTile, Icon, Inline, Stack, Surface, Text,
} from '@canon';

/**
 * THE HAND-OFF. In the reference, the app leaves for the partner's consent and
 * comes back to a full-page "Please wait while we make everything perfect for
 * you…" while the account is linked. Flipkart authorises with the credentials
 * already entered, so there is no consent page — only the wait, which reports
 * what it is doing rather than spinning silently.
 */
const STEPS = [
  'Verifying your Flipkart application…',
  'Fetching your seller profile and pickup locations…',
  'Please wait while we make everything perfect for you…',
];

export function Connecting({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setStep((s) => s + 1), 900);
    return () => window.clearInterval(t);
  }, []);
  //  Once, whatever the parent does with `onDone`'s identity in the meantime.
  const done = useRef(onDone);
  done.current = onDone;
  const fired = useRef(false);
  useEffect(() => {
    if (step >= STEPS.length && !fired.current) { fired.current = true; done.current(); }
  }, [step]);

  return (
    <Surface tone="canvas" pad={0} radius="none" className="flex min-h-dvh items-center justify-center">
      <Stack gap={8} align="center">
        <Inline gap={6} align="center">
          <BrandTile name="Zoho Inventory" src={`${import.meta.env.BASE_URL}brand/zoho-inventory.svg`} size="lg" />
          <Icon name="arrow-right" size="lg" tone="muted" />
          <BrandTile name="Flipkart" src={`${import.meta.env.BASE_URL}brand/flipkart.svg`} size="lg" />
        </Inline>
        <Text size="body" tone="secondary" role="status">{STEPS[Math.min(step, STEPS.length - 1)]}</Text>
      </Stack>
    </Surface>
  );
}
