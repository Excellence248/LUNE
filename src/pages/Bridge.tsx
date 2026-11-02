import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';

const Bridge = () => (
  <Layout>
    <UnavailableFeature
      title="Cross-Chain Bridge"
      description="No bridge provider is connected. Quotes and cross-chain transfers are unavailable."
    />
  </Layout>
);

export default Bridge;
