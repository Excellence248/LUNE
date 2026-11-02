import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';

const Communities = () => (
  <Layout>
    <UnavailableFeature
      title="Communities"
      description="Community listings and creation are not connected to a data source. Membership counts and token-gating features are unavailable."
    />
  </Layout>
);

export default Communities;
