"use client";

import React from 'react';
import { LayoutDashboard, BarChart3, Rocket, Wallet, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const BottomNav = () => {
  const location = useLocation();
  
  const navItems = [
    { icon: LayoutDashboard, label: 'Feed', path: '/' },
    { icon: BarChart3, label: 'Explorer', path: '/explorer' },
    { icon: Rocket, label: 'Launch', path: '/launchpad' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="lg:hidden fixed bottom-6 left-0 right-0 z-50 px-4 pointer-events-none">
      <nav className="max-w-md mx-auto h-16 bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-around px-2 pointer-events-auto relative overflow-hidden">
        {/* Liquid Background Highlight */}
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className="relative flex flex-col items-center justify-center w-14 h-12 transition-all duration-500"
            >
              {isActive && (
                <motion.div
                  layoutId="liquid-bg"
                  className="absolute inset-0 bg-gradient-to-b from-purple-500/20 to-blue-500/10 rounded-2xl blur-sm"
                  transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                />
              )}
              
              <item.icon 
                size={20} 
                className={cn(
                  "relative z-10 transition-all duration-500",
                  isActive ? "text-purple-400 scale-110" : "text-gray-500"
                )} 
              />
              
              <span className={cn(
                "relative z-10 text-[8px] font-bold uppercase tracking-tighter mt-1 transition-all duration-500",
                isActive ? "text-white opacity-100" : "text-gray-600 opacity-0"
              )}>
                {item.label}
              </span>

              {isActive && (
                <motion.div 
                  layoutId="active-dot"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;