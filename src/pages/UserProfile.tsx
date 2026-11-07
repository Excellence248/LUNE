import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, UserMinus, UserPlus, UserX } from 'lucide-react';
import Layout from '@/components/lune/Layout';
import ProfileHero from '@/components/lune/ProfileHero';
import ProfileActivity from '@/components/lune/ProfileActivity';
import { EmptyState } from '@/components/lune/Brand';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSocial, type PublicProfile } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';
import { showError } from '@/utils/toast';

const PublicProfileView = ({ username }: { username: string }) => {
  const { user: currentUser } = useWallet();
  const { isFollowing, followUser, unfollowUser, getProfileByUsername, followingLoading, followingError, refreshFollowing } = useSocial();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      setProfile(null);
      try {
        const data = await getProfileByUsername(username);
        if (active) setProfile(data);
      } catch {
        if (active) setError('This profile could not be loaded. Check your connection and try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchProfile();
    return () => { active = false; };
  }, [username, getProfileByUsername, retry]);

  const handleFollow = async () => {
    if (!profile || !currentUser || busy.current || followingLoading || followingError) return;
    const following = isFollowing(profile.id);
    busy.current = true;
    setPending(true);
    try {
      if (following) await unfollowUser(profile.id);
      else await followUser(profile.id);
    } catch {
      showError(`Could not ${following ? 'unfollow' : 'follow'} this account. Check your login session and connection, then try again.`);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  if (loading) {
    return <Layout><div role="status" className="flex min-h-[60vh] items-center justify-center gap-3 text-white/50"><Loader2 className="h-6 w-6 animate-spin text-lune-400" /> Loading profile…</div></Layout>;
  }

  if (!profile) {
    return (
      <Layout>
        <div className="lune-card mx-auto mt-10 max-w-lg">
          <EmptyState icon={UserX} title={error ? 'Profile temporarily unavailable' : 'Profile not found'}>{error || `No account uses @${username}. The username may have changed.`}</EmptyState>
          <div className="flex justify-center gap-3 pb-10">
            {error && <Button variant="outline" onClick={() => setRetry(previous => previous + 1)}>Try again</Button>}
            <Button asChild className="lune-btn"><Link to="/">Back to feed</Link></Button>
          </div>
        </div>
      </Layout>
    );
  }

  const following = isFollowing(profile.id);
  const isMe = currentUser?.id === profile.id;
  const activityUser = { id: profile.id, username: profile.username, avatar: profile.avatar_url, walletAddress: profile.wallet_address };

  return (
    <Layout noPadding>
      <ProfileHero
        name={profile.username}
        handle={profile.username}
        avatarUrl={profile.avatar_url}
        bio={profile.bio}
        actions={isMe ? (
          <Button asChild variant="outline" className="rounded-full border-white/15 bg-transparent"><Link to="/profile">Edit profile</Link></Button>
        ) : (
          <Button
            variant={following ? 'outline' : 'default'}
            disabled={!currentUser || pending || followingLoading || !!followingError}
            title={!currentUser ? 'Log in to follow this account' : followingError || undefined}
            aria-pressed={following}
            aria-busy={pending}
            onClick={handleFollow}
            className={following ? 'rounded-full border-white/15 bg-transparent hover:border-red-400/40 hover:text-red-300' : 'lune-btn rounded-full'}
          >
            {pending || (currentUser && followingLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : following ? <UserMinus className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {pending ? following ? 'Unfollowing…' : 'Following…' : currentUser && followingLoading ? 'Checking…' : following ? 'Unfollow' : 'Follow'}
          </Button>
        )}
      />

      {currentUser && !isMe && followingError && <div className="mx-4 mt-5 flex max-w-3xl flex-wrap items-center gap-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 md:mx-10"><p role="alert" className="text-sm text-red-200">{followingError}</p><Button size="sm" variant="outline" disabled={followingLoading} onClick={() => void refreshFollowing()}>Retry status</Button></div>}

      <section className="mx-4 mb-8 mt-8 max-w-4xl overflow-hidden rounded-3xl border border-white/10 glass-soft md:mx-10" aria-label={`Activity by ${profile.username}`}>
        <Tabs defaultValue="posts">
          <div className="border-b border-white/10 px-5 pt-5">
            <TabsList className="h-auto gap-6 rounded-none bg-transparent p-0">
              <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-white/45 data-[state=active]:border-lune-400 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none">Posts</TabsTrigger>
              <TabsTrigger value="reposts" className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-white/45 data-[state=active]:border-lune-400 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none">Reposts</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="posts" className="mt-0"><ProfileActivity key={`${profile.id}-posts`} user={activityUser} kind="posts" personal={false} /></TabsContent>
          <TabsContent value="reposts" className="mt-0"><ProfileActivity key={`${profile.id}-reposts`} user={activityUser} kind="reposts" personal={false} /></TabsContent>
        </Tabs>
      </section>
    </Layout>
  );
};

const UserProfile = () => {
  const { username = '' } = useParams();
  return <PublicProfileView key={username} username={username} />;
};

export default UserProfile;
