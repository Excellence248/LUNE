"use client";

import { useState } from 'react';
import { Bell, Wallet, Menu, LogOut, User, Settings } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarContent } from './Sidebar';
import WalletModal from './WalletModal';
import PriceTicker from './PriceTicker';
import PeopleSearch from './PeopleSearch';
import { LuneLogo } from './Brand';
import { useWallet } from '@/context/WalletContext';
import { useSocial } from '@/context/SocialContext';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { shortWalletAddress } from '@/lib/solana-wallet';
import { showError } from '@/utils/toast';

const iconBtn =
  'relative h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors';

const TopBar = () => {
  const navigate = useNavigate();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, user, disconnect } = useWallet();
  const { unreadCount } = useSocial();

  const displayName = user ? (user.username === user.walletAddress ? shortWalletAddress(user.walletAddress) : user.username) : 'Wallet';

  return (
    <header className="h-16 lg:h-[72px] border-b border-white/[0.06] bg-[hsl(260_40%_3%/0.7)] backdrop-blur-2xl sticky top-0 z-40 px-3 md:px-6 lg:px-10 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 lg:gap-4 flex-1 min-w-0">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className={`${iconBtn} lg:hidden`} aria-label="Open menu">
              <Menu size={20} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-[hsl(260_40%_4%)] border-white/[0.06]">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onClose={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <LuneLogo className="lg:hidden" />

        <PeopleSearch />

        <PriceTicker />
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        <button onClick={() => navigate('/notifications')} className={iconBtn} aria-label="Activity">
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-lune-400 rounded-full ring-2 ring-background shadow-[0_0_8px_rgba(169,116,255,0.9)]" />
          )}
        </button>

        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-full pl-1 pr-1 md:pr-3 py-1 hover:bg-white/[0.06] transition-colors"
                aria-label="Account menu"
              >
                <Avatar className="w-8 h-8 ring-2 ring-lune-500/40">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-lune-500 to-lune-800 text-white text-xs font-semibold">
                    {displayName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">{displayName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-60 bg-popover/95 backdrop-blur-2xl border-white/10 rounded-2xl p-1.5 text-white"
            >
              <DropdownMenuLabel className="px-2.5 py-2">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                <p className="text-xs font-normal text-white/40 truncate" title={user?.walletAddress}>{user?.walletAddress}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-xl gap-2.5 py-2 focus:bg-white/[0.06]">
                <User size={16} /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-xl gap-2.5 py-2 focus:bg-white/[0.06]">
                <Settings size={16} /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => disconnect().catch(() => showError('Wallet sign-out failed. Please retry.'))}
                className="rounded-xl gap-2.5 py-2 text-red-300 focus:text-red-200 focus:bg-red-500/10"
              >
                <LogOut size={16} /> Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={() => setIsWalletOpen(true)}
            aria-label="Connect wallet"
            className="flex items-center gap-2 h-10 px-3 md:px-4 rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-lune-400/40 text-xs font-semibold transition-all"
          >
            <Wallet size={15} />
            <span className="hidden sm:inline">Connect wallet</span>
          </button>
        )}
      </div>

      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </header>
  );
};

export default TopBar;
