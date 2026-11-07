import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import LuneFollowLogo from '@/components/auth/LuneFollowLogo';
import LuneMoon from './LuneMoon';

/** Small brand mark: the live moon with cursor-tracking eyes. */
export const LuneMark = ({ className, glow = true }: { className?: string; glow?: boolean }) => (
  <LuneMoon className={className} glow={glow} tilt={18} />
);

export const LuneLogo = ({ onClick, className }: { onClick?: () => void; className?: string }) => (
  <Link to="/" onClick={onClick} className={cn('flex items-center gap-2.5 group', className)} aria-label="Lune home">
    <LuneMark className="h-9 w-9 transition-transform duration-500 group-hover:scale-110" />
    <span className="font-display text-xl font-bold tracking-tight lune-glow-text">lune</span>
  </Link>
);

interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({ eyebrow, title, description, icon: Icon, actions, className }: PageHeaderProps) => (
  <header className={cn('flex flex-col gap-5 md:flex-row md:items-end md:justify-between mb-8 md:mb-10', className)}>
    <div className="space-y-3 min-w-0">
      {eyebrow && (
        <p className="lune-eyebrow flex items-center gap-2">
          {Icon && <Icon size={13} />}
          {eyebrow}
        </p>
      )}
      <h1 className="text-3xl md:text-[2.75rem] md:leading-[1.1] font-bold">{title}</h1>
      {description && <p className="text-white/50 max-w-2xl leading-relaxed">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
  </header>
);

/** Quiet empty / unavailable state, consistent across the app. */
export const EmptyState = ({
  icon: Icon,
  moon,
  title,
  children,
  className,
}: {
  icon?: React.ElementType;
  /** Show the friendly cursor-tracking Lune moon instead of an icon. */
  moon?: boolean;
  title: string;
  children?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('flex flex-col items-center text-center py-14 px-6', className)}>
    {moon && <LuneFollowLogo className="mb-4 h-28 w-28" />}
    <div className={cn('relative mb-5', moon && 'hidden')}>
      <div className="absolute inset-0 rounded-full bg-lune-500/20 blur-xl" />
      <div className="relative h-14 w-14 rounded-2xl border border-white/10 glass-soft flex items-center justify-center text-lune-300">
        {Icon ? <Icon size={24} /> : <LuneMark className="h-10 w-10" glow={false} />}
      </div>
    </div>
    <p className="font-display font-semibold text-white">{title}</p>
    {children && <div className="mt-1.5 text-sm text-white/45 max-w-sm leading-relaxed">{children}</div>}
  </div>
);
