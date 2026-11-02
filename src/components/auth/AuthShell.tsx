import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import { LuneLogo } from '@/components/lune/Brand';
import LuneMoon from '@/components/lune/LuneMoon';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const AuthShell = ({ title, description, children }: { title: string; description: string; children: ReactNode }) => {
  const { pathname } = useLocation();
  const accountPage = pathname === '/signin' || pathname === '/signup';

  return (
    <main className="lune-backdrop flex min-h-screen flex-col text-white">
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <LuneLogo />
        {!accountPage && <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"><ArrowLeft size={15} /> Browse feed</Link>}
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 pb-10 pt-4 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:py-12">
        <section className="hidden max-w-lg lg:block" aria-label="About Lune">
          <div className="relative mb-12 ml-6 h-36 w-36">
            <span aria-hidden className="lune-orbit lune-orbit--wide" />
            <span aria-hidden className="lune-orbit" />
            <LuneMoon className="h-36 w-36" float boop tilt={16} label="Lune, the moon mascot. Click to boop." />
          </div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-lune-300">Your people. Your conversations.</p>
          <h2 className="font-display text-5xl font-bold leading-[1.12] tracking-tight">A little more connection.<br /><span className="lune-shimmer-text">A lot more you.</span></h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-white/50">Share what’s on your mind, discover new perspectives, and find your corner of Lune.</p>
          <div className="mt-9 space-y-5">
            <div className="flex items-center gap-4 transition-transform duration-300 hover:translate-x-1"><span className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-lune-300"><MessageCircle size={20} /></span><div><p className="text-sm font-medium">Join the conversation</p><p className="mt-1 text-sm text-white/40">Post, reply, and share your perspective.</p></div></div>
            <div className="flex items-center gap-4 transition-transform duration-300 hover:translate-x-1"><span className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-lune-300"><Users size={20} /></span><div><p className="text-sm font-medium">Find your people</p><p className="mt-1 text-sm text-white/40">Follow profiles and discover your community.</p></div></div>
            <div className="flex items-center gap-4 transition-transform duration-300 hover:translate-x-1"><span className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-lune-300"><ShieldCheck size={20} /></span><div><p className="text-sm font-medium">Start with just your email</p><p className="mt-1 text-sm text-white/40">Wallet sign-in is always optional.</p></div></div>
          </div>
          <Link to="/" className="mt-9 inline-flex items-center gap-2 text-sm text-lune-300 hover:underline">Take a look around first <ArrowUpRight size={16} /></Link>
        </section>
        <div className="mx-auto w-full max-w-md lg:ml-auto lg:mr-0">
          <Card className="lune-spot lune-tilt rounded-3xl border-white/10 bg-popover/80 text-white shadow-2xl shadow-lune-950/80 backdrop-blur-2xl" data-tilt="4">
            {accountPage && <nav aria-label="Account access" className="mx-6 mt-6 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/20 p-1 sm:mx-8 sm:mt-8">
              {[{ to: '/signin', label: 'Sign in' }, { to: '/signup', label: 'Sign up' }].map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => `rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-colors ${isActive ? 'bg-lune-500/20 text-lune-200 shadow-sm' : 'text-white/45 hover:bg-white/5 hover:text-white'}`}>{item.label}</NavLink>)}
            </nav>}
            <CardHeader className="space-y-2 p-6 pb-5 sm:p-8 sm:pb-5"><CardTitle className="font-display text-2xl sm:text-3xl">{title}</CardTitle><CardDescription className="text-sm leading-relaxed text-white/50">{description}</CardDescription></CardHeader>
            <CardContent className="space-y-5 p-6 pt-0 sm:p-8 sm:pt-0">{children}</CardContent>
          </Card>
          <p className="mt-5 flex items-start justify-center gap-2 px-3 text-center text-xs leading-relaxed text-white/35"><ShieldCheck size={14} className="mt-0.5 shrink-0" /><span>Your profile and posts are public.<br />Your email and account notifications stay private.</span></p>
        </div>
      </div>
      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between border-t border-white/5 px-5 py-5 text-xs text-white/30 sm:px-8"><span>Lune · Connect through conversation</span><Link to="/" className="hover:text-white/60">Explore Lune</Link></footer>
    </main>
  );
};

export default AuthShell;
