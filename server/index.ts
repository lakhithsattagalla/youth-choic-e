import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import brandRoutes from './routes/brands.js';
import cartRoutes from './routes/cart.js';
import wishlistRoutes from './routes/wishlist.js';
import orderRoutes from './routes/orders.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';
import whatsappBotRoutes from './routes/whatsappBot.js';
import aiRoutes from './routes/ai.js';
import { db } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Initialize Database
db.init();

// Create master API Router to handle requests both with /api prefix and stripped /api prefix (Vercel serverless)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/brands', brandRoutes);
app.use('/api/cart', cartRoutes);
app.use('/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/orders', orderRoutes);
app.use('/api/whatsapp', whatsappBotRoutes);
app.use('/whatsapp', whatsappBotRoutes);
app.use('/api/ai', aiRoutes);
app.use('/ai', aiRoutes);
app.use('/api/user', userRoutes);
app.use('/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/analytics', analyticsRoutes);

const apiRouter = express.Router();

apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    store: 'Youth Choice The Fashion Store',
    tagline: 'Define Your Style. Wear Your Confidence.',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiRouter);
app.use('/', apiRouter);

// Serve frontend static files in production deployment
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// 404 Handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global Express Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Express Global Error]:', err);
  if (!res.headersSent) {
    const statusCode = err.status || err.statusCode || 500;
    const clientMessage = statusCode >= 500
      ? 'Something went wrong. Please try again later.'
      : (err.message || 'Invalid request');

    res.status(statusCode).json({
      success: false,
      error: clientMessage,
      message: clientMessage
    });
  }
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Youth Choice The Fashion Store Server running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

export default app;
export { app };
