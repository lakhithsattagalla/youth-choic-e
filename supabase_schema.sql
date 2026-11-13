-- ====================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR YOUTH CHOICE THE FASHION STORE
-- ====================================================================

-- 1. BRANDS TABLE
CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  description TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  gender TEXT DEFAULT 'UNISEX',
  image_url TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  brand_id TEXT REFERENCES public.brands(id) ON DELETE SET NULL,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  gender TEXT DEFAULT 'MEN',
  description TEXT,
  material TEXT,
  fit TEXT,
  care_instructions TEXT,
  mrp NUMERIC(10, 2) NOT NULL,
  selling_price NUMERIC(10, 2) NOT NULL,
  discount_pct INTEGER DEFAULT 0,
  sku_prefix TEXT NOT NULL,
  rating NUMERIC(3, 2) DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT true,
  is_trending BOOLEAN DEFAULT true,
  is_new_arrival BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCT VARIANTS TABLE (Colors, Sizes & Inventory Stock)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  sku TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  price_override NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRODUCT IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  color TEXT,
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0
);

-- 6. CART ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.cart_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  variant_id TEXT NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. WISHLIST ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR HIGH-PERFORMANCE SEARCH & FILTERING
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR PUBLIC READ ACCESS
CREATE POLICY "Allow public read access to active products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public read access to variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Allow public read access to images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Allow public read access to categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to brands" ON public.brands FOR SELECT USING (true);

-- POLICIES FOR ALL OPERATIONS BY SERVICE ROLE / ADMIN
CREATE POLICY "Allow admin full write access to products" ON public.products FOR ALL USING (true);
CREATE POLICY "Allow admin full write access to variants" ON public.product_variants FOR ALL USING (true);
CREATE POLICY "Allow admin full write access to images" ON public.product_images FOR ALL USING (true);
