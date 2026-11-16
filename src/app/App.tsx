import { FlipkartProvider } from './data/flipkart';
import { FlipkartApp } from './screens/FlipkartApp';

/**
 * Application root. The current design target is the FLIPKART INTEGRATION —
 * setting up a Flipkart store from Settings → Integrations & Marketplace →
 * eCommerce (Marketplace), sharing one store so each step sees the one before it.
 */
export function App() {
  return (
    <FlipkartProvider>
      <FlipkartApp />
    </FlipkartProvider>
  );
}
