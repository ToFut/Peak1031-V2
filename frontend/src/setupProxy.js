const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5001',
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('🔄 Proxying request:', req.method, req.url, '->', proxyReq.path);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('✅ Proxy response:', proxyRes.statusCode, req.url);
      },
      onError: (err, req, res) => {
        console.error('❌ Proxy error:', err.message, req.url);
      }
    })
  );
};

