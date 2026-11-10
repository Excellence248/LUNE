import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Page } from './api';

/** Loads `${path}?q=&page=` lists with "load more", ignoring responses that arrive out of order. */
export const usePagedList = <T>(path: string, params: Record<string, string>) => {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  const key = new URLSearchParams(params).toString();

  const load = useCallback(async (nextPage: number) => {
    const id = ++request.current;
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams(key);
      query.set('page', String(nextPage));
      const data = await api<Page<T>>(`${path}?${query}`);
      if (id !== request.current) return;
      setItems(previous => (nextPage === 0 ? data.items : [...previous, ...data.items]));
      setHasMore(data.hasMore);
      setPage(nextPage);
    } catch (cause) {
      if (id === request.current) setError(cause instanceof Error ? cause.message : 'Could not load this list.');
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [path, key]);

  useEffect(() => { void load(0); }, [load]);

  return { items, hasMore, loading, error, reload: () => load(0), loadMore: () => load(page + 1) };
};
