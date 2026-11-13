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
    const pImages = images.filter(img => img.product_id === p.id);
    const pVariants = variants.filter(v => v.product_id === p.id);
    const totalStock = pVariants.reduce((sum, v) => sum + (v.stock || 0), 0);

    return {
      ...p,
      brand_name: brandObj?.name || 'Brand',
      category_name: catObj?.name || 'Category',
      images: pImages,
      variants: pVariants,
      total_stock: totalStock,
      primary_image: pImages.find(i => i.is_primary)?.image_url || pImages[0]?.image_url || '',
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

  const { error: prodErr } = await supabase.from('products').insert([newProduct]);
  if (prodErr) {
    console.error('[Supabase Create Product Error]:', prodErr);
    throw prodErr;
  }

  if (Array.isArray(prodData.images) && prodData.images.length > 0) {
    const imgRecords = prodData.images.map((img: any, idx: number) => ({
      id: `img-${prodId}-${idx}`,
      product_id: prodId,
      image_url: typeof img === 'string' ? img : img.url,
      color: img.color || '',
      is_primary: idx === 0 || img.is_primary,
      display_order: idx
    }));
    await supabase.from('product_images').insert(imgRecords);
  }

  if (Array.isArray(prodData.variants) && prodData.variants.length > 0) {
    const varRecords = prodData.variants.map((v: any) => ({
      id: `var-${prodId}-${v.color}-${v.size}`,
      product_id: prodId,
      color: v.color,
      size: v.size,
      sku: v.sku || `${prodData.sku_prefix}-${(v.color || 'CLR').substring(0, 2).toUpperCase()}-${v.size}`,
      stock: Number(v.stock || 0),
      created_at: now
    }));
    await supabase.from('product_variants').insert(varRecords);
  }

  console.log(`[Supabase Create Success] Product '${newProduct.name}' inserted into Supabase.`);
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
    const imgRecords = prodData.images.map((img: any, idx: number) => ({
      id: `img-${targetId}-${idx}-${Date.now()}`,
      product_id: targetId,
      image_url: typeof img === 'string' ? img : img.url,
      color: img.color || '',
      is_primary: idx === 0 || img.is_primary,
      display_order: idx
    }));
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
