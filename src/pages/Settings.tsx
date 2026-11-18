import { Palette } from 'lucide-react';
import Layout from '@/components/lune/Layout';
import AppearancePanel from '@/components/lune/AppearancePanel';
import { PageHeader } from '@/components/lune/Brand';

const Settings = () => (
  <Layout>
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Settings" icon={Palette} title="Appearance" description="Make Lune yours: pick a background for the app and a wallpaper for your chats, or use your own picture." />
      <div className="lune-card p-5 sm:p-7"><AppearancePanel /></div>
      <p className="mt-5 text-center text-xs text-white/30">Account settings such as email and password changes are not available yet.</p>
    </div>
  </Layout>
);

export default Settings;
