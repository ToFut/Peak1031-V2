const PeakServer = require('./server');

// Create and start server on port 5333
process.env.PORT = 5333;
const server = new PeakServer();
server.start();

