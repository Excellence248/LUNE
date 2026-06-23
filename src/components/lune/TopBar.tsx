"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Wallet, Menu, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarContent } from './Sidebar';
import WalletModal from './WalletModal';
import PriceTicker from './PriceTicker';
import { useWallet } from '@/context/WalletContext';
import { useSocial } from '@/context/SocialContext';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const TopBar = () => {
  const navigate = useNavigate();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const { isConnected, address, disconnect } = useWallet();
  const { searchUsers } = useSocial();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearching(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim()) {
        const results = await searchUsers(searchQuery);
        setSearchResults(results);
        setIsSearching(true);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleUserClick = (username: string) => {
    setSearchQuery('');
    setIsSearching(false);
    navigate(`/profile/${username}`);
  };

  return (
    <header className="h-16 lg:h-20 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-40 px-4 lg:px-8 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 lg:gap-4 flex-1 min-w-0">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden text-gray-400 hover:text-white h-9 w-9 shrink-0">
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-[#050505] border-white/5">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        <div className="flex-1 max-w-xl relative group hidden sm:block" ref={searchRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={18} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setIsSearching(true)}
            placeholder="Search users or alpha..." 
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-12 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all"
          />

          {isSearching && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#050505] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="p-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase px-3 py-2">Users</p>
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserClick(user.username)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                  >
                    <Avatar className="w-8 h-8 border border-white/10">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-purple-900 text-purple-200 text-[10px]">
                        {user.username?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold text-white">{user.username}</p>
                      <p className="text-[10px] text-gray-500">View Profile</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="sm:hidden font-bold text-lg tracking-tighter text-white shrink-0">LUNE</div>
        
        <PriceTicker />
      </div>

      <div className="flex items-center gap-2 lg:gap-6">
        <button className="relative p-2 text-gray-400 hover:text-white transition-colors shrink-0">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-purple-500 rounded-full border border-[#050505]" />
        </button>

        <div className="h-6 w-[1px] bg-white/10 hidden xs:block" />

        {isConnected ? (
          <Button 
            onClick={disconnect}
            className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 hover:bg-white/10 text-white rounded-xl h-10 px-4 lg:px-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center gap-2 text-xs font-bold transition-all"
          >
            <LogOut size={14} className="text-red-400" />
            <span className="hidden xs:inline">{address} (Log Out)</span>
            <span className="xs:hidden">Log Out</span>
          </Button>
        ) : (
          <Button 
            onClick={() => setIsWalletOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-none rounded-xl h-10 px-4 lg:px-6 shadow-[0_0_20px_rgba(147,51,234,0.3)] flex items-center gap-2 text-xs font-bold transition-all"
          >
            <Wallet size={14} />
            <span>Connect Wallet</span>
          </Button>
        )}
      </div>

      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </header>
  );
};

export default TopBar;