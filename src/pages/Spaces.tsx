import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Headphones, Mic, Radio, Users } from 'lucide-react';
import Layout from '@/components/lune/Layout';
import { EmptyState, PageHeader } from '@/components/lune/Brand';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/context/WalletContext';
import { useSpacesLobby } from '@/lib/spaces/useSpaceRoom';
import { showError } from '@/utils/toast';

export const SpaceAvatar = ({ name, src, className = 'h-10 w-10' }: { name: string; src?: string; className?: string }) => (
  src
    ? <img src={src} alt="" className={`${className} rounded-full object-cover`} />
    : <span className={`${className} flex items-center justify-center rounded-full bg-lune-500/30 text-sm font-semibold uppercase text-lune-100`}>{name.slice(0, 1) || '?'}</span>
);

const Spaces = () => {
  const { user } = useWallet();
  const navigate = useNavigate();
  const { spaces, connected } = useSpacesLobby();
  const [title, setTitle] = useState('');

  const start = () => {
    const name = title.trim();
    if (!name) { showError('Give your space a title first.'); return; }
    if (!navigator.mediaDevices?.getUserMedia) { showError('Your browser does not support microphone access (HTTPS is required).'); return; }
    navigate(`/spaces/${crypto.randomUUID().slice(0, 8)}`, { state: { host: true, title: name.slice(0, 80) } });
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        <PageHeader eyebrow="Live audio" icon={Radio} title="Spaces" description="Drop into live conversations, or start your own and invite people to speak." />

        <section className="lune-card mb-8 p-5 sm:p-6" aria-label="Start a space">
          <h2 className="mb-3 font-display text-lg font-semibold">Start a space</h2>
          {user ? (
            <form className="flex flex-col gap-3 sm:flex-row" onSubmit={e => { e.preventDefault(); start(); }}>
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="What do you want to talk about?" aria-label="Space title" className="lune-input h-12 flex-1 px-4" />
              <Button type="submit" className="h-12 rounded-full bg-lune-500 px-6 hover:bg-lune-600"><Mic className="mr-2 h-4 w-4" /> Go live</Button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
              <span>Log in to host or join a space.</span>
              <Button asChild className="rounded-full bg-lune-500 hover:bg-lune-600"><Link to="/signin">Log in</Link></Button>
              <Button asChild variant="outline" className="rounded-full"><Link to="/signup">Create account</Link></Button>
            </div>
          )}
        </section>

        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          Live now
          <span className={`h-2 w-2 rounded-full ${connected ? 'animate-pulse bg-up' : 'bg-white/25'}`} aria-label={connected ? 'Connected' : 'Connecting'} />
        </h2>
        {spaces.length === 0 ? (
          <div className="lune-card"><EmptyState icon={Headphones} title={connected ? 'No spaces are live' : 'Connecting…'}>{connected ? 'Be the first – start a space above and others can join instantly.' : 'Looking for live spaces.'}</EmptyState></div>
        ) : (
          <ul className="space-y-3">
            {spaces.map(space => (
              <li key={space.id} className="lune-card lune-card-hover flex items-center gap-4 p-4 sm:p-5">
                <SpaceAvatar name={space.hostName} src={space.hostAvatar} className="h-12 w-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{space.title}</p>
                  <p className="mt-0.5 flex items-center gap-3 truncate text-sm text-white/50">
                    <span className="truncate">Hosted by @{space.hostName}</span>
                    <span className="flex shrink-0 items-center gap-1"><Users size={13} /> {space.listeners + 1}</span>
                  </p>
                </div>
                <Button asChild className="shrink-0 rounded-full bg-lune-500 hover:bg-lune-600"><Link to={user ? `/spaces/${space.id}` : '/signin'}>{user ? 'Join' : 'Log in'}</Link></Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
};

export default Spaces;
