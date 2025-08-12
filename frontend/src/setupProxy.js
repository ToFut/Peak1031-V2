const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Use the simple proxy configuration to forward all /api requests
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('🔄 Proxying:', req.method, req.originalUrl, '->', 'http://localhost:5001' + req.originalUrl);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('✅ Response:', proxyRes.statusCode, 'for', req.originalUrl);
      },
      onError: (err, req, res) => {
        console.error('❌ Proxy error:', err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Proxy error', message: err.message });
        }
      }
    })
  );
  
  console.log('🚀 Proxy middleware configured for /api/* -> http://localhost:5001/api/*');
};



