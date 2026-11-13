import React, { useState, useEffect } from 'react';
import { Plus, Tag, Edit2, Trash2, Calendar, Clock, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { formatKolkataDateTime, combineDateAndTimeToIso, getRelativeTimeLabel, CouponItem } from '../../utils/couponUtils';

export const AdminCouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [discountValue, setDiscountValue] = useState<number>(100);
  const [minOrder, setMinOrder] = useState<number>(999);
  const [startDate, setStartDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const fetchCoupons = async () => {
    try {
      const res = await apiRequest('/admin/coupons');
      setCoupons(res.coupons || []);
    } catch (err: any) {
      console.error('Failed to fetch coupons:', err);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const openCreateModal = () => {
    setEditingCouponId(null);
    setCode('');
    setDiscountType('FIXED');
    setDiscountValue(100);
    setMinOrder(999);

    const now = new Date();
    const nowFormatted = formatKolkataDateTime(now);
    const in7DaysFormatted = formatKolkataDateTime(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

    setStartDate(nowFormatted.dateStr || new Date().toISOString().split('T')[0]);
    setStartTime(nowFormatted.timeStr || '10:00');
    setEndDate(in7DaysFormatted.dateStr || new Date().toISOString().split('T')[0]);
    setEndTime('23:59');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (cpn: CouponItem) => {
    setEditingCouponId(cpn.id);
    setCode(cpn.code);
    setDiscountType(cpn.discount_type);
    setDiscountValue(cpn.discount_value);
    setMinOrder(cpn.min_order_amount);

    const startInfo = formatKolkataDateTime(cpn.start_at);
    const endInfo = formatKolkataDateTime(cpn.end_at);

    setStartDate(startInfo.dateStr);
    setStartTime(startInfo.timeStr || '10:00');
    setEndDate(endInfo.dateStr);
    setEndTime(endInfo.timeStr || '23:59');
    setFormError('');
    setShowModal(true);
  };

  const handleDeleteCoupon = async (id: string, cpnCode: string) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${cpnCode}"?`)) return;
    try {
      await apiRequest(`/admin/coupons/${id}`, { method: 'DELETE' });
      await fetchCoupons();
    } catch (err: any) {
      alert(err.message || 'Failed to delete coupon');
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

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
      const payload = {
        code: code.toUpperCase().trim(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        min_order_amount: Number(minOrder),
        start_at: startIso,
        end_at: endIso
      };

      if (editingCouponId) {
        await apiRequest(`/admin/coupons/${editingCouponId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest('/admin/coupons', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setShowModal(false);
      await fetchCoupons();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save coupon');
    }
  };

  const getBadgeStyle = (status?: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
      case 'EXPIRED':
      default:
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">PROMOTIONAL DISCOUNTS</span>
          <h1 className="text-2xl font-display font-bold text-white uppercase">Coupons Management</h1>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-5 py-3 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/10 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon Code</span>
        </button>
      </div>

      {/* Coupons Table / Card View */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-neutral-950 text-slate-400 font-bold uppercase tracking-wider border-b border-neutral-800">
              <tr>
                <th className="py-4 px-5">Coupon Code</th>
                <th className="py-4 px-5">Discount</th>
                <th className="py-4 px-5">Start Date & Time</th>
                <th className="py-4 px-5">End Date & Time</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Usage</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-medium">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    No coupons created yet. Click "Create Coupon Code" above.
                  </td>
                </tr>
              ) : (
                coupons.map((cpn) => {
                  const startFormatted = formatKolkataDateTime(cpn.start_at);
                  const endFormatted = formatKolkataDateTime(cpn.end_at);
                  const relativeLabel = getRelativeTimeLabel(cpn);

                  return (
                    <tr key={cpn.id} className="hover:bg-neutral-800/40 transition-colors">
                      {/* Code */}
                      <td className="py-4 px-5 font-mono font-extrabold text-amber-400 text-sm">
                        <div className="flex items-center space-x-2">
                          <Tag className="w-4 h-4 text-amber-400/80" />
                          <span>{cpn.code}</span>
                        </div>
                      </td>

                      {/* Discount */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-white">
                          {cpn.discount_type === 'FIXED' ? `Flat ₹${cpn.discount_value} OFF` : `${cpn.discount_value}% OFF`}
                        </div>
                        <div className="text-[10px] text-slate-400">Min Order: ₹{cpn.min_order_amount}</div>
                      </td>

                      {/* Start Date & Time */}
                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-1.5 text-slate-200">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{startFormatted.fullStr}</span>
                        </div>
                      </td>

                      {/* End Date & Time */}
                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-1.5 text-slate-200">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{endFormatted.fullStr}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${getBadgeStyle(cpn.status)}`}>
                            {cpn.status || 'ACTIVE'}
                          </span>
                          <div className="text-[10px] text-slate-400 font-normal">{relativeLabel}</div>
                        </div>
                      </td>

                      {/* Usage */}
                      <td className="py-4 px-5 text-slate-300 font-mono">
                        {cpn.usage_count || 0} uses
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(cpn)}
                          className="p-2 bg-neutral-800 hover:bg-neutral-700 text-amber-400 hover:text-amber-300 rounded-lg transition-colors inline-flex items-center space-x-1"
                          title="Edit Coupon"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-semibold">Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteCoupon(cpn.id, cpn.code)}
                          className="p-2 bg-neutral-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-lg transition-colors inline-flex items-center"
                          title="Delete Coupon"
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

      {/* CREATE / EDIT COUPON MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="border-b border-neutral-800 pb-3 flex justify-between items-center">
              <h3 className="font-display font-bold text-white text-lg uppercase">
                {editingCouponId ? 'Edit Scheduled Coupon' : 'Create Coupon Code'}
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

            <form onSubmit={handleSaveCoupon} className="space-y-5 text-xs">
              {/* Coupon Code */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                  Coupon Code (Uppercase)
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  placeholder="e.g. FASHION20"
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3.5 font-mono font-bold tracking-wider focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                    Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3.5 focus:border-amber-500 focus:outline-none font-semibold"
                  >
                    <option value="FIXED">Fixed Amount (₹)</option>
                    <option value="PERCENT">Percentage (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3.5 font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Min Order Amount */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                  Min. Order Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minOrder}
                  onChange={(e) => setMinOrder(Number(e.target.value))}
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3.5 font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* SCHEDULING SECTION (Start Date, Start Time, End Date, End Time) */}
              <div className="space-y-3 pt-2 border-t border-neutral-800/80">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block">
                  COUPON SCHEDULE (ASIA/KOLKATA IST)
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

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-3 bg-neutral-800 hover:bg-neutral-700 text-slate-300 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl shadow-lg shadow-amber-500/20 transition-all uppercase tracking-wider"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
