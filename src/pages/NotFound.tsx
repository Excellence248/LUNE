import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Sanitize the pathname to prevent log injection attacks
    const sanitizedPath = location.pathname.replace(/[<>]/g, '').substring(0, 255);
    
    console.error(
      "404 Error: User attempted to access non-existent route:",
      sanitizedPath,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
      <div className="text-center p-8 bg-white/5 border border-white/10 rounded-[2.5rem] max-w-md">
        <h1 className="text-6xl font-bold mb-4 text-purple-500">404</h1>
        <p className="text-xl text-gray-400 mb-8">Oops! This page has drifted into deep space.</p>
        <a href="/" className="inline-block bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl font-bold transition-all">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;