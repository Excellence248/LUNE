import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FOUNDER_USERNAMES, type BadgeTier } from '@/lib/badges';

interface BadgeRow { tier: BadgeTier; expires_at: string | null; profiles: { username: string } | null; }

const BadgesContext = createContext<Map<string, BadgeTier>>(new Map());

/** Loads who is verified (username -> tier). Fails quietly: showing no badges is a safe fallback. */
export const BadgesProvider = ({ children }: { children: ReactNode }) => {
  const [rows, setRows] = useState<BadgeRow[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.from('user_badges').select('tier, expires_at, profiles(username)');
      if (active && !error && data) setRows(data as unknown as BadgeRow[]);
    };
    void load();
    const timer = setInterval(load, 5 * 60 * 1000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const map = useMemo(() => {
    const m = new Map<string, BadgeTier>();
    for (const r of rows) {
      const name = r.profiles?.username?.toLowerCase();
      if (name && (!r.expires_at || new Date(r.expires_at) > new Date())) m.set(name, r.tier);
    }
    for (const name of FOUNDER_USERNAMES) m.set(name, 'gold');
    return m;
  }, [rows]);

  return <BadgesContext.Provider value={map}>{children}</BadgesContext.Provider>;
};

export const useBadge = (username?: string | null): BadgeTier | undefined => {
  const map = useContext(BadgesContext);
  return username ? map.get(username.toLowerCase()) : undefined;
};
