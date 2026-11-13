import { Router, Response } from 'express';
import { db } from '../db.js';
import { isSupabaseConfigured, fetchBrandsFromSupabase, getSupabaseClient } from '../services/supabaseService.js';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (isSupabaseConfigured()) {
      try {
        const sbBrands = await fetchBrandsFromSupabase();
        if (sbBrands && sbBrands.length > 0) {
          return res.json({ success: true, brands: sbBrands });
        }
      } catch (sbErr) {
        console.warn('[Supabase Brands Fetch Error, fallback to local DB]:', sbErr);
      }
    }

    const brands = (db.data?.brands || []).filter(b => b.status === 'ACTIVE').map(b => {
      const productCount = (db.data?.products || []).filter(p => p.brand_id === b.id && p.status === 'ACTIVE').length;
      return { ...b, product_count: productCount };
    });
    res.json({ success: true, brands });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch brands' });
  }
});

router.post('/', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { name, logo, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Brand name required' });

    const id = `brand-${Date.now()}`;
    const now = new Date().toISOString();

    const newBrand = {
      id,
      name,
      logo: logo || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&auto=format&fit=crop&q=80',
      description: description || '',
      status: 'ACTIVE' as const,
      created_at: now
    };

    if (!db.data.brands) db.data.brands = [];
    db.data.brands.push(newBrand);
    db.save();
    res.status(201).json({ success: true, brand: newBrand });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create brand' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const index = (db.data?.brands || []).findIndex(b => b.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Brand not found' });

    const { name, logo, description, status } = req.body;
    db.data.brands[index] = {
      ...db.data.brands[index],
      name: name || db.data.brands[index].name,
      logo: logo || db.data.brands[index].logo,
      description: description !== undefined ? description : db.data.brands[index].description,
      status: status || db.data.brands[index].status
    };

    db.save();
    res.json({ success: true, brand: db.data.brands[index] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update brand' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    db.data.brands = (db.data?.brands || []).filter(b => b.id !== id);
    db.save();
    res.json({ success: true, message: 'Brand deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete brand' });
  }
});

export default router;
