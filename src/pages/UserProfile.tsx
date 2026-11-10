import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ban, Flag, Loader2, MoreHorizontal, UserMinus, UserPlus, UserX } from 'lucide-react';
import Layout from '@/components/lune/Layout';
import ProfileHero from '@/components/lune/ProfileHero';
import ProfileActivity from '@/components/lune/ProfileActivity';
import { EmptyState } from '@/components/lune/Brand';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ReportDialog from '@/components/lune/ReportDialog';
import ConfirmDialog, { type Confirm } from '@/components/lune/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSocial, type PublicProfile } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';
import { showError, showSuccess } from '@/utils/toast';

const PublicProfileView = ({ username }: { username: string }) => {
  const { user: currentUser } = useWallet();
  const { posts, isFollowing, followUser, unfollowUser, getProfileByUsername, followingLoading, followingError, refreshFollowing, isBlocked, blockUser, unblockUser } = useSocial();
  const [reporting, setReporting] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
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

  // Likes, reposts and posts change the counts; the feed refreshes after each, so follow it quietly.
  useEffect(() => {
    let active = true;
    getProfileByUsername(username).then(data => { if (active && data) setProfile(data); }).catch(() => undefined);
    return () => { active = false; };
  }, [posts, username, getProfileByUsername]);

  const handleFollow = async () => {
    if (!profile || !currentUser || busy.current || followingLoading || followingError) return;
    const following = isFollowing(profile.id);
    busy.current = true;
    setPending(true);
    try {
      if (following) await unfollowUser(profile.id);
      else await followUser(profile.id);
      // Refresh the follower count without showing the loading state again.
      const updated = await getProfileByUsername(profile.username).catch(() => null);
      if (updated) setProfile(updated);
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
  const blocked = isBlocked(profile.id);

  const applyBlock = async (block: boolean) => {
    if (block) await blockUser(profile.id);
    else await unblockUser(profile.id);
    showSuccess(block ? `@${profile.username} is blocked` : `@${profile.username} is unblocked`);
    const updated = await getProfileByUsername(profile.username).catch(() => null);
    if (updated) setProfile(updated);
  };
  const toggleBlock = () => {
    if (blocked) {
      void applyBlock(false).catch(error => showError(error instanceof Error ? error.message : 'That could not be saved. Try again.'));
      return;
    }
    setConfirm({
      title: `Block @${profile.username}?`,
      description: 'You won’t see their posts, and neither of you can follow, reply to, like or repost the other. You can unblock them here.',
      action: 'Block',
      run: () => applyBlock(true),
    });
  };

  const moreMenu = currentUser && !isMe && (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label={`More options for @${profile.username}`} className="rounded-full border-white/15 bg-transparent"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setReporting(true)}><Flag className="mr-2 h-4 w-4" />Report @{profile.username}</DropdownMenuItem>
        <DropdownMenuItem className={blocked ? '' : 'text-red-300 focus:text-red-200'} onSelect={toggleBlock}><Ban className="mr-2 h-4 w-4" />{blocked ? 'Unblock' : 'Block'} @{profile.username}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const activityUser = { id: profile.id, username: profile.username, avatar: profile.avatar_url, walletAddress: profile.wallet_address };

  return (
    <Layout noPadding>
      <ProfileHero
        name={profile.username}
        handle={profile.username}
        avatarUrl={profile.avatar_url}
        bio={profile.bio}
        stats={profile.stats}
        footnote={profile.suspended ? 'This account is suspended.' : undefined}
        actions={isMe ? (
          <Button asChild variant="outline" className="rounded-full border-white/15 bg-transparent"><Link to="/profile">Edit profile</Link></Button>
        ) : blocked ? (
          <>{moreMenu}<Button variant="outline" className="rounded-full border-white/15 bg-transparent" onClick={toggleBlock}>Unblock</Button></>
        ) : (
          <>{moreMenu}
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
          </>
        )}
      />

      {currentUser && !isMe && followingError && <div className="mx-4 mt-5 flex max-w-3xl flex-wrap items-center gap-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 md:mx-10"><p role="alert" className="text-sm text-red-200">{followingError}</p><Button size="sm" variant="outline" disabled={followingLoading} onClick={() => void refreshFollowing()}>Retry status</Button></div>}

      {blocked ? (
        <p className="mx-4 mb-8 mt-8 max-w-4xl rounded-3xl border border-white/10 p-6 text-sm text-white/60 md:mx-10">You blocked @{profile.username}. Unblock them to see their posts.</p>
      ) : (
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
      )}
      {confirm && <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />}
      {reporting && <ReportDialog target={{ type: 'profile', id: profile.id, label: `@${profile.username}` }} onClose={() => setReporting(false)} />}
    </Layout>
  );
};

const UserProfile = () => {
  const { username = '' } = useParams();
  return <PublicProfileView key={username} username={username} />;
};

export default UserProfile;
