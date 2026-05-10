import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#f9f9f8] flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-[11px] font-medium text-[#999] uppercase tracking-widest mb-3">404</p>
        <h1 className="text-2xl font-medium text-[#111] mb-2">Page not found</h1>
        <p className="text-sm text-[#888] mb-6">The page you're looking for doesn't exist.</p>
        <a
          href="/"
          className="inline-flex items-center h-9 px-4 bg-[#111] text-white text-sm font-medium rounded-lg hover:bg-[#333] transition-colors"
        >
          Back to editor
        </a>
      </div>
    </div>
  );
};

export default NotFound;
