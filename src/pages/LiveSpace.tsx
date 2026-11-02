import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';

const LiveSpace = () => (
  <Layout>
    <UnavailableFeature
      title="Audio Space"
      description="No audio-room or chat service is connected. Speaker identities, listener counts, messages, and live status cannot be determined."
    />
  </Layout>
);

export default LiveSpace;
