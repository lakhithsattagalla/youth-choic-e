import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all products with advanced filtering, search, and sorting
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    let {
      gender,
      category,
      brand,
      size,
      color,
      minPrice,
      maxPrice,
      rating,
      inStock,
      search,
      sort,
      isFeatured,
      isTrending,
      isNewArrival
    } = req.query as Record<string, string>;

    let products = db.data.products.filter(p => p.status === 'ACTIVE');

    // Gender Filter
    if (gender && gender !== 'ALL') {
      products = products.filter(p => p.gender.toUpperCase() === gender.toUpperCase() || p.gender === 'UNISEX');
    }

    // Category Filter (ID or slug)
    if (category) {
      const catObj = db.data.categories.find(c => c.id === category || c.slug === category);
      if (catObj) {
        products = products.filter(p => p.category_id === catObj.id);
      }
    }

    // Brand Filter (ID or Name)
    if (brand) {
      const brandObj = db.data.brands.find(b => b.id === brand || b.name.toLowerCase() === brand.toLowerCase());
      if (brandObj) {
        products = products.filter(p => p.brand_id === brandObj.id);
      }
    }

    // Search Query (name, brand, category, description, SKU)
    if (search && search.trim() !== '') {
      const query = search.toLowerCase().trim();
      products = products.filter(p => {
        const brandName = db.data.brands.find(b => b.id === p.brand_id)?.name.toLowerCase() || '';
        const catName = db.data.categories.find(c => c.id === p.category_id)?.name.toLowerCase() || '';
        return (
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.sku_prefix.toLowerCase().includes(query) ||
          brandName.includes(query) ||
          catName.includes(query)
        );
      });
    }

    // Price Range Filter
    if (minPrice) {
      products = products.filter(p => p.selling_price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      products = products.filter(p => p.selling_price <= parseFloat(maxPrice));
    }

    // Rating Filter
    if (rating) {
      products = products.filter(p => p.rating >= parseFloat(rating));
    }

    // Flags Filter
    if (isFeatured === 'true') products = products.filter(p => p.is_featured);
    if (isTrending === 'true') products = products.filter(p => p.is_trending);
    if (isNewArrival === 'true') products = products.filter(p => p.is_new_arrival);

    // Color or Size Filter via Variant lookup
    if (size || color || inStock === 'true') {
      products = products.filter(p => {
        let variants = db.data.product_variants.filter(v => v.product_id === p.id);
        if (size) variants = variants.filter(v => v.size.toUpperCase() === size.toUpperCase());
        if (color) variants = variants.filter(v => v.color.toLowerCase() === color.toLowerCase());
        if (inStock === 'true') variants = variants.filter(v => v.stock > 0);
        return variants.length > 0;
      });
    }

    // Sorting Logic
    if (sort === 'price-asc') {
      products.sort((a, b) => a.selling_price - b.selling_price);
    } else if (sort === 'price-desc') {
      products.sort((a, b) => b.selling_price - a.selling_price);
    } else if (sort === 'newest') {
      products.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === 'highest-rated') {
      products.sort((a, b) => b.rating - a.rating);
    }

    // Populate Brand, Category, Images, and Variants for each product
    const fullProducts = products.map(p => {
      const brandObj = db.data.brands.find(b => b.id === p.brand_id);
      const catObj = db.data.categories.find(c => c.id === p.category_id);
      const images = db.data.product_images.filter(img => img.product_id === p.id);
      const variants = db.data.product_variants.filter(v => v.product_id === p.id);

      const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

      return {
        ...p,
        brand_name: brandObj?.name || 'Brand',
        category_name: catObj?.name || 'Category',
        images,
        variants,
        total_stock: totalStock,
        primary_image: images.find(img => img.is_primary)?.image_url || images[0]?.image_url || ''
      };
    });

    res.json({ products: fullProducts, count: fullProducts.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Product by ID or Slug with full details
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = db.data.products.find(p => p.id === id || p.slug === id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const brandObj = db.data.brands.find(b => b.id === product.brand_id);
    const catObj = db.data.categories.find(c => c.id === product.category_id);
    const images = db.data.product_images.filter(img => img.product_id === product.id);
    const variants = db.data.product_variants.filter(v => v.product_id === product.id);
    const reviews = db.data.reviews.filter(r => r.product_id === product.id);

    // Track analytics event
    db.data.analytics_events.push({
      id: `evt-${Date.now()}`,
      event_type: 'PRODUCT_VIEW',
      user_id: req.user?.id,
      product_id: product.id,
      category_id: product.category_id,
      brand_id: product.brand_id,
      created_at: new Date().toISOString()
    });
    db.save();

    res.json({
      product: {
        ...product,
        brand: brandObj,
        category: catObj,
        images,
        variants,
        reviews
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Add New Product
router.post('/', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      brand_id,
      category_id,
      gender,
      description,
      material,
      fit,
      care_instructions,
      mrp,
      selling_price,
      sku_prefix,
      images, // array of { url, color, is_primary }
      variants // array of { color, size, stock, sku }
    } = req.body;

    if (!name || !brand_id || !category_id || !mrp || !selling_price || !sku_prefix) {
      return res.status(400).json({ error: 'Missing required product fields' });
    }

    // Validate that no Base64 image data is sent through Vercel API routes
    if (Array.isArray(images)) {
      for (const img of images) {
        const urlStr = typeof img === 'string' ? img : (img?.url || img?.image_url || '');
        if (typeof urlStr === 'string' && (urlStr.startsWith('data:image') || urlStr.length > 2000)) {
          return res.status(400).json({
            error: 'Base64 image forwarding is prohibited. Upload images directly to Supabase Storage and pass the public URL.'
          });
        }
      }
    }

    const prodId = `prod-${Date.now()}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const discount_pct = Math.round(((mrp - selling_price) / mrp) * 100);
    const now = new Date().toISOString();

    const newProduct = {
      id: prodId,
      name,
      slug,
      brand_id,
      category_id,
      gender: gender || 'MEN',
      description: description || '',
      material: material || '',
      fit: fit || '',
      care_instructions: care_instructions || '',
      mrp: Number(mrp),
      selling_price: Number(selling_price),
      discount_pct,
      sku_prefix,
      rating: 5.0,
      review_count: 0,
      is_featured: true,
      is_trending: true,
      is_new_arrival: true,
      status: 'ACTIVE' as const,
      created_at: now
    };

    db.data.products.push(newProduct);

    // Save Images
    if (Array.isArray(images)) {
      images.forEach((img: any, idx: number) => {
        const urlStr = typeof img === 'string' ? img : (img?.url || img?.image_url || '');
        if (urlStr) {
          db.data.product_images.push({
            id: `img-${prodId}-${idx}`,
            product_id: prodId,
            image_url: urlStr,
            color: img.color || '',
            is_primary: idx === 0 || !!img.is_primary,
            display_order: img.display_order !== undefined ? img.display_order : idx
          });
        }
      });
    }

    // Save Variants
    if (Array.isArray(variants)) {
      variants.forEach((v: any) => {
        const variantSku = v.sku || `${sku_prefix}-${(v.color || 'CLR').substring(0, 2).toUpperCase()}-${v.size}`;
        db.data.product_variants.push({
          id: `var-${prodId}-${v.color}-${v.size}`,
          product_id: prodId,
          color: v.color,
          size: v.size,
          sku: variantSku,
          stock: Number(v.stock || 0),
          created_at: now
        });
      });
    }

    db.save();
    res.status(201).json({ message: 'Product created successfully', product: newProduct });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Edit Product & Update Details / Variants
router.put('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const prodIndex = db.data.products.findIndex(p => p.id === id);

    if (prodIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const current = db.data.products[prodIndex];
    const {
      name,
      brand_id,
      category_id,
      gender,
      description,
      material,
      fit,
      care_instructions,
      mrp,
      selling_price,
      sku_prefix,
      status,
      images,
      variants
    } = req.body;

    const newMrp = mrp !== undefined ? Number(mrp) : current.mrp;
    const newSelling = selling_price !== undefined ? Number(selling_price) : current.selling_price;
    const discount_pct = Math.round(((newMrp - newSelling) / newMrp) * 100);
    const newName = name || current.name;
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const updated = {
      ...current,
      name: newName,
      slug,
      brand_id: brand_id || current.brand_id,
      category_id: category_id || current.category_id,
      gender: gender || current.gender,
      description: description !== undefined ? description : current.description,
      material: material !== undefined ? material : current.material,
      fit: fit !== undefined ? fit : current.fit,
      care_instructions: care_instructions !== undefined ? care_instructions : current.care_instructions,
      sku_prefix: sku_prefix || current.sku_prefix,
      status: status || current.status,
      mrp: newMrp,
      selling_price: newSelling,
      discount_pct
    };

    db.data.products[prodIndex] = updated;

    // Validate that no Base64 image data is sent through Vercel API routes
    if (Array.isArray(images)) {
      for (const img of images) {
        const urlStr = typeof img === 'string' ? img : (img?.url || img?.image_url || '');
        if (typeof urlStr === 'string' && (urlStr.startsWith('data:image') || urlStr.length > 2000)) {
          return res.status(400).json({
            error: 'Base64 image forwarding is prohibited. Upload images directly to Supabase Storage and pass the public URL.'
          });
        }
      }
    }

    // Handle Images update if provided
    if (Array.isArray(images)) {
      // Filter out existing images for this product
      db.data.product_images = db.data.product_images.filter(img => img.product_id !== id);

      images.forEach((img: any, idx: number) => {
        const urlStr = typeof img === 'string' ? img : (img?.url || img?.image_url || '');
        if (urlStr) {
          db.data.product_images.push({
            id: `img-${id}-${idx}-${Date.now()}`,
            product_id: id,
            image_url: urlStr,
            color: img.color || '',
            is_primary: idx === 0 || !!img.is_primary,
            display_order: img.display_order !== undefined ? img.display_order : idx
          });
        }
      });
    }

    // Handle Variants update if provided
    if (Array.isArray(variants)) {
      const existingVariants = db.data.product_variants.filter(v => v.product_id === id);
      const updatedVariantIds = new Set<string>();

      variants.forEach((v: any) => {
        const variantSku = v.sku || `${updated.sku_prefix}-${(v.color || 'CLR').substring(0, 2).toUpperCase()}-${v.size}`;
        const match = existingVariants.find(ex => ex.color.toLowerCase() === v.color.toLowerCase() && ex.size.toUpperCase() === v.size.toUpperCase());

        if (match) {
          match.color = v.color;
          match.size = v.size;
          match.sku = variantSku;
          if (v.stock !== undefined) match.stock = Number(v.stock);
          updatedVariantIds.add(match.id);
        } else {
          const newVarId = `var-${id}-${v.color}-${v.size}-${Date.now()}`;
          db.data.product_variants.push({
            id: newVarId,
            product_id: id,
            color: v.color,
            size: v.size,
            sku: variantSku,
            stock: Number(v.stock || 0),
            created_at: new Date().toISOString()
          });
          updatedVariantIds.add(newVarId);
        }
      });

      // Remove variants that were removed by admin
      db.data.product_variants = db.data.product_variants.filter(v => v.product_id !== id || updatedVariantIds.has(v.id));
    }

    db.save();

    res.json({ message: 'Product updated successfully', product: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete Product
router.delete('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const targetId = String(id).trim();

    db.data.products = db.data.products.filter(p => String(p.id).trim() !== targetId && String(p.slug).trim() !== targetId);
    db.data.product_images = db.data.product_images.filter(img => String(img.product_id).trim() !== targetId);
    db.data.product_variants = db.data.product_variants.filter(v => String(v.product_id).trim() !== targetId);
    db.data.cart_items = db.data.cart_items.filter(c => {
      const variant = db.data.product_variants.find(v => String(v.id) === String(c.variant_id));
      return variant && String(variant.product_id).trim() !== targetId;
    });

    db.save();
    res.json({ message: 'Product deleted successfully', id: targetId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
