import app from '../server/index.js';

export default function handler(req: any, res: any) {
  let requestPath = req.url || '/';

  const forwardedUri = req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'] || req.originalUrl;
  if (typeof forwardedUri === 'string' && forwardedUri.length > 0 && forwardedUri !== '/api' && forwardedUri !== '/api/') {
    requestPath = forwardedUri;
  }

  // Ensure requestPath starts with /api for Express routing
  if (!requestPath.startsWith('/api')) {
    requestPath = `/api${requestPath.startsWith('/') ? '' : '/'}${requestPath}`;
  }

  req.url = requestPath;
  console.log(`[Vercel Serverless Invocation] ${req.method} -> ${req.url}`);
  return app(req, res);
}

