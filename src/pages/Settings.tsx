import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';

const Settings = () => (
  <Layout>
    <UnavailableFeature
      title="Settings"
      description="Email invitations and account preference controls are not connected to delivery or settings services. Browsing does not require a username, password, or email verification."
    />
  </Layout>
);

export default Settings;
