import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

export async function runSupabaseMigration() {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    console.log('[Supabase DB Migration] No POSTGRES_URL found. Skipping direct SQL migration.');
    return { success: false, reason: 'No connection string' };
  }

  // Ensure SSL validation allows Supabase PostgreSQL certificate
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  let cleanConnString = connectionString;
  try {
    const parsedUrl = new URL(connectionString);
    parsedUrl.searchParams.delete('sslmode');
    cleanConnString = parsedUrl.toString();
  } catch (e) {}

  const pool = new Pool({
    connectionString: cleanConnString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
  });

  try {
    const client = await pool.connect();
    try {
      console.log('[Supabase DB Migration] Connected to PostgreSQL. Applying tables & RLS schemas...');

      // 1. Core Tables
      await client.query(`
        -- BRANDS
        CREATE TABLE IF NOT EXISTS public.brands (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          logo TEXT,
          description TEXT,
          status TEXT DEFAULT 'ACTIVE',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- CATEGORIES
        CREATE TABLE IF NOT EXISTS public.categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          gender TEXT DEFAULT 'UNISEX',
          image_url TEXT,
          status TEXT DEFAULT 'ACTIVE',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- PRODUCTS
        CREATE TABLE IF NOT EXISTS public.products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          brand_id TEXT,
          category_id TEXT,
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

        -- PRODUCT VARIANTS
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

        -- PRODUCT IMAGES
        CREATE TABLE IF NOT EXISTS public.product_images (
          id TEXT PRIMARY KEY,
          product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          color TEXT,
          is_primary BOOLEAN DEFAULT false,
          display_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- USERS
        CREATE TABLE IF NOT EXISTS public.users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          phone TEXT,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'CUSTOMER',
          gender TEXT DEFAULT 'MALE',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- CART ITEMS
        CREATE TABLE IF NOT EXISTS public.cart_items (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          variant_id TEXT NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
          quantity INTEGER DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- WISHLIST ITEMS
        CREATE TABLE IF NOT EXISTS public.wishlist_items (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 2. Indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
        CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand_id);
        CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
        CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
        CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
        CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
      `);

      // 3. Row Level Security (RLS) & Policies
      await client.query(`
        ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

        -- Public Read Access Policies
        DROP POLICY IF EXISTS "Public Read Products" ON public.products;
        CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Public Read Variants" ON public.product_variants;
        CREATE POLICY "Public Read Variants" ON public.product_variants FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Public Read Images" ON public.product_images;
        CREATE POLICY "Public Read Images" ON public.product_images FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
        CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Public Read Brands" ON public.brands;
        CREATE POLICY "Public Read Brands" ON public.brands FOR SELECT USING (true);

        -- Full Access Policies for Operations
        DROP POLICY IF EXISTS "Full Access Products" ON public.products;
        CREATE POLICY "Full Access Products" ON public.products FOR ALL USING (true) WITH CHECK (true);

        DROP POLICY IF EXISTS "Full Access Variants" ON public.product_variants;
        CREATE POLICY "Full Access Variants" ON public.product_variants FOR ALL USING (true) WITH CHECK (true);

        DROP POLICY IF EXISTS "Full Access Images" ON public.product_images;
        CREATE POLICY "Full Access Images" ON public.product_images FOR ALL USING (true) WITH CHECK (true);

        DROP POLICY IF EXISTS "Full Access Categories" ON public.categories;
        CREATE POLICY "Full Access Categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

        DROP POLICY IF EXISTS "Full Access Brands" ON public.brands;
        CREATE POLICY "Full Access Brands" ON public.brands FOR ALL USING (true) WITH CHECK (true);

        DROP POLICY IF EXISTS "Full Access Users" ON public.users;
        CREATE POLICY "Full Access Users" ON public.users FOR ALL USING (true) WITH CHECK (true);
      `);

      // 4. Seed Admin User in PostgreSQL with temporary password 'youthchoice' (preserve if exists)
      const adminPasswordHash = bcrypt.hashSync('youthchoice', 10);
      await client.query(`
        INSERT INTO public.users (id, email, phone, password_hash, name, role, gender)
        VALUES (
          'user-admin-1',
          'youthchoicemenswear@gmail.com',
          '+918522000504',
          $1,
          'Youth Choice Admin',
          'ADMIN',
          'MALE'
        )
        ON CONFLICT (email) DO UPDATE SET
          role = 'ADMIN',
          password_hash = COALESCE(users.password_hash, $1),
          updated_at = NOW();
      `, [adminPasswordHash]);

      // 5. Seed Initial Brands if empty
      const brandsCountRes = await client.query('SELECT COUNT(*) FROM public.brands');
      if (parseInt(brandsCountRes.rows[0].count, 10) === 0) {
        await client.query(`
          INSERT INTO public.brands (id, name, description) VALUES
          ('brand-youth-choice', 'Youth Choice', 'Official Brand of Youth Choice Mens Wear'),
          ('brand-levis', 'Levis', 'Iconic Denim and Casual Wear'),
          ('brand-zara', 'Zara', 'Modern Contemporary Styles'),
          ('brand-hm', 'H&M', 'Trendy Everyday Fashion')
          ON CONFLICT (id) DO NOTHING;
        `);
      }

      // 6. Seed Initial Categories if empty
      const catsCountRes = await client.query('SELECT COUNT(*) FROM public.categories');
      if (parseInt(catsCountRes.rows[0].count, 10) === 0) {
        await client.query(`
          INSERT INTO public.categories (id, name, slug, gender, image_url) VALUES
          ('cat-shirts', 'Shirts', 'shirts', 'MEN', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80'),
          ('cat-tshirts', 'T-Shirts', 't-shirts', 'MEN', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'),
          ('cat-jeans', 'Jeans', 'jeans', 'MEN', 'https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80'),
          ('cat-trousers', 'Trousers', 'trousers', 'MEN', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80'),
          ('cat-jackets', 'Jackets', 'jackets', 'MEN', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80'),
          ('cat-kurtas', 'Kurtas & Ethnic', 'kurtas', 'MEN', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80')
          ON CONFLICT (id) DO NOTHING;
        `);
      }

      // 7. Verify / Configure Storage Bucket
      try {
        await client.query(`
          INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
          VALUES (
            'product-images',
            'product-images',
            true,
            10485760,
            ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
          )
          ON CONFLICT (id) DO UPDATE SET
            public = true,
            file_size_limit = 10485760,
            allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

          DROP POLICY IF EXISTS "Public View Product Images" ON storage.objects;
          CREATE POLICY "Public View Product Images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

          DROP POLICY IF EXISTS "Public Upload Product Images" ON storage.objects;
          CREATE POLICY "Public Upload Product Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');

          DROP POLICY IF EXISTS "Public Update Product Images" ON storage.objects;
          CREATE POLICY "Public Update Product Images" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images') WITH CHECK (bucket_id = 'product-images');

          DROP POLICY IF EXISTS "Public Delete Product Images" ON storage.objects;
          CREATE POLICY "Public Delete Product Images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');
        `);
      } catch (storageErr: any) {
        console.warn('[Supabase DB Migration] Storage SQL notice:', storageErr.message);
      }

      console.log('[Supabase DB Migration] Tables & Schemas verified successfully!');
      return { success: true };
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[Supabase DB Migration Error]:', err.message);
    return { success: false, error: err.message };
  } finally {
    await pool.end();
  }
}

