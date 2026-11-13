import { Router, Response } from 'express';
import { db } from '../db.js';
import { isSupabaseConfigured, fetchCategoriesFromSupabase } from '../services/supabaseService.js';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { gender } = req.query;

    if (isSupabaseConfigured()) {
      try {
        let sbCats = await fetchCategoriesFromSupabase();
        if (sbCats && sbCats.length > 0) {
          if (gender) {
            sbCats = sbCats.filter((c: any) => c.gender.toUpperCase() === (gender as string).toUpperCase() || c.gender === 'UNISEX');
          }
          return res.json({ success: true, categories: sbCats });
        }
      } catch (sbErr) {
        console.warn('[Supabase Categories Fetch Error, fallback to local DB]:', sbErr);
      }
    }

    let categories = (db.data?.categories || []).filter(c => c.status === 'ACTIVE');

    if (gender) {
      categories = categories.filter(c => c.gender.toUpperCase() === (gender as string).toUpperCase() || c.gender === 'UNISEX');
    }

    const result = categories.map(cat => {
      const productCount = (db.data?.products || []).filter(p => p.category_id === cat.id && p.status === 'ACTIVE').length;
      return { ...cat, product_count: productCount };
    });

    res.json({ success: true, categories: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch categories' });
  }
});

router.post('/', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { name, gender, image_url } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Category name required' });

    const id = `cat-${Date.now()}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const now = new Date().toISOString();

    const newCat = {
      id,
      name,
      slug,
      gender: gender || 'MEN',
      image_url: image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
      status: 'ACTIVE' as const,
      created_at: now
    };

    if (!db.data.categories) db.data.categories = [];
    db.data.categories.push(newCat);
    db.save();
    res.status(201).json({ success: true, category: newCat });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create category' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const index = (db.data?.categories || []).findIndex(c => c.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Category not found' });

    const { name, gender, image_url, status } = req.body;
    db.data.categories[index] = {
      ...db.data.categories[index],
      name: name || db.data.categories[index].name,
      gender: gender || db.data.categories[index].gender,
      image_url: image_url || db.data.categories[index].image_url,
      status: status || db.data.categories[index].status
    };

    db.save();
    res.json({ success: true, category: db.data.categories[index] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update category' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    db.data.categories = (db.data?.categories || []).filter(c => c.id !== id);
    db.save();
    res.json({ success: true, message: 'Category deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete category' });
  }
});

export default router;
