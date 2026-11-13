import React, { useState } from 'react';
import { Settings, Save, Check } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [storeName, setStoreName] = useState('Youth Choice The Fashion Store');
  const [tagline, setTagline] = useState('Define Your Style. Wear Your Confidence.');
  const [whatsappPhone, setWhatsappPhone] = useState('918522000504');
  const [storeAddress, setStoreAddress] = useState('Youth Choice The Fashion Store, Shasam Complex, Kosgi, Telangana - 509339');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('https://maps.app.goo.gl/nbaJPKgVFzTCNaRF6');
  const [supportEmail, setSupportEmail] = useState('youthchoicemenswear@gmail.com');

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
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
    </div>
  );
};
