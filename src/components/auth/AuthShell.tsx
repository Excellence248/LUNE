import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LuneLogo } from '@/components/lune/Brand';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const AuthShell = ({ title, description, children }: { title: string; description: string; children: ReactNode }) => (
  <main className="lune-backdrop flex min-h-screen flex-col items-center px-4 py-10 text-white">
    <div className="mb-8 flex w-full max-w-md items-center justify-between"><LuneLogo /><Link to="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white"><ArrowLeft size={15} /> Browse feed</Link></div>
    <Card className="w-full max-w-md rounded-3xl border-white/10 bg-popover/90 text-white shadow-2xl">
      <CardHeader className="space-y-2 p-7 pb-4"><CardTitle className="font-display text-2xl">{title}</CardTitle><CardDescription className="leading-relaxed text-white/50">{description}</CardDescription></CardHeader>
      <CardContent className="space-y-5 p-7 pt-2">{children}</CardContent>
    </Card>
    <p className="mt-6 max-w-md text-center text-xs leading-relaxed text-white/35">Your profile and posts are public. Your email and account notifications are private.</p>
  </main>
);

export default AuthShell;
