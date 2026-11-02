import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSocial, type PublicProfile } from '@/context/SocialContext';

const SearchField = ({ onNavigate, autoFocus = false }: { onNavigate?: () => void; autoFocus?: boolean }) => {
  const { searchUsers } = useSocial();
  const navigate = useNavigate();
  const listId = useId();
  const container = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [retry, setRetry] = useState(0);
  const [response, setResponse] = useState<{ query: string; results: PublicProfile[]; error: string; pending: boolean }>({ query: '', results: [], error: '', pending: false });
  const term = query.trim().replace(/^@/, '');
  const busy = !!term && (response.query !== term || response.pending);
  const results = !busy && response.query === term ? response.results : [];
  const error = response.query === term ? response.error : '';

  useEffect(() => {
    let active = true;
    setActiveIndex(-1);
    if (!term) {
      setResponse({ query: '', results: [], error: '', pending: false });
      return;
    }
    setResponse({ query: term, results: [], error: '', pending: true });
    const timer = setTimeout(async () => {
      try {
        const users = await searchUsers(term);
        if (active) setResponse({ query: term, results: users, error: '', pending: false });
      } catch {
        if (active) setResponse({ query: term, results: [], error: 'People search could not be loaded. Please retry.', pending: false });
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [term, retry, searchUsers]);

  useEffect(() => {
    const dismiss = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, []);

  const selectUser = (username: string) => {
    setOpen(false);
    setQuery('');
    navigate(`/profile/${encodeURIComponent(username)}`);
    onNavigate?.();
  };

  return (
    <div ref={container} className="relative w-full" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <Search size={16} className="pointer-events-none absolute left-4 top-3 text-white/35" />
      <Input
        autoFocus={autoFocus}
        value={query}
        maxLength={65}
        onChange={event => { setQuery(event.target.value); setOpen(true); setActiveIndex(-1); }}
        onFocus={() => setOpen(true)}
        placeholder="Search people…"
        role="combobox"
        aria-label="Search people by username"
        aria-autocomplete="list"
        aria-expanded={open && !!term}
        aria-controls={listId}
        aria-activedescendant={open && activeIndex >= 0 && results[activeIndex] ? `${listId}-${results[activeIndex].id}` : undefined}
        onKeyDown={event => {
          if (event.key === 'Escape') { setOpen(false); return; }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            if (results.length) setActiveIndex(previous => event.key === 'ArrowDown' ? (previous + 1) % results.length : previous <= 0 ? results.length - 1 : previous - 1);
          }
          if (event.key === 'Enter' && open && results.length) {
            event.preventDefault();
            selectUser(results[Math.max(0, activeIndex)].username);
          }
        }}
        className="h-10 rounded-full border-white/10 bg-white/[0.03] pl-11 text-white"
      />
      {open && term && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-[55dvh] overflow-y-auto rounded-2xl border border-white/10 bg-popover p-2 shadow-xl">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">People</p>
          {busy ? <p role="status" className="flex items-center gap-2 px-3 pb-3 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</p> : error ? <div className="space-y-2 px-3 pb-3"><p role="alert" className="text-sm text-red-300">{error}</p><Button size="sm" variant="outline" onClick={() => setRetry(previous => previous + 1)}>Retry search</Button></div> : !results.length && <p role="status" className="px-3 pb-3 text-sm text-white/40">No users match “{term}”.</p>}
          <div id={listId} role="listbox" aria-label="People search results">
            {results.map((result, index) => (
              <button key={result.id} id={`${listId}-${result.id}`} role="option" aria-selected={index === activeIndex} onMouseEnter={() => setActiveIndex(index)} onClick={() => selectUser(result.username)} className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-white/[0.05] ${index === activeIndex ? 'bg-white/[0.05]' : ''}`}>
                <Avatar className="h-9 w-9 shrink-0 ring-1 ring-white/10"><AvatarImage src={result.avatar_url} /><AvatarFallback className="bg-lune-900 text-xs text-lune-200">{result.username[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{result.username}</p><p className="truncate text-xs text-white/40">@{result.username}</p></div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PeopleSearch = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
      <div className="ml-2 hidden min-w-0 flex-1 sm:block sm:max-w-md lg:ml-0"><SearchField /></div>
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogTrigger asChild><Button variant="ghost" size="icon" className="shrink-0 rounded-full text-white/60 sm:hidden" aria-label="Search people"><Search size={19} /></Button></DialogTrigger>
        <DialogContent className="top-[20%] overflow-visible rounded-3xl border-white/10 bg-popover text-white">
          <DialogHeader><DialogTitle>Find people</DialogTitle><DialogDescription>Search for an account by username.</DialogDescription></DialogHeader>
          <SearchField autoFocus onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PeopleSearch;
