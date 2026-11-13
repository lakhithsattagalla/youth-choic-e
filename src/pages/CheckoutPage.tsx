import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, MessageSquare, Tag, Check, ShieldCheck, Plus, CreditCard, Banknote } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';

export const CheckoutPage: React.FC = () => {
  const { items, summary, refreshCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState<string>('');

  const [paymentMethod, setPaymentMethod] = useState<'ONLINE_UPI' | 'COD'>('ONLINE_UPI');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);
  const [selectedUpiHandle, setSelectedUpiHandle] = useState<string>('8522000504@ybl');

  // New Address form
  const [showNewAddr, setShowNewAddr] = useState<boolean>(false);
  const [newAddr, setNewAddr] = useState({
    recipient_name: user?.name || '',
    phone: user?.phone || '',
    street: '',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500034',
    type: 'HOME'
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    apiRequest('/user/addresses')
      .then(res => {
        const addrList = res.addresses || [];
        setAddresses(addrList);
        const defaultAddr = addrList.find((a: any) => a.is_default) || addrList[0];
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      });
  }, [user]);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/user/addresses', {
        method: 'POST',
        body: JSON.stringify({ ...newAddr, is_default: true })
      });
      setAddresses([...addresses, res.address]);
      setSelectedAddressId(res.address.id);
      setShowNewAddr(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save address');
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponCode.trim()) return;

    try {
      const res = await apiRequest('/admin/coupons');
      const found = (res.coupons || []).find((c: any) => c.code.toUpperCase() === couponCode.trim().toUpperCase());
      if (!found) {
        setCouponError('Invalid coupon code');
        return;
      }

      const nowMs = Date.now();

      // 1. Check if before start time
      if (found.start_at && nowMs < new Date(found.start_at).getTime()) {
        setCouponError('This coupon is not active yet.');
        return;
      }

      // 2. Check if after end time or status expired
      if ((found.end_at && nowMs > new Date(found.end_at).getTime()) || found.status === 'EXPIRED') {
        setCouponError('This coupon has expired.');
        return;
      }

      // 3. Check minimum order requirement
      if (summary.subtotal < found.min_order_amount) {
        setCouponError(`Minimum order amount for coupon ${found.code} is ₹${found.min_order_amount}`);
        return;
      }

      setAppliedCoupon(found);
      setCouponError('');
    } catch (err) {
      setCouponError('Failed to validate coupon');
    }
  };

  const calculateFinalTotal = () => {
    let couponDiscount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.discount_type === 'FIXED') {
        couponDiscount = appliedCoupon.discount_value;
      } else {
        couponDiscount = Math.round((summary.subtotal * appliedCoupon.discount_value) / 100);
      }
    }
    const codFee = paymentMethod === 'COD' ? 100 : 0;
    const finalGrand = Math.max(0, summary.subtotal - couponDiscount + summary.delivery_fee + codFee);
    return { couponDiscount, codFee, finalGrand };
  };

  const handleCreateWhatsAppOrder = async () => {
    if (!selectedAddressId) {
      alert('Please select or add a delivery address');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiRequest('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          address_id: selectedAddressId,
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          payment_method: paymentMethod,
          notes
        })
      });

      setOrderSuccess(res);
      await refreshCart();
    } catch (err: any) {
      alert(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { couponDiscount, codFee, finalGrand } = calculateFinalTotal();

  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="max-w-md mx-auto my-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Your cart is empty</h2>
        <button onClick={() => navigate('/products')} className="bg-amber-500 text-black font-bold text-xs px-6 py-3 rounded-xl uppercase">
          Shop Now
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Step Header */}
      <div className="border-b border-neutral-800 pb-4">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">STEP 3 OF 3</span>
        <h1 className="text-3xl font-display font-bold text-white uppercase">Checkout & Order via WhatsApp</h1>
      </div>

      {/* SUCCESS MODAL AFTER CREATING ORDER */}
      {orderSuccess ? (
        <div className="max-w-2xl mx-auto bg-neutral-900 border border-emerald-500/40 rounded-3xl p-8 space-y-6 text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
            <Check className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">ORDER CREATED SUCCESSFULLY</span>
            <h2 className="text-2xl font-display font-bold text-white uppercase">Order ID: {orderSuccess.order.order_number}</h2>
            <p className="text-xs text-slate-300">
              Your order has been recorded in our system. Click the button below to send your order details directly to the Youth Choice The Fashion Store owner via WhatsApp!
            </p>
          </div>

          {/* Dynamic Scannable UPI Payment QR Code Card */}
          <div className="bg-neutral-950 border border-amber-500/30 rounded-2xl p-6 space-y-6 text-center shadow-2xl">
            <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider inline-block">
              💳 SCAN TO PAY WITH ANY UPI APP
            </span>

            {/* UPI ID VPA Handle Selector Tabs */}
            <div className="space-y-2">
              <span className="text-xs text-slate-400 block font-semibold">Select Store UPI Handle:</span>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { handle: '8522000504@ybl', label: '8522000504@ybl (PhonePe / Yes Bank)' },
                  { handle: '8522000504@paytm', label: '8522000504@paytm (Paytm)' },
                  { handle: '8522000504@okicici', label: '8522000504@okicici (GPay / ICICI)' }
                ].map((item) => (
                  <button
                    key={item.handle}
                    type="button"
                    onClick={() => setSelectedUpiHandle(item.handle)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                      selectedUpiHandle === item.handle
                        ? 'bg-amber-500 text-black border-amber-400 shadow-lg scale-105'
                        : 'bg-neutral-900 text-slate-300 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-2">
              {/* QR Image with active handle */}
              <div className="bg-white p-3.5 rounded-2xl shadow-2xl border-4 border-amber-500/40 text-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                    `upi://pay?pa=${selectedUpiHandle}&pn=YouthChoiceMensWear&am=${orderSuccess.order.grand_total}&cu=INR&tn=Order_${(orderSuccess.order.order_number || 'YC-00000').replace(/[^a-zA-Z0-9]/g, '')}`
                  )}`} 
                  alt="UPI Payment QR Code" 
                  className="w-52 h-52 object-contain"
                />
                <p className="text-[10px] text-neutral-800 font-bold mt-1.5 uppercase tracking-wider">Scan with PhonePe, GPay, Paytm, BHIM</p>
              </div>

              {/* Payment Info & Interactive Supported Apps */}
              <div className="text-left space-y-4 max-w-sm w-full">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Grand Total Amount</span>
                  <span className="text-3xl font-extrabold text-amber-400">₹{orderSuccess.order.grand_total?.toLocaleString()}</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <span className="text-slate-400 block font-semibold">Active Store UPI ID:</span>
                  <div className="flex items-center space-x-2">
                    <code className="bg-neutral-900 px-3 py-2 rounded-xl text-amber-300 font-mono font-extrabold border border-neutral-800 text-sm flex-1">
                      {selectedUpiHandle}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedUpiHandle);
                        alert(`UPI ID ${selectedUpiHandle} copied to clipboard!`);
                      }}
                      className="bg-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-300 px-3.5 py-2 rounded-xl font-bold text-xs transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>


              </div>
            </div>
          </div>

          {/* Formatted Message Preview */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-left font-mono text-[11px] text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
            {orderSuccess.whatsapp_message}
          </div>

          {/* Live Order Location & Tracking Information Card */}
          <div className="bg-neutral-950 border border-amber-500/30 rounded-2xl p-6 text-left space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>WHERE IS MY ORDER? (LIVE ORDER TRACKING)</span>
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-full border border-emerald-500/30">
                ORDER CONFIRMED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl space-y-1">
                <span className="text-slate-400 block font-semibold">Order Number</span>
                <span className="text-white font-mono font-extrabold text-sm">{orderSuccess.order.order_number}</span>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl space-y-1">
                <span className="text-slate-400 block font-semibold">Estimated Delivery</span>
                <span className="text-emerald-400 font-bold text-xs">2 - 3 Business Days (Express Dispatch)</span>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl space-y-1 text-xs">
              <span className="text-slate-400 block font-semibold">Shipping Address:</span>
              <p className="text-white font-medium">{orderSuccess.order.delivery_address}</p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-xs space-y-1">
              <span className="text-amber-300 font-bold block">📱 Want Live GPS & Dispatch Tracking Updates?</span>
              <p className="text-slate-300 text-[11px]">
                You can chat directly with our store support on WhatsApp to get real-time tracking links, courier docket numbers, and dispatch photos for your order.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <a 
              href={orderSuccess.whatsapp_url} 
              target="_blank" 
              rel="noreferrer"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm uppercase tracking-wider py-4 rounded-xl shadow-xl shadow-emerald-500/20 flex items-center justify-center space-x-3 transition-all hover:scale-105"
            >
              <MessageSquare className="w-5 h-5 fill-black" />
              <span>SEND ORDER & GET TRACKING ON WHATSAPP</span>
            </a>

            <button 
              onClick={() => navigate('/account/orders')}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase py-3.5 rounded-xl flex items-center justify-center space-x-2 border border-neutral-700"
            >
              <span>📦 TRACK ORDER LOCATION IN MY ACCOUNT DASHBOARD</span>
            </button>
          </div>
        </div>
      ) : (

        /* MAIN CHECKOUT FORM GRID */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Address & Coupon */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Address Selection */}
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white uppercase text-sm flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>1. Select Delivery Address</span>
                </h3>
                <button 
                  onClick={() => setShowNewAddr(!showNewAddr)}
                  className="text-xs text-amber-400 hover:underline font-semibold flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Address</span>
                </button>
              </div>

              {/* Saved Address Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`p-4 rounded-xl border cursor-pointer transition-all relative block ${
                      selectedAddressId === addr.id 
                        ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg' 
                        : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:border-neutral-700'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="address"
                      value={addr.id}
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="sr-only"
                    />
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{addr.recipient_name} ({addr.type})</span>
                        {addr.is_default && <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded font-semibold">DEFAULT</span>}
                      </div>
                      <p className="text-slate-300">{addr.street}</p>
                      <p className="text-slate-300">{addr.city}, {addr.state} - {addr.pincode}</p>
                      <p className="text-amber-400 font-medium">Ph: {addr.phone}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Add New Address Form */}
              {showNewAddr && (
                <form onSubmit={handleAddAddress} className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl space-y-3 text-xs pt-4">
                  <h4 className="font-bold text-white uppercase">Add Delivery Address</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="text" placeholder="Recipient Full Name" required 
                      value={newAddr.recipient_name} onChange={e => setNewAddr({ ...newAddr, recipient_name: e.target.value })}
                      className="bg-neutral-900 border border-neutral-700 text-white p-2.5 rounded-lg"
                    />
                    <input 
                      type="text" placeholder="Phone Number" required 
                      value={newAddr.phone} onChange={e => setNewAddr({ ...newAddr, phone: e.target.value })}
                      className="bg-neutral-900 border border-neutral-700 text-white p-2.5 rounded-lg"
                    />
                  </div>
                  <input 
                    type="text" placeholder="House No, Building, Street, Area" required 
                    value={newAddr.street} onChange={e => setNewAddr({ ...newAddr, street: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white p-2.5 rounded-lg"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <input 
                      type="text" placeholder="City" required 
                      value={newAddr.city} onChange={e => setNewAddr({ ...newAddr, city: e.target.value })}
                      className="bg-neutral-900 border border-neutral-700 text-white p-2.5 rounded-lg"
                    />
                    <input 
                      type="text" placeholder="State" required 
                      value={newAddr.state} onChange={e => setNewAddr({ ...newAddr, state: e.target.value })}
                      className="bg-neutral-900 border border-neutral-700 text-white p-2.5 rounded-lg"
                    />
                    <input 
                      type="text" placeholder="Pincode" required 
                      value={newAddr.pincode} onChange={e => setNewAddr({ ...newAddr, pincode: e.target.value })}
                      className="bg-neutral-900 border border-neutral-700 text-white p-2.5 rounded-lg"
                    />
                  </div>
                  <button type="submit" className="bg-amber-500 text-black font-bold px-4 py-2 rounded-lg text-xs">Save Address</button>
                </form>
              )}
            </div>

            {/* Coupon Code Section */}
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-white uppercase text-sm flex items-center space-x-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <span>2. Apply Promotional Coupon</span>
              </h3>

              <form onSubmit={handleApplyCoupon} className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="Enter coupon code (e.g. WELCOME100, YOUTH20)"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  className="flex-1 bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-2.5 text-xs uppercase tracking-wider focus:outline-none focus:border-amber-500"
                />
                <button type="submit" className="bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold px-6 py-2.5 rounded-xl text-xs">
                  Apply
                </button>
              </form>

              {couponError && <p className="text-xs text-red-400">{couponError}</p>}
              {appliedCoupon && (
                <p className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Coupon {appliedCoupon.code} applied successfully!</span>
                </p>
              )}
            </div>

            {/* Payment Method Selection */}
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-white uppercase text-sm flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>3. Select Payment Option</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option A: Online UPI */}
                <div
                  onClick={() => setPaymentMethod('ONLINE_UPI')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-1 ${
                    paymentMethod === 'ONLINE_UPI' 
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg' 
                      : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-amber-400" />
                      <span>Online UPI / Scan QR</span>
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-extrabold uppercase">
                      FREE / INSTANT
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Pay via GPay, PhonePe, Paytm, or BHIM scanning QR code. No extra fee.
                  </p>
                </div>

                {/* Option B: Cash on Delivery */}
                <div
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all space-y-1 ${
                    paymentMethod === 'COD' 
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg' 
                      : 'bg-neutral-950 border-neutral-800 text-slate-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center space-x-2">
                      <Banknote className="w-4 h-4 text-amber-400" />
                      <span>Cash on Delivery (COD)</span>
                    </span>
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded font-extrabold uppercase border border-amber-500/30">
                      + ₹100 EXTRA FEE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Pay cash directly to courier representative upon delivery at doorstep.
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery Notes */}
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Special Delivery Instructions (Optional)</label>
              <textarea 
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Call before delivery, leave with security guard..."
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

          </div>

          {/* Right Column: Order Summary & WhatsApp Button */}
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl h-fit space-y-6">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm border-b border-neutral-800 pb-3">Items Breakdown</h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map(item => (
                <div key={item.id} className="flex items-center space-x-3 text-xs">
                  <img src={item.image_url} alt="" className="w-12 h-14 object-cover rounded-lg border border-neutral-800 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white line-clamp-1">{item.name}</p>
                    <p className="text-slate-400 text-[10px]">Size: {item.size} | Color: {item.color} | Qty: {item.quantity}</p>
                  </div>
                  <span className="font-bold text-white">₹{item.total_price.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-800 pt-4 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="text-white font-semibold">₹{summary.subtotal.toLocaleString()}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Coupon Discount</span>
                  <span>-₹{couponDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="text-white font-semibold">{summary.delivery_fee === 0 ? 'FREE' : `₹${summary.delivery_fee}`}</span>
              </div>
              {codFee > 0 && (
                <div className="flex justify-between text-amber-400 font-bold bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  <span>Cash on Delivery (COD) Extra Fee</span>
                  <span>+₹{codFee.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="border-t border-neutral-800 pt-4 flex justify-between items-baseline">
              <span className="text-sm font-bold text-white uppercase">Grand Total</span>
              <span className="text-2xl font-extrabold text-amber-400">₹{finalGrand.toLocaleString()}</span>
            </div>

            {/* WhatsApp Place Order CTA */}
            <button
              onClick={handleCreateWhatsAppOrder}
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider py-4 rounded-xl shadow-xl shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]"
            >
              <MessageSquare className="w-4 h-4 fill-black" />
              <span>{isSubmitting ? 'GENERATING ORDER...' : 'ORDER VIA WHATSAPP'}</span>
            </button>

            <div className="text-[11px] text-slate-400 space-y-1 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
              <p className="text-amber-400 font-bold flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Zero Online Payment Risk</span>
              </p>
              <p>Clicking "ORDER VIA WHATSAPP" generates your order ID and opens official WhatsApp chat with the store owner for payment & dispatch confirmation.</p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
