import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';

const Governance = () => (
  <Layout>
    <UnavailableFeature
      title="Governance"
      description="No governance contract or proposal data source is connected. Proposals and voting are unavailable."
    />
  </Layout>
);

export default Governance;
