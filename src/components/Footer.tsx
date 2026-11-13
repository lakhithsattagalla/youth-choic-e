import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, ShieldCheck, Truck, RefreshCw, MessageSquare } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-950 border-t border-neutral-800 text-slate-400 text-sm">
      {/* Brand Values Bar */}
      <div className="border-b border-neutral-800 py-10 bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-amber-400 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Express Delivery</h4>
              <p className="text-xs text-slate-400">Fast doorstep shipping</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-amber-400 shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">WhatsApp Order</h4>
              <p className="text-xs text-slate-400">Instant owner assistance</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">100% Original</h4>
              <p className="text-xs text-slate-400">Curated authentic fashion</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-amber-400 shrink-0">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Easy Exchange</h4>
              <p className="text-xs text-slate-400">Size swap support</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        
        {/* Brand Story */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center space-x-3">
            <img 
              src="/yc-logo.jpg" 
              alt="Youth Choice Logo" 
              className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 shadow-md" 
            />
            <div>
              <span className="font-display font-extrabold text-white text-lg tracking-wider block">YOUTH CHOICE</span>
              <span className="text-[10px] tracking-[0.2em] text-amber-400 font-semibold uppercase block">THE FASHION STORE</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
            “Define Your Style. Wear Your Confidence.” <br />
            Youth Choice The Fashion Store brings you contemporary menswear and women’s fashion crafted for timeless elegance, everyday comfort, and high-impact style.
          </p>
        </div>

        {/* Shop Navigation */}
        <div>
          <h4 className="text-white font-semibold uppercase text-xs tracking-wider mb-4">Shop Collections</h4>
          <ul className="space-y-2.5 text-xs">
            <li><Link to="/men" className="hover:text-amber-400 transition-colors">Men's Apparel</Link></li>
            <li><Link to="/women" className="hover:text-amber-400 transition-colors">Women's Collection</Link></li>
            <li><Link to="/products?category=t-shirts" className="hover:text-amber-400 transition-colors">Heavyweight T-Shirts</Link></li>
            <li><Link to="/products?category=jeans" className="hover:text-amber-400 transition-colors">Stretch Denim Jeans</Link></li>
            <li><Link to="/products?category=cargo-pants" className="hover:text-amber-400 transition-colors">Tactical Cargo Pants</Link></li>
            <li><Link to="/new-arrivals" className="hover:text-amber-400 transition-colors">New Arrivals</Link></li>
          </ul>
        </div>

        {/* Customer Help */}
        <div>
          <h4 className="text-white font-semibold uppercase text-xs tracking-wider mb-4">Customer Care</h4>
          <ul className="space-y-2.5 text-xs">
            <li><Link to="/account" className="hover:text-amber-400 transition-colors">My Profile</Link></li>
            <li><Link to="/account/orders" className="hover:text-amber-400 transition-colors">Track Orders</Link></li>
            <li><Link to="/wishlist" className="hover:text-amber-400 transition-colors">Wishlist</Link></li>
            <li><Link to="/cart" className="hover:text-amber-400 transition-colors">Shopping Cart</Link></li>
            <li><a href="https://wa.me/918522000504" target="_blank" rel="noreferrer" className="hover:text-amber-400 transition-colors">WhatsApp Helpdesk</a></li>
          </ul>
        </div>

        {/* Store Contact */}
        <div>
          <h4 className="text-white font-semibold uppercase text-xs tracking-wider mb-4">Store Info</h4>
          <ul className="space-y-3 text-xs">
            <li className="flex items-start space-x-3">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span>Youth Choice The Fashion Store, Shasam Complex, Kosgi, Telangana - 509339</span>
                <a 
                  href="https://maps.app.goo.gl/nbaJPKgVFzTCNaRF6" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="block text-[10px] text-amber-400 hover:underline mt-0.5 font-semibold"
                >
                  📍 View Location on Google Maps ↗
                </a>
              </div>
            </li>
            <li className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <a href="mailto:youthchoicemenswear@gmail.com" className="hover:text-amber-400 transition-colors">
                youthchoicemenswear@gmail.com
              </a>
            </li>
          </ul>
        </div>

      </div>

      {/* Bottom Legal Copyright */}
      <div className="border-t border-neutral-900 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Youth Choice The Fashion Store. All rights reserved. Designed for Premium Fashion Commerce.</p>
      </div>
    </footer>
  );
};
