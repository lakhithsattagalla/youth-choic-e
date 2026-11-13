import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const DB_FILE = path.resolve(process.cwd(), 'youth_choice_db.json');

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  phone?: string;
  google_id?: string;
  role: 'CUSTOMER' | 'ADMIN';
  gender?: string;
  dob?: string;
  profile_img?: string;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  type: 'HOME' | 'WORK' | 'OTHER';
  recipient_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  gender: 'MEN' | 'WOMEN' | 'UNISEX';
  image_url: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  color?: string;
  is_primary: boolean;
  display_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  color: string;
  size: string;
  sku: string;
  stock: number;
  price_override?: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand_id: string;
  category_id: string;
  gender: 'MEN' | 'WOMEN' | 'UNISEX';
  description: string;
  material: string;
  fit: string;
  care_instructions: string;
  mrp: number;
  selling_price: number;
  discount_pct: number;
  price?: number;
  sku_prefix: string;
  rating: number;
  review_count: number;
  is_featured: boolean;
  is_trending: boolean;
  is_new_arrival: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  variant_id: string;
  quantity: number;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  brand_name: string;
  color: string;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  cod_fee?: number;
  payment_method?: 'ONLINE_UPI' | 'COD';
  coupon_code?: string;
  grand_total: number;
  status: 
    | 'PENDING_CONFIRMATION'
    | 'WHATSAPP_CONTACTED'
    | 'ORDER_CONFIRMED'
    | 'PAYMENT_CONFIRMED'
    | 'PROCESSING'
    | 'SHIPPED'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'CANCELLED';
  whatsapp_message?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  user_name: string;
  rating: number;
  comment: string;
  is_verified: boolean;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  start_at: string;
  end_at: string;
  status?: 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  is_active?: boolean;
  total_usage_limit?: number;
  per_customer_limit?: number;
  first_order_only?: boolean;
  applicable_products?: string[];
  applicable_categories?: string[];
  applicable_brands?: string[];
  usage_count: number;
  created_at: string;
}

export interface OfferItem {
  id: string;
  offer_id: string;
  product_id: string;
  discount_type: 'PERCENT' | 'FIXED';
  discount_value: number;
}

export interface Offer {
  id: string;
  name?: string;
  title: string;
  subtitle?: string;
  banner_url?: string;
  discount_tag?: string;
  link_url?: string;
  allow_coupon_with_offer?: boolean;
  start_at?: string;
  end_at?: string;
  is_active?: boolean;
  status?: 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  items?: OfferItem[];
  views_count?: number;
  orders_count?: number;
  total_revenue?: number;
  created_at: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  event_type: string;
  user_id?: string;
  product_id?: string;
  category_id?: string;
  brand_id?: string;
  metadata?: string;
  created_at: string;
}

export interface DatabaseSchema {
  users: User[];
  addresses: Address[];
  brands: Brand[];
  categories: Category[];
  products: Product[];
  product_images: ProductImage[];
  product_variants: ProductVariant[];
  cart_items: CartItem[];
  wishlist_items: WishlistItem[];
  orders: Order[];
  order_items: OrderItem[];
  reviews: Review[];
  coupons: Coupon[];
  offers: Offer[];
  notifications: Notification[];
  analytics_events: AnalyticsEvent[];
}

let dbData: DatabaseSchema = {
  users: [],
  addresses: [],
  brands: [],
  categories: [],
  products: [],
  product_images: [],
  product_variants: [],
  cart_items: [],
  wishlist_items: [],
  orders: [],
  order_items: [],
  reviews: [],
  coupons: [],
  offers: [],
  notifications: [],
  analytics_events: []
};

export function saveDatabase() {
  const targetPaths = [
    DB_FILE,
    path.resolve(process.cwd(), 'youth_choice_db.json'),
    '/tmp/youth_choice_db.json'
  ];

  for (const p of targetPaths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(p, JSON.stringify(dbData, null, 2), 'utf-8');
    } catch (err) {
      // Ignore fallback write errors
    }
  }
}

export function loadDatabase() {
  const possiblePaths = [
    DB_FILE,
    path.resolve(process.cwd(), 'youth_choice_db.json'),
    '/tmp/youth_choice_db.json',
    path.resolve(process.cwd(), '../youth_choice_db.json')
  ];

  let loaded = false;
  for (const dbPath of possiblePaths) {
    if (fs.existsSync(dbPath)) {
      try {
        const data = fs.readFileSync(dbPath, 'utf-8');
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.products)) {
          dbData = parsed;
          console.log('Database loaded successfully from:', dbPath);
          loaded = true;
          break;
        }
      } catch (e) {
        console.error('Failed to parse database JSON at:', dbPath);
      }
    }
  }

  if (!loaded) {
    try {
      const initialDbData = require('../youth_choice_db.json');
      if (initialDbData && typeof initialDbData === 'object' && Array.isArray((initialDbData as any).users)) {
        dbData = JSON.parse(JSON.stringify(initialDbData));
        console.log('Database loaded from initial JSON fallback');
        loaded = true;
      }
    } catch (e) {
      console.warn('Initial JSON require fallback failed:', e);
    }

    if (!loaded) {
      seedDatabase();
    }
  }

  // Ensure Admin User ALWAYS exists in database
  ensureAdminUser();
  ensureCouponFields();
  ensureOfferFields();
}

export function deleteProductFromDb(productId: string): boolean {
  const targetId = String(productId).trim();

  dbData.products = (dbData.products || []).filter(
    p => String(p.id).trim() !== targetId && String(p.slug).trim() !== targetId
  );

  // Clean up product images
  dbData.product_images = (dbData.product_images || []).filter(
    img => String(img.product_id).trim() !== targetId
  );

  // Clean up product variants
  const removedVariantIds = new Set(
    (dbData.product_variants || [])
      .filter(v => String(v.product_id).trim() === targetId)
      .map(v => String(v.id))
  );

  dbData.product_variants = (dbData.product_variants || []).filter(
    v => String(v.product_id).trim() !== targetId
  );

  // Clean up cart items
  dbData.cart_items = (dbData.cart_items || []).filter(c => {
    return !removedVariantIds.has(String(c.variant_id));
  });

  // Clean up wishlist items
  dbData.wishlist_items = (dbData.wishlist_items || []).filter(
    w => String(w.product_id).trim() !== targetId
  );

  // Clean up offers items
  if (Array.isArray(dbData.offers)) {
    dbData.offers.forEach((o: any) => {
      if (Array.isArray(o.items)) {
        o.items = o.items.filter((item: any) => String(item.product_id).trim() !== targetId);
      }
    });
  }

  // Clean up reviews
  dbData.reviews = (dbData.reviews || []).filter(
    r => String(r.product_id).trim() !== targetId
  );

  saveDatabase();
  return true;
}


function ensureOfferFields() {
  if (!dbData.offers) dbData.offers = [];
  const pastDefault = '2026-09-01T00:00:00.000+05:30';
  const futureDefault = '2026-12-31T23:59:59.000+05:30';

  dbData.offers.forEach((o: any) => {
    if (!o.name) o.name = o.title || 'Special Promotion';
    if (!o.start_at) o.start_at = pastDefault;
    if (!o.end_at) o.end_at = futureDefault;
    if (o.is_active === undefined) o.is_active = o.status !== 'INACTIVE';
    if (!o.items) {
      const sampleProds = (dbData.products || []).slice(0, 3).map(p => ({
        id: `off-item-${Date.now()}-${p.id}`,
        offer_id: o.id,
        product_id: p.id,
        discount_type: 'PERCENT' as const,
        discount_value: 20
      }));
      o.items = sampleProds;
    }
  });
}

function ensureCouponFields() {
  if (!dbData.coupons) dbData.coupons = [];
  const pastDefault = '2026-09-01T00:00:00.000+05:30';
  const futureDefault = '2026-12-31T23:59:59.000+05:30';

  dbData.coupons.forEach(c => {
    if (!c.start_at) c.start_at = pastDefault;
    if (!c.end_at) c.end_at = futureDefault;
  });
}

function ensureAdminUser() {
  if (!dbData.users) dbData.users = [];
  const adminEmail = 'youthchoicemenswear@gmail.com';
  const adminPhone = '8522000504';

  let admin = dbData.users.find(u => u.email.trim().toLowerCase() === adminEmail || (u.phone && u.phone.includes(adminPhone)));
  if (!admin) {
    admin = {
      id: 'user-admin-1',
      email: adminEmail,
      password_hash: bcrypt.hashSync('Sai naveen', 10),
      name: 'Youth Choice Admin',
      phone: '+918522000504',
      role: 'ADMIN',
      gender: 'MALE',
      created_at: new Date().toISOString()
    };
    dbData.users.unshift(admin);
  } else {
    admin.role = 'ADMIN';
    admin.email = adminEmail;
    admin.phone = '+918522000504';
    try {
      if (!admin.password_hash || !bcrypt.compareSync('Sai naveen', admin.password_hash)) {
        admin.password_hash = bcrypt.hashSync('Sai naveen', 10);
      }
    } catch (e) {
      admin.password_hash = bcrypt.hashSync('Sai naveen', 10);
    }
  }
}

export function seedDatabase() {
  console.log('Seeding initial Youth Choice The Fashion Store database...');
  const passwordHashAdmin = bcrypt.hashSync('Sai naveen', 10);
  const passwordHashUser = bcrypt.hashSync('customer123', 10);

  const now = new Date().toISOString();

  // 1. Users
  dbData.users = [
    {
      id: 'user-admin-1',
      email: 'youthchoicemenswear@gmail.com',
      password_hash: passwordHashAdmin,
      name: 'Youth Choice Admin',
      phone: '+918522000504',
      role: 'ADMIN',
      gender: 'MALE',
      created_at: now
    },
    {
      id: 'user-customer-1',
      email: 'john@example.com',
      password_hash: passwordHashUser,
      name: 'John Doe',
      phone: '+919123456789',
      role: 'CUSTOMER',
      gender: 'MALE',
      created_at: now
    }
  ];

  // 2. Addresses
  dbData.addresses = [
    {
      id: 'addr-1',
      user_id: 'user-customer-1',
      type: 'HOME',
      recipient_name: 'John Doe',
      phone: '+919123456789',
      street: 'Flat 402, Royal Residency, Road No. 3, Banjara Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500034',
      is_default: true
    }
  ];

  // 3. Brands
  dbData.brands = [
    { id: 'brand-nike', name: 'Nike', logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&auto=format&fit=crop&q=80', description: 'World leader in contemporary sportswear and streetwear.', status: 'ACTIVE', created_at: now },
    { id: 'brand-adidas', name: 'Adidas', logo: 'https://images.unsplash.com/photo-1518002171953-a0847b74681d?w=100&auto=format&fit=crop&q=80', description: 'Iconic three stripes casual and sports wear.', status: 'ACTIVE', created_at: now },
    { id: 'brand-puma', name: 'Puma', logo: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=100&auto=format&fit=crop&q=80', description: 'Fast, bold, and modern high-fashion apparel.', status: 'ACTIVE', created_at: now },
    { id: 'brand-levis', name: "Levi's", logo: 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=100&auto=format&fit=crop&q=80', description: 'The definitive authority in denim and casual jeans.', status: 'ACTIVE', created_at: now },
    { id: 'brand-hm', name: 'H&M', logo: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=100&auto=format&fit=crop&q=80', description: 'Trendy fast-fashion essentials for young trendsetters.', status: 'ACTIVE', created_at: now },
    { id: 'brand-zara', name: 'Zara', logo: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=100&auto=format&fit=crop&q=80', description: 'High-street European tailored menswear and womenswear.', status: 'ACTIVE', created_at: now },
    { id: 'brand-lp', name: 'Louis Philippe', logo: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=100&auto=format&fit=crop&q=80', description: 'Premium executive formalwear and aristocratic luxury.', status: 'ACTIVE', created_at: now },
    { id: 'brand-allen-solly', name: 'Allen Solly', logo: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=100&auto=format&fit=crop&q=80', description: 'Pioneer of Friday Dressing and vibrant smart casuals.', status: 'ACTIVE', created_at: now },
    { id: 'brand-peter-england', name: 'Peter England', logo: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=100&auto=format&fit=crop&q=80', description: 'Honest value, elegant fitting menswear.', status: 'ACTIVE', created_at: now },
    { id: 'brand-van-heusen', name: 'Van Heusen', logo: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=100&auto=format&fit=crop&q=80', description: 'Power dressing for corporate and formal settings.', status: 'ACTIVE', created_at: now }
  ];

  // 4. Categories
  dbData.categories = [
    // Men Categories
    { id: 'cat-men-tshirts', name: 'T-Shirts', slug: 't-shirts', gender: 'MEN', image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },
    { id: 'cat-men-shirts', name: 'Shirts', slug: 'shirts', gender: 'MEN', image_url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },
    { id: 'cat-men-jeans', name: 'Jeans', slug: 'jeans', gender: 'MEN', image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },
    { id: 'cat-men-trousers', name: 'Trousers', slug: 'trousers', gender: 'MEN', image_url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },
    { id: 'cat-men-cargo', name: 'Cargo Pants', slug: 'cargo-pants', gender: 'MEN', image_url: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },
    { id: 'cat-men-hoodies', name: 'Hoodies', slug: 'hoodies', gender: 'MEN', image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },
    { id: 'cat-men-jackets', name: 'Jackets', slug: 'jackets', gender: 'MEN', image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },
    { id: 'cat-men-ethnic', name: 'Ethnic Wear', slug: 'ethnic-wear', gender: 'MEN', image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },
    { id: 'cat-men-footwear', name: 'Footwear', slug: 'footwear', gender: 'MEN', image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },
    { id: 'cat-men-accessories', name: 'Accessories', slug: 'accessories', gender: 'MEN', image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },

    // Women Categories
    { id: 'cat-women-tops', name: 'Tops', slug: 'women-tops', gender: 'WOMEN', image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },
    { id: 'cat-women-dresses', name: 'Dresses', slug: 'women-dresses', gender: 'WOMEN', image_url: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },
    { id: 'cat-women-kurtis', name: 'Kurtis', slug: 'women-kurtis', gender: 'WOMEN', image_url: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },
    { id: 'cat-women-sarees', name: 'Sarees', slug: 'women-sarees', gender: 'WOMEN', image_url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },
    { id: 'cat-women-jeans', name: 'Jeans', slug: 'women-jeans', gender: 'WOMEN', image_url: 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },
    { id: 'cat-women-jackets', name: 'Jackets', slug: 'women-jackets', gender: 'WOMEN', image_url: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now },
    { id: 'cat-women-handbags', name: 'Handbags', slug: 'women-handbags', gender: 'WOMEN', image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop&q=80', status: 'ACTIVE', created_at: now }
  ];

  // 5. Products & Variants & Images (Initialized empty)
  dbData.products = [];
  dbData.product_images = [];
  dbData.product_variants = [];
  dbData.reviews = [];
  dbData.cart_items = [];
  dbData.wishlist_items = [];
  dbData.orders = [];
  dbData.order_items = [];
  dbData.analytics_events = [];

  saveDatabase();
  console.log('Database initialized cleanly without simulated sample products.');
}

// Accessor helper for database
export const db = {
  get data() {
    return dbData;
  },
  save: saveDatabase,
  init: loadDatabase
};

// Auto load DB on startup
loadDatabase();
