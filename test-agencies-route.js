const express = require('express');
const agenciesRoute = require('./backend/routes/agencies');

const app = express();
app.use('/api/agencies', agenciesRoute);

// Test the route
app.listen(5002, () => {
  console.log('Test server running on port 5002');
  
  // Test the route
  const http = require('http');
  const req = http.request({
    hostname: 'localhost',
    port: 5002,
    path: '/api/agencies?page=1&limit=20&includeStats=true',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  }, (res) => {
    console.log('Status:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('Response:', data);
      process.exit(0);
    });
  });
  
  req.on('error', (err) => {
    console.error('Error:', err);
    process.exit(1);
  });
  
  req.end();
});
