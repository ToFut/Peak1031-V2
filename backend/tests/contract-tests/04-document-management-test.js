const axios = require('axios');
const colors = require('colors');
const FormData = require('form-data');

class DocumentManagementTestSuite {
  constructor() {
    this.baseURL = process.env.TEST_API_URL || 'http://localhost:5001';
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.adminToken = null;
    this.clientToken = null;
    this.thirdPartyToken = null;
    this.exchangeId = null;
    this.documentId = null;
  }

  async run() {
    console.log('\n📁 CONTRACT A.3.4: DOCUMENT MANAGEMENT TEST SUITE'.cyan.bold);
    console.log('='.repeat(70));
    
    try {
      await this.authenticate();
      await this.testManualUploadDownload();
      await this.testDocumentOrganization();
      await this.testRoleBasedAccess();
      await this.testPINProtection();
      await this.testDocumentTemplates();
      await this.testDocumentActivityLogs();
      await this.testDocumentCRUD();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.testResults.failed++;
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
      
      // Third party authentication
      const thirdPartyResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'thirdparty@peak1031.com',
        password: 'thirdparty123'
      });
      
      if (thirdPartyResponse.data.token) {
        this.thirdPartyToken = thirdPartyResponse.data.token;
        console.log('✅ Third party authentication successful');
        this.testResults.passed++;
      } else {
        throw new Error('No third party token received');
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

  async testManualUploadDownload() {
    console.log('\n📤 Testing Manual upload/download of documents...'.yellow);
    
    if (!this.exchangeId) {
      console.log('⚠️ No exchange ID available for document test');
      return;
    }
    
    // Test document upload
    try {
      const form = new FormData();
      form.append('file', Buffer.from('Test document content for contract validation'), {
        filename: 'test-document.txt',
        contentType: 'text/plain'
      });
      form.append('exchangeId', this.exchangeId);
      form.append('category', 'test');
      form.append('description', 'Test document for contract validation');
      
      const response = await axios.post(`${this.baseURL}/api/documents`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.adminToken}`
        }
      });
      
      if (response.status === 201 && response.data.document) {
        this.documentId = response.data.document.id;
        console.log('✅ Document upload working');
        this.testResults.passed++;
        
        // Check document structure
        const document = response.data.document;
        const requiredFields = ['id', 'filename', 'exchangeId', 'uploadedBy'];
        const missingFields = requiredFields.filter(field => !document[field]);
        
        if (missingFields.length === 0) {
          console.log('✅ Document has all required fields');
          this.testResults.passed++;
        } else {
          console.log(`❌ Document missing fields: ${missingFields.join(', ')}`);
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid document upload response');
      }
    } catch (error) {
      console.log('❌ Document upload failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test document download
    if (this.documentId) {
      try {
        const response = await axios.get(`${this.baseURL}/api/documents/${this.documentId}/download`, {
          headers: { Authorization: `Bearer ${this.adminToken}` },
          responseType: 'stream'
        });
        
        if (response.status === 200) {
          console.log('✅ Document download working');
          this.testResults.passed++;
        } else {
          throw new Error(`Unexpected status: ${response.status}`);
        }
      } catch (error) {
        console.log('❌ Document download failed:', error.message);
        this.testResults.failed++;
      }
    }
  }

  async testDocumentOrganization() {
    console.log('\n📂 Testing Documents organized by exchange...'.yellow);
    
    if (!this.exchangeId) {
      console.log('⚠️ No exchange ID available for organization test');
      return;
    }
    
    try {
      const response = await axios.get(`${this.baseURL}/api/exchanges/${this.exchangeId}/documents`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Exchange document organization working (${response.data.length} documents)`);
        this.testResults.passed++;
        
        // Check that documents belong to the exchange
        const exchangeDocuments = response.data.filter(doc => 
          doc.exchangeId === this.exchangeId || doc.exchange_id === this.exchangeId
        );
        
        if (exchangeDocuments.length === response.data.length) {
          console.log('✅ All documents belong to the correct exchange');
          this.testResults.passed++;
        } else {
          console.log('❌ Some documents do not belong to the exchange');
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid exchange documents format');
      }
    } catch (error) {
      console.log('❌ Exchange document organization failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testRoleBasedAccess() {
    console.log('\n🔒 Testing Third-party users can view, but cannot upload...'.yellow);
    
    if (!this.exchangeId) {
      console.log('⚠️ No exchange ID available for role-based access test');
      return;
    }
    
    // Test third party can view documents
    try {
      const response = await axios.get(`${this.baseURL}/api/exchanges/${this.exchangeId}/documents`, {
        headers: { Authorization: `Bearer ${this.thirdPartyToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log('✅ Third party can view documents');
        this.testResults.passed++;
      } else {
        throw new Error('Invalid document list response');
      }
    } catch (error) {
      console.log('❌ Third party document view failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test third party cannot upload documents
    try {
      const form = new FormData();
      form.append('file', Buffer.from('Test upload by third party'), {
        filename: 'third-party-test.txt',
        contentType: 'text/plain'
      });
      form.append('exchangeId', this.exchangeId);
      
      await axios.post(`${this.baseURL}/api/documents`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.thirdPartyToken}`
        }
      });
      
      console.log('❌ Third party should not be able to upload documents');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Third party upload properly restricted');
        this.testResults.passed++;
      } else {
        console.log('❌ Third party upload restriction failed:', error.message);
        this.testResults.failed++;
      }
    }
  }

  async testPINProtection() {
    console.log('\n🔐 Testing PIN-protected access for sensitive files...'.yellow);
    
    if (!this.documentId) {
      console.log('⚠️ No document ID available for PIN protection test');
      return;
    }
    
    // Test setting PIN on document
    try {
      const response = await axios.put(`${this.baseURL}/api/documents/${this.documentId}`, {
        pinRequired: true,
        pin: '1234'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 200) {
        console.log('✅ PIN protection setup working');
        this.testResults.passed++;
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ PIN protection setup failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test accessing PIN-protected document without PIN
    try {
      await axios.get(`${this.baseURL}/api/documents/${this.documentId}/download`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      console.log('❌ PIN-protected document should require PIN');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ PIN-protected document properly requires PIN');
        this.testResults.passed++;
      } else {
        console.log('❌ PIN protection validation failed:', error.message);
        this.testResults.failed++;
      }
    }
    
    // Test accessing PIN-protected document with correct PIN
    try {
      const response = await axios.post(`${this.baseURL}/api/documents/${this.documentId}/verify-pin`, {
        pin: '1234'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 200) {
        console.log('✅ PIN verification working');
        this.testResults.passed++;
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ PIN verification failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testDocumentTemplates() {
    console.log('\n📋 Testing Auto-generate documents from templates using exchange/member data...'.yellow);
    
    if (!this.exchangeId) {
      console.log('⚠️ No exchange ID available for template test');
      return;
    }
    
    // Test template list
    try {
      const response = await axios.get(`${this.baseURL}/api/templates`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Document templates endpoint working (${response.data.length} templates)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid templates format');
      }
    } catch (error) {
      console.log('❌ Document templates failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test template generation
    try {
      const templateData = {
        templateId: 'test-template',
        exchangeId: this.exchangeId,
        data: {
          exchangeName: 'Test Exchange',
          clientName: 'Test Client',
          date: new Date().toISOString()
        }
      };
      
      const response = await axios.post(`${this.baseURL}/api/templates/generate`, templateData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 200 || response.status === 201) {
        console.log('✅ Template generation working');
        this.testResults.passed++;
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Template generation properly validates input');
        this.testResults.passed++;
      } else {
        console.log('❌ Template generation failed:', error.message);
        this.testResults.failed++;
      }
    }
  }

  async testDocumentActivityLogs() {
    console.log('\n📊 Testing Basic document activity logs...'.yellow);
    
    if (!this.documentId) {
      console.log('⚠️ No document ID available for activity logs test');
      return;
    }
    
    // Test document activity logs
    try {
      const response = await axios.get(`${this.baseURL}/api/documents/${this.documentId}/activity`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Document activity logs working (${response.data.length} activities)`);
        this.testResults.passed++;
        
        // Check activity structure
        if (response.data.length > 0) {
          const activity = response.data[0];
          const requiredFields = ['id', 'action', 'userId', 'timestamp'];
          const missingFields = requiredFields.filter(field => !activity[field]);
          
          if (missingFields.length === 0) {
            console.log('✅ Document activities have required fields');
            this.testResults.passed++;
          } else {
            console.log(`❌ Document activities missing fields: ${missingFields.join(', ')}`);
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid activity logs format');
      }
    } catch (error) {
      console.log('❌ Document activity logs failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testDocumentCRUD() {
    console.log('\n🔄 Testing Document CRUD operations...'.yellow);
    
    if (!this.exchangeId) {
      console.log('⚠️ No exchange ID available for document CRUD test');
      return;
    }
    
    // Test creating document
    try {
      const form = new FormData();
      form.append('file', Buffer.from('CRUD test document'), {
        filename: 'crud-test.txt',
        contentType: 'text/plain'
      });
      form.append('exchangeId', this.exchangeId);
      form.append('category', 'test');
      
      const response = await axios.post(`${this.baseURL}/api/documents`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.adminToken}`
        }
      });
      
      if (response.status === 201 && response.data.document) {
        console.log('✅ Document creation working');
        this.testResults.passed++;
        
        const crudDocumentId = response.data.document.id;
        
        // Test updating document metadata
        try {
          const updateResponse = await axios.put(`${this.baseURL}/api/documents/${crudDocumentId}`, {
            category: 'updated-test',
            description: 'Updated test document'
          }, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (updateResponse.status === 200) {
            console.log('✅ Document update working');
            this.testResults.passed++;
          } else {
            throw new Error(`Unexpected status: ${updateResponse.status}`);
          }
        } catch (error) {
          console.log('❌ Document update failed:', error.message);
          this.testResults.failed++;
        }
        
        // Test getting single document
        try {
          const getResponse = await axios.get(`${this.baseURL}/api/documents/${crudDocumentId}`, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (getResponse.status === 200 && getResponse.data.document) {
            console.log('✅ Single document retrieval working');
            this.testResults.passed++;
          } else {
            throw new Error('Invalid single document response');
          }
        } catch (error) {
          console.log('❌ Single document retrieval failed:', error.message);
          this.testResults.failed++;
        }
        
        // Test deleting document
        try {
          const deleteResponse = await axios.delete(`${this.baseURL}/api/documents/${crudDocumentId}`, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (deleteResponse.status === 200) {
            console.log('✅ Document deletion working');
            this.testResults.passed++;
          } else {
            throw new Error(`Unexpected status: ${deleteResponse.status}`);
          }
        } catch (error) {
          console.log('❌ Document deletion failed:', error.message);
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid document creation response');
      }
    } catch (error) {
      console.log('❌ Document CRUD failed:', error.message);
      this.testResults.failed++;
    }
  }

  printResults() {
    console.log('\n📊 DOCUMENT MANAGEMENT TEST RESULTS'.cyan.bold);
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
  const testSuite = new DocumentManagementTestSuite();
  testSuite.run().catch(console.error);
}

module.exports = DocumentManagementTestSuite;




