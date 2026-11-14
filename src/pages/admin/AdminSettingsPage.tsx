import React, { useState } from 'react';
import { Settings, Save, Check, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../services/api';

export const AdminSettingsPage: React.FC = () => {
  const [storeName, setStoreName] = useState('Youth Choice The Fashion Store');
  const [tagline, setTagline] = useState('Define Your Style. Wear Your Confidence.');
  const [whatsappPhone, setWhatsappPhone] = useState('918522000504');
  const [storeAddress, setStoreAddress] = useState('Youth Choice The Fashion Store, Shasam Complex, Kosgi, Telangana - 509339');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('https://maps.app.goo.gl/nbaJPKgVFzTCNaRF6');
  const [supportEmail, setSupportEmail] = useState('youthchoicemenswear@gmail.com');

  const [saved, setSaved] = useState(false);

  // Admin Password Management State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSuccess(null);
    setPwdError(null);

    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('New password and confirmation do not match.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await apiRequest('/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      setPwdSuccess(res.message || 'Admin password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'Failed to update admin password.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="border-b border-neutral-800 pb-4">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">STORE CONFIGURATION</span>
        <h1 className="text-2xl font-display font-bold text-white uppercase">General Store Settings</h1>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>Store settings saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4 text-xs">
        <div>
          <label className="block text-slate-300 font-semibold mb-1">Store Name</label>
          <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} required className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3" />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Store Tagline</label>
          <input type="text" value={tagline} onChange={e => setTagline(e.target.value)} required className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3" />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">WhatsApp Business Ordering Number (with country code)</label>
          <input type="text" value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)} required placeholder="919876543210" className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3 font-mono" />
          <span className="text-[10px] text-slate-400 mt-1 block">This number is used to open direct click-to-chat WhatsApp order messages during checkout.</span>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Store Address</label>
          <input type="text" value={storeAddress} onChange={e => setStoreAddress(e.target.value)} required className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3" />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Google Maps Location URL</label>
          <input type="text" value={googleMapsUrl} onChange={e => setGoogleMapsUrl(e.target.value)} required className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3 font-mono text-xs" />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Support Email</label>
          <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} required className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3" />
        </div>

        <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase px-8 py-3 rounded-xl flex items-center space-x-2">
          <Save className="w-4 h-4" />
          <span>SAVE CONFIGURATION</span>
        </button>
      </form>

      {/* Admin Security & Password Change */}
      <div className="border-t border-neutral-800 pt-6 space-y-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">ADMIN SECURITY</span>
          <h2 className="text-xl font-display font-bold text-white uppercase">Change Admin Password</h2>
          <p className="text-xs text-slate-400 mt-0.5">Only authorized administrators can modify the admin portal credentials.</p>
        </div>

        {pwdSuccess && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{pwdSuccess}</span>
          </div>
        )}

        {pwdError && (
          <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{pwdError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Current Admin Password</label>
            <div className="relative">
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                placeholder="Enter current password"
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 text-xs"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">New Admin Password</label>
            <div className="relative">
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                placeholder="Min 6 characters"
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 text-xs"
              />
              <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat new password"
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 text-xs"
              />
              <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={pwdLoading}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs uppercase px-8 py-3 rounded-xl flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>{pwdLoading ? 'UPDATING PASSWORD...' : 'UPDATE ADMIN PASSWORD'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
