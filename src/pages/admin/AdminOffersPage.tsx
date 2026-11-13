import React, { useState, useEffect } from 'react';
import { Plus, Tag, Edit2, Trash2, Eye, Copy, Calendar, Clock, AlertCircle, Search, Check, Percent, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { formatKolkataDateTime, combineDateAndTimeToIso, getRelativeTimeLabel, ProductOffer, OfferProductItem } from '../../utils/couponUtils';

export const AdminOffersPage: React.FC = () => {
  const [offers, setOffers] = useState<ProductOffer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [selectedOfferDetails, setSelectedOfferDetails] = useState<ProductOffer | null>(null);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [discountTag, setDiscountTag] = useState('');
  const [allowCoupon, setAllowCoupon] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Selected Products & Custom Discount Matrix State
  const [productSearch, setProductSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<OfferProductItem[]>([]);

  const fetchOffers = async () => {
    try {
      const res = await apiRequest('/admin/offers');
      setOffers(res.offers || []);
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiRequest('/products');
      setProducts(res.products || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetchProducts();
  }, []);

  const openCreateModal = () => {
    setEditingOfferId(null);
    setName('');
    setTitle('');
    setSubtitle('');
    setBannerUrl('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&auto=format&fit=crop&q=80');
    setDiscountTag('SPECIAL OFFER');
    setAllowCoupon(false);
    setIsActive(true);

    const now = new Date();
    const nowFormatted = formatKolkataDateTime(now);
    const in7DaysFormatted = formatKolkataDateTime(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

    setStartDate(nowFormatted.dateStr || new Date().toISOString().split('T')[0]);
    setStartTime(nowFormatted.timeStr || '10:00');
    setEndDate(in7DaysFormatted.dateStr || new Date().toISOString().split('T')[0]);
    setEndTime('23:59');

    // Preselect first 2 products with 20% discount as default template
    const initialItems = products.slice(0, 2).map(p => ({
      product_id: p.id,
      discount_type: 'PERCENT' as const,
      discount_value: 20
    }));
    setSelectedItems(initialItems);

    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (off: ProductOffer) => {
    setEditingOfferId(off.id);
    setName(off.name || off.title || '');
    setTitle(off.title || off.name || '');
    setSubtitle(off.subtitle || '');
    setBannerUrl(off.banner_url || '');
    setDiscountTag(off.discount_tag || '');
    setAllowCoupon(!!off.allow_coupon_with_offer);
    setIsActive(off.is_active !== false);

    const startInfo = formatKolkataDateTime(off.start_at);
    const endInfo = formatKolkataDateTime(off.end_at);

    setStartDate(startInfo.dateStr);
    setStartTime(startInfo.timeStr || '10:00');
    setEndDate(endInfo.dateStr);
    setEndTime(endInfo.timeStr || '23:59');

    setSelectedItems(off.items || []);
    setFormError('');
    setShowModal(true);
  };

  const openDetailsModal = (off: ProductOffer) => {
    setSelectedOfferDetails(off);
    setShowDetailsModal(true);
  };

  const handleToggleProduct = (prodId: string) => {
    const existing = selectedItems.find(item => item.product_id === prodId);
    if (existing) {
      setSelectedItems(selectedItems.filter(item => item.product_id !== prodId));
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          product_id: prodId,
          discount_type: 'PERCENT',
          discount_value: 20
        }
      ]);
    }
  };

  const handleUpdateItemDiscount = (prodId: string, field: 'discount_type' | 'discount_value', val: any) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.product_id === prodId) {
        return {
          ...item,
          [field]: field === 'discount_value' ? Math.max(0, Number(val)) : val
        };
      }
      return item;
    }));
  };

  const handleToggleActiveStatus = async (id: string, currentStatus: boolean) => {
    try {
      await apiRequest(`/admin/offers/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !currentStatus })
      });
      await fetchOffers();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle offer status');
    }
  };

  const handleDuplicateOffer = async (id: string) => {
    try {
      await apiRequest(`/admin/offers/${id}/duplicate`, { method: 'POST' });
      await fetchOffers();
    } catch (err: any) {
      alert(err.message || 'Failed to duplicate offer');
    }
  };

  const handleDeleteOffer = async (id: string, offerName: string) => {
    if (!window.confirm(`Are you sure you want to delete offer "${offerName}"?`)) return;
    try {
      await apiRequest(`/admin/offers/${id}`, { method: 'DELETE' });
      await fetchOffers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete offer');
    }
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Offer campaign name is required.');
      return;
    }

    if (selectedItems.length === 0) {
      setFormError('Please select at least one product for this offer.');
      return;
    }

    if (!startDate || !startTime || !endDate || !endTime) {
      setFormError('Start Date, Start Time, End Date, and End Time are required.');
      return;
    }

    const startIso = combineDateAndTimeToIso(startDate, startTime);
    const endIso = combineDateAndTimeToIso(endDate, endTime);

    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();

    if (isNaN(startMs) || isNaN(endMs)) {
      setFormError('Please enter valid start and end dates and times.');
      return;
    }

    if (endMs <= startMs) {
      setFormError('End date and time must be after the start date and time.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: name.trim(),
        title: title.trim() || name.trim(),
        subtitle: subtitle.trim(),
        banner_url: bannerUrl.trim(),
        discount_tag: discountTag.trim(),
        allow_coupon_with_offer: allowCoupon,
        is_active: isActive,
        start_at: startIso,
        end_at: endIso,
        items: selectedItems
      };

      if (editingOfferId) {
        await apiRequest(`/admin/offers/${editingOfferId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest('/admin/offers', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setShowModal(false);
      await fetchOffers();
    } catch (err: any) {
      console.error('Save Offer Error:', err);
      setFormError(err.message || 'Failed to save offer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.brand_name && p.brand_name.toLowerCase().includes(productSearch.toLowerCase())) ||
    (p.category_name && p.category_name.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const getBadgeStyle = (status?: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      case 'EXPIRED':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
      case 'INACTIVE':
      default:
        return 'bg-neutral-800 text-slate-400 border border-neutral-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">PROMOTIONS & DISCOUNTS</span>
          <h1 className="text-2xl font-display font-bold text-white uppercase">Product Offers Management</h1>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-5 py-3 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/10 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Offer</span>
        </button>
      </div>

      {/* Offers Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-neutral-950 text-slate-400 font-bold uppercase tracking-wider border-b border-neutral-800">
              <tr>
                <th className="py-4 px-5">Offer Name</th>
                <th className="py-4 px-5">Products Included</th>
                <th className="py-4 px-5">Coupon Stacking</th>
                <th className="py-4 px-5">Start Date & Time</th>
                <th className="py-4 px-5">End Date & Time</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {offers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    No product offers created yet. Click "+ Create Offer" above.
                  </td>
                </tr>
              ) : (
                offers.map((off) => {
                  const startFormatted = formatKolkataDateTime(off.start_at);
                  const endFormatted = formatKolkataDateTime(off.end_at);
                  const relativeLabel = getRelativeTimeLabel(off);
                  const itemCounts = (off.items || []).length;

                  return (
                    <tr key={off.id} className="hover:bg-neutral-800/40 transition-colors">
                      {/* Name */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-white text-sm">{off.name || off.title}</div>
                        <div className="text-[10px] text-slate-400">{off.subtitle || 'Direct Sale Discount'}</div>
                      </td>

                      {/* Products */}
                      <td className="py-4 px-5">
                        <div className="inline-flex items-center space-x-1.5 bg-neutral-950 px-3 py-1 rounded-lg border border-neutral-800 text-amber-400 font-bold">
                          <Percent className="w-3.5 h-3.5" />
                          <span>{itemCounts} Product{itemCounts !== 1 ? 's' : ''}</span>
                        </div>
                      </td>

                      {/* Coupon Stacking */}
                      <td className="py-4 px-5">
                        {off.allow_coupon_with_offer ? (
                          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border border-emerald-500/20">
                            YES (STACKABLE)
                          </span>
                        ) : (
                          <span className="bg-neutral-800 text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border border-neutral-700">
                            NO (OFFER ONLY)
                          </span>
                        )}
                      </td>

                      {/* Start Date */}
                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-1.5 text-slate-200">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{startFormatted.fullStr}</span>
                        </div>
                      </td>

                      {/* End Date */}
                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-1.5 text-slate-200">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{endFormatted.fullStr}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${getBadgeStyle(off.status)}`}>
                            {off.status || 'ACTIVE'}
                          </span>
                          <div className="text-[10px] text-slate-400 font-normal">{relativeLabel}</div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right space-x-1.5">
                        <button
                          onClick={() => openDetailsModal(off)}
                          className="p-2 bg-neutral-800 hover:bg-neutral-700 text-slate-300 rounded-lg transition-colors inline-flex items-center"
                          title="View Offer Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => openEditModal(off)}
                          className="p-2 bg-neutral-800 hover:bg-neutral-700 text-amber-400 rounded-lg transition-colors inline-flex items-center"
                          title="Edit Offer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDuplicateOffer(off.id)}
                          className="p-2 bg-neutral-800 hover:bg-neutral-700 text-indigo-400 rounded-lg transition-colors inline-flex items-center"
                          title="Duplicate Offer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleActiveStatus(off.id, off.is_active !== false)}
                          className="p-2 bg-neutral-800 hover:bg-neutral-700 text-slate-400 rounded-lg transition-colors inline-flex items-center"
                          title={off.is_active !== false ? "Deactivate Offer" : "Activate Offer"}
                        >
                          {off.is_active !== false ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                        </button>

                        <button
                          onClick={() => handleDeleteOffer(off.id, off.name)}
                          className="p-2 bg-neutral-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-lg transition-colors inline-flex items-center"
                          title="Delete Offer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT OFFER MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="border-b border-neutral-800 pb-3 flex justify-between items-center">
              <h3 className="font-display font-bold text-white text-lg uppercase">
                {editingOfferId ? 'Edit Product Offer' : 'Create Product Offer'}
              </h3>
              <span className="text-[10px] bg-amber-500/10 text-amber-300 px-3 py-1 rounded-full uppercase font-bold tracking-wider">
                Store Timezone: Asia/Kolkata (IST)
              </span>
            </div>

            {formError && (
              <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 p-3.5 rounded-xl text-xs flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveOffer} className="space-y-6 text-xs">
              {/* Offer Name */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                  Offer Campaign Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Diwali Sale / Weekend Fashion Sale"
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3.5 font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Offer Subtitle & Coupon Stacking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                    Banner Subtitle / Tagline
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Special discounts on festive shirts & denim"
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                    Allow Coupon With Offer?
                  </label>
                  <select
                    value={allowCoupon ? 'YES' : 'NO'}
                    onChange={(e) => setAllowCoupon(e.target.value === 'YES')}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3.5 font-bold focus:border-amber-500 focus:outline-none"
                  >
                    <option value="NO">NO (Default: Offer Only, No Coupon Stacking)</option>
                    <option value="YES">YES (Allow Coupon + Offer Stacking)</option>
                  </select>
                </div>
              </div>

              {/* SCHEDULING SECTION (Start Date, Start Time, End Date, End Time) */}
              <div className="space-y-3 pt-2 border-t border-neutral-800/80">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block">
                  OFFER VALIDITY PERIOD (ASIA/KOLKATA IST)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
                  {/* Start Date */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 text-[11px]">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl p-3 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 text-[11px]">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl p-3 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 text-[11px]">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl p-3 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 text-[11px]">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl p-3 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* PRODUCTS PICKER & CUSTOM DISCOUNT PER PRODUCT MATRIX */}
              <div className="space-y-4 pt-2 border-t border-neutral-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block">
                    SELECT PRODUCTS & CUSTOM DISCOUNT PER PRODUCT
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {selectedItems.length} Product{selectedItems.length !== 1 ? 's' : ''} Selected
                  </span>
                </div>

                {/* Product Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products to add to this offer..."
                    className="w-full bg-neutral-950 border border-neutral-800 text-white pl-10 pr-4 py-3 rounded-xl focus:border-amber-500 focus:outline-none text-xs"
                  />
                </div>

                {/* Products Selection List & Custom Discount Inputs */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 max-h-72 overflow-y-auto space-y-3">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-6 text-slate-500">No matching products found.</div>
                  ) : (
                    filteredProducts.map((p) => {
                      const selectedItem = selectedItems.find((itm) => itm.product_id === p.id);
                      const isSelected = !!selectedItem;
                      const mrp = Number(p.price || p.selling_price || 0);

                      let calcPrice = mrp;
                      if (isSelected && selectedItem) {
                        let discount = 0;
                        if (selectedItem.discount_type === 'PERCENT') {
                          discount = Math.round((mrp * Number(selectedItem.discount_value)) / 100);
                        } else {
                          discount = Number(selectedItem.discount_value);
                        }
                        calcPrice = Math.max(0, mrp - discount);
                      }

                      return (
                        <div
                          key={p.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isSelected ? 'bg-neutral-900 border-amber-500/40' : 'bg-neutral-900/40 border-neutral-800/80 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => handleToggleProduct(p.id)}
                                className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                                  isSelected ? 'bg-amber-500 border-amber-500 text-black' : 'border-neutral-700 text-transparent'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 font-extrabold" />
                              </button>
                              <div className="truncate">
                                <span className="font-bold text-white text-xs block truncate">{p.name}</span>
                                <span className="text-[10px] text-slate-400">MRP: ₹{mrp.toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Custom Discount Config for Selected Product */}
                            {isSelected && selectedItem && (
                              <div className="flex items-center space-x-2 shrink-0">
                                <select
                                  value={selectedItem.discount_type}
                                  onChange={(e) => handleUpdateItemDiscount(p.id, 'discount_type', e.target.value)}
                                  className="bg-neutral-950 border border-neutral-800 text-white text-[11px] rounded-lg p-2 font-semibold"
                                >
                                  <option value="PERCENT">Percent (%)</option>
                                  <option value="FIXED">Fixed (₹)</option>
                                </select>

                                <input
                                  type="number"
                                  min="0"
                                  value={selectedItem.discount_value}
                                  onChange={(e) => handleUpdateItemDiscount(p.id, 'discount_value', e.target.value)}
                                  className="w-20 bg-neutral-950 border border-neutral-800 text-white text-[11px] font-bold rounded-lg p-2 text-center"
                                />

                                <div className="text-right pl-2 border-l border-neutral-800">
                                  <span className="text-[10px] text-slate-400 block">Offer Price:</span>
                                  <span className="font-bold text-amber-400 text-xs">₹{calcPrice.toLocaleString()}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Form Error Notice at Footer */}
              {formError && (
                <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 p-3.5 rounded-xl text-xs flex items-center space-x-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="px-5 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-slate-300 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-7 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold rounded-xl shadow-lg shadow-amber-500/20 transition-all uppercase tracking-wider flex items-center justify-center space-x-2 min-w-[180px]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>SAVING OFFER...</span>
                    </>
                  ) : (
                    <span>SAVE PRODUCT OFFER</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFER DETAILS MODAL */}
      {showDetailsModal && selectedOfferDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="border-b border-neutral-800 pb-3 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">OFFER DETAILS</span>
                <h3 className="font-display font-bold text-white text-lg uppercase">{selectedOfferDetails.name || selectedOfferDetails.title}</h3>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-white text-xs font-bold bg-neutral-800 px-3 py-1.5 rounded-lg">
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-neutral-950 p-4 rounded-2xl border border-neutral-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Start Date & Time</span>
                <span className="font-bold text-white">{formatKolkataDateTime(selectedOfferDetails.start_at).fullStr}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">End Date & Time</span>
                <span className="font-bold text-white">{formatKolkataDateTime(selectedOfferDetails.end_at).fullStr}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Coupon Stacking</span>
                <span className="font-bold text-amber-400">{selectedOfferDetails.allow_coupon_with_offer ? 'Allowed' : 'Not Allowed'}</span>
              </div>
            </div>

            {/* Selected Products List */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Products Included in Offer</h4>
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 max-h-60 overflow-y-auto divide-y divide-neutral-800/60">
                {(selectedOfferDetails.items || []).map((item) => {
                  const p = products.find((prod) => prod.id === item.product_id);
                  const mrp = Number(p?.price || p?.selling_price || 0);
                  let discount = 0;
                  if (item.discount_type === 'PERCENT') {
                    discount = Math.round((mrp * Number(item.discount_value)) / 100);
                  } else {
                    discount = Number(item.discount_value);
                  }
                  const offerPrice = Math.max(0, mrp - discount);

                  return (
                    <div key={item.product_id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white block">{p?.name || 'Product'}</span>
                        <span className="text-[10px] text-slate-400">MRP: ₹{mrp.toLocaleString()} | Discount: {item.discount_type === 'PERCENT' ? `${item.discount_value}% OFF` : `₹${item.discount_value} OFF`}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Offer Price</span>
                        <span className="font-extrabold text-amber-400">₹{offerPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
