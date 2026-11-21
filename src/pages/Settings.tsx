import { Settings as SettingsIcon } from 'lucide-react';
import Layout from '@/components/lune/Layout';
import AppearancePanel from '@/components/lune/AppearancePanel';
import { AccountSection, BlockedSection, DataSection, SettingsCard } from '@/components/lune/AccountSettings';
import { PageHeader } from '@/components/lune/Brand';
import { PushSetting } from '@/components/lune/PushControl';

const Settings = () => (
  <Layout>
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Settings" icon={SettingsIcon} title="Make Lune yours" description="Notifications, your account, who you’ve blocked, how Lune looks, and your data." />
      <SettingsCard title="Notifications"><PushSetting /></SettingsCard>
      <AccountSection />
      <BlockedSection />
      <SettingsCard title="Appearance" description="Pick a background for the app and a wallpaper for your chats, or use your own picture."><AppearancePanel /></SettingsCard>
      <DataSection />
    </div>
  </Layout>
);

export default Settings;
