"use client";

import React, { useState, useMemo } from 'react';
import Layout from '@/components/lune/Layout';
import { Settings as SettingsIcon, Shield, Bell, Lock, Mail, Trash2, UserPlus, Loader2, Check, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/context/WalletContext';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const Settings = () => {
  const { user, updateEmail, updatePassword, deleteAccount, reauthenticate } = useWallet();
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const passwordRequirements = useMemo(() => [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'At least one uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'At least one number', test: (p: string) => /[0-9]/.test(p) },
    { label: 'At least one special character', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
  ], []);

  const isPasswordValid = useMemo(() => 
    newPassword ? passwordRequirements.every(req => req.test(newPassword)) : false
  , [newPassword, passwordRequirements]);

  const handleUpdateEmail = async () => {
    if (!newEmail) return;
    setLoading(true);
    const { error } = await updateEmail(newEmail);
    if (error) showError(error.message);
    else showSuccess("Verification email sent to new address!");
    setLoading(false);
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) return;
    if (!isPasswordValid) {
      showError("Password does not meet requirements.");
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(newPassword);
    if (error) showError(error.message);
    else {
      showSuccess("Password updated successfully!");
      setNewPassword('');
    }
    setLoading(false);
  };

  const handleInvite = () => {
    if (!inviteEmail) return;
    showSuccess(`Invite sent to ${inviteEmail}!`);
    setInviteEmail('');
  };

  const handleDeleteAccount = async () => {
    if (confirm("Are you absolutely sure? This will sign you out and your account will be marked for deletion.")) {
      await deleteAccount();
      window.location.href = '/signin';
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto w-full">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 md:mb-12 flex items-center gap-3">
          Settings <SettingsIcon className="text-gray-500" />
        </h1>

        <div className="space-y-8 md:space-y-12">
          {/* Account Management */}
          <section className="space-y-4 md:space-y-6">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <Lock className="text-purple-400 w-4 h-4 md:w-5 md:h-5" />
              Account Management
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-8 space-y-8">
              {/* Change Email */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase">
                  <Mail size={14} /> Change Email
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input 
                    placeholder="New email address" 
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="bg-black/40 border-white/10"
                  />
                  <Button onClick={handleUpdateEmail} disabled={loading} className="bg-purple-600 hover:bg-purple-500 shrink-0">
                    Update Email
                  </Button>
                </div>
              </div>

              <div className="h-[1px] bg-white/5" />

              {/* Change Password */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase">
                  <Shield size={14} /> Change Password
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <div className="flex-1 w-full space-y-3">
                    <Input 
                      type="password"
                      placeholder="New password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-black/40 border-white/10"
                    />
                    {/* Password Strength Indicator */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {passwordRequirements.map((req, i) => {
                        const isMet = req.test(newPassword);
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <div className={cn(
                              "w-4 h-4 rounded-full flex items-center justify-center transition-colors",
                              isMet ? "bg-green-500/20 text-green-500" : "bg-white/5 text-gray-600"
                            )}>
                              {isMet ? <Check size={10} /> : <X size={10} />}
                            </div>
                            <span className={cn(
                              "text-[10px] font-medium transition-colors",
                              isMet ? "text-green-500/70" : "text-gray-500"
                            )}>
                              {req.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <Button 
                    onClick={handleUpdatePassword} 
                    disabled={loading || !isPasswordValid} 
                    className="bg-purple-600 hover:bg-purple-500 shrink-0 w-full sm:w-auto"
                  >
                    Update Password
                  </Button>
                </div>
              </div>

              <div className="h-[1px] bg-white/5" />

              {/* Invite User */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase">
                  <UserPlus size={14} /> Invite Friend
                </div>
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
            </div>
          </section>

          {/* Preferences */}
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

          {/* Danger Zone */}
          <section className="space-y-4 md:space-y-6">
            <h2 className="text-lg md:text-xl font-bold text-red-500 flex items-center gap-2">
              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
              Danger Zone
            </h2>
            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl md:rounded-3xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1 text-center md:text-left">
                  <h3 className="font-bold text-white">Erase Account</h3>
                  <p className="text-xs md:text-sm text-gray-500">Permanently delete your account and all associated data. This action cannot be undone.</p>
                </div>
                <Button onClick={handleDeleteAccount} variant="destructive" className="w-full md:w-auto">
                  Delete Account
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;