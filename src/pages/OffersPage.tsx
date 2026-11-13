import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tag, ArrowRight } from 'lucide-react';
import { apiRequest } from '../services/api';

export const OffersPage: React.FC = () => {
  const [offers, setOffers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      apiRequest('/admin/offers').catch(() => ({ offers: [] })),
      apiRequest('/admin/coupons').catch(() => ({ coupons: [] }))
    ]).then(([offRes, cpnRes]) => {
      setOffers(offRes.offers || []);
      setCoupons(cpnRes.coupons || []);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <div className="border-b border-neutral-800 pb-4">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">PROMOTIONS</span>
        <h1 className="text-3xl font-display font-bold text-white uppercase">Exclusive Offers & Coupons</h1>
      </div>

      {/* Promotional Banners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {offers.map(offer => (
          <div key={offer.id} className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900 group">
            <img src={offer.banner_url} alt={offer.title} className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-6 sm:p-8 flex flex-col justify-end space-y-2">
              <span className="bg-amber-500 text-black font-extrabold text-[10px] uppercase px-3 py-1 rounded w-fit">{offer.discount_tag}</span>
              <h2 className="text-2xl font-display font-bold text-white uppercase">{offer.title}</h2>
              <p className="text-xs text-slate-300">{offer.subtitle}</p>
              <Link to={offer.link_url || '/products'} className="inline-flex items-center space-x-2 text-xs font-bold text-amber-400 hover:text-amber-300 pt-2">
                <span>SHOP DEALS NOW</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Coupons Code List */}
      <div className="space-y-4">
        <h3 className="text-xl font-display font-bold text-white uppercase flex items-center space-x-2">
          <Tag className="w-5 h-5 text-amber-400" />
          <span>Active Coupon Codes</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.filter(c => c.status === 'ACTIVE').length === 0 ? (
            <p className="text-xs text-slate-500 italic col-span-full">No active promo codes right now. Check back soon!</p>
          ) : (
            coupons.filter(c => c.status === 'ACTIVE').map(cpn => (
              <div key={cpn.id} className="bg-neutral-900 border border-dashed border-amber-500/40 p-5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-extrabold text-base text-amber-400 tracking-wider">{cpn.code}</span>
                  <span className="bg-amber-500/10 text-amber-300 text-[10px] px-2 py-0.5 rounded font-bold uppercase">{cpn.discount_type}</span>
                </div>
                <p className="text-xs text-white font-bold">
                  {cpn.discount_type === 'FIXED' ? `Flat ₹${cpn.discount_value} OFF` : `${cpn.discount_value}% OFF`}
                </p>
                <p className="text-[11px] text-slate-400">Min. Order Value: ₹{cpn.min_order_amount}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
