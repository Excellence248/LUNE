import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';

const Launchpad = () => (
  <Layout>
    <UnavailableFeature
      title="Launchpad"
      description="Token creation and project listings are not connected to a launchpad service or deployed contract. No launch fees, liquidity guarantees, or safety certifications are advertised."
    />
  </Layout>
);

export default Launchpad;
