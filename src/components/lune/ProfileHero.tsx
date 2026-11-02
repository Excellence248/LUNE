import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfileHeroProps {
  name: string;
  handle?: string;
  subtitle?: string;
  avatarUrl?: string;
  bio?: string;
  actions?: React.ReactNode;
  footnote?: React.ReactNode;
}

/** Cover + identity block shared by the own-profile and public-profile pages. */
const ProfileHero = ({ name, handle, subtitle, avatarUrl, bio, actions, footnote }: ProfileHeroProps) => (
  <section>
    <div className="relative h-40 md:h-56 overflow-hidden border-b border-white/[0.06]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_120%,hsl(271_91%_55%/0.55),transparent_55%),radial-gradient(ellipse_at_10%_-20%,hsl(250_90%_50%/0.35),transparent_50%),linear-gradient(180deg,hsl(262_50%_8%),hsl(260_40%_4%))]" />
      <div className="absolute inset-0 lune-stars opacity-80" />
      {/* moonrise */}
      <div className="absolute -bottom-40 right-[8%] h-64 w-64 md:h-80 md:w-80 rounded-full bg-gradient-to-b from-lune-200/50 to-lune-500/10 blur-[2px] shadow-[0_0_120px_40px_rgba(145,71,245,0.35)]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </div>

    <div className="px-4 md:px-10 max-w-4xl -mt-14 md:-mt-16 relative z-10">
      <div className="flex items-end justify-between gap-4">
        <Avatar className="w-28 h-28 md:w-32 md:h-32 ring-4 ring-background shadow-[0_0_0_6px_hsl(271_91%_65%/0.25),0_20px_50px_-10px_rgba(0,0,0,0.8)]">
          <AvatarImage src={avatarUrl} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-lune-400 to-lune-800 text-4xl font-display font-bold text-white">
            {name?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        {actions && <div className="flex flex-wrap justify-end gap-2 pb-2">{actions}</div>}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <h1 className="break-all text-2xl md:text-3xl font-bold">{name}</h1>
          {handle && <p className="break-all text-white/40 text-sm">@{handle}</p>}
          {subtitle && <p className="break-all text-white/40 text-sm font-mono">{subtitle}</p>}
        </div>
        {bio !== undefined && (
          <p className="selectable whitespace-pre-wrap break-words text-white/75 leading-relaxed max-w-2xl">
            {bio || <span className="text-white/35 italic">No bio yet.</span>}
          </p>
        )}
        {footnote && <p className="text-xs text-white/30">{footnote}</p>}
      </div>
    </div>
  </section>
);

export default ProfileHero;
