import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';

const Staking = () => (
  <Layout>
    <UnavailableFeature
      title="Staking"
      description="No staking contract or position data source is connected. Balances, yields, reward claims, and staking terms are unavailable."
    />
  </Layout>
);

export default Staking;
