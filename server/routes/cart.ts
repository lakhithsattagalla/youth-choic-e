import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get Cart Items
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const rawItems = (db.data?.cart_items || []).filter(c => c.user_id === userId);

    const items = rawItems.map(item => {
      const variant = (db.data?.product_variants || []).find(v => v.id === item.variant_id);
      if (!variant) return null;

      const product = (db.data?.products || []).find(p => p.id === variant.product_id);
      if (!product) return null;

      const brand = (db.data?.brands || []).find(b => b.id === product.brand_id);
      const images = (db.data?.product_images || []).filter(img => img.product_id === product.id);
      const colorImg = images.find(img => img.color?.toLowerCase() === variant.color.toLowerCase())?.image_url;
      const primaryImg = images.find(img => img.is_primary)?.image_url || images[0]?.image_url || '';

      return {
        id: item.id,
        variant_id: variant.id,
        product_id: product.id,
        name: product.name,
        brand_name: brand?.name || 'Brand',
        color: variant.color,
        size: variant.size,
        quantity: item.quantity,
        unit_price: product.selling_price,
        mrp: product.mrp,
        total_price: product.selling_price * item.quantity,
        stock: variant.stock,
        image_url: colorImg || primaryImg
      };
    }).filter(Boolean);

    const subtotal = items.reduce((sum, item) => sum + (item ? item.total_price : 0), 0);
    const totalMrp = items.reduce((sum, item) => sum + (item ? item.mrp * item.quantity : 0), 0);
    const discount = totalMrp - subtotal;
    const delivery_fee = subtotal >= 999 ? 0 : 99;

    res.json({
      success: true,
      items,
      summary: {
        subtotal,
        totalMrp,
        discount,
        delivery_fee,
        grand_total: subtotal + delivery_fee
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch cart items' });
  }
});

// Add Item to Cart
router.post('/add', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { variant_id, quantity = 1 } = req.body;

    if (!variant_id) {
      return res.status(400).json({ success: false, message: 'Variant ID is required' });
    }

    const variant = (db.data?.product_variants || []).find(v => v.id === variant_id);
    if (!variant) {
      return res.status(404).json({ success: false, message: 'Selected variant not found' });
    }

    if (variant.stock <= 0) {
      return res.status(400).json({ success: false, message: 'Variant is out of stock' });
    }

    if (!db.data.cart_items) db.data.cart_items = [];
    const existingIndex = db.data.cart_items.findIndex(c => c.user_id === userId && c.variant_id === variant_id);

    if (existingIndex > -1) {
      const newQty = db.data.cart_items[existingIndex].quantity + Number(quantity);
      if (newQty > variant.stock) {
        return res.status(400).json({ success: false, message: `Cannot add more than available stock (${variant.stock})` });
      }
      db.data.cart_items[existingIndex].quantity = newQty;
    } else {
      if (Number(quantity) > variant.stock) {
        return res.status(400).json({ success: false, message: `Cannot add more than available stock (${variant.stock})` });
      }
      db.data.cart_items.push({
        id: `cart-${Date.now()}`,
        user_id: userId,
        variant_id,
        quantity: Number(quantity),
        created_at: new Date().toISOString()
      });
    }

    // Analytics event
    if (!db.data.analytics_events) db.data.analytics_events = [];
    db.data.analytics_events.push({
      id: `evt-${Date.now()}`,
      event_type: 'ADD_TO_CART',
      user_id: userId,
      product_id: variant.product_id,
      created_at: new Date().toISOString()
    });

    db.save();
    res.json({ success: true, message: 'Product added to cart' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to add item to cart' });
  }
});

// Update Quantity
router.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { quantity } = req.body;

    const itemIndex = (db.data?.cart_items || []).findIndex(c => c.id === id && c.user_id === userId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    const variant = (db.data?.product_variants || []).find(v => v.id === db.data.cart_items[itemIndex].variant_id);
    if (Number(quantity) > (variant?.stock || 0)) {
      return res.status(400).json({ success: false, message: `Only ${variant?.stock} units available` });
    }

    if (Number(quantity) <= 0) {
      db.data.cart_items.splice(itemIndex, 1);
    } else {
      db.data.cart_items[itemIndex].quantity = Number(quantity);
    }

    db.save();
    res.json({ success: true, message: 'Cart updated' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update cart' });
  }
});

// Remove Item from Cart
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;

    db.data.cart_items = (db.data?.cart_items || []).filter(c => !(c.id === id && c.user_id === userId));
    db.save();
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to remove item from cart' });
  }
});

// Clear Cart
router.delete('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    db.data.cart_items = (db.data?.cart_items || []).filter(c => c.user_id !== userId);
    db.save();
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to clear cart' });
  }
});

export default router;
