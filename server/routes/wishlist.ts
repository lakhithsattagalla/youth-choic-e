import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const rawItems = (db.data?.wishlist_items || []).filter(w => w.user_id === userId);

    const items = rawItems.map(item => {
      const product = (db.data?.products || []).find(p => p.id === item.product_id);
      if (!product) return null;

      const brand = (db.data?.brands || []).find(b => b.id === product.brand_id);
      const images = (db.data?.product_images || []).filter(img => img.product_id === product.id);
      const variants = (db.data?.product_variants || []).filter(v => v.product_id === product.id);
      const inStock = variants.some(v => v.stock > 0);

      return {
        id: item.id,
        product_id: product.id,
        name: product.name,
        brand_name: brand?.name || 'Brand',
        mrp: product.mrp,
        selling_price: product.selling_price,
        discount_pct: product.discount_pct,
        image_url: images.find(img => img.is_primary)?.image_url || images[0]?.image_url || '',
        in_stock: inStock
      };
    }).filter(Boolean);

    res.json({ success: true, items });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch wishlist' });
  }
});

router.post('/toggle', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { product_id } = req.body;

    if (!product_id) return res.status(400).json({ success: false, message: 'Product ID required' });

    if (!db.data.wishlist_items) db.data.wishlist_items = [];
    const existingIndex = db.data.wishlist_items.findIndex(w => w.user_id === userId && w.product_id === product_id);

    if (existingIndex > -1) {
      db.data.wishlist_items.splice(existingIndex, 1);
      db.save();
      return res.json({ success: true, message: 'Removed from wishlist', inWishlist: false });
    } else {
      db.data.wishlist_items.push({
        id: `wish-${Date.now()}`,
        user_id: userId,
        product_id,
        created_at: new Date().toISOString()
      });

      if (!db.data.analytics_events) db.data.analytics_events = [];
      db.data.analytics_events.push({
        id: `evt-${Date.now()}`,
        event_type: 'WISHLIST_ADD',
        user_id: userId,
        product_id,
        created_at: new Date().toISOString()
      });

      db.save();
      return res.json({ success: true, message: 'Added to wishlist', inWishlist: true });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to toggle wishlist' });
  }
});

router.delete('/:productId', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { productId } = req.params;

    db.data.wishlist_items = (db.data?.wishlist_items || []).filter(w => !(w.user_id === userId && w.product_id === productId));
    db.save();
    res.json({ success: true, message: 'Item removed from wishlist' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to remove wishlist item' });
  }
});

export default router;
