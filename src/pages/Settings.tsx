"use client";

import { useState } from 'react';
import Layout from '@/components/lune/Layout';
import { Settings as SettingsIcon, Bell, UserPlus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { showSuccess } from '@/utils/toast';

const Settings = () => {
  const [inviteEmail, setInviteEmail] = useState('');

  const handleInvite = () => {
    if (!inviteEmail) return;
    showSuccess(`Invite sent to ${inviteEmail}!`);
    setInviteEmail('');
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 md:mb-12 flex items-center gap-3">
          Settings <SettingsIcon className="text-gray-500" />
        </h1>
        <div className="space-y-8 md:space-y-12">
          <p className="text-sm text-gray-400">Browse Lune without a username, password, or email verification. Private account actions are unavailable to guests.</p>
          <section className="space-y-4 md:space-y-6">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <UserPlus className="text-purple-400 w-4 h-4 md:w-5 md:h-5" />
              Invite Friend
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Friend's email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-black/40 border-white/10"
                />
                <Button onClick={handleInvite} className="bg-blue-600 hover:bg-blue-500 shrink-0">
                  Send Invite
                </Button>
              </div>
            </div>
          </section>
          <section className="space-y-4 md:space-y-6">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <Bell className="text-yellow-400 w-4 h-4 md:w-5 md:h-5" />
              Preferences
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-white font-bold text-sm md:text-base">Public Profile</Label>
                  <p className="text-xs md:text-sm text-gray-500">Allow others to see your wallet activity and posts.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="h-[1px] bg-white/5" />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-white font-bold text-sm md:text-base">Trade Alerts</Label>
                  <p className="text-xs md:text-sm text-gray-500">Get notified when your limit orders are filled.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
