const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy all /api/* requests to backend
  // IMPORTANT: Keep the /api prefix in the forwarded request
  app.use(
    ['/api', '/api/*'],
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      ws: true, // Enable WebSocket proxy
      // Explicitly preserve the path with /api prefix
      pathRewrite: {
        '^/api': '/api' // Keep /api prefix (identity rewrite)
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('🔄 Proxying request:', req.method, req.url, '->', 'http://localhost:5001' + req.url);
        // Log headers for debugging
        console.log('   Headers:', req.headers.authorization ? 'Has Auth' : 'No Auth');
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('✅ Proxy response:', proxyRes.statusCode, req.url);
      },
      onError: (err, req, res) => {
        console.error('❌ Proxy error:', err.message, req.url);
        // Send error response
        if (!res.headersSent) {
          res.status(500).json({ error: 'Proxy error', message: err.message });
        }
      }
    })
  );
  
  console.log('🚀 Proxy middleware configured for /api/* -> http://localhost:5001/api/*');
};

