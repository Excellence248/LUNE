import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import SpaceBackground from '@/components/auth/SpaceBackground';
import LuneFollowLogo from '@/components/auth/LuneFollowLogo';

const AuthShell = ({ title, description, children }: { title: string; description: string; children: ReactNode }) => {
  const { pathname } = useLocation();
  const accountPage = pathname === '/signin' || pathname === '/signup';

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-[#07040f] text-white">
      <SpaceBackground />

      <div className="relative z-10 flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-10">
        <LuneFollowLogo className="mb-9 h-44 w-44 sm:h-52 sm:w-52" />

        <Link to="/" aria-label="Lune home" className="font-display text-sm font-semibold uppercase tracking-[0.4em] text-lune-300/80 transition-colors hover:text-lune-200">lune</Link>
        <h1 className="mt-3 text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2.5 max-w-sm text-center text-sm leading-relaxed text-white/50">{description}</p>

        <div className="mt-8 w-full rounded-3xl border border-white/10 glass-strong p-6 sm:p-7">
          {accountPage && (
            <nav aria-label="Account access" className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-black/20 p-1">
              {[{ to: '/signin', label: 'Sign in' }, { to: '/signup', label: 'Sign up' }].map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `rounded-full px-4 py-2 text-center text-sm font-medium transition-all ${isActive ? 'bg-gradient-to-r from-lune-500/40 to-lune-400/25 text-white shadow-[0_0_18px_rgba(168,85,247,0.35)]' : 'text-white/45 hover:text-white'}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
          <div className="space-y-5">{children}</div>
        </div>

        <p className="mt-6 flex items-start justify-center gap-2 px-3 text-center text-xs leading-relaxed text-white/35">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          <span>Your profile and posts are public. Your email and notifications stay private.</span>
        </p>
        <Link to="/" className="mt-4 text-xs text-white/35 transition-colors hover:text-white/70">Take a look around first →</Link>
      </div>
    </main>
  );
};

export default AuthShell;
