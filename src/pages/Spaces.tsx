import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';

const Spaces = () => (
  <Layout>
    <UnavailableFeature
      title="Audio Spaces"
      description="An audio-room service is not connected. Room listings, live status, and room creation are unavailable."
    />
  </Layout>
);

export default Spaces;
