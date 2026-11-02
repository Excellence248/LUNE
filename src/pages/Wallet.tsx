import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';

const Wallet = () => (
  <Layout>
    <UnavailableFeature
      title="Wallet"
      description="A wallet provider and on-chain balance reader are not connected. Asset balances, portfolio values, swaps, and transfers are unavailable."
    />
  </Layout>
);

export default Wallet;
