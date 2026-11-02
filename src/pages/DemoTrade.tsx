import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';

const DemoTrade = () => (
  <Layout>
    <UnavailableFeature
      title="Demo Trading"
      description="The simulator and its virtual balance, generated price history, and simulated positions have been removed. API-backed market quotes are available in Market Explorer."
    />
  </Layout>
);

export default DemoTrade;
