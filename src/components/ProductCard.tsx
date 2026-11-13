import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Star, ShoppingBag, Eye } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';

export interface ProductCardProps {
  product: {
    id: string;
    name: string;
    brand_name?: string;
    price?: number;
    selling_price?: number;
    mrp?: number;
    original_price?: number;
    discount_pct?: number;
    discount_percentage?: number;
    has_offer?: boolean;
    offer_name?: string;
    rating: number;
    review_count: number;
    primary_image: string;
    total_stock?: number;
    gender?: string;
  };
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const isWishlisted = isInWishlist(product.id);
  const isOutOfStock = product.total_stock !== undefined && product.total_stock <= 0;

  const displayPrice = Number(product.price ?? product.selling_price ?? 0);
  const displayMrp = Number(product.original_price ?? product.mrp ?? displayPrice);
  const discountPct = Number(product.discount_percentage ?? product.discount_pct ?? (displayMrp > displayPrice ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100) : 0));
  const hasOffer = !!product.has_offer || (displayMrp > displayPrice);

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await toggleWishlist(product.id);
    } catch (err: any) {
      alert(err.message || 'Please login to add to wishlist');
    }
  };

  return (
    <div 
      className="group bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/5 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Discount & Stock Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {discountPct > 0 && (
          <span className="bg-amber-500 text-black font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded shadow">
            {hasOffer ? `SALE ${discountPct}% OFF` : `${discountPct}% OFF`}
          </span>
        )}
        {isOutOfStock && (
          <span className="bg-red-900/90 text-red-200 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded backdrop-blur">
            OUT OF STOCK
          </span>
        )}
      </div>

      {/* Wishlist Button */}
      <button
        onClick={handleWishlistClick}
        className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:text-amber-400 transition-colors"
        aria-label="Wishlist"
      >
        <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-amber-400 text-amber-400' : ''}`} />
      </button>

      {/* Product Image */}
      <Link to={`/products/${product.id}`} className="block relative aspect-[4/5] bg-neutral-950 overflow-hidden">
        <img
          src={product.primary_image}
          alt={product.name}
          className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Quick View Overlay Button */}
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <span className="inline-flex items-center space-x-2 bg-neutral-900/90 text-amber-300 border border-amber-500/40 text-xs font-semibold px-4 py-2 rounded-lg shadow-xl">
            <Eye className="w-4 h-4" />
            <span>View Details</span>
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest">
            {product.brand_name || 'Brand'}
          </p>
          <Link to={`/products/${product.id}`} className="block mt-1">
            <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Rating */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <div className="flex items-center text-amber-400">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span className="ml-1 text-white font-semibold text-xs">{product.rating}</span>
          </div>
          <span className="text-[10px] text-slate-500">({product.review_count})</span>
        </div>

        {/* Pricing & Add Button */}
        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-base font-extrabold text-white">
                ₹{displayPrice.toLocaleString()}
              </span>
              {displayMrp > displayPrice && (
                <span className="text-xs text-slate-400 line-through">
                  ₹{displayMrp.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate(`/products/${product.id}`)}
            disabled={isOutOfStock}
            className={`p-2.5 rounded-xl border transition-all ${
              isOutOfStock 
                ? 'bg-neutral-800 text-slate-500 border-neutral-700 cursor-not-allowed'
                : 'bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black border-amber-500/30'
            }`}
            title={isOutOfStock ? 'Out of Stock' : 'Select Size & Color'}
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
