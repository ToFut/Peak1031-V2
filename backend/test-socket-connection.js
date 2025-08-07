const io = require('socket.io-client');
const axios = require('axios');

async function testSocketConnection() {
  try {
    // First, get a valid token
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });

    const authData = response.data;
    console.log('✅ Authentication successful');
    console.log('Token:', authData.token.substring(0, 50) + '...');

    // Connect to Socket.IO with the token
    const socket = io('http://localhost:5001', {
      auth: {
        token: authData.token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected successfully!');
      console.log('Socket ID:', socket.id);
      socket.disconnect();
      process.exit(0);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error.message);
      process.exit(1);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      console.error('❌ Connection timeout');
      socket.disconnect();
      process.exit(1);
    }, 10000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSocketConnection(); 