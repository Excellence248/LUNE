"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Home, CandlestickChart, Bell, Wallet, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useSocial } from '@/context/SocialContext';

const items = [
  { icon: Home, label: 'Feed', path: '/' },
  { icon: CandlestickChart, label: 'Markets', path: '/explorer' },
  { icon: Bell, label: 'Activity', path: '/notifications' },
  { icon: Wallet, label: 'Wallet', path: '/wallet' },
  { icon: User, label: 'Profile', path: '/profile' },
];

/**
 * Hides the bar while the page is being scrolled down, so the feed gets the whole screen, and brings it
 * back when you scroll up, when you stop for a moment, at the very top or bottom of the page, and on a new page.
 */
const useHideOnScroll = (resetKey: string) => {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    setHidden(false);
    let last = window.scrollY;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - last;
      last = y;
      const nearTop = y < 24;
      const nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 24;
      clearTimeout(idle);
      if (nearTop || nearBottom || delta < -4) { setHidden(false); return; }
      if (delta > 4) setHidden(true);
      idle = setTimeout(() => setHidden(false), 500);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(idle); };
  }, [resetKey]);
  return hidden;
};

const BottomNav = () => {
  const location = useLocation();
  const { unreadCount } = useSocial();
  const hidden = useHideOnScroll(location.pathname);
  const wrapper = useRef<HTMLDivElement>(null);

  // While hidden the bar must not be reachable by keyboard or screen reader either.
  useEffect(() => { wrapper.current?.toggleAttribute('inert', hidden); }, [hidden]);

  return (
    <div
      ref={wrapper}
      className={cn(
        'lg:hidden fixed bottom-0 inset-x-0 z-50 pointer-events-none transition-transform duration-300 ease-out motion-reduce:transition-none',
        hidden && 'translate-y-[calc(100%+1rem)]',
      )}
    >
      {/* Fade so content scrolls under the bar instead of colliding with it */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background via-background/80 to-transparent" />
      <nav
        aria-label="Primary"
        className="relative mx-auto mb-[max(12px,env(safe-area-inset-bottom))] w-[calc(100%-24px)] max-w-md h-16 rounded-[1.75rem] glass grid grid-cols-5 px-1.5 pointer-events-auto"
      >
        {items.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center gap-1"
            >
              {isActive && (
                <motion.span
                  layoutId="bottomnav-pill"
                  className="absolute inset-x-1 inset-y-1.5 rounded-2xl bg-lune-500/15 ring-1 ring-lune-400/20"
                  transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                />
              )}
              <span className="relative">
                <item.icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  className={cn('transition-colors', isActive ? 'text-lune-300' : 'text-white/45')}
                />
                {item.path === '/notifications' && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-lune-400 ring-2 ring-[hsl(260_35%_7%)]" />
                )}
              </span>
              <span
                className={cn(
                  'relative text-[10px] font-medium transition-colors',
                  isActive ? 'text-white' : 'text-white/40'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
