import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { cn } from '@/lib/utils';
import Repost from '@/components/Repost';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

const Layout = ({ children, className, noPadding = false }: LayoutProps) => {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen lune-backdrop text-white flex flex-col">
      <Sidebar />
      <main className="relative lg:pl-72 min-h-screen flex flex-col w-full pb-28 lg:pb-0">
        <TopBar />
        <div key={pathname} className={cn('lune-page-enter flex-1 w-full max-w-[1680px] mx-auto', !noPadding && 'px-4 py-6 md:px-10 md:py-10', className)}>
          <Repost />
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
