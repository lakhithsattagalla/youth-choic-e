import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

// Customer Components & Pages
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { FloatingCallButton } from './components/FloatingCallButton';
import { Home } from './pages/Home';
import { ProductsCatalog } from './pages/ProductsCatalog';
import { ProductDetail } from './pages/ProductDetail';
import { CartPage } from './pages/CartPage';
import { WishlistPage } from './pages/WishlistPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AccountPage } from './pages/AccountPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { BrandsPage } from './pages/BrandsPage';
import { OffersPage } from './pages/OffersPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Admin Components & Pages
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminInventoryPage } from './pages/admin/AdminInventoryPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminBrandsPage } from './pages/admin/AdminBrandsPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminCouponsPage } from './pages/admin/AdminCouponsPage';
import { AdminOffersPage } from './pages/admin/AdminOffersPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <Routes>
            
            {/* Admin Dedicated Authentication Route */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Admin Nested Routes with Sidebar Layout */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="inventory" element={<AdminInventoryPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="brands" element={<AdminBrandsPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="coupons" element={<AdminCouponsPage />} />
              <Route path="offers" element={<AdminOffersPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            {/* Customer Website Routes with Navbar, Footer & Fixed Bottom Nav */}
            <Route
              path="*"
              element={
                <div className="flex flex-col min-h-screen pb-16 relative">
                  <Navbar />
                  <main className="flex-1">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/men" element={<ProductsCatalog defaultGender="MEN" />} />
                      <Route path="/women" element={<ProductsCatalog defaultGender="WOMEN" />} />
                      <Route path="/new-arrivals" element={<ProductsCatalog />} />
                      <Route path="/trending" element={<ProductsCatalog />} />
                      <Route path="/products" element={<ProductsCatalog />} />
                      <Route path="/products/:id" element={<ProductDetail />} />
                      <Route path="/search" element={<ProductsCatalog />} />
                      <Route path="/brands" element={<BrandsPage />} />
                      <Route path="/offers" element={<OffersPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/wishlist" element={<WishlistPage />} />
                      <Route path="/checkout" element={<CheckoutPage />} />
                      <Route path="/account/*" element={<AccountPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </main>
                  <Footer />
                  <FloatingCallButton />
                  <BottomNav />
                </div>
              }
            />

          </Routes>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
};
