import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus, Search, Users, ImagePlus } from 'lucide-react';
import Layout from '@/components/lune/Layout';
import UnavailableFeature from '@/components/lune/UnavailableFeature';
import { EmptyState, PageHeader } from '@/components/lune/Brand';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWallet } from '@/context/WalletContext';
import { api, uploadImage } from '@/lib/api';
import { prepareImage } from '@/lib/images';
import { slugFromName, type CommunityDetails, type CommunitySummary } from '@/lib/communities';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

export const CommunityAvatar = ({ community, className }: { community: Pick<CommunitySummary, 'name' | 'avatar_url'>; className?: string }) => (
  <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-lune-500 to-lune-900 font-display font-bold text-white ring-1 ring-white/10', className ?? 'h-12 w-12 text-lg')}>
    {community.avatar_url ? <img src={community.avatar_url} alt="" className="h-full w-full object-cover" /> : community.name[0]?.toUpperCase()}
  </div>
);

const CommunityCard = ({ community }: { community: CommunitySummary }) => (
  <Link to={`/communities/${community.slug}`} className="group block overflow-hidden rounded-2xl border border-white/10 glass-soft transition-colors hover:border-lune-400/40">
    <div className="h-20 bg-gradient-to-br from-lune-700/50 via-lune-900/60 to-black/40">
      {community.cover_url && <img src={community.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
    </div>
    <div className="-mt-6 px-4 pb-4">
      <CommunityAvatar community={community} className="h-12 w-12 text-lg ring-2 ring-[#0a0618]" />
      <p className="mt-2 truncate font-display font-semibold text-white group-hover:text-lune-200">{community.name}</p>
      <p className="text-xs text-white/40">{community.member_count.toLocaleString()} {community.member_count === 1 ? 'member' : 'members'}{community.viewer_role ? ` · ${community.viewer_role === 'owner' ? 'You own this' : 'Joined'}` : ''}</p>
      {community.description && <p className="mt-2 line-clamp-2 text-sm text-white/55">{community.description}</p>}
    </div>
  </Link>
);

const CreateDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [picture, setPicture] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => (picture ? URL.createObjectURL(picture) : ''), [picture]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const avatar_url = picture ? await uploadImage(await prepareImage(picture)) : '';
      const created = await api<CommunityDetails>('/api/communities', { method: 'POST', body: { name, slug, description, rules, avatar_url } });
      showSuccess('Your community is live.');
      onClose();
      navigate(`/communities/${created.slug}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The community could not be created. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={next => { if (!next && !saving) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a community</DialogTitle>
          <DialogDescription>A place for people who share an interest. You’ll be the owner and can remove posts and members.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Choose a community picture" className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 text-white/50 hover:border-lune-400/50">
              {previewUrl ? <img src={previewUrl} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={20} />}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => { setPicture(event.target.files?.[0] ?? null); event.target.value = ''; }} />
            <label className="block flex-1 text-xs text-white/50">Name
              <input value={name} maxLength={60} required onChange={event => { setName(event.target.value); if (!slugTouched) setSlug(slugFromName(event.target.value)); }} placeholder="Solana Builders" className="lune-input mt-1 w-full text-[16px]" />
            </label>
          </div>
          <label className="block text-xs text-white/50">Web address
            <div className="mt-1 flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white/40"><span>/communities/</span>
              <input value={slug} maxLength={40} required onChange={event => { setSlugTouched(true); setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} placeholder="solana-builders" className="min-w-0 flex-1 bg-transparent py-2 text-[16px] text-white outline-none" />
            </div>
          </label>
          <label className="block text-xs text-white/50">What is it about?
            <textarea value={description} maxLength={500} rows={3} onChange={event => setDescription(event.target.value)} placeholder="Share what members can expect here." className="lune-input mt-1 w-full resize-none text-[16px]" />
          </label>
          <label className="block text-xs text-white/50">Rules (optional)
            <textarea value={rules} maxLength={1000} rows={3} onChange={event => setRules(event.target.value)} placeholder="Be kind. No spam." className="lune-input mt-1 w-full resize-none text-[16px]" />
          </label>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button>
            <button type="submit" disabled={saving || name.trim().length < 3 || slug.length < 3} className="lune-btn h-10 px-5 text-sm">{saving ? 'Creating…' : 'Create community'}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Communities = () => {
  const { user } = useWallet();
  const navigate = useNavigate();
  const [items, setItems] = useState<CommunitySummary[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (signal: { active: boolean }) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (mine) params.set('mine', '1');
      const data = await api<{ available: boolean; items: CommunitySummary[] }>(`/api/communities?${params}`);
      if (!signal.active) return;
      setAvailable(data.available);
      setItems(data.items);
    } catch {
      if (signal.active) setError('Communities could not be loaded. Check your connection and try again.');
    } finally { if (signal.active) setLoading(false); }
  }, [query, mine]);

  useEffect(() => {
    const signal = { active: true };
    const timer = setTimeout(() => void load(signal), query ? 250 : 0);
    return () => { signal.active = false; clearTimeout(timer); };
  }, [load, query]);

  const startCreate = () => {
    if (!user) { showError('Log in to create a community.'); navigate('/signin'); return; }
    setCreating(true);
  };

  if (!available && !loading) {
    return (
      <Layout>
        <UnavailableFeature title="Communities" description="Communities are being set up. Please check back soon." />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        eyebrow="Communities"
        icon={Users}
        title="Find your people"
        description="Join a community, post with its members, or start your own."
        actions={<button onClick={startCreate} className="lune-btn h-10 px-5 text-sm"><Plus size={16} className="mr-1.5" />Create community</button>}
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search communities" aria-label="Search communities" className="lune-input w-full pl-10 text-[16px]" />
        </div>
        {user && (
          <div className="flex rounded-full border border-white/10 p-0.5 text-sm" role="tablist">
            {([['Discover', false], ['My communities', true]] as const).map(([label, value]) => (
              <button key={label} role="tab" aria-selected={mine === value} onClick={() => setMine(value)} className={cn('rounded-full px-4 py-1.5 transition-colors', mine === value ? 'bg-lune-500/25 text-white' : 'text-white/50 hover:text-white')}>{label}</button>
            ))}
          </div>
        )}
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
      {loading && !items.length ? (
        <div role="status" className="flex items-center justify-center gap-2 py-16 text-white/50"><Loader2 className="h-5 w-5 animate-spin" />Loading communities…</div>
      ) : items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(community => <CommunityCard key={community.id} community={community} />)}</div>
      ) : !error && (
        <div className="lune-card">
          <EmptyState icon={Users} title={mine ? 'You haven’t joined any communities yet' : query ? 'No communities match your search' : 'No communities yet'}>
            {mine ? 'Discover a community to join, or start your own.' : 'Be the first to start one.'}
          </EmptyState>
        </div>
      )}
      <CreateDialog open={creating} onClose={() => setCreating(false)} />
    </Layout>
  );
};

export default Communities;
