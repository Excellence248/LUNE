import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface UnavailableFeatureProps {
  title: string;
  description: string;
}

/**
 * Shown for sections whose data source isn't connected.
 * Intentionally honest: no sample data or simulated activity.
 */
const UnavailableFeature = ({ title, description }: UnavailableFeatureProps) => (
  <div className="max-w-3xl mx-auto w-full pt-4 md:pt-10">
    <div className="lune-card relative overflow-hidden px-6 py-12 md:px-14 md:py-16 text-center">
      <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-lune-500/20 blur-3xl" />

      <div className="relative mx-auto mb-8 h-32 w-32 md:h-40 md:w-40 animate-float">
        <div aria-hidden className="absolute inset-4 rounded-full bg-lune-500/40 blur-2xl" />
        <img
          src="/lune-mascot.jpg"
          alt="Lune mascot"
          className="relative h-full w-full object-cover scale-[1.6]"
          style={{ clipPath: 'circle(30%)' }}
          draggable={false}
        />
      </div>

      <p className="lune-eyebrow mb-3">Not connected yet</p>
      <h1 className="relative text-3xl md:text-4xl font-bold mb-4">{title}</h1>
      <p className="relative text-white/55 leading-relaxed max-w-lg mx-auto">{description}</p>
      <p className="relative mt-3 text-xs text-white/30">No sample data or simulated activity is shown.</p>

      <Link
        to="/"
        className="relative mt-8 inline-flex items-center gap-2 h-10 px-5 rounded-full border border-white/10 text-sm font-semibold text-white/70 hover:text-white hover:border-lune-400/40 hover:bg-lune-500/10 transition-all"
      >
        <ArrowLeft size={16} /> Back to feed
      </Link>
    </div>
  </div>
);

export default UnavailableFeature;
