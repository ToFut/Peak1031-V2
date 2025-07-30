#!/usr/bin/env node

// Simple port forwarding from port 80 to 8000 for OAuth callback
const http = require('http');
const httpProxy = require('http-proxy');

console.log('🔄 Setting up port forwarding: 80 -> 8000');

// Create a proxy server
const proxy = httpProxy.createProxyServer({});

// Create HTTP server on port 80
const server = http.createServer((req, res) => {
  console.log(`📨 Proxying request: ${req.method} ${req.url}`);
  
  // Forward all requests to port 8000
  proxy.web(req, res, {
    target: 'http://localhost:8000',
    changeOrigin: true
  });
});

// Handle proxy errors
proxy.on('error', (err, req, res) => {
  console.error('❌ Proxy error:', err.message);
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.end('Proxy error occurred');
});

// Start server
const PORT = 80;
server.listen(PORT, (err) => {
  if (err) {
    console.error('❌ Failed to start proxy server:', err.message);
    console.log('💡 Try running with sudo: sudo node setup-port-forward.js');
    process.exit(1);
  }
  
  console.log(`✅ Port forwarding active: http://localhost:${PORT} -> http://localhost:8000`);
  console.log('🔗 OAuth callback will now work with: http://localhost/oauth/callback');
  console.log('⏹️  Press Ctrl+C to stop');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down port forwarding...');
  server.close(() => {
    console.log('✅ Port forwarding stopped');
    process.exit(0);
  });
}); 