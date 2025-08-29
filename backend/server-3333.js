const PeakServer = require('./server');

// Create and start server on port 3333
process.env.PORT = 3333;
const server = new PeakServer();
server.start();

