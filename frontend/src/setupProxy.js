const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy configuration for the primary API (port 3333)
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3333',
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('🔄 Proxying:', req.method, req.originalUrl, '->', 'http://localhost:3333' + req.originalUrl);
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

  // Proxy configuration for the secondary API (port 5333)
  app.use(
    '/api-secondary',
    createProxyMiddleware({
      target: 'http://localhost:5333',
      pathRewrite: {'^/api-secondary': '/api'},
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('🔄 Proxying:', req.method, req.originalUrl, '->', 'http://localhost:5333' + req.originalUrl);
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
  
  console.log('🚀 Proxy middleware configured:');
  console.log('   - /api/* -> http://localhost:3333/api/*');
  console.log('   - /api-secondary/* -> http://localhost:5333/api/*');
};