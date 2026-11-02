import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import LuneMoon from '@/components/lune/LuneMoon';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Sanitize the pathname to prevent log injection attacks
    const sanitizedPath = location.pathname.replace(/[<>]/g, '').substring(0, 255);

    console.error('404 Error: User attempted to access non-existent route:', sanitizedPath);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen flex items-center justify-center lune-backdrop text-white px-6 overflow-hidden">
      <div className="relative text-center max-w-md">
        <div className="relative mx-auto mb-10 h-40 w-40">
          <span aria-hidden className="lune-orbit lune-orbit--wide" />
          <span aria-hidden className="lune-orbit" />
          <LuneMoon className="h-40 w-40" float boop tilt={16} label="Lune, the moon mascot, looking for the page" />
        </div>
        <p className="font-mono text-sm tracking-[0.4em] text-lune-300 mb-2">404</p>
        <h1 className="text-3xl md:text-5xl font-bold mb-3"><span className="lune-shimmer-text">Lost in orbit</span></h1>
        <p className="text-white/50 mb-8">This page has drifted into deep space.</p>
        <Link to="/" className="lune-btn h-11 px-7">
          Return home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
