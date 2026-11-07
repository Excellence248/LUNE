import { Link } from 'react-router-dom';
import { ArrowUpRight, Loader2, UserRound, Wallet } from 'lucide-react';
import Layout from '@/components/lune/Layout';
import ProfileHero from '@/components/lune/ProfileHero';
import ProfileEditor from '@/components/lune/ProfileEditor';
import ProfileActivity from '@/components/lune/ProfileActivity';
import { EmptyState } from '@/components/lune/Brand';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWallet } from '@/context/WalletContext';

const Profile = () => {
  const { user, loading, authError, refreshProfile } = useWallet();

  if (loading) {
    return <Layout><div role="status" className="flex items-center justify-center gap-3 py-20 text-white/50"><Loader2 className="h-5 w-5 animate-spin" /> Loading your profile…</div></Layout>;
  }

  if (!user) {
    return (
      <Layout>
        <div className="lune-card mx-auto mt-10 max-w-lg">
          <EmptyState icon={UserRound} title={authError ? 'Profile could not be loaded' : 'Your profile starts here'}>
            {authError || 'Log in to edit your profile and see your activity.'}
          </EmptyState>
          <div className="pb-8 text-center"><Button onClick={() => void refreshProfile()}>Retry loading profile</Button></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-lune-300">Personal profile</p>
            <h1 className="font-display text-2xl font-bold md:text-3xl">Your corner of Lune</h1>
            <p className="mt-2 text-sm text-white/45">Make it yours. Share what matters.</p>
          </div>
          <Link to={`/profile/${encodeURIComponent(user.username)}`} className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white">View public profile <ArrowUpRight size={16} /></Link>
        </header>

        <div className="overflow-hidden rounded-3xl border border-white/10 glass-soft pb-7">
          <ProfileHero name={user.username} handle={user.username} avatarUrl={user.avatar} bio={user.bio} actions={<ProfileEditor key={user.id} />} />
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
          <section className="min-w-0 overflow-hidden rounded-3xl border border-white/10 glass-soft" aria-label="Your activity">
            <Tabs defaultValue="posts">
              <div className="border-b border-white/10 px-5 pt-5 md:px-6">
                <h2 className="mb-4 font-display text-lg font-semibold">Your activity</h2>
                <TabsList className="h-auto gap-6 rounded-none bg-transparent p-0">
                  <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-white/45 data-[state=active]:border-lune-400 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none">Posts</TabsTrigger>
                  <TabsTrigger value="reposts" className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-white/45 data-[state=active]:border-lune-400 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none">Reposts</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="posts" className="mt-0"><ProfileActivity key={`${user.id}-posts`} user={user} kind="posts" /></TabsContent>
              <TabsContent value="reposts" className="mt-0"><ProfileActivity key={`${user.id}-reposts`} user={user} kind="reposts" /></TabsContent>
            </Tabs>
          </section>

          <aside className="space-y-4 rounded-3xl border border-white/10 glass-soft p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">{user.walletAddress ? <Wallet size={16} className="text-lune-300" /> : <UserRound size={16} className="text-lune-300" />} Your account</div>
            <div>
              <p className="mb-2 text-xs text-white/40">{user.email ? 'Signed-in email · private' : 'Solana wallet'}</p>
              <p className="break-all font-mono text-xs leading-6 text-white/70">{user.email || user.walletAddress}</p>
            </div>
            <p className="border-t border-white/10 pt-4 text-xs leading-relaxed text-white/40">Your username, photo, and bio are public and can be changed with Edit profile. Your email is never shown on your public profile.</p>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
