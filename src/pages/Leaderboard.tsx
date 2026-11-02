import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';

const Leaderboard = () => (
  <Layout>
    <UnavailableFeature
      title="Leaderboard"
      description="No ranking or performance data source is connected. Trader rankings and reputation scores cannot be determined."
    />
  </Layout>
);

export default Leaderboard;
