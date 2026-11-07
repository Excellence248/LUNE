"use client";

import React from 'react';
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

const BottomNav = () => {
  const location = useLocation();
  const { unreadCount } = useSocial();

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 pointer-events-none">
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
