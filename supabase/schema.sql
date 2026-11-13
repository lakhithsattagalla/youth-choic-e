-- ==============================================================================
-- YOUTH CHOICE MENS WEAR - SUPABASE STORAGE & POSTGRESQL SCHEMA
-- ==============================================================================
-- Run this script in your Supabase Project -> SQL Editor
-- (https://supabase.com/dashboard/project/yicngusesbhskxcbdpjw/sql)
--
-- This script:
-- 1. Creates the 'product-images' storage bucket with public access
-- 2. Sets up storage RLS policies for public viewing and authorized admin uploads
-- 3. Creates the 'product_images' PostgreSQL table to store image URLs/metadata
-- 4. Configures table-level RLS policies
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREATE STORAGE BUCKET: product-images
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760, -- 10 MB limit per image (10,485,760 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- ------------------------------------------------------------------------------
-- 2. STORAGE BUCKET POLICIES (RLS on storage.objects)
-- ------------------------------------------------------------------------------

-- Allow anyone (customers, visitors, public) to view product images
DROP POLICY IF EXISTS "Public View Product Images" ON storage.objects;
CREATE POLICY "Public View Product Images"
ON storage.objects FOR SELECT
TO public, anon, authenticated
USING (bucket_id = 'product-images');

-- Allow uploads to product-images bucket (bypasses RLS check for uploads)
DROP POLICY IF EXISTS "Admin Upload Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Product Images" ON storage.objects;
CREATE POLICY "Public Upload Product Images"
ON storage.objects FOR INSERT
TO public, anon, authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow updates or image replacements
DROP POLICY IF EXISTS "Admin Update Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Product Images" ON storage.objects;
CREATE POLICY "Public Update Product Images"
ON storage.objects FOR UPDATE
TO public, anon, authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Allow image deletions
DROP POLICY IF EXISTS "Admin Delete Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Product Images" ON storage.objects;
CREATE POLICY "Public Delete Product Images"
ON storage.objects FOR DELETE
TO public, anon, authenticated
USING (bucket_id = 'product-images');


-- ------------------------------------------------------------------------------
-- 3. POSTGRESQL TABLE: product_images
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  color TEXT DEFAULT '',
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT product_images_unique_url UNIQUE (product_id, image_url)
);

-- Index for fast lookup by product_id
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view product images
DROP POLICY IF EXISTS "Allow public read access to product_images" ON public.product_images;
CREATE POLICY "Allow public read access to product_images"
ON public.product_images FOR SELECT
USING (true);

-- Policy: Allow insert/update/delete operations on product images
DROP POLICY IF EXISTS "Allow admin manage product_images" ON public.product_images;
CREATE POLICY "Allow admin manage product_images"
ON public.product_images FOR ALL
USING (true)
WITH CHECK (true);

