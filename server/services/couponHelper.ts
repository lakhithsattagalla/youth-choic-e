export type CouponStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
export type OfferStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'INACTIVE';

export interface OfferItemData {
  id?: string;
  offer_id?: string;
  product_id: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: number;
}

export interface OfferData {
  id: string;
  name?: string;
  title?: string;
  subtitle?: string;
  banner_url?: string;
  discount_tag?: string;
  link_url?: string;
  allow_coupon_with_offer?: boolean;
  start_at?: string;
  end_at?: string;
  is_active?: boolean;
  items?: OfferItemData[];
  views_count?: number;
  orders_count?: number;
  total_revenue?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CouponData {
  id: string;
  code: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  start_at: string;
  end_at: string;
  total_usage_limit?: number;
  per_customer_limit?: number;
  first_order_only?: boolean;
  applicable_products?: string[];
  applicable_categories?: string[];
  applicable_brands?: string[];
  is_active?: boolean;
  usage_count: number;
  created_at: string;
}

/**
 * Calculates dynamic time-based coupon status based on current server time (Asia/Kolkata)
 */
export function calculateCouponStatus(coupon: { start_at?: string; end_at?: string; is_active?: boolean }, now: Date = new Date()): CouponStatus {
  if (coupon.is_active === false) return 'INACTIVE';
  const nowMs = now.getTime();

  if (coupon.start_at) {
    const startMs = new Date(coupon.start_at).getTime();
    if (nowMs < startMs) return 'SCHEDULED';
  }

  if (coupon.end_at) {
    const endMs = new Date(coupon.end_at).getTime();
    if (nowMs > endMs) return 'EXPIRED';
  }

  return 'ACTIVE';
}

/**
 * Calculates dynamic time-based offer status based on current server time (Asia/Kolkata)
 */
export function calculateOfferStatus(offer: { start_at?: string; end_at?: string; is_active?: boolean }, now: Date = new Date()): OfferStatus {
  if (offer.is_active === false) return 'INACTIVE';
  const nowMs = now.getTime();

  if (offer.start_at) {
    const startMs = new Date(offer.start_at).getTime();
    if (nowMs < startMs) return 'SCHEDULED';
  }

  if (offer.end_at) {
    const endMs = new Date(offer.end_at).getTime();
    if (nowMs > endMs) return 'EXPIRED';
  }

  return 'ACTIVE';
}

/**
 * Calculates effective product offer price for a product at a given server time
 */
export function getProductEffectivePrice(product: { id: string; price?: number; selling_price?: number; mrp?: number }, offers: OfferData[], now: Date = new Date()) {
  const mrp = Number(product.price ?? product.selling_price ?? product.mrp ?? 0);
  let bestOfferPrice = mrp;
  let activeOffer: OfferData | null = null;
  let activeItem: OfferItemData | null = null;
  let discountAmount = 0;

  for (const offer of offers) {
    const status = calculateOfferStatus(offer, now);
    if (status !== 'ACTIVE') continue;

    const matchedItem = (offer.items || []).find(item => item.product_id === product.id);
    if (!matchedItem) continue;

    let itemDiscount = 0;
    if (matchedItem.discount_type === 'PERCENT') {
      itemDiscount = Math.round((mrp * Number(matchedItem.discount_value)) / 100);
    } else {
      itemDiscount = Number(matchedItem.discount_value || 0);
    }

    // Clamp discount
    itemDiscount = Math.max(0, Math.min(mrp, itemDiscount));
    const calculatedPrice = Math.max(0, mrp - itemDiscount);

    if (calculatedPrice < bestOfferPrice) {
      bestOfferPrice = calculatedPrice;
      activeOffer = offer;
      activeItem = matchedItem;
      discountAmount = itemDiscount;
    }
  }

  const discountPercentage = mrp > 0 && discountAmount > 0 ? Math.round((discountAmount / mrp) * 100) : 0;

  return {
    mrp,
    offerPrice: bestOfferPrice,
    discountAmount,
    discountPercentage,
    hasOffer: !!activeOffer,
    offerName: activeOffer ? (activeOffer.name || activeOffer.title || 'Product Offer') : null,
    offerId: activeOffer?.id || null,
    allowCoupon: activeOffer ? (activeOffer.allow_coupon_with_offer ?? false) : true,
    endAt: activeOffer?.end_at || null
  };
}

/**
 * Formats date/time strings for display in Asia/Kolkata timezone
 */
export function formatKolkataDateTime(dateInput: string | Date | undefined): string {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'Invalid Date';

  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
