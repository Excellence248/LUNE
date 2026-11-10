import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Search box that reports its value after the admin stops typing. */
export const SearchBox = ({ label, onSearch }: { label: string; onSearch: (value: string) => void }) => {
  const [value, setValue] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => onSearch(value.trim()), 300);
    return () => clearTimeout(timer);
  }, [value, onSearch]);
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input aria-label={label} placeholder={label} value={value} onChange={event => setValue(event.target.value)} className="pl-9" />
    </div>
  );
};

interface ListStatusProps {
  count: number;
  loading: boolean;
  error: string;
  hasMore: boolean;
  empty: string;
  onRetry: () => void;
  onMore: () => void;
}

/** Loading, error, empty and "load more" states shared by the admin lists. */
export const ListStatus = ({ count, loading, error, hasMore, empty, onRetry, onMore }: ListStatusProps) => {
  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-3 p-4">
        <p role="alert" className="text-sm text-red-300">{error}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>
      </div>
    );
  }
  if (loading) return <div role="status" className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (!count) return <p className="p-6 text-center text-sm text-muted-foreground">{empty}</p>;
  if (hasMore) return <div className="p-4 text-center"><Button variant="outline" size="sm" onClick={onMore}>Load more</Button></div>;
  return null;
};
