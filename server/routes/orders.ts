import { Router, Response } from 'express';
import { db } from '../db.js';
import { calculateCouponStatus, getProductEffectivePrice } from '../services/couponHelper.js';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { formatAIPaymentBotMessage } from './whatsappBot.js';

const router = Router();
const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE_NUMBER || '918522000504';
const STORE_NAME = process.env.STORE_NAME || 'Youth Choice The Fashion Store';

// Create New Order & Generate WhatsApp Message
router.post('/checkout', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { address_id, coupon_code, notes, payment_method } = req.body;
    const paymentMethod: 'ONLINE_UPI' | 'COD' = payment_method === 'COD' ? 'COD' : 'ONLINE_UPI';

    // Get Cart Items
    const cartItems = db.data.cart_items.filter(c => c.user_id === userId);
    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty' });
    }

    // Get Address
    const address = db.data.addresses.find(a => a.id === address_id || (a.user_id === userId && a.is_default));
    if (!address) {
      return res.status(400).json({ error: 'Please provide a valid delivery address' });
    }

    const orderNumber = `YC-${Math.floor(10000 + Math.random() * 90000)}`;
    const orderId = `ord-${Date.now()}`;
    const now = new Date().toISOString();

    let subtotal = 0;
    const orderItems: any[] = [];
    const stockUpdates: { variant_id: string; newStock: number }[] = [];

    for (const item of cartItems) {
      const variant = db.data.product_variants.find(v => v.id === item.variant_id);
      if (!variant) continue;

      if (variant.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for SKU ${variant.sku}. Only ${variant.stock} available.`
        });
      }

      const product = db.data.products.find(p => p.id === variant.product_id);
      if (!product) continue;

      const brand = db.data.brands.find(b => b.id === product.brand_id);
      const images = db.data.product_images.filter(img => img.product_id === product.id);
      const imgUrl = images.find(img => img.color?.toLowerCase() === variant.color.toLowerCase())?.image_url || images[0]?.image_url || '';

      const offers = db.data?.offers || [];
      const now = new Date();
      const pricing = getProductEffectivePrice(product, offers, now);

      const unitPrice = pricing.offerPrice;
      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        id: `item-${orderId}-${orderItems.length}`,
        order_id: orderId,
        product_id: product.id,
        variant_id: variant.id,
        product_name: product.name,
        brand_name: brand?.name || 'Brand',
        color: variant.color,
        size: variant.size,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: itemTotal,
        image_url: imgUrl,
        original_price: pricing.mrp,
        has_offer: pricing.hasOffer,
        offer_id: pricing.offerId,
        allow_coupon: pricing.allowCoupon
      } as any);

      stockUpdates.push({
        variant_id: variant.id,
        newStock: variant.stock - item.quantity
      });
    }

    // Coupon Calculation & Validation
    let discount = 0;
    if (coupon_code) {
      const coupon = (db.data?.coupons || []).find(c => c.code.toUpperCase() === String(coupon_code).toUpperCase());
      if (!coupon) {
        return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
      }

      const now = new Date();
      const status = calculateCouponStatus(coupon, now);

      if (status === 'SCHEDULED') {
        return res.status(400).json({ success: false, message: 'This coupon is not active yet.' });
      }

      if (status === 'EXPIRED') {
        return res.status(400).json({ success: false, message: 'This coupon expired before your order was completed.' });
      }

      // Check Offer + Coupon Stacking Rule
      const hasRestrictedOfferItem = orderItems.some((itm: any) => itm.has_offer && itm.allow_coupon === false);
      if (hasRestrictedOfferItem) {
        return res.status(400).json({ success: false, message: 'Coupon cannot be combined with this offer.' });
      }

      // Check Total Usage Limit
      if (coupon.total_usage_limit && (coupon.usage_count || 0) >= coupon.total_usage_limit) {
        return res.status(400).json({ success: false, message: 'This coupon has reached its maximum total usage limit.' });
      }

      // Check Customer Orders for Per-Customer Limit & First-Order-Only
      const userId = req.user?.id;
      const userOrders = userId ? (db.data?.orders || []).filter(o => o.user_id === userId) : [];

      if (coupon.first_order_only && userOrders.length > 0) {
        return res.status(400).json({ success: false, message: 'This coupon is valid for first-time orders only.' });
      }

      if (coupon.per_customer_limit && userId) {
        const userCouponUsage = userOrders.filter(o => (o as any).coupon_code?.toUpperCase() === coupon.code.toUpperCase()).length;
        if (userCouponUsage >= coupon.per_customer_limit) {
          return res.status(400).json({ success: false, message: 'You have reached the maximum usage limit for this coupon.' });
        }
      }

      // Minimum Order Amount Check
      if (subtotal < coupon.min_order_amount) {
        return res.status(400).json({ success: false, message: `Minimum order amount for coupon ${coupon.code} is ₹${coupon.min_order_amount}` });
      }

      // Calculate Discount with Optional Max Capping
      if (coupon.discount_type === 'FIXED') {
        discount = coupon.discount_value;
      } else {
        discount = Math.round((subtotal * coupon.discount_value) / 100);
        if (coupon.max_discount_amount && coupon.max_discount_amount > 0) {
          discount = Math.min(discount, coupon.max_discount_amount);
        }
      }
      coupon.usage_count = (coupon.usage_count || 0) + 1;
    }

    const deliveryFee = subtotal >= 999 ? 0 : 99;
    const codFee = paymentMethod === 'COD' ? 100 : 0;
    const grandTotal = Math.max(0, subtotal - discount + deliveryFee + codFee);
    const fullAddress = `${address.recipient_name}, ${address.street}, ${address.city}, ${address.state} - ${address.pincode} (Ph: ${address.phone})`;

    // Dynamic UPI Payment Link & QR Code Generator
    const upiId = '8522000504@ybl';
    const payeeName = 'YouthChoiceMensWear';
    const cleanOrderNo = orderNumber.replace(/[^a-zA-Z0-9]/g, '');
    const upiUri = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${grandTotal}&cu=INR&tn=Order_${cleanOrderNo}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(upiUri)}`;

    // Generate Structured WhatsApp Order & Payment Bot Message
    let message = `Hello ${STORE_NAME}!\n`;
    message += `I would like to place an order.\n\n`;
    message += `📋 *Order ID:* ${orderNumber}\n`;
    message += `👤 *Customer Name:* ${address.recipient_name}\n`;
    message += `📞 *Phone:* ${address.phone}\n`;
    message += `💳 *Payment Method:* ${paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'Online UPI / Scan QR'}\n`;
    message += `📍 *Delivery Address:* ${address.street}, ${address.city}, ${address.state} - ${address.pincode}\n\n`;
    message += `🛍️ *Order Items:*\n`;

    orderItems.forEach((itm, idx) => {
      message += `${idx + 1}. *${itm.product_name}* (${itm.brand_name})\n`;
      message += `   Size: ${itm.size} | Color: ${itm.color} | Qty: ${itm.quantity}\n`;
      message += `   Price: ₹${itm.total_price.toLocaleString()}\n`;
    });

    message += `\n💵 *Order Bill Summary:*\n`;
    message += `Subtotal: ₹${subtotal.toLocaleString()}\n`;
    if (discount > 0) message += `Coupon Discount: -₹${discount.toLocaleString()}\n`;
    message += `Delivery Fee: ${deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}\n`;
    if (codFee > 0) message += `Cash on Delivery Extra Charge: ₹${codFee}\n`;
    message += `*Grand Total: ₹${grandTotal.toLocaleString()}*\n\n`;

    if (paymentMethod === 'COD') {
      message += `📦 *COD Instruction:* Customer selected Cash on Delivery. Please collect ₹${grandTotal.toLocaleString()} on delivery. Thank you!`;
    } else {
      message += `💳 *UPI Payment Details:*\n`;
      message += `UPI ID: ${upiId}\n`;
      message += `Direct Pay Link: ${upiUri}\n\n`;
      message += `🤖 *AI BOT REQUEST:* Please reply with the Payment QR Code for ₹${grandTotal.toLocaleString()} for Order #${orderNumber}. Thank you!`;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodedMessage}`;

    // Save Order to DB
    const newOrder = {
      id: orderId,
      order_number: orderNumber,
      user_id: userId,
      customer_name: address.recipient_name,
      customer_phone: address.phone,
      delivery_address: fullAddress,
      subtotal,
      discount,
      delivery_fee: deliveryFee,
      cod_fee: codFee,
      payment_method: paymentMethod,
      coupon_code: coupon_code || '',
      grand_total: grandTotal,
      status: 'PENDING_CONFIRMATION' as const,
      whatsapp_message: message,
      notes: notes || '',
      created_at: now,
      updated_at: now
    };

    db.data.orders.unshift(newOrder);
    db.data.order_items.push(...orderItems);

    // Apply Stock Reduction
    for (const su of stockUpdates) {
      const vIndex = db.data.product_variants.findIndex(v => v.id === su.variant_id);
      if (vIndex > -1) {
        db.data.product_variants[vIndex].stock = su.newStock;
      }
    }

    // Clear User Cart
    db.data.cart_items = db.data.cart_items.filter(c => c.user_id !== userId);

    // Track Analytics Event
    db.data.analytics_events.push({
      id: `evt-${Date.now()}`,
      event_type: 'WHATSAPP_ORDER',
      user_id: userId,
      metadata: JSON.stringify({ order_number: orderNumber, grand_total: grandTotal }),
      created_at: now
    });

    db.save();

    res.status(201).json({
      message: 'Order created successfully',
      order: newOrder,
      whatsapp_url: whatsappUrl,
      whatsapp_message: message,
      upi_id: upiId,
      upi_uri: upiUri,
      qr_code_url: qrCodeUrl
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get User Orders
router.get('/my-orders', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const orders = (db.data?.orders || []).filter(o => o.user_id === userId);

    const fullOrders = orders.map(o => {
      const items = (db.data?.order_items || []).filter(i => i.order_id === o.id);
      return { ...o, items };
    });

    res.json({ success: true, orders: fullOrders });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch user orders' });
  }
});

// Get Single Order Details
router.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const order = (db.data?.orders || []).find(o => (o.id === id || o.order_number === id) && (req.user?.role === 'ADMIN' || o.user_id === userId));
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const items = (db.data?.order_items || []).filter(i => i.order_id === order.id);
    res.json({ success: true, order: { ...order, items } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch order details' });
  }
});

// Admin: Get All Orders
router.get('/', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { status, search } = req.query as Record<string, string>;
    let orders = db.data?.orders || [];

    if (status && status !== 'ALL') {
      orders = orders.filter(o => o.status === status);
    }

    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(o =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q)
      );
    }

    const fullOrders = orders.map(o => {
      const items = (db.data?.order_items || []).filter(i => i.order_id === o.id);
      return { ...o, items };
    });

    res.json({ success: true, orders: fullOrders });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch orders' });
  }
});

// Admin: Update Order Status
router.put('/:id/status', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const orderIndex = (db.data?.orders || []).findIndex(o => o.id === id || o.order_number === id);
    if (orderIndex === -1) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const prevStatus = db.data.orders[orderIndex].status;
    const updatedOrder = {
      ...db.data.orders[orderIndex],
      status: status || prevStatus,
      notes: notes !== undefined ? notes : db.data.orders[orderIndex].notes,
      updated_at: new Date().toISOString()
    };

    db.data.orders[orderIndex] = updatedOrder;

    // If order was cancelled, restore variant stock
    if (status === 'CANCELLED' && prevStatus !== 'CANCELLED') {
      const items = (db.data?.order_items || []).filter(i => i.order_id === updatedOrder.id);
      for (const item of items) {
        const vIndex = (db.data?.product_variants || []).findIndex(v => v.id === item.variant_id);
        if (vIndex > -1) {
          db.data.product_variants[vIndex].stock += item.quantity;
        }
      }
    }

    // Generate Payment QR Bot Payload if confirmed or requested
    const botPayload = formatAIPaymentBotMessage(
      updatedOrder.order_number,
      updatedOrder.customer_name,
      updatedOrder.grand_total
    );

    const cleanPhone = updatedOrder.customer_phone.replace(/[^0-9]/g, '');
    const botWhatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(botPayload.message)}`;

    // Push notification to customer with QR Code link
    if (!db.data.notifications) db.data.notifications = [];
    db.data.notifications.push({
      id: `notif-${Date.now()}`,
      user_id: updatedOrder.user_id,
      title: status === 'ORDER_CONFIRMED' ? `Order Confirmed: ${updatedOrder.order_number}` : `Order Update: ${updatedOrder.order_number}`,
      message: status === 'ORDER_CONFIRMED' 
        ? `Your order #${updatedOrder.order_number} is confirmed! Payment QR Code: ${botPayload.qr_code_url}`
        : `Your order status has been updated to: ${status.replace('_', ' ')}`,
      type: 'ORDER',
      is_read: false,
      created_at: new Date().toISOString()
    });

    db.save();
    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: updatedOrder,
      whatsapp_bot_url: botWhatsappUrl,
      qr_code_url: botPayload.qr_code_url,
      upi_uri: botPayload.upi_uri,
      whatsapp_message: botPayload.message
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update order status' });
  }
});

export default router;
