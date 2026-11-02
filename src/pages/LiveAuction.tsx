import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';

const LiveAuction = () => (
  <Layout>
    <UnavailableFeature
      title="Live Auction"
      description="No auction contract or streaming service is connected. Auctions, bid history, and bidding are unavailable."
    />
  </Layout>
);

export default LiveAuction;
