import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingCart, Users, Package, AlertTriangle, TrendingUp, Plus, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { apiRequest } from '../../services/api';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      apiRequest('/admin/dashboard-stats'),
      apiRequest('/admin/analytics'),
      apiRequest('/orders?limit=5')
    ]).then(([sRes, aRes, oRes]) => {
      setStats(sRes);
      setAnalytics(aRes);
      setRecentOrders(oRes.orders?.slice(0, 5) || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-shimmer">
        <div className="h-32 bg-neutral-900 rounded-2xl" />
        <div className="h-64 bg-neutral-900 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">EXECUTIVE SUMMARY</span>
          <h1 className="text-2xl font-display font-extrabold text-white uppercase">Youth Choice The Fashion Store Dashboard</h1>
        </div>

        {/* Quick Actions Toolbar */}
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/products?new=1" className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-4 py-2 rounded-xl flex items-center space-x-1">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </Link>
          <Link to="/admin/inventory" className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs px-4 py-2 rounded-xl">
            Manage Inventory
          </Link>
          <Link to="/admin/orders" className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs px-4 py-2 rounded-xl">
            View Orders
          </Link>
        </div>
      </div>

      {/* Top Stats Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">₹{stats.totalRevenue?.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-400 font-semibold">Today: ₹{stats.todayRevenue?.toLocaleString()}</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
            <ShoppingCart className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{stats.totalOrders}</p>
          <span className="text-[10px] text-amber-400 font-semibold">Today: {stats.todayOrders} Orders</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Customers</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{stats.totalCustomers}</p>
          <span className="text-[10px] text-slate-400">Registered Accounts</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-extrabold text-red-400">{stats.lowStockCount + stats.outOfStockCount}</p>
          <span className="text-[10px] text-red-400 font-semibold">{stats.lowStockCount} Low • {stats.outOfStockCount} Out of Stock</span>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weekly Revenue Trend Chart */}
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Weekly Revenue Trend</h3>
            <span className="text-xs text-amber-400 font-semibold">Past 7 Days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.revenueChart || []}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c5a059" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#c5a059" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#18181c', borderColor: '#333', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#c5a059" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Conversion Funnel Chart */}
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Customer Engagement Funnel</h3>
            <span className="text-xs text-amber-400 font-semibold">Conversion Metrics</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.funnel || []} layout="vertical">
                <XAxis type="number" stroke="#666" fontSize={11} />
                <YAxis dataKey="stage" type="category" stroke="#aaa" fontSize={10} width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#18181c', borderColor: '#333', borderRadius: '12px' }} />
                <Bar dataKey="count" fill="#c5a059" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Recent WhatsApp Orders Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Customer WhatsApp Orders</h3>
          <Link to="/admin/orders" className="text-xs text-amber-400 hover:underline font-semibold flex items-center space-x-1">
            <span>View All Orders</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Grand Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-slate-200 font-medium">
              {recentOrders.map(order => (
                <tr key={order.id} className="hover:bg-neutral-800/50">
                  <td className="py-3 px-4 font-mono font-bold text-amber-400">{order.order_number}</td>
                  <td className="py-3 px-4 text-white font-bold">{order.customer_name}</td>
                  <td className="py-3 px-4">{order.customer_phone}</td>
                  <td className="py-3 px-4 font-bold text-white">₹{order.grand_total?.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
