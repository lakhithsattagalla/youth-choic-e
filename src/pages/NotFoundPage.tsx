import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, Search, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center animate-fade-in">
      <div className="max-w-md w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-md">
        
        {/* Logo Badge */}
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto shadow-xl">
          <img 
            src="/yc-logo.jpg" 
            alt="Youth Choice Logo" 
            className="w-14 h-14 rounded-xl object-contain bg-white p-1"
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-display font-black text-amber-500 tracking-tight">404</h1>
          <h2 className="text-xl font-bold uppercase text-white tracking-wide">Page Not Found</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Sorry, we couldn't find the page you're looking for. It may have been moved or deleted.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="pt-4 space-y-3">
          <Link
            to="/"
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-xl shadow-amber-500/10 flex items-center justify-center space-x-2 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <Link
            to="/products"
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs uppercase tracking-wider py-3.5 rounded-xl border border-neutral-700 flex items-center justify-center space-x-2 transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>Browse Products</span>
          </Link>
        </div>

      </div>
    </div>
  );
};
