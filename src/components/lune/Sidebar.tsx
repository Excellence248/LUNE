"use client";

import React from 'react';
import { 
  LayoutDashboard, 
  Radio, 
  Rocket, 
  Briefcase, 
  Wallet, 
  Users, 
  Settings,
  Zap,
  Image as ImageIcon,
  Bell,
  Vote,
  MessageSquare,
  Trophy,
  Gift,
  ArrowRightLeft,
  UserPlus,
  BarChart3,
  PieChart,
  ShieldAlert,
  Lock,
  Gavel,
  PlayCircle,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';

export const navItems = [
  { icon: LayoutDashboard, label: 'Feed', path: '/' },
  { icon: BarChart3, label: 'Explorer', path: '/explorer' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: Radio, label: 'Spaces', path: '/spaces' },
  { icon: Gavel, label: 'Live Auction', path: '/live-auction' },
  { icon: PlayCircle, label: 'Demo Trade', path: '/demo-trade' },
  { icon: Rocket, label: 'Launchpad', path: '/launchpad' },
  { icon: ShieldAlert, label: 'Degen Tools', path: '/degen-tools' },
  { icon: Lock, label: 'Staking', path: '/staking' },
  { icon: ImageIcon, label: 'NFTs', path: '/nfts' },
  { icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
  { icon: Gift, label: 'Rewards', path: '/rewards' },
  { icon: ArrowRightLeft, label: 'Bridge', path: '/bridge' },
  { icon: UserPlus, label: 'Referrals', path: '/referrals' },
  { icon: Vote, label: 'Governance', path: '/governance' },
  { icon: PieChart, label: 'Analytics', path: '/analytics' },
  { icon: Briefcase, label: 'Jobs', path: '/jobs' },
  { icon: Users, label: 'Communities', path: '/communities' },
  { icon: Wallet, label: 'Wallet', path: '/wallet' },
  { icon: Bell, label: 'Activity', path: '/notifications' },
];

export const SidebarContent = ({ onClose }: { onClose?: () => void }) => {
  const location = useLocation();
  const { isConnected, disconnect } = useWallet();

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(147,51,234,0.3)]">
          <Zap className="text-white fill-white" size={24} />
        </div>
        <span className="text-2xl font-bold tracking-tighter text-white">LUNE</span>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group",
                isActive 
                  ? "bg-white/10 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]" 
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon size={20} className={cn(
                "transition-colors",
                isActive ? "text-purple-400" : "group-hover:text-purple-400"
              )} />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto space-y-2">
        <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-600/10 blur-2xl rounded-full -mr-10 -mt-10 group-hover:bg-purple-600/20 transition-all" />
          <p className="text-xs text-gray-500 mb-1">Reputation Score</p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">2,450</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded border border-green-500/30">+12%</span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full w-[65%] bg-gradient-to-r from-purple-500 to-blue-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          <Link to="/settings" onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-white transition-colors rounded-xl hover:bg-white/5">
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </Link>

          {isConnected && (
            <button 
              onClick={() => {
                disconnect();
                onClose?.();
              }}
              className="flex items-center gap-3 px-4 py-3 text-red-400/70 hover:text-red-400 transition-all rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] backdrop-blur-xl"
            >
              <LogOut size={20} />
              <span className="font-medium">Log Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#050505] border-r border-white/5 hidden lg:flex flex-col z-50">
      <SidebarContent />
    </aside>
  );
};

export default Sidebar;