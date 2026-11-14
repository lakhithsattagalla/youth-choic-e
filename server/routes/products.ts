import { Router, Response } from 'express';
import { db, deleteProductFromDb } from '../db.js';
import {
  isSupabaseConfigured,
  fetchProductsFromSupabase,
  fetchProductByIdFromSupabase,
  deleteProductFromSupabase,
  createProductInSupabase,
  updateProductInSupabase,
  createSignedProductImageUploadUrl,
  ensurePermanentPublicImageUrl
} from '../services/supabaseService.js';
import { getProductEffectivePrice } from '../services/couponHelper.js';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all products with advanced filtering, search, and sorting
router.get('/', async (req: AuthRequest, res: Response) => {
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

    let products: any[] = [];
    if (isSupabaseConfigured()) {
      try {
        const sbProds = await fetchProductsFromSupabase();
        if (sbProds) products = sbProds;
      } catch (err) {
        console.warn('[Supabase fetch error, fallback to local DB]:', err);
        products = (db.data?.products || []).filter(p => p.status === 'ACTIVE');
      }
    } else {
      products = (db.data?.products || []).filter(p => p.status === 'ACTIVE');
    }

    // Gender Filter
    if (gender && gender !== 'ALL') {
      products = products.filter(p => p.gender.toUpperCase() === gender.toUpperCase() || p.gender === 'UNISEX');
    }

    // Category Filter (ID or slug)
    if (category) {
      const catObj = (db.data?.categories || []).find(c => c.id === category || c.slug === category);
      if (catObj) {
        products = products.filter(p => p.category_id === catObj.id);
      }
    }

    // Brand Filter (ID or Name)
    if (brand) {
      const brandObj = (db.data?.brands || []).find(b => b.id === brand || b.name.toLowerCase() === brand.toLowerCase());
      if (brandObj) {
        products = products.filter(p => p.brand_id === brandObj.id);
      }
    }

    // Search Query (name, brand, category, description, SKU)
    if (search && search.trim() !== '') {
      const query = search.toLowerCase().trim();
      products = products.filter(p => {
        const brandName = (db.data?.brands || []).find(b => b.id === p.brand_id)?.name.toLowerCase() || '';
        const catName = (db.data?.categories || []).find(c => c.id === p.category_id)?.name.toLowerCase() || '';
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
        let variants = (db.data?.product_variants || []).filter(v => v.product_id === p.id);
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
      const brandObj = (db.data?.brands || []).find(b => b.id === p.brand_id);
      const catObj = (db.data?.categories || []).find(c => c.id === p.category_id);
      
      // Prefer Supabase images if present, fallback to local DB
      const localImages = (db.data?.product_images || []).filter(img => img.product_id === p.id);
      const rawImages = (Array.isArray(p.images) && p.images.length > 0) ? p.images : localImages;
      const images = rawImages.map((img: any, idx: number) => {
        const rawUrl = typeof img === 'string' ? img : (img.image_url || img.url || '');
        const cleanUrl = ensurePermanentPublicImageUrl(rawUrl);
        return {
          id: img.id || `img-${p.id}-${idx}`,
          product_id: p.id,
          image_url: cleanUrl,
          url: cleanUrl,
          color: img.color || '',
          is_primary: idx === 0 || !!img.is_primary,
          display_order: img.display_order !== undefined ? img.display_order : idx
        };
      });

      const localVariants = (db.data?.product_variants || []).filter(v => v.product_id === p.id);
      const variants = (Array.isArray(p.variants) && p.variants.length > 0) ? p.variants : localVariants;

      const totalStock = p.total_stock !== undefined
        ? p.total_stock
        : variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);

      const primaryImg = p.primary_image
        ? ensurePermanentPublicImageUrl(p.primary_image)
        : (images.find((img: any) => img.is_primary)?.image_url || images[0]?.image_url || '');

      const offers = db.data?.offers || [];
      const now = new Date();
      const pricing = getProductEffectivePrice(p, offers, now);

      return {
        ...p,
        brand_name: p.brand_name || brandObj?.name || 'Brand',
        category_name: p.category_name || catObj?.name || 'Category',
        images,
        variants,
        total_stock: totalStock,
        primary_image: primaryImg,
        mrp: pricing.mrp,
        price: pricing.offerPrice,
        original_price: pricing.mrp,
        offer_price: pricing.offerPrice,
        has_offer: pricing.hasOffer,
        offer_name: pricing.offerName,
        offer_id: pricing.offerId,
        discount_percentage: pricing.discountPercentage,
        allow_coupon: pricing.allowCoupon,
        offer_end_at: pricing.endAt
      };
    });

    res.json({ success: true, products: fullProducts, count: fullProducts.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch products' });
  }
});

// Get Single Product by ID or Slug with full details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    let product: any = (db.data?.products || []).find(p => p.id === id || p.slug === id);

    if (!product && isSupabaseConfigured()) {
      try {
        product = await fetchProductByIdFromSupabase(id);
      } catch (sbErr) {
        console.warn('[Supabase fetch product by id fallback failed]:', sbErr);
      }
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const brandObj = product.brand || (db.data?.brands || []).find(b => b.id === product.brand_id);
    const catObj = product.category || (db.data?.categories || []).find(c => c.id === product.category_id);
    
    const localImages = (db.data?.product_images || []).filter(img => img.product_id === product.id);
    const rawImages = (Array.isArray(product.images) && product.images.length > 0) ? product.images : localImages;
    const images = rawImages.map((img: any, idx: number) => {
      const rawUrl = typeof img === 'string' ? img : (img.image_url || img.url || '');
      const cleanUrl = ensurePermanentPublicImageUrl(rawUrl);
      return {
        id: img.id || `img-${product.id}-${idx}`,
        product_id: product.id,
        image_url: cleanUrl,
        url: cleanUrl,
        color: img.color || '',
        is_primary: idx === 0 || !!img.is_primary,
        display_order: img.display_order !== undefined ? img.display_order : idx
      };
    });

    const localVariants = (db.data?.product_variants || []).filter(v => v.product_id === product.id);
    const variants = (Array.isArray(product.variants) && product.variants.length > 0) ? product.variants : localVariants;
    const reviews = product.reviews || (db.data?.reviews || []).filter(r => r.product_id === product.id);

    const offers = db.data?.offers || [];
    const now = new Date();
    const pricing = getProductEffectivePrice(product, offers, now);

    // Track analytics event
    if (!db.data.analytics_events) db.data.analytics_events = [];
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
      success: true,
      product: {
        ...product,
        brand: brandObj,
        category: catObj,
        brand_name: product.brand_name || brandObj?.name || 'Brand',
        category_name: product.category_name || catObj?.name || 'Category',
        images,
        variants,
        reviews,
        primary_image: product.primary_image ? ensurePermanentPublicImageUrl(product.primary_image) : (images.find((i: any) => i.is_primary)?.image_url || images[0]?.image_url || ''),
        mrp: pricing.mrp,
        price: pricing.offerPrice,
        original_price: pricing.mrp,
        offer_price: pricing.offerPrice,
        has_offer: pricing.hasOffer,
        offer_name: pricing.offerName,
        offer_id: pricing.offerId,
        discount_percentage: pricing.discountPercentage,
        allow_coupon: pricing.allowCoupon,
        offer_end_at: pricing.endAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch product details' });
  }
});

// Direct Browser Signed Upload URL (Bypasses Supabase Storage RLS)
router.post('/storage-upload-url', async (req: AuthRequest, res: Response) => {
  try {
    const { fileName, fileType, fileSize } = req.body;
    if (fileSize && fileSize > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds maximum upload limit of 10 MB.'
      });
    }
    const uploadInfo = await createSignedProductImageUploadUrl(fileName || 'product-image.jpg');
    res.json({ success: true, ...uploadInfo });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to generate signed upload URL'
    });
  }
});

// Admin: Add New Product
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
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

    // Validate immediately that no Base64 or temporary blob: image data is sent through API routes
    if (Array.isArray(images)) {
      for (const img of images) {
        const urlStr = typeof img === 'string' ? img : (img?.url || img?.image_url || '');
        if (typeof urlStr === 'string') {
          if (urlStr.startsWith('data:image') || urlStr.length > 2000) {
            return res.status(400).json({
              success: false,
              error: 'Base64 image forwarding is prohibited. Upload images directly to Supabase Storage and pass the public URL.'
            });
          }
          if (urlStr.startsWith('blob:')) {
            return res.status(400).json({
              success: false,
              error: 'Temporary browser blob URLs cannot be saved. Please wait for image upload to complete.'
            });
          }
        }
      }
    }

    if (!name || !brand_id || !category_id || !mrp || !selling_price || !sku_prefix) {
      return res.status(400).json({ success: false, message: 'Missing required product fields' });
    }

    const prodId = req.body.id || `prod-${Date.now()}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const discount_pct = Math.round(((Number(mrp) - Number(selling_price)) / Number(mrp)) * 100);
    const now = new Date().toISOString();

    // Sanitize image URLs to ensure they are permanent public URLs
    const sanitizedImages = Array.isArray(images)
      ? images
          .filter((img: any) => {
            const u = typeof img === 'string' ? img : (img?.url || img?.image_url || '');
            return u && !u.startsWith('blob:') && !u.startsWith('data:');
          })
          .map((img: any, idx: number) => {
            const rawUrl = typeof img === 'string' ? img : (img.url || img.image_url || '');
            const cleanUrl = ensurePermanentPublicImageUrl(rawUrl);
            return {
              id: img.id || `img-${prodId}-${idx}`,
              product_id: prodId,
              image_url: cleanUrl,
              url: cleanUrl,
              color: img.color || '',
              is_primary: idx === 0 || !!img.is_primary,
              display_order: img.display_order !== undefined ? img.display_order : idx
            };
          })
      : [];

    if (sanitizedImages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one valid permanent product image is required.'
      });
    }

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
      created_at: now,
      updated_at: now
    };

    if (isSupabaseConfigured()) {
      try {
        await createProductInSupabase({
          ...req.body,
          id: prodId,
          slug,
          images: sanitizedImages
        });
      } catch (sbErr) {
        console.warn('[Supabase create product failed, falling back to persistent DB]:', sbErr);
      }
    }

    if (!db.data.products) db.data.products = [];
    db.data.products.push(newProduct);

    // Save Images
    if (!db.data.product_images) db.data.product_images = [];
    sanitizedImages.forEach((img: any) => {
      db.data.product_images.push({
        id: img.id,
        product_id: prodId,
        image_url: img.image_url,
        color: img.color || '',
        is_primary: img.is_primary,
        display_order: img.display_order
      });
    });

    // Save Variants
    if (!db.data.product_variants) db.data.product_variants = [];
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
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: {
        ...newProduct,
        images: sanitizedImages,
        primary_image: sanitizedImages.find(i => i.is_primary)?.image_url || sanitizedImages[0]?.image_url
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to create product' });
  }
});

// Admin: Edit Product & Update Details / Variants
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const targetId = String(id).trim();

    // Validate that no Base64 or temporary blob: image data is sent through API routes
    if (Array.isArray(req.body.images)) {
      for (const img of req.body.images) {
        const urlStr = typeof img === 'string' ? img : (img?.url || img?.image_url || '');
        if (typeof urlStr === 'string') {
          if (urlStr.startsWith('data:image') || urlStr.length > 2000) {
            return res.status(400).json({
              success: false,
              error: 'Base64 image forwarding is prohibited. Upload images directly to Supabase Storage and pass the public URL.'
            });
          }
          if (urlStr.startsWith('blob:')) {
            return res.status(400).json({
              success: false,
              error: 'Temporary browser blob URLs cannot be saved. Please wait for image upload to complete.'
            });
          }
        }
      }
    }

    // Sanitize image URLs with permanent public URL converter
    let sanitizedImages: any[] | undefined = undefined;
    if (Array.isArray(req.body.images)) {
      sanitizedImages = req.body.images
        .filter((img: any) => {
          const u = typeof img === 'string' ? img : (img?.url || img?.image_url || '');
          return u && !u.startsWith('blob:') && !u.startsWith('data:');
        })
        .map((img: any, idx: number) => {
          const rawUrl = typeof img === 'string' ? img : (img.url || img.image_url || '');
          const cleanUrl = ensurePermanentPublicImageUrl(rawUrl);
          return {
            id: img.id || `img-${targetId}-${idx}-${Date.now()}`,
            product_id: targetId,
            image_url: cleanUrl,
            url: cleanUrl,
            color: img.color || '',
            is_primary: idx === 0 || !!img.is_primary,
            display_order: img.display_order !== undefined ? img.display_order : idx
          };
        });
      req.body.images = sanitizedImages;
    }

    if (isSupabaseConfigured()) {
      try {
        await updateProductInSupabase(targetId, {
          ...req.body,
          images: sanitizedImages
        });
      } catch (sbErr) {
        console.warn('[Supabase update product failed, falling back to persistent DB]:', sbErr);
      }
    }

    const prodIndex = (db.data?.products || []).findIndex(p => String(p.id).trim() === targetId || String(p.slug).trim() === targetId);

    if (prodIndex === -1 && !isSupabaseConfigured()) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (prodIndex !== -1) {
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
        discount_pct,
        updated_at: new Date().toISOString()
      };

      db.data.products[prodIndex] = updated;

      if (Array.isArray(sanitizedImages) && sanitizedImages.length > 0) {
        db.data.product_images = (db.data?.product_images || []).filter(img => String(img.product_id).trim() !== targetId);

        sanitizedImages.forEach((img: any) => {
          db.data.product_images.push({
            id: img.id,
            product_id: targetId,
            image_url: img.image_url,
            color: img.color || '',
            is_primary: img.is_primary,
            display_order: img.display_order
          });
        });
      }

      if (Array.isArray(variants)) {
        const existingVariants = (db.data?.product_variants || []).filter(v => String(v.product_id).trim() === targetId);
        const updatedVariantIds = new Set<string>();

        variants.forEach((v: any) => {
          const variantSku = v.sku || `${sku_prefix || current.sku_prefix}-${(v.color || 'CLR').substring(0, 2).toUpperCase()}-${v.size}`;
          const match = existingVariants.find(ex => ex.color.toLowerCase() === v.color.toLowerCase() && ex.size.toUpperCase() === v.size.toUpperCase());

          if (match) {
            match.color = v.color;
            match.size = v.size;
            match.sku = variantSku;
            if (v.stock !== undefined) match.stock = Number(v.stock);
            updatedVariantIds.add(match.id);
          } else {
            const newVarId = `var-${targetId}-${v.color}-${v.size}-${Date.now()}`;
            db.data.product_variants.push({
              id: newVarId,
              product_id: targetId,
              color: v.color,
              size: v.size,
              sku: variantSku,
              stock: Number(v.stock || 0),
              created_at: new Date().toISOString()
            });
            updatedVariantIds.add(newVarId);
          }
        });

        db.data.product_variants = (db.data?.product_variants || []).filter(v => String(v.product_id).trim() !== targetId || updatedVariantIds.has(v.id));
      }

      db.save();
    }

    res.json({ success: true, message: 'Product updated successfully', id: targetId });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update product' });
  }
});

// Admin: Delete Product
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid or missing product ID' });
    }
    const targetId = String(id).trim();

    if (isSupabaseConfigured()) {
      try {
        await deleteProductFromSupabase(targetId);
      } catch (sbErr: any) {
        console.error('[Supabase Delete Failed]:', sbErr);
      }
    }

    deleteProductFromDb(targetId);

    res.json({
      success: true,
      message: 'Product deleted successfully',
      id: targetId
    });
  } catch (err: any) {
    console.error('[Delete Product Error]:', err);
    res.status(500).json({
      success: false,
      message: 'Unable to delete product. Please try again.'
    });
  }
});

export default router;

