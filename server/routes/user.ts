import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Profile Update
router.put('/profile', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { name, phone, gender, dob, profile_img } = req.body;

    const idx = (db.data?.users || []).findIndex(u => u.id === userId);
    if (idx === -1) return res.status(404).json({ success: false, message: 'User not found' });

    const updated = {
      ...db.data.users[idx],
      name: name || db.data.users[idx].name,
      phone: phone !== undefined ? phone : db.data.users[idx].phone,
      gender: gender !== undefined ? gender : db.data.users[idx].gender,
      dob: dob !== undefined ? dob : db.data.users[idx].dob,
      profile_img: profile_img !== undefined ? profile_img : db.data.users[idx].profile_img
    };

    db.data.users[idx] = updated;
    db.save();

    const { password_hash, ...safeUser } = updated;
    res.json({ success: true, message: 'Profile updated', user: safeUser });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update profile' });
  }
});

// Address List & Actions
router.get('/addresses', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const addresses = (db.data?.addresses || []).filter(a => a.user_id === userId);
    res.json({ success: true, addresses });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch addresses' });
  }
});

router.post('/addresses', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { type, recipient_name, phone, street, city, state, pincode, is_default } = req.body;

    if (!recipient_name || !phone || !street || !city || !state || !pincode) {
      return res.status(400).json({ success: false, message: 'All address fields are required' });
    }

    if (!db.data.addresses) db.data.addresses = [];

    if (is_default) {
      db.data.addresses.forEach(a => {
        if (a.user_id === userId) a.is_default = false;
      });
    }

    const newAddress = {
      id: `addr-${Date.now()}`,
      user_id: userId,
      type: type || 'HOME',
      recipient_name,
      phone,
      street,
      city,
      state,
      pincode,
      is_default: !!is_default
    };

    db.data.addresses.push(newAddress);
    db.save();
    res.status(201).json({ success: true, address: newAddress });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create address' });
  }
});

router.put('/addresses/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const idx = (db.data?.addresses || []).findIndex(a => a.id === id && a.user_id === userId);

    if (idx === -1) return res.status(404).json({ success: false, message: 'Address not found' });

    if (req.body.is_default) {
      db.data.addresses.forEach(a => {
        if (a.user_id === userId) a.is_default = false;
      });
    }

    db.data.addresses[idx] = {
      ...db.data.addresses[idx],
      ...req.body,
      user_id: userId
    };

    db.save();
    res.json({ success: true, address: db.data.addresses[idx] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update address' });
  }
});

router.delete('/addresses/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;

    db.data.addresses = (db.data?.addresses || []).filter(a => !(a.id === id && a.user_id === userId));
    db.save();
    res.json({ success: true, message: 'Address deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete address' });
  }
});

// Notifications
router.get('/notifications', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const notifications = (db.data?.notifications || []).filter(n => n.user_id === userId);
    res.json({ success: true, notifications });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch notifications' });
  }
});

router.put('/notifications/read-all', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    (db.data?.notifications || []).forEach(n => {
      if (n.user_id === userId) n.is_read = true;
    });
    db.save();
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update notifications' });
  }
});

// Reviews
router.post('/reviews', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { product_id, rating, comment } = req.body;

    if (!product_id || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'Product, rating, and comment are required' });
    }

    const user = (db.data?.users || []).find(u => u.id === userId);
    const newReview = {
      id: `rev-${Date.now()}`,
      user_id: userId,
      product_id,
      user_name: user?.name || 'Customer',
      rating: Number(rating),
      comment,
      is_verified: true,
      created_at: new Date().toISOString()
    };

    if (!db.data.reviews) db.data.reviews = [];
    db.data.reviews.push(newReview);

    // Recalculate Product Average Rating
    const productReviews = (db.data?.reviews || []).filter(r => r.product_id === product_id);
    const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;

    const prodIdx = (db.data?.products || []).findIndex(p => p.id === product_id);
    if (prodIdx > -1) {
      db.data.products[prodIdx].rating = Number(avgRating.toFixed(1));
      db.data.products[prodIdx].review_count = productReviews.length;
    }

    db.save();
    res.status(201).json({ success: true, review: newReview });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to submit review' });
  }
});

export default router;
