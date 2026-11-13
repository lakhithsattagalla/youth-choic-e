import React, { useState, useEffect } from 'react';
import { MessageSquare, Search, Eye, Filter, CheckCircle, Bot } from 'lucide-react';
import { apiRequest } from '../../services/api';

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/orders');
      setOrders(res.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await apiRequest(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      // If order confirmed, automatically open WhatsApp with the Payment QR message for the customer
      if ((newStatus === 'ORDER_CONFIRMED' || newStatus === 'PENDING_CONFIRMATION') && res.whatsapp_bot_url) {
        window.open(res.whatsapp_bot_url, '_blank');
      }

      await fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  const openWhatsAppChat = (phone: string, orderNum: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hello ${name}! This is Youth Choice The Fashion Store regarding your order #${orderNum}.`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const filtered = orders.filter(o => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.customer_phone.includes(q);
    
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">ORDER PROCESSING</span>
          <h1 className="text-2xl font-display font-bold text-white uppercase">Customer Orders Manager</h1>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
        <div className="md:col-span-2 flex items-center space-x-3 bg-neutral-950 border border-neutral-800 px-3 py-2 rounded-xl">
          <Search className="w-4 h-4 text-slate-400 ml-1" />
          <input 
            type="text" 
            placeholder="Search by Order ID (YC-XXXXX), customer name, or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-white text-xs focus:outline-none"
          />
        </div>

        <select 
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-neutral-950 border border-neutral-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-semibold"
        >
          <option value="ALL">All Order Statuses</option>
          <option value="PENDING_CONFIRMATION">PENDING CONFIRMATION</option>
          <option value="WHATSAPP_CONTACTED">WHATSAPP CONTACTED</option>
          <option value="ORDER_CONFIRMED">ORDER CONFIRMED</option>
          <option value="PAYMENT_CONFIRMED">PAYMENT CONFIRMED</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="SHIPPED">SHIPPED</option>
          <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-slate-400 uppercase tracking-wider bg-neutral-950">
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Items Count</th>
                <th className="py-3.5 px-4">Grand Total</th>
                <th className="py-3.5 px-4">Order Status</th>
                <th className="py-3.5 px-4">Direct Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-slate-200">
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-neutral-800/40">
                  <td className="py-3 px-4">
                    <p className="font-mono font-bold text-amber-400 text-xs">{order.order_number}</p>
                    <p className="text-[10px] text-slate-500">{new Date(order.created_at).toLocaleString()}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-white">{order.customer_name}</p>
                    <p className="text-[10px] text-slate-400">{order.customer_phone}</p>
                  </td>
                  <td className="py-3 px-4 font-bold text-white">{order.items?.length || 0} Items</td>
                  <td className="py-3 px-4 font-extrabold text-white">
                    ₹{order.grand_total?.toLocaleString()}
                    <span className={`block text-[10px] font-semibold mt-0.5 ${order.payment_method === 'COD' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {order.payment_method === 'COD' ? '💵 COD (+₹100 Fee)' : '💳 Online UPI'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={order.status}
                      onChange={e => handleStatusChange(order.id, e.target.value)}
                      className="bg-neutral-950 border border-neutral-700 text-amber-300 font-bold text-[11px] rounded-lg p-1.5 focus:outline-none"
                    >
                      <option value="PENDING_CONFIRMATION">PENDING CONFIRMATION</option>
                      <option value="WHATSAPP_CONTACTED">WHATSAPP CONTACTED</option>
                      <option value="ORDER_CONFIRMED">ORDER CONFIRMED</option>
                      <option value="PAYMENT_CONFIRMED">PAYMENT CONFIRMED</option>
                      <option value="PROCESSING">PROCESSING</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={async () => {
                          try {
                            const res = await apiRequest('/whatsapp/send-qr-bot', {
                              method: 'POST',
                              body: JSON.stringify({
                                order_number: order.order_number,
                                phone: order.customer_phone,
                                amount: order.grand_total,
                                customer_name: order.customer_name
                              })
                            });
                            if (res.whatsapp_url) {
                              window.open(res.whatsapp_url, '_blank');
                            }
                          } catch (err: any) {
                            alert(err.message || 'Failed to trigger AI bot');
                          }
                        }}
                        className="bg-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-300 font-bold px-2.5 py-1.5 rounded-lg flex items-center space-x-1 text-[11px] transition-all"
                        title="Send UPI Payment QR Code via AI Bot on WhatsApp"
                      >
                        <Bot className="w-3.5 h-3.5 text-amber-400" />
                        <span>🤖 SEND QR BOT</span>
                      </button>

                      <button
                        onClick={() => openWhatsAppChat(order.customer_phone, order.order_number, order.customer_name)}
                        className="bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-400 font-bold px-2.5 py-1.5 rounded-lg flex items-center space-x-1 text-[11px] transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>CHAT</span>
                      </button>

                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="bg-neutral-800 hover:bg-neutral-700 text-slate-300 p-2 rounded-lg"
                        title="View Full Breakdown"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Order #{selectedOrder.order_number} Details</h3>
                <p className="text-xs text-slate-400">Customer: {selectedOrder.customer_name} ({selectedOrder.customer_phone})</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-amber-400 uppercase">Items Ordered:</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedOrder.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center space-x-3 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                    <img src={item.image_url} alt="" className="w-10 h-12 object-cover rounded" />
                    <div className="flex-1">
                      <p className="font-bold text-white">{item.product_name}</p>
                      <p className="text-[10px] text-slate-400">Brand: {item.brand_name} | Size: {item.size} | Color: {item.color} | Qty: {item.quantity}</p>
                    </div>
                    <span className="font-bold text-white">₹{item.total_price.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-400 text-xs">📍 Delivery Address for Courier Partner:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`To: ${selectedOrder.customer_name}\nPh: ${selectedOrder.customer_phone}\nAddress: ${selectedOrder.delivery_address}`);
                      alert('Address copied to clipboard for courier booking!');
                    }}
                    className="bg-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-300 text-[10px] font-bold px-3 py-1 rounded transition-colors"
                  >
                    📋 Copy Address for Courier
                  </button>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed">{selectedOrder.delivery_address}</p>
              </div>

              <div className="border-t border-neutral-800 pt-3 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Payment Method</span>
                  <span className="font-bold text-white">{selectedOrder.payment_method === 'COD' ? 'Cash on Delivery (COD)' : 'Online UPI'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-white">₹{selectedOrder.subtotal?.toLocaleString()}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Coupon Discount</span>
                    <span>-₹{selectedOrder.discount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-white">{selectedOrder.delivery_fee === 0 ? 'FREE' : `₹${selectedOrder.delivery_fee}`}</span>
                </div>
                {selectedOrder.cod_fee > 0 && (
                  <div className="flex justify-between text-amber-400 font-bold">
                    <span>Cash on Delivery (COD) Extra Charge</span>
                    <span>+₹{selectedOrder.cod_fee?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center font-bold text-sm pt-2 border-t border-neutral-800 text-white">
                  <span>Grand Total Amount</span>
                  <span className="text-amber-400 text-base">₹{selectedOrder.grand_total?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
