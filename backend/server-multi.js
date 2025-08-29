const PeakServer = require('./server');

// Create and start server on port 3333
const server3333 = new PeakServer();
process.env.PORT = 3333;
server3333.start();

// Create and start server on port 5333
const server5333 = new PeakServer();
process.env.PORT = 5333;
server5333.start();

