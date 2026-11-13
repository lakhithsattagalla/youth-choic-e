import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Warehouse, ShoppingCart, Tag, Percent, Grid, Users, BarChart3, Settings, LogOut, ExternalLink, Menu, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 px-4">
        <ShieldCheck className="w-12 h-12 text-amber-500" />
        <h2 className="text-xl font-bold text-white">Access Denied: Admin Privileges Required</h2>
        <button onClick={() => navigate('/admin/login')} className="bg-amber-500 text-black font-bold text-xs px-6 py-3 rounded-xl uppercase">
          Go to Admin Login
        </button>
      </div>
    );
  }

  const menuItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Products Management', href: '/admin/products', icon: Package },
    { name: 'Inventory & Stock Matrix', href: '/admin/inventory', icon: Warehouse },
    { name: 'WhatsApp Orders', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Brand Management', href: '/admin/brands', icon: Tag },
    { name: 'Category Management', href: '/admin/categories', icon: Grid },
    { name: 'Customer Directory', href: '/admin/customers', icon: Users },
    { name: 'Coupon Discounts', href: '/admin/coupons', icon: Tag },
    { name: 'Product Offers', href: '/admin/offers', icon: Percent },
    { name: 'Business Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Store Settings', href: '/admin/settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col lg:flex-row">
      
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-neutral-900 border-b border-neutral-800 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center font-bold text-black text-xs">YC</div>
          <span className="font-display font-extrabold text-white text-sm">ADMIN PORTAL</span>
        </div>
        <button onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} className="text-slate-300">
          {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Admin Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col justify-between transition-transform duration-300 lg:static lg:translate-x-0 ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 space-y-8 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-bold text-black text-lg shadow-lg shadow-amber-500/20">
              YC
            </div>
            <div>
              <span className="font-display font-extrabold text-white text-base tracking-wider block">YOUTH CHOICE</span>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest block">ADMIN CONSOLE</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                    isActive 
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' 
                      : 'text-slate-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-amber-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-900 space-y-2 text-xs">
          <Link 
            to="/" 
            target="_blank"
            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-slate-300 font-medium"
          >
            <span className="flex items-center space-x-2">
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Customer Website</span>
            </span>
            <span className="text-[10px] text-slate-500">Live ↗</span>
          </Link>

          <button 
            onClick={logout}
            className="w-full flex items-center space-x-2 px-4 py-2.5 rounded-xl text-red-400 hover:bg-neutral-900 font-semibold text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content Body */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-[#0a0a0c]">
        <Outlet />
      </main>

    </div>
  );
};
