"use client";

import React from 'react';
import {
  Home,
  Radio,
  Rocket,
  Briefcase,
  Wallet,
  Users,
  Settings,
  Image as ImageIcon,
  Bell,
  Vote,
  MessageCircle,
  Trophy,
  Gift,
  ArrowRightLeft,
  UserPlus,
  CandlestickChart,
  PieChart,
  ShieldAlert,
  Lock,
  Gavel,
  PlayCircle,
  LogOut,
  BadgeCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { showError } from '@/utils/toast';
import { LuneLogo } from './Brand';

export const navSections = [
  {
    title: 'Social',
    items: [
      { icon: Home, label: 'Feed', path: '/' },
      { icon: Bell, label: 'Activity', path: '/notifications' },
      { icon: MessageCircle, label: 'Messages', path: '/messages' },
      { icon: Radio, label: 'Spaces', path: '/spaces' },
      { icon: BadgeCheck, label: 'Premium', path: '/premium' },
      { icon: Users, label: 'Communities', path: '/communities' },
    ],
  },
  {
    title: 'Markets',
    items: [
      { icon: CandlestickChart, label: 'Explorer', path: '/explorer' },
      { icon: PieChart, label: 'Analytics', path: '/analytics' },
      { icon: PlayCircle, label: 'Demo Trade', path: '/demo-trade' },
      { icon: Rocket, label: 'Launchpad', path: '/launchpad' },
      { icon: ShieldAlert, label: 'Degen Tools', path: '/degen-tools' },
    ],
  },
  {
    title: 'Earn & Collect',
    items: [
      { icon: Lock, label: 'Staking', path: '/staking' },
      { icon: ImageIcon, label: 'NFTs', path: '/nfts' },
      { icon: Gavel, label: 'Live Auction', path: '/live-auction' },
      { icon: Gift, label: 'Rewards', path: '/rewards' },
      { icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
    ],
  },
  {
    title: 'Ecosystem',
    items: [
      { icon: Wallet, label: 'Wallet', path: '/wallet' },
      { icon: ArrowRightLeft, label: 'Bridge', path: '/bridge' },
      { icon: Vote, label: 'Governance', path: '/governance' },
      { icon: UserPlus, label: 'Referrals', path: '/referrals' },
      { icon: Briefcase, label: 'Jobs', path: '/jobs' },
    ],
  },
];

/** Flat list kept for any consumer that imported it previously. */
export const navItems = navSections.flatMap(s => s.items);

const NavLink = ({
  icon: Icon,
  label,
  path,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  path: string;
  active: boolean;
  onClick?: () => void;
}) => (
  <Link
    to={path}
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    className={cn(
      'relative flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] transition-all duration-200 group',
      active
        ? 'text-white bg-gradient-to-r from-lune-500/20 via-lune-500/[0.07] to-transparent'
        : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
    )}
  >
    {active && (
      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-lune-400 shadow-[0_0_12px_2px_rgba(169,116,255,0.6)]" />
    )}
    <Icon
      size={18}
      strokeWidth={active ? 2.2 : 1.8}
      className={cn('transition-colors', active ? 'text-lune-300' : 'group-hover:text-lune-300')}
    />
    <span className={cn(active ? 'font-semibold' : 'font-medium')}>{label}</span>
  </Link>
);

export const SidebarContent = ({ onClose }: { onClose?: () => void }) => {
  const location = useLocation();
  const { isAuthenticated, disconnect } = useWallet();

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4">
        <LuneLogo onClick={onClose} />
      </div>

      <nav className="flex-1 px-3 pb-4 overflow-y-auto custom-scrollbar space-y-5" aria-label="Main">
        {navSections.map(section => (
          <div key={section.title}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavLink key={item.path} {...item} active={location.pathname === item.path} onClick={onClose} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/[0.06] space-y-0.5">
        <NavLink icon={Settings} label="Settings" path="/settings" active={location.pathname === '/settings'} onClick={onClose} />
        {isAuthenticated && (
          <button
            onClick={() => {
              void disconnect().then(() => onClose?.()).catch(() => showError('Log out failed. Please retry.'));
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium text-white/40 hover:text-red-300 hover:bg-red-500/[0.06] transition-all"
          >
            <LogOut size={18} strokeWidth={1.8} />
            <span>Log out</span>
          </button>
        )}
      </div>
    </div>
  );
};

const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-72 hidden lg:flex flex-col z-50 glass-bar border-r">
      <SidebarContent />
    </aside>
  );
};

export default Sidebar;
