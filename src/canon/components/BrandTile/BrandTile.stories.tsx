import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrandTile } from './BrandTile';
import { Inline } from '../../primitives';

/**
 * A sales channel's mark. Three sizes; the `lg` 96 square is the integrations
 * card's. Without `src` it shows the name's initials.
 */
const meta = {
  title: 'Components/BrandTile', component: BrandTile,
  parameters: { layout: 'padded' },
  args: { name: 'Flipkart', src: '/brand/flipkart.svg', size: 'lg' },
} satisfies Meta<typeof BrandTile>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <Inline gap={8} align="center">
      <BrandTile name="Flipkart" src="/brand/flipkart.svg" size="sm" />
      <BrandTile name="Flipkart" src="/brand/flipkart.svg" size="md" />
      <BrandTile name="Flipkart" src="/brand/flipkart.svg" size="lg" />
    </Inline>
  ),
};

export const Initials: Story = {
  render: () => (
    <Inline gap={8} align="center">
      <BrandTile name="Zoho POS" size="sm" />
      <BrandTile name="Zoho POS" size="md" />
      <BrandTile name="Zoho POS" size="lg" />
    </Inline>
  ),
};

export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div data-theme="dark" className="bg-surface-default p-10">
      <Inline gap={8} align="center">
        <BrandTile name="Flipkart" src="/brand/flipkart.svg" />
        <BrandTile name="Zoho POS" />
      </Inline>
    </div>
  ),
};
