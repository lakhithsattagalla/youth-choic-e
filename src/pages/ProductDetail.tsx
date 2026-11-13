import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Heart, ShoppingBag, Truck, RefreshCw, ShieldCheck, MessageSquare, Check, AlertTriangle, Plus, Minus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { ProductCard } from '../components/ProductCard';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [productData, setProductData] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeVariant, setActiveVariant] = useState<any>(null);

  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Review modal state
  const [reviewOpen, setReviewOpen] = useState<boolean>(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>('');

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<{ days: string; hours: string; mins: string; secs: string }>({ days: '00', hours: '00', mins: '00', secs: '00' });

  useEffect(() => {
    if (!productData?.offer_end_at) return;
    const updateCountdown = () => {
      const diffMs = new Date(productData.offer_end_at).getTime() - Date.now();
      if (diffMs <= 0) {
        setTimeLeft({ days: '00', hours: '00', mins: '00', secs: '00' });
        return;
      }
      const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const h = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diffMs / (1000 * 60)) % 60);
      const s = Math.floor((diffMs / 1000) % 60);

      setTimeLeft({
        days: String(d).padStart(2, '0'),
        hours: String(h).padStart(2, '0'),
        mins: String(m).padStart(2, '0'),
        secs: String(s).padStart(2, '0')
      });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [productData?.offer_end_at]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setErrorMsg('');

    apiRequest(`/products/${id}`)
      .then(res => {
        const prod = res.product;
        setProductData(prod);

        // Preselect primary image
        const primary = prod.images?.find((img: any) => img.is_primary)?.image_url || prod.images?.[0]?.image_url || '';
        setSelectedImage(primary);

        // Extract available colors and pre-select first color
        const availableColors = Array.from(new Set(prod.variants?.map((v: any) => v.color))) as string[];
        if (availableColors.length > 0) {
          setSelectedColor(availableColors[0]);
        }

        // Fetch related products
        apiRequest(`/products?category=${prod.category_id}`)
          .then(relRes => setRelatedProducts((relRes.products || []).filter((p: any) => p.id !== prod.id).slice(0, 4)));
      })
      .catch(err => setErrorMsg(err.message || 'Product not found'))
      .finally(() => setLoading(false));
  }, [id]);

  // Update active variant when color or size changes
  useEffect(() => {
    if (productData && selectedColor && selectedSize) {
      const variant = productData.variants?.find((v: any) => 
        v.color.toLowerCase() === selectedColor.toLowerCase() && 
        v.size.toUpperCase() === selectedSize.toUpperCase()
      );
      setActiveVariant(variant || null);
    } else {
      setActiveVariant(null);
    }
  }, [selectedColor, selectedSize, productData]);

  // Handle image swap when color changes
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    const colorImg = productData.images?.find((img: any) => img.color?.toLowerCase() === color.toLowerCase())?.image_url;
    if (colorImg) {
      setSelectedImage(colorImg);
    }
  };

  const handleAddToCart = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!user) {
      navigate('/login');
      return;
    }

    if (!selectedColor) {
      setErrorMsg('Please select a color variant');
      return;
    }

    if (!selectedSize) {
      setErrorMsg('Please select a size');
      return;
    }

    if (!activeVariant) {
      setErrorMsg('The selected color and size combination is not available.');
      return;
    }

    if (activeVariant.stock <= 0) {
      setErrorMsg('This size & color variant is currently OUT OF STOCK.');
      return;
    }

    try {
      await addToCart(activeVariant.id, quantity);
      setSuccessMsg(`Added ${productData.name} (${selectedColor} / ${selectedSize}) to your cart!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add to cart');
    }
  };

  const handleWriteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await apiRequest('/user/reviews', {
        method: 'POST',
        body: JSON.stringify({
          product_id: productData.id,
          rating: newRating,
          comment: newComment
        })
      });
      setReviewOpen(false);
      setNewComment('');
      // Refresh product data
      const updated = await apiRequest(`/products/${id}`);
      setProductData(updated.product);
    } catch (err: any) {
      alert(err.message || 'Failed to post review');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-8 animate-shimmer">
        <div className="h-96 rounded-2xl bg-neutral-900" />
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="max-w-md mx-auto my-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Product Not Found</h2>
        <button onClick={() => navigate('/products')} className="bg-amber-500 text-black font-bold text-xs px-6 py-3 rounded-xl uppercase">
          Return to Catalog
        </button>
      </div>
    );
  }

  const isWishlisted = isInWishlist(productData.id);
  const colorsAvailable = Array.from(new Set(productData.variants?.map((v: any) => v.color))) as string[];
  const sizesAvailable = Array.from(new Set(productData.variants?.map((v: any) => v.size))) as string[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      
      {/* Product Detail Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Left: Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-[4/5] bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl">
            <img 
              src={selectedImage} 
              alt={productData.name} 
              className="w-full h-full object-cover object-top"
            />
            {productData.discount_pct > 0 && (
              <span className="absolute top-4 left-4 bg-amber-500 text-black font-extrabold text-xs uppercase tracking-wider px-3 py-1 rounded shadow">
                {productData.discount_pct}% OFF
              </span>
            )}
          </div>

          {/* Thumbnails list */}
          <div className="flex items-center space-x-3 overflow-x-auto pb-2">
            {productData.images?.map((img: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img.image_url)}
                className={`w-20 h-24 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                  selectedImage === img.image_url ? 'border-amber-400 scale-95' : 'border-neutral-800 opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Product Details & Controls */}
        <div className="space-y-6">
          
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">{productData.brand?.name || 'Brand'}</span>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mt-1 leading-tight">{productData.name}</h1>
            
            {/* Rating */}
            <div className="flex items-center space-x-3 mt-3">
              <div className="flex items-center text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="ml-1 text-white font-bold text-sm">{productData.rating}</span>
              </div>
              <span className="text-slate-500 text-xs">|</span>
              <span className="text-xs text-slate-400 font-medium">{productData.review_count || 0} Customer Reviews</span>
            </div>
          </div>

          {/* Active Product Offer Banner & Countdown */}
          {productData.has_offer && (
            <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                  🔥 {productData.offer_name || 'SPECIAL PRODUCT OFFER'}
                </span>
                <span className="text-[10px] bg-amber-500 text-black font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider">
                  LIMITED TIME SALE
                </span>
              </div>

              {productData.offer_end_at && (
                <div className="flex items-center space-x-3 pt-1">
                  <span className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">SALE ENDS IN:</span>
                  <div className="flex items-center space-x-1.5 font-mono text-xs font-bold text-amber-300">
                    <span className="bg-neutral-950 px-2 py-1 rounded border border-neutral-800">{timeLeft.days}d</span>
                    <span>:</span>
                    <span className="bg-neutral-950 px-2 py-1 rounded border border-neutral-800">{timeLeft.hours}h</span>
                    <span>:</span>
                    <span className="bg-neutral-950 px-2 py-1 rounded border border-neutral-800">{timeLeft.mins}m</span>
                    <span>:</span>
                    <span className="bg-neutral-950 px-2 py-1 rounded border border-neutral-800">{timeLeft.secs}s</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pricing */}
          {(() => {
            const displayPrice = Number(productData.price ?? productData.selling_price ?? 0);
            const displayMrp = Number(productData.original_price ?? productData.mrp ?? displayPrice);
            const discountPct = Number(productData.discount_percentage ?? productData.discount_pct ?? (displayMrp > displayPrice ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100) : 0));

            return (
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-extrabold text-white">₹{displayPrice.toLocaleString()}</span>
                {displayMrp > displayPrice && (
                  <span className="text-base text-slate-400 line-through">₹{displayMrp.toLocaleString()}</span>
                )}
                {discountPct > 0 && (
                  <span className="text-xs text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full uppercase tracking-wider">
                    Save ₹{(displayMrp - displayPrice).toLocaleString()} ({discountPct}% OFF)
                  </span>
                )}
              </div>
            );
          })()}

          {/* Error / Success Notifications */}
          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Color Selector */}
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider">Select Color:</span>
              <span className="text-amber-400 font-semibold">{selectedColor || 'Choose a color'}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {colorsAvailable.map((color: string) => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    selectedColor === color 
                      ? 'bg-amber-500 text-black border-amber-500 font-bold shadow-lg shadow-amber-500/10' 
                      : 'bg-neutral-900 text-slate-300 border-neutral-700 hover:border-amber-400'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider">Select Size:</span>
              <span className="text-amber-400 font-semibold">{selectedSize || 'Choose a size'}</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {sizesAvailable.map((size: string) => {
                const variantCheck = productData.variants?.find((v: any) => 
                  v.color.toLowerCase() === selectedColor.toLowerCase() && 
                  v.size.toUpperCase() === size.toUpperCase()
                );
                const isOut = variantCheck && variantCheck.stock <= 0;

                return (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-12 h-12 rounded-xl text-xs font-extrabold border flex items-center justify-center transition-all ${
                      selectedSize === size
                        ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/10'
                        : isOut
                        ? 'bg-neutral-950 text-slate-600 border-neutral-800 line-through'
                        : 'bg-neutral-900 text-slate-200 border-neutral-700 hover:border-amber-400'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Variant Stock Indicator */}
          {selectedColor && selectedSize && (
            <div className="text-xs font-semibold">
              {activeVariant ? (
                activeVariant.stock > 5 ? (
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>In Stock ({activeVariant.stock} units available)</span>
                  </span>
                ) : activeVariant.stock > 0 ? (
                  <span className="text-amber-400 flex items-center space-x-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Low Stock: Only {activeVariant.stock} units remaining!</span>
                  </span>
                ) : (
                  <span className="text-red-400 font-bold">OUT OF STOCK for this size/color</span>
                )
              ) : (
                <span className="text-slate-400">Variant configuration loading...</span>
              )}
            </div>
          )}

          {/* Quantity Selector & Action Buttons */}
          <div className="flex items-center space-x-4 pt-4">
            
            {/* Quantity Controls */}
            <div className="flex items-center bg-neutral-900 border border-neutral-700 rounded-xl p-1">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-neutral-800"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center font-bold text-white text-sm">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-neutral-800"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={activeVariant && activeVariant.stock <= 0}
              className={`flex-1 font-extrabold text-xs uppercase tracking-wider py-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-xl ${
                activeVariant && activeVariant.stock <= 0
                  ? 'bg-neutral-800 text-slate-500 border border-neutral-700 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{activeVariant && activeVariant.stock <= 0 ? 'OUT OF STOCK' : 'ADD TO CART'}</span>
            </button>

            {/* Wishlist Button */}
            <button
              onClick={() => toggleWishlist(productData.id)}
              className={`p-4 rounded-xl border transition-all ${
                isWishlisted
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-neutral-900 border-neutral-700 text-slate-300 hover:border-amber-400'
              }`}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-amber-400' : ''}`} />
            </button>

          </div>

          {/* Product Specifications */}
          <div className="border-t border-neutral-800 pt-6 space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider">Product Specifications</h4>
            <div className="grid grid-cols-2 gap-3 text-slate-300 bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
              <div><span className="text-slate-500 block">Material</span> {productData.material || 'Premium Cotton'}</div>
              <div><span className="text-slate-500 block">Fit Type</span> {productData.fit || 'Regular Fit'}</div>
              <div><span className="text-slate-500 block">SKU Prefix</span> {productData.sku_prefix}</div>
              <div><span className="text-slate-500 block">Care</span> {productData.care_instructions || 'Machine wash cold'}</div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <h4 className="font-bold text-white uppercase tracking-wider">Description</h4>
            <p>{productData.description}</p>
          </div>

        </div>

      </div>

      {/* Customer Reviews Section */}
      <div className="border-t border-neutral-800 pt-12 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-display font-bold text-white uppercase">Customer Reviews ({productData.reviews?.length || 0})</h3>
            <p className="text-xs text-slate-400">Authentic feedback from verified Youth Choice buyers</p>
          </div>
          {user && (
            <button 
              onClick={() => setReviewOpen(true)}
              className="bg-neutral-900 border border-amber-500/40 text-amber-400 hover:bg-amber-500 hover:text-black font-bold text-xs px-4 py-2 rounded-xl transition-all"
            >
              Write a Review
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {productData.reviews?.map((rev: any) => (
            <div key={rev.id} className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">{rev.user_name}</span>
                <div className="flex text-amber-400">
                  {[...Array(rev.rating)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />)}
                </div>
              </div>
              <p className="text-xs text-slate-300 italic">{rev.comment}</p>
              <span className="text-[10px] text-slate-500 block">{new Date(rev.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Related Products Recommendations */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-neutral-800 pt-12 space-y-6">
          <h3 className="text-xl font-display font-bold text-white uppercase">You May Also Like</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map(rel => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </div>
      )}

      {/* Write Review Modal */}
      {reviewOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Write a Review</h3>
            <form onSubmit={handleWriteReview} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Rating (1 to 5 Stars)</label>
                <select 
                  value={newRating}
                  onChange={(e) => setNewRating(Number(e.target.value))}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg p-2.5"
                >
                  <option value={5}>5 Stars - Excellent</option>
                  <option value={4}>4 Stars - Very Good</option>
                  <option value={3}>3 Stars - Average</option>
                  <option value={2}>2 Stars - Poor</option>
                  <option value={1}>1 Star - Terrible</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Your Review</label>
                <textarea 
                  rows={4}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Describe quality, fabric, fitting, and delivery experience..."
                  required
                  className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg p-2.5 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setReviewOpen(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-800 text-slate-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-amber-500 text-black font-bold"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
