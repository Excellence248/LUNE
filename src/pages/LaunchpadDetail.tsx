import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';

const LaunchpadDetail = () => (
  <Layout>
    <UnavailableFeature
      title="Launchpad Project"
      description="No project data source is connected. Project status, token details, holders, and funding progress cannot be determined."
    />
  </Layout>
);

export default LaunchpadDetail;
