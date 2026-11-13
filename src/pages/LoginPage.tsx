import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/account');
    } catch (err: any) {
      setError(err.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 space-y-6 shadow-2xl">
        
        <div className="text-center space-y-2">
          <img 
            src="/yc-logo.jpg" 
            alt="Youth Choice Logo" 
            className="w-16 h-16 rounded-2xl object-contain bg-white p-1 mx-auto shadow-lg shadow-amber-500/20" 
          />
          <h1 className="text-2xl font-display font-extrabold text-white uppercase">Customer Login</h1>
          <p className="text-xs text-slate-400">Access your personal Youth Choice The Fashion Store account.</p>
        </div>

        {error && (
          <div className="bg-red-950/80 border border-red-800 text-red-300 p-3 rounded-xl text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Email Address or Phone Number</label>
            <div className="relative">
              <input 
                type="text" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address or phone number"
                required
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 text-xs"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Password</label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 text-xs"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-xl shadow-amber-500/10 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <span>{loading ? 'LOGGING IN...' : 'LOG IN'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 border-t border-neutral-800 pt-4">
          <span>Don't have an account? </span>
          <Link to="/register" className="text-amber-400 font-bold hover:underline">
            Register Here
          </Link>
        </div>

        <div className="text-center pt-2">
          <Link to="/admin/login" className="text-[11px] text-slate-500 hover:text-amber-400 font-semibold flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Are you a Store Administrator? Click for Admin Portal</span>
          </Link>
        </div>

      </div>
    </div>
  );
};
