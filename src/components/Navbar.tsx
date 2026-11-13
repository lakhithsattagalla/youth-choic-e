import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, Heart, User, Menu, X, ChevronRight, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { apiRequest } from '../services/api';
import { AuthModal } from './AuthModal';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { itemCount: cartCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const userName = typeof user === 'string' ? user : (user?.name || user?.email || 'User');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  // Live search suggestions
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const timer = setTimeout(() => {
        apiRequest(`/products?search=${encodeURIComponent(searchQuery)}`)
          .then(res => setSearchResults(res.products?.slice(0, 5) || []))
          .catch(() => setSearchResults([]));
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
    }
  };

  const navLinks = [
    { name: 'Men', href: '/men' },
    { name: 'Women', href: '/women' },
    { name: 'New Arrivals', href: '/new-arrivals' },
    { name: 'Trending', href: '/trending' },
    { name: 'Offers', href: '/offers' },
    { name: 'Brands', href: '/brands' }
  ];

  return (
    <>
      {/* Top Banner Announcement */}
      <div className="bg-gradient-to-r from-neutral-900 via-amber-950 to-neutral-900 text-amber-200 text-xs py-2 text-center border-b border-amber-900/30 font-medium tracking-wide px-4 flex items-center justify-center space-x-2 sm:space-x-4 flex-wrap">
        <span>✨ Free Shipping on Orders Over ₹999</span>
        <span className="hidden sm:inline">•</span>
        <span>Direct WhatsApp Ordering Available!</span>
      </div>

      {/* Main Sticky Header */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${isScrolled ? 'glass-panel shadow-2xl py-3' : 'bg-black/95 border-b border-neutral-800 py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 text-slate-300 hover:text-white"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center space-x-3 group">
            <img 
              src="/yc-logo.jpg" 
              alt="Youth Choice Logo" 
              className="w-11 h-11 rounded-xl object-contain bg-white p-1 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform duration-300" 
            />
            <div>
              <span className="font-display font-extrabold tracking-wider text-lg sm:text-xl text-white block leading-none">
                YOUTH CHOICE
              </span>
              <span className="text-[9px] sm:text-[10px] tracking-[0.2em] text-amber-400 font-medium block uppercase mt-0.5">
                THE FASHION STORE
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`text-sm font-medium tracking-wider uppercase transition-colors relative py-1 ${
                  location.pathname === link.href 
                    ? 'text-amber-400 font-semibold' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {link.name}
                {location.pathname === link.href && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-400 rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Action Icons: Search, Wishlist, Account, Cart */}
          <div className="flex items-center space-x-4 sm:space-x-6">
            
            {/* Search Trigger */}
            <button 
              onClick={() => setSearchOpen(true)}
              className="text-slate-300 hover:text-amber-400 p-1.5 transition-colors"
              aria-label="Search Catalog"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist */}
            <Link 
              to="/wishlist" 
              className="text-slate-300 hover:text-amber-400 p-1.5 transition-colors relative"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-black font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link 
              to="/cart" 
              className="text-slate-300 hover:text-amber-400 p-1.5 transition-colors relative"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-black font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Account / Admin Badge */}
            {user ? (
              <div className="relative group">
                <Link 
                  to={user?.role === 'ADMIN' ? '/admin' : '/account'}
                  className="flex items-center space-x-2 text-slate-300 hover:text-amber-400 p-1.5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs text-amber-400">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-xs font-medium text-slate-200 truncate max-w-[100px]">
                    Hi, {userName}
                  </span>
                  {user?.role === 'ADMIN' && (
                    <span className="hidden sm:inline bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded font-semibold border border-amber-500/30">
                      ADMIN
                    </span>
                  )}
                </Link>

                {/* Account Dropdown */}
                <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="px-4 py-2 border-b border-neutral-800">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="text-sm font-semibold text-white truncate">{userName}</p>
                  </div>

                  {user?.role === 'ADMIN' && (
                    <Link to="/admin" className="flex items-center space-x-2 px-4 py-2.5 text-xs text-amber-400 hover:bg-neutral-800 font-medium">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Admin Portal</span>
                    </Link>
                  )}

                  <Link to="/account" className="block px-4 py-2 text-xs text-slate-300 hover:bg-neutral-800">
                    My Account
                  </Link>
                  <Link to="/account/orders" className="block px-4 py-2 text-xs text-slate-300 hover:bg-neutral-800">
                    My Orders
                  </Link>

                  <button 
                    onClick={logout}
                    className="w-full text-left flex items-center space-x-2 px-4 py-2 text-xs text-red-400 hover:bg-neutral-800 border-t border-neutral-800 mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthOpen(true)}
                className="hidden sm:inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-xs uppercase tracking-wider px-4 py-2 rounded-lg shadow-md transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

          </div>
        </div>
      </header>

      {/* Search Overlay Modal */}
      {searchOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center pt-16 px-4">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setSearchOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-6 h-6" />
            </button>

            <form onSubmit={handleSearchSubmit} className="relative mt-2">
              <input 
                type="text"
                placeholder="Search Men's T-Shirts, Shirts, Jeans, Brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-neutral-800 border border-neutral-700 focus:border-amber-500 text-white rounded-xl px-4 py-3.5 pl-11 text-sm focus:outline-none transition-colors"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-4" />
            </form>

            {/* Live Suggestions list */}
            {searchResults.length > 0 && (
              <div className="mt-4 border-t border-neutral-800 pt-4 space-y-3">
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Search Results ({searchResults.length})</p>
                {searchResults.map(p => (
                  <Link
                    key={p.id}
                    to={`/products/${p.id}`}
                    className="flex items-center space-x-4 p-2.5 rounded-lg hover:bg-neutral-800 transition-colors group"
                  >
                    <img src={p.primary_image} alt={p.name} className="w-12 h-12 object-cover rounded-md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-amber-400 font-medium">{p.brand_name}</p>
                      <p className="text-sm font-semibold text-white truncate group-hover:text-amber-300">{p.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">₹{p.selling_price.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 line-through">₹{p.mrp.toLocaleString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          
          <div className="relative w-4/5 max-w-sm bg-neutral-900 border-r border-neutral-800 h-full flex flex-col p-6 z-10 shadow-2xl">
            <div className="flex items-center justify-between pb-6 border-b border-neutral-800">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center font-serif text-black font-bold text-lg">YC</div>
                <span className="font-display font-extrabold text-white text-base">YOUTH CHOICE</span>
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 py-6 space-y-4 overflow-y-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="flex items-center justify-between text-slate-200 hover:text-amber-400 text-sm font-medium tracking-wide uppercase py-2"
                >
                  <span>{link.name}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </Link>
              ))}
            </nav>

            <div className="border-t border-neutral-800 pt-6 space-y-3">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-800 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Hi, {userName}</p>
                      <p className="text-xs text-slate-400">{typeof user === 'string' ? user : (user?.email || user?.phone || '')}</p>
                    </div>
                  </div>
                  {user?.role === 'ADMIN' && (
                    <Link to="/admin" className="block w-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-center py-2 rounded-lg font-semibold text-xs">
                      Admin Portal
                    </Link>
                  )}
                  <button onClick={logout} className="w-full text-center text-red-400 text-xs font-semibold py-2">
                    Sign Out
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => { setMobileMenuOpen(false); setIsAuthOpen(true); }}
                  className="w-full text-center bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold text-xs py-2.5 rounded-lg uppercase tracking-wider shadow-md"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
};
