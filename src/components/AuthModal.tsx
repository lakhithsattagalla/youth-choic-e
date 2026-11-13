import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, ArrowRight, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) onClose();
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || loading) return;
    setLocalError(null);
    setLoading(true);

    try {
      await login(email, password);
      onClose();
    } catch (err: any) {
      setLocalError(err.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4">
      <div className="w-full max-w-md rounded-3xl bg-neutral-900 border border-neutral-800 p-8 shadow-2xl relative space-y-6 text-white">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
          <div className="flex items-center space-x-3">
            <img 
              src="/yc-logo.jpg" 
              alt="Youth Choice Logo" 
              className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 shadow-md" 
            />
            <div>
              <h3 className="text-lg font-display font-extrabold uppercase text-white tracking-wide leading-tight">
                Sign In to Account
              </h3>
              <p className="text-[11px] text-slate-400">Youth Choice The Fashion Store</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 text-lg font-semibold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Error Alert */}
        {localError && (
          <div className="p-3 text-xs font-medium rounded-xl bg-red-950/80 text-red-300 border border-red-800 flex items-center space-x-2 text-center">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email or Phone Number</label>
            <div className="relative">
              <input 
                type="text" 
                required 
                disabled={loading}
                placeholder="Email address or phone number" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full px-4 py-3 pl-10 rounded-xl border border-neutral-700 bg-neutral-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 text-xs disabled:opacity-50" 
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <input 
                type="password" 
                required 
                disabled={loading}
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full px-4 py-3 pl-10 rounded-xl border border-neutral-700 bg-neutral-950 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 text-xs disabled:opacity-50" 
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !email.trim() || !password.trim()} 
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-black font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>{loading ? 'LOGGING IN...' : 'LOG IN'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Direct Links to Full Pages */}
          <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-neutral-800">
            <Link 
              to="/register" 
              onClick={onClose}
              className="text-amber-400 hover:underline font-semibold"
            >
              Create Account
            </Link>
            <Link 
              to="/login" 
              onClick={onClose}
              className="text-slate-300 hover:text-white"
            >
              Full Login Page
            </Link>
          </div>
        </form>

        {/* Dedicated Admin Portal Access Link */}
        <div className="bg-neutral-950 border border-amber-500/20 p-3.5 rounded-2xl flex items-center justify-between text-xs mt-4">
          <div className="flex items-center space-x-2 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Store Administrator?</span>
          </div>
          <Link 
            to="/admin/login" 
            onClick={onClose}
            className="bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-black font-semibold text-[11px] px-3 py-1.5 rounded-lg transition-all"
          >
            Admin Portal Login →
          </Link>
        </div>

      </div>
    </div>
  );
};
