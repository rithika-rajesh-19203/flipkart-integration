import { useEffect, useState } from 'react';
import {
  Banner, Field, Inline, Modal, Select, Stack, Text,
} from '@canon';
import { GSTINS } from '../data/flipkart';

/**
 * CONNECT YOUR FLIPKART SELLER ACCOUNT — the Flipkart counterpart of Shopify's
 * "Enter your Store Name" dialog.
 *
 * Shopify authorises by store URL and an OAuth redirect. Flipkart's Seller API
 * authorises a *self-access application* the seller creates in Seller Hub, so
 * the dialog asks for the two values that application generates — and says
 * where to find them, because nothing else on the page does.
 *
 * GSTIN is asked here rather than in configuration: Flipkart orders carry the
 * seller's GSTIN, and the orders cannot be taxed correctly until it is known.
 */
export interface FlipkartConnectModalProps {
  open: boolean;
  onClose: () => void;
  onConnect: (v: { storeName: string; appId: string; gstin: string }) => void;
}

type Errors = Partial<Record<'storeName' | 'appId' | 'secret', string>>;

export function FlipkartConnectModal({ open, onClose, onConnect }: FlipkartConnectModalProps) {
  const [storeName, setStoreName] = useState('');
  const [appId, setAppId] = useState('');
  const [secret, setSecret] = useState('');
  const [gstin, setGstin] = useState(GSTINS[0].value);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    setStoreName(''); setAppId(''); setSecret(''); setGstin(GSTINS[0].value); setErrors({});
  }, [open]);

  const connect = () => {
    const next: Errors = {};
    if (!storeName.trim()) next.storeName = 'Enter a name for this Flipkart store.';
    if (!appId.trim()) next.appId = 'Enter the Application ID from Seller Hub.';
    if (!secret.trim()) next.secret = 'Enter the Application Secret from Seller Hub.';
    setErrors(next);
    if (Object.keys(next).length) return;
    onConnect({ storeName: storeName.trim(), appId: appId.trim(), gstin });
  };

  const clear = (k: keyof Errors) => setErrors((e) => ({ ...e, [k]: undefined }));

  return (
    <Modal
      open={open}
      title="Connect your Flipkart Seller Account"
      width="lg"
      onRequestClose={onClose}
      primaryAction={{ label: 'Connect', onSelect: connect }}
      secondaryAction={{ label: 'Cancel', onSelect: onClose }}
    >
      <Stack gap={8}>
        <Banner tone="info">
          In Flipkart Seller Hub, go to Manage Profile → Developer Access → Create New Access and create a
          self-access application. Copy the Application ID and Application Secret it generates.
        </Banner>

        <Field
          label="Store Name" required autoFocus placeholder="e.g. The Retail Store – Flipkart"
          error={Boolean(errors.storeName)} message={errors.storeName}
          value={storeName} onChange={(e) => { setStoreName(e.target.value); clear('storeName'); }}
        />
        <Inline gap={8} align="start" className="grid grid-cols-2">
          <Field
            label="Application ID" required placeholder="e.g. 3b2a9c71d84f5e60a1b2"
            error={Boolean(errors.appId)} message={errors.appId}
            value={appId} onChange={(e) => { setAppId(e.target.value); clear('appId'); }}
          />
          <Field
            label="Application Secret" required type="password" autoComplete="off"
            error={Boolean(errors.secret)} message={errors.secret}
            value={secret} onChange={(e) => { setSecret(e.target.value); clear('secret'); }}
          />
        </Inline>
        <Stack gap={2}>
          <Text weight="medium">
            GSTIN <Text as="span" tone="danger">*</Text>
          </Text>
          <Select
            ariaLabel="GSTIN" required options={GSTINS} value={gstin}
            onChange={(v) => setGstin(v)}
          />
          <Text size="body-sm" tone="secondary">The GSTIN your Flipkart seller account is registered with. It is used to tax Flipkart orders.</Text>
        </Stack>
        <Text size="caption" tone="secondary">
          Zoho Inventory only reads and updates listings, orders, returns and settlements. You can
          disconnect at any time from the Flipkart page.
        </Text>
      </Stack>
    </Modal>
  );
}
