import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getEnv(key: string): string {
  return process.env[key] || '';
}

const supabaseUrl =
  getEnv('SUPABASE_URL') ||
  getEnv('VITE_SUPABASE_URL') ||
  getEnv('NEXT_PUBLIC_SUPABASE_URL') ||
  getEnv('REACT_APP_SUPABASE_URL') ||
  '';

const supabaseKey =
  getEnv('SUPABASE_SERVICE_ROLE_KEY') ||
  getEnv('SUPABASE_ANON_KEY') ||
  getEnv('SUPABASE_KEY') ||
  getEnv('VITE_SUPABASE_ANON_KEY') ||
  getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
  getEnv('REACT_APP_SUPABASE_ANON_KEY') ||
  '';

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Supabase Client] Successfully connected to Supabase PostgreSQL at:', supabaseUrl);
  } catch (err) {
    console.warn('[Supabase Client] Failed to initialize client:', err);
    supabase = null;
  }
} else {
  console.log('[Supabase Client] Supabase environment variables not found. Application running in local storage fallback mode.');
}

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabase;
}

/**
 * Ensures the 'product-images' storage bucket exists with 10 MB limit and public read access.
 */
export async function ensureStorageBucket() {
  if (!supabase) return null;
  try {
    const bucketName = 'product-images';
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.warn('[Supabase Storage] listBuckets notice:', listError.message);
      return null;
    }

    const existing = buckets?.find(b => b.id === bucketName || b.name === bucketName);
    if (existing) {
      const { data, error } = await supabase.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10 MB (10,485,760 bytes)
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
      });
      if (error) {
        console.warn('[Supabase Storage] updateBucket notice:', error.message);
      } else {
        console.log('[Supabase Storage] Bucket "product-images" updated with 10 MB limit.');
      }
      return data || existing;
    } else {
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10 MB (10,485,760 bytes)
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
      });
      if (error) {
        console.warn('[Supabase Storage] createBucket notice:', error.message);
      } else {
        console.log('[Supabase Storage] Bucket "product-images" created with 10 MB limit.');
      }
      return data;
    }
  } catch (err: any) {
    console.warn('[Supabase Storage] ensureStorageBucket error:', err?.message || err);
    return null;
  }
}

/**
 * Retrieves storage bucket configuration and status
 */
export async function getStorageBucketStatus() {
  if (!supabase) {
    return {
      configured: false,
      bucket: 'product-images',
      max_size_bytes: 10485760,
      max_size_mb: 10,
      allowed_types: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
      status: 'supabase_not_configured'
    };
  }
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      return {
        configured: true,
        bucket: 'product-images',
        max_size_bytes: 10485760,
        max_size_mb: 10,
        allowed_types: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
        status: 'error',
        message: error.message
      };
    }
    const bucket = buckets?.find(b => b.id === 'product-images' || b.name === 'product-images');
    return {
      configured: true,
      bucket: 'product-images',
      exists: !!bucket,
      public: bucket ? bucket.public : true,
      file_size_limit: bucket?.file_size_limit || 10485760,
      max_size_mb: 10,
      allowed_mime_types: bucket?.allowed_mime_types || ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
      status: 'active'
    };
  } catch (err: any) {
    return {
      configured: true,
      bucket: 'product-images',
      max_size_bytes: 10485760,
      max_size_mb: 10,
      status: 'error',
      message: err?.message || 'Failed to inspect bucket'
    };
  }
}

/**
 * Generates a signed upload URL for direct browser-to-Supabase upload.
 * Completely bypasses Supabase RLS ("new row violates row-level security policy")
 * because the signed URL is signed by the service-role key.
 */
export async function createSignedProductImageUploadUrl(fileName: string) {
  if (!supabase) {
    throw new Error('Supabase Storage is not configured on the server');
  }

  const ext = fileName?.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanBaseName = (fileName || 'image')
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 30);
  const uniqueId = Math.random().toString(36).substring(2, 9);
  const storagePath = `products/${Date.now()}_${cleanBaseName}_${uniqueId}.${ext}`;

  const { data, error } = await supabase.storage
    .from('product-images')
    .createSignedUploadUrl(storagePath, { upsert: true });

  if (error) {
    console.error('[Supabase createSignedUploadUrl error]:', error);
    throw error;
  }

  const { data: pubData } = supabase.storage
    .from('product-images')
    .getPublicUrl(storagePath);

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: storagePath,
    publicUrl: ensurePermanentPublicImageUrl(pubData.publicUrl)
  };
}

/**
 * Ensures any image URL is converted to a permanent, non-expiring public URL.
 * Strips temporary tokens, signatures, and converts upload/sign endpoints to /public/.
 */
export function ensurePermanentPublicImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();

  if (clean.includes('/storage/v1/object/')) {
    // 1. Strip ?token=... or query params
    clean = clean.split('?')[0];

    // 2. Convert signed paths to permanent public paths
    clean = clean
      .replace('/storage/v1/object/upload/sign/', '/storage/v1/object/public/')
      .replace('/storage/v1/object/sign/', '/storage/v1/object/public/');
  }

  return clean;
}

// 1. FETCH PRODUCTS
export async function fetchProductsFromSupabase(includeInactive: boolean = false) {
  if (!supabase) return null;

  let query = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('status', 'ACTIVE');
  }

  const { data: products, error: prodErr } = await query;
  if (prodErr) {
    console.error('[Supabase Fetch Products Error]:', prodErr);
    throw prodErr;
  }
  if (!products || products.length === 0) return [];

  const productIds = products.map(p => p.id);

  const [imagesRes, variantsRes, brandsRes, categoriesRes] = await Promise.all([
    supabase.from('product_images').select('*').in('product_id', productIds),
    supabase.from('product_variants').select('*').in('product_id', productIds),
    supabase.from('brands').select('*'),
    supabase.from('categories').select('*')
  ]);

  const images = imagesRes.data || [];
  const variants = variantsRes.data || [];
  const brands = brandsRes.data || [];
  const categories = categoriesRes.data || [];

  return products.map(p => {
    const brandObj = brands.find(b => b.id === p.brand_id);
    const catObj = categories.find(c => c.id === p.category_id);
    const pImages = images
      .filter(img => img.product_id === p.id)
      .map(img => ({
        ...img,
        image_url: ensurePermanentPublicImageUrl(img.image_url)
      }));
    const pVariants = variants.filter(v => v.product_id === p.id);
    const totalStock = pVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
    const primaryImg = pImages.find(i => i.is_primary)?.image_url || pImages[0]?.image_url || '';

    return {
      ...p,
      brand_name: brandObj?.name || 'Brand',
      category_name: catObj?.name || 'Category',
      images: pImages,
      variants: pVariants,
      total_stock: totalStock,
      primary_image: primaryImg,
      price: Number(p.selling_price),
      original_price: Number(p.mrp),
      mrp: Number(p.mrp),
      selling_price: Number(p.selling_price)
    };
  });
}

// 2. FETCH SINGLE PRODUCT BY ID OR SLUG
export async function fetchProductByIdFromSupabase(idOrSlug: string) {
  if (!supabase) return null;

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('*')
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .limit(1);

  if (prodErr || !products || products.length === 0) return null;

  const product = products[0];
  const [imagesRes, variantsRes, brandRes, catRes] = await Promise.all([
    supabase.from('product_images').select('*').eq('product_id', product.id),
    supabase.from('product_variants').select('*').eq('product_id', product.id),
    supabase.from('brands').select('*').eq('id', product.brand_id).single(),
    supabase.from('categories').select('*').eq('id', product.category_id).single()
  ]);

  return {
    ...product,
    brand: brandRes.data || null,
    category: catRes.data || null,
    images: imagesRes.data || [],
    variants: variantsRes.data || [],
    price: Number(product.selling_price),
    original_price: Number(product.mrp),
    mrp: Number(product.mrp),
    selling_price: Number(product.selling_price)
  };
}

// 3. DELETE PRODUCT FROM SUPABASE (PERMANENT DELETE / DEACTIVATE)
export async function deleteProductFromSupabase(productId: string): Promise<boolean> {
  if (!supabase) return false;

  const targetId = String(productId).trim();

  // Delete child records first to satisfy strict foreign key constraints
  try {
    await supabase.from('product_images').delete().eq('product_id', targetId);
    await supabase.from('product_variants').delete().eq('product_id', targetId);
    await supabase.from('wishlist_items').delete().eq('product_id', targetId);
  } catch (childErr) {
    console.warn('[Supabase Child Record Deletion Notice]:', childErr);
  }

  // Delete product row from Supabase products table
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', targetId);

  if (error) {
    console.error('[Supabase Delete Product Error]:', error);
    // If hard delete fails due to historical orders, soft delete by setting status = 'INACTIVE'
    const { error: softErr } = await supabase
      .from('products')
      .update({ status: 'INACTIVE', updated_at: new Date().toISOString() })
      .eq('id', targetId);

    if (softErr) {
      throw new Error(`Failed to delete product from Supabase: ${error.message}`);
    }
  }

  console.log(`[Supabase Delete Success] Product ID '${targetId}' successfully removed/deactivated from Supabase.`);
  return true;
}

// 4. CREATE PRODUCT IN SUPABASE
export async function createProductInSupabase(prodData: any) {
  if (!supabase) return null;

  const prodId = prodData.id || `prod-${Date.now()}`;
  const slug = prodData.slug || prodData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const mrp = Number(prodData.mrp);
  const selling_price = Number(prodData.selling_price);
  const discount_pct = Math.round(((mrp - selling_price) / mrp) * 100);
  const now = new Date().toISOString();

  const newProduct = {
    id: prodId,
    name: prodData.name,
    slug,
    brand_id: prodData.brand_id,
    category_id: prodData.category_id,
    gender: prodData.gender || 'MEN',
    description: prodData.description || '',
    material: prodData.material || '',
    fit: prodData.fit || '',
    care_instructions: prodData.care_instructions || '',
    mrp,
    selling_price,
    discount_pct,
    sku_prefix: prodData.sku_prefix,
    rating: 5.0,
    review_count: 0,
    is_featured: true,
    is_trending: true,
    is_new_arrival: true,
    status: 'ACTIVE',
    created_at: now,
    updated_at: now
  };

  const { error: prodErr } = await supabase.from('products').upsert([newProduct]);
  if (prodErr) {
    console.error('[Supabase Create Product Error]:', prodErr);
    throw prodErr;
  }

  if (Array.isArray(prodData.images) && prodData.images.length > 0) {
    await supabase.from('product_images').delete().eq('product_id', prodId);
    const imgRecords = prodData.images.map((img: any, idx: number) => {
      const rawUrl = typeof img === 'string' ? img : (img.url || img.image_url || '');
      const cleanUrl = ensurePermanentPublicImageUrl(rawUrl);
      return {
        id: `img-${prodId}-${idx}-${Date.now()}`,
        product_id: prodId,
        image_url: cleanUrl,
        color: img.color || '',
        is_primary: idx === 0 || !!img.is_primary,
        display_order: idx
      };
    });
    await supabase.from('product_images').insert(imgRecords);
  }

  if (Array.isArray(prodData.variants) && prodData.variants.length > 0) {
    await supabase.from('product_variants').delete().eq('product_id', prodId);
    const varRecords = prodData.variants.map((v: any) => ({
      id: `var-${prodId}-${v.color}-${v.size}-${Date.now()}`,
      product_id: prodId,
      color: v.color,
      size: v.size,
      sku: v.sku || `${prodData.sku_prefix}-${(v.color || 'CLR').substring(0, 2).toUpperCase()}-${v.size}`,
      stock: Number(v.stock || 0),
      created_at: now
    }));
    await supabase.from('product_variants').insert(varRecords);
  }

  console.log(`[Supabase Create Success] Product '${newProduct.name}' (ID: ${prodId}) inserted into Supabase.`);
  return newProduct;
}

// 5. UPDATE PRODUCT IN SUPABASE
export async function updateProductInSupabase(productId: string, prodData: any) {
  if (!supabase) return null;

  const targetId = String(productId).trim();
  const newMrp = Number(prodData.mrp);
  const newSelling = Number(prodData.selling_price);
  const discount_pct = Math.round(((newMrp - newSelling) / newMrp) * 100);
  const slug = prodData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const updateFields = {
    name: prodData.name,
    slug,
    brand_id: prodData.brand_id,
    category_id: prodData.category_id,
    gender: prodData.gender || 'MEN',
    description: prodData.description || '',
    material: prodData.material || '',
    fit: prodData.fit || '',
    care_instructions: prodData.care_instructions || '',
    mrp: newMrp,
    selling_price: newSelling,
    discount_pct,
    sku_prefix: prodData.sku_prefix,
    status: prodData.status || 'ACTIVE',
    updated_at: new Date().toISOString()
  };

  const { error: updateErr } = await supabase
    .from('products')
    .update(updateFields)
    .eq('id', targetId);

  if (updateErr) {
    console.error('[Supabase Update Product Error]:', updateErr);
    throw updateErr;
  }

  if (Array.isArray(prodData.images)) {
    await supabase.from('product_images').delete().eq('product_id', targetId);
    const imgRecords = prodData.images.map((img: any, idx: number) => {
      const rawUrl = typeof img === 'string' ? img : (img.url || img.image_url || '');
      const cleanUrl = ensurePermanentPublicImageUrl(rawUrl);
      return {
        id: `img-${targetId}-${idx}-${Date.now()}`,
        product_id: targetId,
        image_url: cleanUrl,
        color: img.color || '',
        is_primary: idx === 0 || img.is_primary,
        display_order: idx
      };
    });
    await supabase.from('product_images').insert(imgRecords);
  }

  if (Array.isArray(prodData.variants)) {
    await supabase.from('product_variants').delete().eq('product_id', targetId);
    const varRecords = prodData.variants.map((v: any) => ({
      id: `var-${targetId}-${v.color}-${v.size}-${Date.now()}`,
      product_id: targetId,
      color: v.color,
      size: v.size,
      sku: v.sku || `${prodData.sku_prefix}-${(v.color || 'CLR').substring(0, 2).toUpperCase()}-${v.size}`,
      stock: Number(v.stock || 0),
      created_at: new Date().toISOString()
    }));
    await supabase.from('product_variants').insert(varRecords);
  }

  console.log(`[Supabase Update Success] Product ID '${targetId}' updated in Supabase.`);
  return { id: targetId, ...updateFields };
}

// 6. UPDATE INVENTORY STOCK IN SUPABASE
export async function updateVariantStockInSupabase(variantId: string, newStock: number) {
  if (!supabase) return false;

  const { error } = await supabase
    .from('product_variants')
    .update({ stock: Number(newStock) })
    .eq('id', String(variantId).trim());

  if (error) {
    console.error('[Supabase Stock Update Error]:', error);
    throw error;
  }

  return true;
}

// 7. FETCH BRANDS & CATEGORIES FROM SUPABASE
export async function fetchBrandsFromSupabase() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('brands').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchCategoriesFromSupabase() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data || [];
}

// 8. USER & AUTHENTICATION (SUPABASE POSTGRESQL)
export async function fetchUserFromSupabase(emailOrPhone: string) {
  if (!supabase) return null;
  const raw = String(emailOrPhone || '').trim().toLowerCase();
  const digits = raw.replace(/[^0-9]/g, '');

  try {
    let query = supabase.from('users').select('*');
    if (raw.includes('@')) {
      query = query.eq('email', raw);
    } else if (digits.length >= 8) {
      query = query.ilike('phone', `%${digits}%`);
    } else {
      query = query.or(`email.eq.${raw},phone.ilike.%${digits}%`);
    }

    const { data, error } = await query.limit(1);
    if (error || !data || data.length === 0) return null;
    return data[0];
  } catch (err: any) {
    console.warn('[Supabase Fetch User notice]:', err?.message || err);
    return null;
  }
}

export async function updateAdminPasswordInSupabase(email: string, newPasswordHash: string) {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('email', email.trim().toLowerCase());

    if (error) {
      console.warn('[Supabase update password notice]:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase update password error]:', err?.message || err);
    return false;
  }
}
