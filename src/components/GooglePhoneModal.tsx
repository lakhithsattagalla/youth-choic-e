import React, { useState } from 'react';
import { Phone, ShieldCheck, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface GooglePhoneModalProps {
  googleUser: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export const GooglePhoneModal: React.FC<GooglePhoneModalProps> = ({
  googleUser,
  onSuccess,
  onCancel
}) => {
  const { completeGoogleRegistration } = useAuth();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile phone number');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await completeGoogleRegistration({
        googleId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
        phone: cleanPhone,
        picture: googleUser.picture
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-white">
        
        <button
          onClick={onCancel}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Google User Profile Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full border-2 border-amber-500 overflow-hidden mx-auto shadow-lg">
            <img
              src={googleUser.picture || 'https://lh3.googleusercontent.com/a/default-user'}
              alt={googleUser.name}
              className="w-full h-full object-cover"
              onError={e => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h2 className="text-xl font-display font-extrabold uppercase text-white">
            Complete Registration
          </h2>
          <p className="text-xs text-amber-400 font-medium">
            Authenticated via Google: <span className="text-white font-mono">{googleUser.email}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-950/80 border border-red-800 text-red-300 p-3 rounded-xl text-xs flex items-center justify-center space-x-2 text-center">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCompleteRegistration} className="space-y-4 text-xs">
          <p className="text-slate-300 text-center">
            Please link your mobile phone number to complete your Youth Choice account creation.
          </p>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Mobile Phone Number</label>
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="9032644552"
                required
                autoFocus
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 font-mono text-sm"
              />
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || phone.replace(/[^0-9]/g, '').length < 10}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-xl flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'COMPLETING REGISTRATION...' : 'COMPLETE REGISTRATION'}</span>
          </button>
        </form>

      </div>
    </div>
  );
};
