import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Check, Loader2, UserPlus, UserCheck, X } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWallet } from '@/context/WalletContext';
import { useSocial, type PublicProfile } from '@/context/SocialContext';
import type { AccountUser } from '@/context/SessionContext';
import { api, orNull } from '@/lib/api';
import { MOON_AVATARS } from '@/lib/moon-avatars';
import { INTERESTS, getInterests, hasDefaultUsername, isGeneratedUsername, markOnboardingDone, markPostedFirst, setInterests as saveInterests } from '@/lib/onboarding';
import { showError } from '@/utils/toast';

const STEPS = [
  { title: 'Make it yours', description: 'Pick a handle and a face. You can change both any time.' },
  { title: 'What are you into?', description: 'Choose a few topics and we’ll point you to the right people.' },
  { title: 'Find your people', description: 'Follow a few accounts so your feed has something in it.' },
  { title: 'Say hello', description: 'Your first post is the easiest one. Make it count, or keep it short.' },
] as const;

type Availability = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'unknown';

const primary = 'h-12 w-full rounded-xl bg-lune-500 font-semibold text-white hover:bg-lune-600 disabled:opacity-50';

const Progress = ({ step }: { step: number }) => (
  <ol aria-label={`Step ${step + 1} of ${STEPS.length}`} className="mb-6 flex items-center justify-center gap-2">
    {STEPS.map((item, index) => (
      <li key={item.title} aria-current={index === step ? 'step' : undefined} className={`h-1.5 rounded-full transition-all duration-300 ${index === step ? 'w-8 bg-lune-300' : index < step ? 'w-4 bg-lune-500/70' : 'w-4 bg-white/15'}`} />
    ))}
  </ol>
);

const WelcomeFlow = ({ user }: { user: AccountUser }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { updateProfile } = useWallet();
  const { followUser, unfollowUser, isFollowing, addPost } = useSocial();

  const [step, setStep] = useState(params.get('step') === 'follow' ? 2 : 0);

  // step 0
  const suggested = user.email.split('@')[0].replace(/[^A-Za-z0-9_]/g, '').slice(0, 24);
  const [username, setUsername] = useState(hasDefaultUsername(user) ? (suggested.length >= 3 ? suggested : '') : user.username);
  const [bio, setBio] = useState(user.bio);
  const [avatar, setAvatar] = useState(user.avatar);
  const [availability, setAvailability] = useState<Availability>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  // step 1
  const [interests, setInterests] = useState<string[]>(() => getInterests(user.id));

  // step 2
  const [people, setPeople] = useState<PublicProfile[] | null>(null);
  const [peopleError, setPeopleError] = useState(false);
  const [busyIds, setBusyIds] = useState<string[]>([]);

  // step 3
  const [post, setPost] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const name = username.trim();
    if (!name) { setAvailability('idle'); return; }
    if (!/^[A-Za-z0-9_]{3,64}$/.test(name)) { setAvailability('invalid'); return; }
    if (name === user.username) { setAvailability('available'); return; }
    setAvailability('checking');
    let active = true;
    const timer = setTimeout(async () => {
      // Usernames are unique regardless of case, and so is this lookup.
      const found = await orNull(api<PublicProfile>(`/api/profiles/${encodeURIComponent(name)}`)).catch(() => undefined);
      if (active) setAvailability(found === undefined ? 'unknown' : found && found.id !== user.id ? 'taken' : 'available');
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [username, user.username, user.id]);

  useEffect(() => {
    if (step !== 2 || people) return;
    let active = true;
    api<PublicProfile[]>('/api/profiles?limit=40').then(data => ({ data, loadError: false }), () => ({ data: [] as PublicProfile[], loadError: true })).then(({ data, loadError }) => {
      if (!active) return;
      if (loadError) { setPeopleError(true); setPeople([]); return; }
      const wanted = interests.map(item => item.toLowerCase());
      const score = (profile: PublicProfile) => wanted.filter(item => `${profile.bio} ${profile.username}`.toLowerCase().includes(item)).length * 2 + (profile.avatar_url ? 0.5 : 0) + (profile.bio ? 0.5 : 0);
      setPeople((data || []).filter(profile => !isGeneratedUsername(profile.username)).sort((a, b) => score(b) - score(a)).slice(0, 8));
    });
    return () => { active = false; };
  }, [step, people, user.id, interests]);

  const hello = useMemo(() => {
    const topics = interests.slice(0, 3).join(', ').toLowerCase();
    return [
      'Hey Lune 👋 just landed. Excited to be here.',
      topics ? `Hello from a brand new moon 🌙 I’m into ${topics}. Who should I follow?` : 'Hello from a brand new moon 🌙 Who should I follow first?',
      `Hi, I’m @${username.trim() || user.username}. Say hi if you’re around!`,
    ];
  }, [interests, username, user.username]);

  const finish = () => {
    markOnboardingDone(user.id);
    navigate('/', { replace: true, state: { welcome: true } });
  };

  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { setError('Choose a JPG, PNG, WebP, or GIF image.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Your avatar must be 2 MB or smaller.'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.onerror = () => setError('This image could not be read. Please choose another.');
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    try {
      await updateProfile({ username: username.trim(), bio, avatar });
      setStep(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your profile could not be saved. Please try again.');
    } finally { setSaving(false); }
  };

  const toggleFollow = async (id: string) => {
    if (busyIds.includes(id)) return;
    setBusyIds(previous => [...previous, id]);
    try { await (isFollowing(id) ? unfollowUser(id) : followUser(id)); }
    catch { showError('That follow could not be saved. Please try again.'); }
    finally { setBusyIds(previous => previous.filter(item => item !== id)); }
  };

  const sendPost = async () => {
    if (posting || !post.trim()) return;
    setPosting(true);
    try {
      await addPost(post);
      markPostedFirst(user.id);
      finish();
    } catch (cause) {
      showError(cause instanceof Error ? cause.message : 'Your post could not be saved. Please retry.');
      setPosting(false);
    }
  };

  const status = {
    idle: null,
    invalid: <span className="text-red-300">Use 3–64 letters, numbers, or underscores.</span>,
    checking: <span className="flex items-center gap-1.5 text-white/50"><Loader2 size={12} className="animate-spin" /> Checking…</span>,
    available: <span className="flex items-center gap-1.5 text-emerald-300"><Check size={12} /> {username.trim() === user.username ? 'This is your handle' : 'Available'}</span>,
    taken: <span className="flex items-center gap-1.5 text-red-300"><X size={12} /> Already taken</span>,
    unknown: <span className="text-amber-200">Couldn’t check right now. We’ll confirm when you continue.</span>,
  }[availability];

  const { title, description } = STEPS[step];

  return (
    <AuthShell title={title} description={description}>
      <Progress step={step} />

      {step === 0 && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => fileInput.current?.click()} aria-label="Upload a profile photo" className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lune-400">
              <Avatar className="h-20 w-20 ring-2 ring-lune-400/30">
                <AvatarImage src={avatar} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-lune-400 to-lune-800 text-2xl font-bold">{username[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1 rounded-full border-4 border-[#120a24] bg-lune-500 p-1.5"><Camera size={13} /></span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs text-white/45">Pick a moon, or upload your own</p>
              <div className="flex flex-wrap gap-2">
                {MOON_AVATARS.map(moon => (
                  <button key={moon.name} type="button" onClick={() => setAvatar(moon.url)} aria-label={`${moon.name} moon avatar`} aria-pressed={avatar === moon.url} className={`h-9 w-9 overflow-hidden rounded-full ring-2 transition-transform hover:scale-110 ${avatar === moon.url ? 'ring-lune-300' : 'ring-transparent'}`}>
                    <img src={moon.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImage} className="hidden" />
          </div>

          <div className="space-y-2">
            <label htmlFor="welcome-username" className="text-sm text-white/70">Username</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">@</span>
              <Input id="welcome-username" value={username} onChange={event => setUsername(event.target.value)} maxLength={64} autoComplete="username" autoFocus placeholder="yourname" className="h-12 rounded-xl border-white/10 glass-soft pl-9" />
            </div>
            <p className="min-h-4 text-xs" aria-live="polite">{status}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-white/70"><label htmlFor="welcome-bio">Bio <span className="text-white/35">(optional)</span></label><span className="text-xs tabular-nums text-white/35">{bio.length}/500</span></div>
            <Textarea id="welcome-bio" value={bio} onChange={event => setBio(event.target.value)} maxLength={500} placeholder="A little about you and what you’re here for…" className="min-h-20 resize-none rounded-xl border-white/10 glass-soft" />
          </div>

          {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
          <Button onClick={() => void saveProfile()} disabled={saving || availability === 'taken' || availability === 'invalid' || availability === 'checking' || availability === 'idle'} className={primary}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saving ? 'Saving…' : 'Continue'}</Button>
          <button type="button" onClick={() => setStep(1)} className="block w-full text-center text-sm text-white/40 hover:text-white/70">Skip for now</button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Topics you’re interested in">
            {INTERESTS.map(item => {
              const on = interests.includes(item);
              return <button key={item} type="button" aria-pressed={on} onClick={() => setInterests(previous => on ? previous.filter(value => value !== item) : [...previous, item])} className={`rounded-full border px-4 py-2 text-sm transition-colors ${on ? 'border-lune-300/60 bg-lune-500/30 text-white shadow-[0_0_16px_rgba(168,85,247,0.3)]' : 'border-white/10 text-white/60 hover:border-white/25 hover:text-white'}`}>{item}</button>;
            })}
          </div>
          <Button onClick={() => { saveInterests(user.id, interests); setStep(2); }} className={primary}>{interests.length ? `Continue with ${interests.length} topic${interests.length === 1 ? '' : 's'}` : 'Continue'}</Button>
          <button type="button" onClick={() => setStep(2)} className="block w-full text-center text-sm text-white/40 hover:text-white/70">Skip for now</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          {people === null ? (
            <div role="status" aria-label="Loading suggestions" className="space-y-3">{[0, 1, 2].map(item => <div key={item} className="flex animate-pulse items-center gap-3"><div className="h-11 w-11 rounded-full glass-soft" /><div className="flex-1 space-y-2"><div className="h-3 w-28 rounded-full glass-soft" /><div className="h-3 w-44 rounded-full glass-soft" /></div></div>)}</div>
          ) : people.length === 0 ? (
            <p className="rounded-2xl border border-white/10 glass-soft p-5 text-center text-sm leading-relaxed text-white/55">{peopleError ? 'Suggestions couldn’t load right now. You can find people with search any time.' : 'You’re one of the first moons here. Be the first to post and others will find you.'}</p>
          ) : (
            <ul className="-mx-1 max-h-80 space-y-1 overflow-y-auto px-1">
              {people.map(person => {
                const following = isFollowing(person.id);
                const busy = busyIds.includes(person.id);
                return (
                  <li key={person.id} className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-white/[0.04]">
                    <Avatar className="h-11 w-11 shrink-0 ring-1 ring-white/10"><AvatarImage src={person.avatar_url} className="object-cover" /><AvatarFallback className="bg-lune-900 text-sm text-lune-200">{person.username[0]?.toUpperCase()}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">@{person.username}</p><p className="truncate text-xs text-white/40">{person.bio || 'New to Lune'}</p></div>
                    <Button size="sm" variant={following ? 'outline' : 'default'} disabled={busy} onClick={() => void toggleFollow(person.id)} className={`shrink-0 rounded-full ${following ? 'border-white/15 bg-transparent' : 'bg-lune-500 hover:bg-lune-600'}`}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : following ? <><UserCheck className="mr-1.5 h-4 w-4" /> Following</> : <><UserPlus className="mr-1.5 h-4 w-4" /> Follow</>}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <Button onClick={() => setStep(3)} className={primary}>Continue</Button>
          <button type="button" onClick={() => setStep(3)} className="block w-full text-center text-sm text-white/40 hover:text-white/70">Skip for now</button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Textarea value={post} onChange={event => setPost(event.target.value)} disabled={posting} maxLength={2000} placeholder="Say hello to Lune 👋" aria-label="Your first post" className="min-h-28 resize-none rounded-xl border-white/10 glass-soft" />
          <div className="flex flex-wrap gap-2" aria-label="Post ideas">
            {hello.map(text => <button key={text} type="button" onClick={() => setPost(text)} className="rounded-full border border-white/10 px-3 py-1.5 text-left text-xs text-white/55 transition-colors hover:border-lune-300/40 hover:text-white">{text}</button>)}
          </div>
          <Button onClick={() => void sendPost()} disabled={posting || !post.trim()} className={primary}>{posting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{posting ? 'Posting…' : 'Post and enter Lune'}</Button>
          <button type="button" onClick={finish} disabled={posting} className="block w-full text-center text-sm text-white/40 hover:text-white/70">Skip, take me to my feed</button>
        </div>
      )}
    </AuthShell>
  );
};

const Welcome = () => {
  const { user } = useWallet();
  if (!user) return <AuthShell title="Getting things ready" description="Loading your account…"><p role="status" className="flex items-center justify-center gap-2 py-6 text-white/60"><Loader2 className="h-5 w-5 animate-spin" /> One moment…</p></AuthShell>;
  return <WelcomeFlow key={user.id} user={user} />;
};

export default Welcome;
