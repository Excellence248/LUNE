import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Repost from '@/components/Repost';
interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}
const Layout = ({ children, className, noPadding = false }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 flex flex-col">
      <Sidebar />
      <main className="lg:pl-64 min-h-screen flex flex-col w-full pb-24 lg:pb-0">
        <TopBar />
        <div className={cn( "flex-1 w-full mx-auto", !noPadding && "p-4 md:p-8", className )}>
          <Repost />
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};
export default Layout;