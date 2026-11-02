import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Heart, Loader2, MessageSquare, RefreshCw, Repeat2, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import Layout from '@/components/lune/Layout';
import { PageHeader, EmptyState } from '@/components/lune/Brand';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useSocial } from '@/context/SocialContext';
import { useWallet } from '@/context/WalletContext';
import { cn } from '@/lib/utils';

const NotificationList = () => {
  const {
    notifications, unreadCount, notificationsLoading, notificationsError, notificationsReady,
    notificationsHasMore, notificationsLoadingMore, markingNotificationsRead,
    refreshNotifications, loadMoreNotifications, markNotificationsAsRead,
  } = useSocial();
  const [readError, setReadError] = useState('');
  const acknowledged = useRef(false);

  useEffect(() => {
    if (!notificationsReady || acknowledged.current) return;
    acknowledged.current = true;
    const visibleUnread = notifications.filter(row => !row.read).map(row => row.id);
    if (visibleUnread.length) void markNotificationsAsRead(visibleUnread).catch(error => setReadError(error instanceof Error ? error.message : 'Notifications could not be marked read. Please retry.'));
  }, [notificationsReady, notifications, markNotificationsAsRead]);

  const markAll = async () => {
    setReadError('');
    try { await markNotificationsAsRead(); }
    catch (error) { setReadError(error instanceof Error ? error.message : 'Notifications could not be marked read. Please retry.'); }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="fill-pink-400 text-pink-400" size={12} />;
      case 'repost': return <Repeat2 className="text-emerald-400" size={12} />;
      case 'reply': return <MessageSquare className="text-sky-400" size={12} />;
      default: return <UserPlus className="text-lune-300" size={12} />;
    }
  };
  const getMessage = (type: string) => {
    switch (type) {
      case 'like': return 'liked your post';
      case 'repost': return 'reposted your post';
      case 'reply': return 'replied to your post';
      default: return 'started following you';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/45" aria-live="polite">{notificationsReady ? `${unreadCount} unread` : 'Loading your activity…'}</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" disabled={notificationsLoading} aria-label="Refresh notifications" onClick={() => void refreshNotifications()}><RefreshCw size={17} className={notificationsLoading ? 'animate-spin' : ''} /></Button>
          <Button variant="outline" disabled={!notificationsReady || !unreadCount || markingNotificationsRead} onClick={markAll} className="rounded-full border-white/10">
            {markingNotificationsRead ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}{markingNotificationsRead ? 'Marking…' : 'Mark all read'}
          </Button>
        </div>
      </div>
      {notificationsError && <div className="space-y-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3"><p role="alert" className="text-sm text-red-200">{notificationsError}</p><Button variant="outline" size="sm" disabled={notificationsLoading} onClick={() => void refreshNotifications()}>Retry loading</Button></div>}
      {readError && <div className="space-y-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3"><p role="alert" className="text-sm text-red-200">{readError}</p><Button variant="outline" size="sm" disabled={markingNotificationsRead} onClick={markAll}>Retry marking read</Button></div>}
      {notifications.length ? (
        <div className="lune-card divide-y divide-white/[0.06] overflow-hidden">
          {notifications.map((notif, index) => {
            const profilePath = notif.actor_profile?.username ? `/profile/${encodeURIComponent(notif.actor_profile.username)}` : '/';
            const activityPath = notif.post_id ? `/post/${notif.post_id}` : profilePath;
            return (
              <motion.div key={notif.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 10) * 0.03 }} className={cn('relative flex items-start gap-3.5 px-4 py-4 transition-colors hover:bg-white/[0.02] md:px-5', !notif.read && 'bg-lune-500/[0.06]')}>
                {!notif.read && <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-lune-400" />}
                <Link to={profilePath} className="relative shrink-0" aria-label={`View ${notif.actor_profile?.username || 'actor'} profile`}>
                  <Avatar className="h-11 w-11 ring-1 ring-white/10"><AvatarImage src={notif.actor_profile?.avatar_url} /><AvatarFallback className="bg-gradient-to-br from-lune-600/70 to-lune-900 text-sm text-lune-100">{notif.actor_profile?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-popover ring-2 ring-background">{getIcon(notif.type)}</span>
                </Link>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="break-words text-[15px] leading-snug text-white/70"><Link to={profilePath} className="font-semibold text-white hover:underline">@{notif.actor_profile?.username || 'Someone'}</Link>{' '}<Link to={activityPath} className="hover:text-white hover:underline">{getMessage(notif.type)}</Link></p>
                  <time dateTime={notif.created_at} className="mt-1 block text-xs text-white/35">{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</time>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : notificationsLoading ? <div role="status" className="flex items-center justify-center gap-2 py-16 text-white/50"><Loader2 className="h-5 w-5 animate-spin" /> Loading notifications…</div> : <div className="lune-card"><EmptyState icon={Bell} title={notificationsError ? 'Activity unavailable' : 'All quiet'}>{notificationsError ? 'Retry loading your activity using the button above.' : 'No notifications yet. Interactions with your posts will show up here.'}</EmptyState></div>}
      {notificationsHasMore && <div className="text-center"><Button variant="outline" disabled={notificationsLoadingMore || notificationsLoading} onClick={() => void loadMoreNotifications()}>{notificationsLoadingMore ? 'Loading…' : 'Load older notifications'}</Button></div>}
    </div>
  );
};

const Notifications = () => {
  const { user, loading } = useWallet();
  return (
    <Layout>
      <div className="mx-auto w-full max-w-2xl">
        <PageHeader eyebrow="Your network" icon={Bell} title="Activity" description="Likes, reposts, replies and new followers." />
        {user ? <NotificationList key={user.id} /> : loading ? <div role="status" className="flex items-center justify-center gap-2 py-16 text-white/50"><Loader2 className="h-5 w-5 animate-spin" /> Checking your account…</div> : <div className="lune-card"><EmptyState icon={Bell} title="Sign in to see activity"><Link to="/signin" className="text-lune-300 hover:underline">Log in</Link> to your account. Notifications are private.</EmptyState></div>}
      </div>
    </Layout>
  );
};

export default Notifications;
