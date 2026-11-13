import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Shield, Truck, RefreshCw, MessageSquare, Star, Tag, Compass } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { apiRequest } from '../services/api';

export const Home: React.FC = () => {
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [newArrivals, setNewArrivals] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [prodRes, brandRes, catRes, offerRes] = await Promise.all([
          apiRequest('/products'),
          apiRequest('/brands'),
          apiRequest('/categories'),
          apiRequest('/admin/offers').catch(() => ({ offers: [] }))
        ]);

        const allProducts = prodRes.products || [];
        setTrendingProducts(allProducts.filter((p: any) => p.is_trending).slice(0, 4));
        setNewArrivals(allProducts.filter((p: any) => p.is_new_arrival).slice(0, 4));
        setBrands(brandRes.brands || []);
        setCategories(catRes.categories || []);
        setOffers(offerRes.offers || []);
      } catch (err) {
        console.error('Error loading homepage data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  const editorialGuides = [
    { title: "Everyday Essentials", tag: "VERSATILE CASUALS", img: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80", link: "/products?category=t-shirts" },
    { title: "Weekend Fits", tag: "RELAXED STREETWEAR", img: "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=800&auto=format&fit=crop&q=80", link: "/products?category=cargo-pants" },
    { title: "Street Style", tag: "URBAN EDGY", img: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80", link: "/products?category=hoodies" },
    { title: "Smart Casual", tag: "OFFICE TO EVENING", img: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80", link: "/products?category=shirts" },
    { title: "Festive Collection", tag: "ELEGANT ETHNIC", img: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80", link: "/products?category=ethnic-wear" }
  ];

  return (
    <div className="space-y-20 pb-16">

      {/* 1. HERO SECTION */}
      <section
        className="relative min-h-[90vh] py-16 flex items-center justify-center overflow-hidden border-b border-neutral-800"
      >
        {/* Background Image & Gradient overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&auto=format&fit=crop&q=80"
            alt="Youth Choice The Fashion Store Hero"
            className="w-full h-full object-cover object-center scale-105 filter brightness-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c] via-transparent to-black/80" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center space-y-6">

          {/* Top Collection Badge */}
          <div className="inline-flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-[0.25em] px-4 py-2 rounded-full backdrop-blur">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NEW CONTEMPORARY COLLECTION 2026</span>
          </div>


          <h1 className="font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight uppercase leading-none pt-2">
            DEFINE YOUR STYLE. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">
              WEAR YOUR CONFIDENCE.
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto font-light leading-relaxed">
            “Discover contemporary fashion curated for your everyday style. From heavy-weight streetwear t-shirts to structured formalwear and luxury denim.”
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              to="/men"
              className="animate-shimmer-sweep bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm uppercase tracking-wider px-8 py-4 rounded-xl shadow-xl shadow-amber-500/20 flex items-center justify-center space-x-3 transition-all hover:scale-105 min-w-[190px] sm:min-w-[210px]"
            >
              <span>SHOP MEN</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/women"
              className="animate-shimmer-sweep bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm uppercase tracking-wider px-8 py-4 rounded-xl shadow-xl shadow-amber-500/20 flex items-center justify-center space-x-3 transition-all hover:scale-105 min-w-[190px] sm:min-w-[210px]"
            >
              <span>SHOP WOMEN</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 3D METRIC STAT COUNTERS BAR (Inspired by Aishwarya Events) */}
          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="glass-card p-4 rounded-2xl border border-neutral-800 hover:border-amber-500/40 transition-all duration-300 transform hover:-translate-y-1">
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 block">5000+</span>
              <span className="text-xs text-slate-400 font-medium">Happy Customers</span>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-neutral-800 hover:border-amber-500/40 transition-all duration-300 transform hover:-translate-y-1">
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 block">100%</span>
              <span className="text-xs text-slate-400 font-medium">Original Mens & Womenswear</span>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-neutral-800 hover:border-amber-500/40 transition-all duration-300 transform hover:-translate-y-1">
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 block">Direct</span>
              <span className="text-xs text-slate-400 font-medium">WhatsApp Ordering</span>
            </div>
            <div className="glass-card p-4 rounded-2xl border border-neutral-800 hover:border-amber-500/40 transition-all duration-300 transform hover:-translate-y-1">
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 block">Express</span>
              <span className="text-xs text-slate-400 font-medium">Doorstep Delivery</span>
            </div>
          </div>

        </div>
      </section>

      {/* Floating WhatsApp Interactive FAB */}
      <a
        href="https://wa.me/918522000504"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-20 right-6 z-40 animate-pulse-ring bg-emerald-500 hover:bg-emerald-400 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 group"
        title="Chat on WhatsApp"
      >
        <MessageSquare className="w-6 h-6 fill-white" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-500 ease-in-out text-xs font-bold pl-0 group-hover:pl-2">
          Chat on WhatsApp
        </span>
      </a>

      {/* 2. SHOP BY CATEGORY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-end justify-between border-b border-neutral-800 pb-4">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">CURATED SECTIONS</span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white uppercase tracking-wide">Shop By Category</h2>
          </div>
          <Link to="/products" className="text-xs text-amber-400 hover:text-amber-300 font-semibold uppercase tracking-wider flex items-center space-x-1">
            <span>Explore All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.slice(0, 10).map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.slug}`}
              className="group relative h-60 rounded-2xl overflow-hidden border border-neutral-800 hover:border-amber-500/40 transition-all duration-300"
            >
              <img
                src={cat.image_url}
                alt={cat.name}
                className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest block">{cat.gender}</span>
                <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">{cat.name}</h3>
                <span className="text-[10px] text-slate-400">{cat.product_count || 5}+ Items</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. TRENDING NOW COLLECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-end justify-between border-b border-neutral-800 pb-4">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">MOST POPULAR</span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white uppercase tracking-wide">Trending Now</h2>
          </div>
          <Link to="/trending" className="text-xs text-amber-400 hover:text-amber-300 font-semibold uppercase tracking-wider flex items-center space-x-1">
            <span>View All Trending</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendingProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. PROMOTIONAL BANNER OFFERS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900 grid grid-cols-1 lg:grid-cols-2">
          <div className="p-8 sm:p-12 flex flex-col justify-center space-y-6">
            <span className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest px-3.5 py-1 rounded-full w-fit">
              <Tag className="w-3.5 h-3.5" />
              <span>LIMITED TIME OFFER</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white uppercase">
              UP TO 50% OFF <br />
              <span className="text-amber-400">NEW SEASON SALE</span>
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Upgrade your wardrobe with our newest drops in heavy cotton tees, washed denim jackets, and tailored trousers.
            </p>
            <div>
              <Link
                to="/offers"
                className="inline-flex items-center space-x-3 bg-amber-500 text-black font-extrabold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl hover:bg-amber-400 transition-colors"
              >
                <span>CLAIM DISCOUNT</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="relative min-h-[280px]">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80"
              alt="Sale Offer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* 5. NEW ARRIVALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-end justify-between border-b border-neutral-800 pb-4">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">FRESH DROPS</span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white uppercase tracking-wide">New Arrivals</h2>
          </div>
          <Link to="/new-arrivals" className="text-xs text-amber-400 hover:text-amber-300 font-semibold uppercase tracking-wider flex items-center space-x-1">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 6. STYLE INSPIRATION EDITORIAL SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">EDITORIAL LOOKBOOK</span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white uppercase">Style Inspiration</h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">Explore curated outfit pairings crafted for every occasion.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {editorialGuides.map((guide, idx) => (
            <Link
              key={idx}
              to={guide.link}
              className="group relative h-80 rounded-2xl overflow-hidden border border-neutral-800 hover:border-amber-500/50 transition-all"
            >
              <img src={guide.img} alt={guide.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">{guide.tag}</span>
                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">{guide.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 7. SHOP BY BRAND */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">AUTHENTIC BRANDS</span>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white uppercase">Shop By Brand</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              to={`/products?brand=${encodeURIComponent(brand.id)}`}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-2 hover:border-amber-500/40 hover:bg-neutral-800/80 transition-all group"
            >
              <span className="font-display font-extrabold text-base text-white tracking-wider group-hover:text-amber-400 transition-colors">
                {brand.name}
              </span>
              <span className="text-[10px] text-slate-400">{brand.product_count || 4} Products</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 8. CUSTOMER BENEFITS ("Why Youth Choice?") */}
      <section className="bg-neutral-900/60 border-y border-neutral-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">OUR PROMISE</span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white uppercase">Why Youth Choice?</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Premium Styles</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Curated fabrics, structural fits, and fashion-forward designs for modern men.</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Tag className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Affordable Prices</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Direct pricing without middleman markups. High fashion made accessible.</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Easy WhatsApp Order</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Instant order placement via WhatsApp directly with the store owner.</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Secure Accounts</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Personal user dashboard to track order status, saved addresses, and wishlist.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">CUSTOMER REVIEWS</span>
          <h2 className="text-3xl font-display font-bold text-white uppercase">What Customers Say</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400" />)}
            </div>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              “Great quality and excellent fitting. Ordered the heavyweight drop-shoulder tee and it fits like a luxury streetwear brand!”
            </p>
            <div>
              <p className="text-xs font-bold text-white">Rohan Sharma</p>
              <p className="text-[10px] text-slate-500">Verified Buyer</p>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400" />)}
            </div>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              “Loved the collection and quick response over WhatsApp. The store owner confirmed payment and dispatched within 2 hours.”
            </p>
            <div>
              <p className="text-xs font-bold text-white">Vikram Reddy</p>
              <p className="text-[10px] text-slate-500">Verified Buyer</p>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400" />)}
            </div>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              “Very stylish products at reasonable prices. The stretch denim jeans and polo t-shirts are top notch.”
            </p>
            <div>
              <p className="text-xs font-bold text-white">Karthik Verma</p>
              <p className="text-[10px] text-slate-500">Verified Buyer</p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. WHATSAPP ORDER CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-950 via-neutral-900 to-emerald-950 border border-emerald-500/30 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-emerald-500/30">
            <MessageSquare className="w-4 h-4" />
            <span>DIRECT STORE ASSISTANCE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white uppercase">
            READY TO FIND YOUR STYLE?
          </h2>

          <p className="text-slate-300 text-sm max-w-xl mx-auto leading-relaxed">
            Order directly through WhatsApp with automatic pre-filled product details, sizes, colors, and delivery location.
          </p>

          <div>
            <a
              href="https://wa.me/918522000504?text=Hello%20Youth%20Choice%20The%20Fashion%20Store!%20I%20would%20like%20to%20inquire%20about%20your%20latest%20fashion%20collection."
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm uppercase tracking-wider px-8 py-4 rounded-xl shadow-xl shadow-emerald-500/20 transition-all hover:scale-105"
            >
              <MessageSquare className="w-5 h-5 fill-black" />
              <span>ORDER VIA WHATSAPP</span>
            </a>
          </div>
        </div>
      </section>

    </div>
  );
};
