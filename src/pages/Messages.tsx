import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';

const Messages = () => (
  <Layout>
    <UnavailableFeature
      title="Messages"
      description="Conversation loading and message sending are not implemented in the social service. Messaging is unavailable; no sample conversations are shown."
    />
  </Layout>
);

export default Messages;
