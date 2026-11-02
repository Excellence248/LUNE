import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Sanitize the pathname to prevent log injection attacks
    const sanitizedPath = location.pathname.replace(/[<>]/g, '').substring(0, 255);

    console.error('404 Error: User attempted to access non-existent route:', sanitizedPath);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen flex items-center justify-center lune-backdrop text-white px-6 overflow-hidden">
      <div aria-hidden className="absolute inset-0 lune-stars opacity-70" />
      <div className="relative text-center max-w-md">
        <div className="relative mx-auto mb-6 h-44 w-44 animate-float">
          <div aria-hidden className="absolute inset-6 rounded-full bg-lune-500/40 blur-2xl" />
          <img
            src="/lune-mascot.jpg"
            alt="Lune mascot"
            className="relative h-full w-full object-cover scale-[1.6]"
            style={{ clipPath: 'circle(30%)' }}
            draggable={false}
          />
        </div>
        <p className="font-mono text-sm text-lune-300 mb-2">404</p>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Lost in orbit</h1>
        <p className="text-white/50 mb-8">This page has drifted into deep space.</p>
        <Link to="/" className="lune-btn h-11 px-7">
          Return home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
