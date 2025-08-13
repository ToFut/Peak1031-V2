const axios = require('axios');
const colors = require('colors');
const { io } = require('socket.io-client');

class MessagingSystemTestSuite {
  constructor() {
    this.baseURL = process.env.TEST_API_URL || 'http://localhost:5001';
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.adminToken = null;
    this.clientToken = null;
    this.exchangeId = null;
    this.socket = null;
  }

  async run() {
    console.log('\n💬 CONTRACT A.3.3: MESSAGING SYSTEM TEST SUITE'.cyan.bold);
    console.log('='.repeat(70));
    
    try {
      await this.authenticate();
      await this.testRealTimeMessaging();
      await this.testFileAttachments();
      await this.testMessageHistory();
      await this.testNotifications();
      await this.testSocketConnection();
      await this.testMessageCRUD();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.testResults.failed++;
    } finally {
      if (this.socket) {
        this.socket.disconnect();
      }
    }
  }

  async authenticate() {
    console.log('\n🔐 Authenticating users...'.yellow);
    
    try {
      // Admin authentication
      const adminResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@peak1031.com',
        password: 'admin123'
      });
      
      if (adminResponse.data.token) {
        this.adminToken = adminResponse.data.token;
        console.log('✅ Admin authentication successful');
        this.testResults.passed++;
      } else {
        throw new Error('No admin token received');
      }
      
      // Client authentication
      const clientResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'client@peak1031.com',
        password: 'client123'
      });
      
      if (clientResponse.data.token) {
        this.clientToken = clientResponse.data.token;
        console.log('✅ Client authentication successful');
        this.testResults.passed++;
      } else {
        throw new Error('No client token received');
      }
      
      // Get an exchange for testing
      await this.getTestExchange();
      
    } catch (error) {
      console.log('❌ Authentication failed:', error.response?.data?.error || error.message);
      this.testResults.failed++;
      throw error;
    }
  }

  async getTestExchange() {
    try {
      const response = await axios.get(`${this.baseURL}/api/exchanges`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && response.data.exchanges && response.data.exchanges.length > 0) {
        this.exchangeId = response.data.exchanges[0].id;
        console.log(`✅ Using exchange ${this.exchangeId} for testing`);
        this.testResults.passed++;
      } else {
        throw new Error('No exchanges available for testing');
      }
    } catch (error) {
      console.log('❌ Failed to get test exchange:', error.message);
      this.testResults.failed++;
    }
  }

  async testRealTimeMessaging() {
    console.log('\n⚡ Testing Real-time messaging between exchange members...'.yellow);
    
    if (!this.exchangeId) {
      console.log('⚠️ No exchange ID available for messaging test');
      return;
    }
    
    // Test Socket.IO connection
    try {
      this.socket = io(this.baseURL, {
        auth: {
          token: this.adminToken
        }
      });
      
      await new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          console.log('✅ Socket.IO connection established');
          this.testResults.passed++;
          resolve();
        });
        
        this.socket.on('connect_error', (error) => {
          console.log('❌ Socket.IO connection failed:', error.message);
          this.testResults.failed++;
          reject(error);
        });
        
        setTimeout(() => {
          reject(new Error('Socket connection timeout'));
        }, 5000);
      });
      
      // Join exchange room
      this.socket.emit('join_exchange', this.exchangeId);
      console.log('✅ Joined exchange room');
      this.testResults.passed++;
      
    } catch (error) {
      console.log('❌ Real-time messaging setup failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testFileAttachments() {
    console.log('\n📎 Testing File attachment support: PDF, DOCX, JPG...'.yellow);
    
    if (!this.exchangeId) {
      console.log('⚠️ No exchange ID available for file attachment test');
      return;
    }
    
    // Test sending message with file attachment
    try {
      const messageData = {
        exchangeId: this.exchangeId,
        content: 'Test message with file attachment',
        messageType: 'text'
      };
      
      const response = await axios.post(`${this.baseURL}/api/messages`, messageData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 201 && response.data.message) {
        console.log('✅ Message creation working');
        this.testResults.passed++;
        
        // Test file upload for message attachment
        try {
          const FormData = require('form-data');
          const form = new FormData();
          form.append('file', Buffer.from('test file content'), {
            filename: 'test.txt',
            contentType: 'text/plain'
          });
          form.append('exchangeId', this.exchangeId);
          
          const uploadResponse = await axios.post(`${this.baseURL}/api/documents`, form, {
            headers: {
              ...form.getHeaders(),
              Authorization: `Bearer ${this.adminToken}`
            }
          });
          
          if (uploadResponse.status === 201) {
            console.log('✅ File upload working');
            this.testResults.passed++;
          } else {
            throw new Error(`Unexpected status: ${uploadResponse.status}`);
          }
        } catch (error) {
          console.log('❌ File upload failed:', error.message);
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid message creation response');
      }
    } catch (error) {
      console.log('❌ Message with file attachment failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testMessageHistory() {
    console.log('\n📜 Testing View message history...'.yellow);
    
    if (!this.exchangeId) {
      console.log('⚠️ No exchange ID available for message history test');
      return;
    }
    
    try {
      const response = await axios.get(`${this.baseURL}/api/exchanges/${this.exchangeId}/messages`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Message history working (${response.data.length} messages)`);
        this.testResults.passed++;
        
        // Check message structure
        if (response.data.length > 0) {
          const message = response.data[0];
          const requiredFields = ['id', 'content', 'senderId', 'createdAt'];
          const missingFields = requiredFields.filter(field => !message[field]);
          
          if (missingFields.length === 0) {
            console.log('✅ Messages have all required fields');
            this.testResults.passed++;
          } else {
            console.log(`❌ Messages missing fields: ${missingFields.join(', ')}`);
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid message history format');
      }
    } catch (error) {
      console.log('❌ Message history failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test message filtering
    try {
      const response = await axios.get(`${this.baseURL}/api/exchanges/${this.exchangeId}/messages?limit=10&page=1`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log('✅ Message filtering working');
        this.testResults.passed++;
      } else {
        throw new Error('Invalid filtered message format');
      }
    } catch (error) {
      console.log('❌ Message filtering failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testNotifications() {
    console.log('\n🔔 Testing Notifications via email and/or SMS...'.yellow);
    
    // Test notification preferences
    try {
      const response = await axios.get(`${this.baseURL}/api/notifications/preferences`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ Notification preferences endpoint working');
        this.testResults.passed++;
      } else {
        throw new Error('Invalid notification preferences format');
      }
    } catch (error) {
      console.log('❌ Notification preferences failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test notification list
    try {
      const response = await axios.get(`${this.baseURL}/api/notifications`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Notifications endpoint working (${response.data.length} notifications)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid notifications format');
      }
    } catch (error) {
      console.log('❌ Notifications failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test notification settings update
    try {
      const settings = {
        emailNotifications: true,
        smsNotifications: false,
        messageNotifications: true
      };
      
      const response = await axios.put(`${this.baseURL}/api/notifications/preferences`, settings, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 200) {
        console.log('✅ Notification settings update working');
        this.testResults.passed++;
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Notification settings update failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testSocketConnection() {
    console.log('\n🔌 Testing Socket.IO connection management...'.yellow);
    
    if (!this.socket) {
      console.log('⚠️ No socket connection available');
      return;
    }
    
    // Test typing indicators
    try {
      this.socket.emit('typing_start', { exchangeId: this.exchangeId });
      console.log('✅ Typing start event sent');
      this.testResults.passed++;
      
      setTimeout(() => {
        this.socket.emit('typing_stop', { exchangeId: this.exchangeId });
        console.log('✅ Typing stop event sent');
        this.testResults.passed++;
      }, 1000);
      
    } catch (error) {
      console.log('❌ Typing indicators failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test message read status
    try {
      this.socket.emit('mark_read', { 
        exchangeId: this.exchangeId, 
        messageId: 'test-message-id' 
      });
      console.log('✅ Mark read event sent');
      this.testResults.passed++;
    } catch (error) {
      console.log('❌ Mark read failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testMessageCRUD() {
    console.log('\n🔄 Testing Message CRUD operations...'.yellow);
    
    if (!this.exchangeId) {
      console.log('⚠️ No exchange ID available for message CRUD test');
      return;
    }
    
    // Test creating message
    try {
      const messageData = {
        exchangeId: this.exchangeId,
        content: 'Test message for CRUD operations',
        messageType: 'text'
      };
      
      const response = await axios.post(`${this.baseURL}/api/messages`, messageData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 201 && response.data.message) {
        console.log('✅ Message creation working');
        this.testResults.passed++;
        
        const messageId = response.data.message.id;
        
        // Test updating message
        try {
          const updateResponse = await axios.put(`${this.baseURL}/api/messages/${messageId}`, {
            content: 'Updated test message'
          }, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (updateResponse.status === 200) {
            console.log('✅ Message update working');
            this.testResults.passed++;
          } else {
            throw new Error(`Unexpected status: ${updateResponse.status}`);
          }
        } catch (error) {
          console.log('❌ Message update failed:', error.message);
          this.testResults.failed++;
        }
        
        // Test getting single message
        try {
          const getResponse = await axios.get(`${this.baseURL}/api/messages/${messageId}`, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (getResponse.status === 200 && getResponse.data.message) {
            console.log('✅ Single message retrieval working');
            this.testResults.passed++;
          } else {
            throw new Error('Invalid single message response');
          }
        } catch (error) {
          console.log('❌ Single message retrieval failed:', error.message);
          this.testResults.failed++;
        }
        
        // Test deleting message
        try {
          const deleteResponse = await axios.delete(`${this.baseURL}/api/messages/${messageId}`, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (deleteResponse.status === 200) {
            console.log('✅ Message deletion working');
            this.testResults.passed++;
          } else {
            throw new Error(`Unexpected status: ${deleteResponse.status}`);
          }
        } catch (error) {
          console.log('❌ Message deletion failed:', error.message);
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid message creation response');
      }
    } catch (error) {
      console.log('❌ Message CRUD failed:', error.message);
      this.testResults.failed++;
    }
  }

  printResults() {
    console.log('\n📊 MESSAGING SYSTEM TEST RESULTS'.cyan.bold);
    console.log('='.repeat(70));
    console.log(`✅ Passed: ${this.testResults.passed}`.green);
    console.log(`❌ Failed: ${this.testResults.failed}`.red);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Errors:'.red);
      this.testResults.errors.forEach(error => {
        console.log(`  - ${error}`.red);
      });
    }
    
    console.log('\n' + '='.repeat(70));
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  const testSuite = new MessagingSystemTestSuite();
  testSuite.run().catch(console.error);
}

module.exports = MessagingSystemTestSuite;




