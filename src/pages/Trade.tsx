import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';

const Trade = () => (
  <Layout>
    <UnavailableFeature
      title="Trading"
      description="No exchange execution or wallet-signing integration is connected. Orders cannot be submitted, and no trades or balances are simulated. Market quotes are available in Market Explorer."
    />
  </Layout>
);

export default Trade;
