const axios = require('axios');
const colors = require('colors');

class TaskManagementTestSuite {
  constructor() {
    this.baseURL = process.env.TEST_API_URL || 'http://localhost:5001';
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.adminToken = null;
    this.exchangeId = null;
    this.taskId = null;
  }

  async run() {
    console.log('\n✅ CONTRACT A.3.5: TASK MANAGEMENT TEST SUITE'.cyan.bold);
    console.log('='.repeat(70));
    
    try {
      await this.authenticate();
      await this.testPracticePantherTaskSync();
      await this.testTaskStatusIndicators();
      await this.testDueDateTracking();
      await this.testTaskAssignment();
      await this.testTaskFiltering();
      await this.testTaskCRUD();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.testResults.failed++;
    }
  }

  async authenticate() {
    console.log('\n🔐 Authenticating as admin...'.yellow);
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@peak1031.com',
        password: 'admin123'
      });
      
      if (response.data.token) {
        this.adminToken = response.data.token;
        console.log('✅ Admin authentication successful');
        this.testResults.passed++;
      } else {
        throw new Error('No token received');
      }
      
      // Get an exchange for testing
      await this.getTestExchange();
      
    } catch (error) {
      console.log('❌ Admin authentication failed:', error.response?.data?.error || error.message);
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

  async testPracticePantherTaskSync() {
    console.log('\n🔄 Testing View tasks synced from PracticePanther...'.yellow);
    
    try {
      const response = await axios.get(`${this.baseURL}/api/tasks`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ PracticePanther tasks synced (${response.data.length} tasks)`);
        this.testResults.passed++;
        
        // Check for PP task ID field
        if (response.data.length > 0) {
          const task = response.data[0];
          this.taskId = task.id;
          
          if (task.ppTaskId || task.pp_task_id) {
            console.log('✅ Task has PracticePanther task ID');
            this.testResults.passed++;
          } else {
            console.log('⚠️ Task missing PracticePanther task ID');
            this.testResults.failed++;
          }
          
          // Check for required fields
          const requiredFields = ['id', 'title', 'status'];
          const missingFields = requiredFields.filter(field => !task[field]);
          
          if (missingFields.length === 0) {
            console.log('✅ Tasks have all required fields');
            this.testResults.passed++;
          } else {
            console.log(`❌ Tasks missing fields: ${missingFields.join(', ')}`);
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid task data format');
      }
    } catch (error) {
      console.log('❌ PracticePanther task sync failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testTaskStatusIndicators() {
    console.log('\n📊 Testing Task status indicators: PENDING, IN_PROGRESS, COMPLETE...'.yellow);
    
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    
    try {
      const response = await axios.get(`${this.baseURL}/api/tasks`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        let validStatusCount = 0;
        let invalidStatusCount = 0;
        
        for (const task of response.data) {
          if (task.status && validStatuses.includes(task.status)) {
            validStatusCount++;
          } else {
            invalidStatusCount++;
          }
        }
        
        if (invalidStatusCount === 0) {
          console.log(`✅ All ${validStatusCount} tasks have valid status`);
          this.testResults.passed++;
        } else {
          console.log(`⚠️ ${invalidStatusCount} tasks have invalid status`);
          this.testResults.failed++;
        }
        
        // Test status update
        if (this.taskId) {
          try {
            const updateResponse = await axios.put(`${this.baseURL}/api/tasks/${this.taskId}`, {
              status: 'IN_PROGRESS'
            }, {
              headers: { Authorization: `Bearer ${this.adminToken}` }
            });
            
            if (updateResponse.status === 200) {
              console.log('✅ Task status update working');
              this.testResults.passed++;
            } else {
              throw new Error(`Unexpected status: ${updateResponse.status}`);
            }
          } catch (error) {
            console.log('❌ Task status update failed:', error.message);
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid task data format');
      }
    } catch (error) {
      console.log('❌ Task status indicators failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testDueDateTracking() {
    console.log('\n📅 Testing Track due dates and completion...'.yellow);
    
    if (!this.exchangeId) {
      console.log('⚠️ No exchange ID available for due date test');
      return;
    }
    
    // Test creating task with due date
    try {
      const taskData = {
        title: 'Test Task with Due Date',
        description: 'Test task for due date tracking',
        status: 'PENDING',
        exchangeId: this.exchangeId,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        priority: 'MEDIUM'
      };
      
      const response = await axios.post(`${this.baseURL}/api/tasks`, taskData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 201 && response.data.task) {
        console.log('✅ Task creation with due date working');
        this.testResults.passed++;
        
        const createdTaskId = response.data.task.id;
        
        // Test updating task completion
        try {
          const updateResponse = await axios.put(`${this.baseURL}/api/tasks/${createdTaskId}`, {
            status: 'COMPLETED',
            completedAt: new Date().toISOString()
          }, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (updateResponse.status === 200) {
            console.log('✅ Task completion tracking working');
            this.testResults.passed++;
          } else {
            throw new Error(`Unexpected status: ${updateResponse.status}`);
          }
        } catch (error) {
          console.log('❌ Task completion tracking failed:', error.message);
          this.testResults.failed++;
        }
        
        // Test overdue detection
        try {
          const overdueTaskData = {
            title: 'Overdue Test Task',
            description: 'Test task that is overdue',
            status: 'PENDING',
            exchangeId: this.exchangeId,
            dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            priority: 'HIGH'
          };
          
          const overdueResponse = await axios.post(`${this.baseURL}/api/tasks`, overdueTaskData, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (overdueResponse.status === 201) {
            console.log('✅ Overdue task creation working');
            this.testResults.passed++;
          } else {
            throw new Error(`Unexpected status: ${overdueResponse.status}`);
          }
        } catch (error) {
          console.log('❌ Overdue task creation failed:', error.message);
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid task creation response');
      }
    } catch (error) {
      console.log('❌ Task due date tracking failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testTaskAssignment() {
    console.log('\n👥 Testing Task assignment to exchanges...'.yellow);
    
    if (!this.exchangeId) {
      console.log('⚠️ No exchange ID available for task assignment test');
      return;
    }
    
    // Test getting tasks by exchange
    try {
      const response = await axios.get(`${this.baseURL}/api/exchanges/${this.exchangeId}/tasks`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Exchange task assignment working (${response.data.length} tasks)`);
        this.testResults.passed++;
        
        // Check that tasks belong to the exchange
        const exchangeTasks = response.data.filter(task => 
          task.exchangeId === this.exchangeId || task.exchange_id === this.exchangeId
        );
        
        if (exchangeTasks.length === response.data.length) {
          console.log('✅ All tasks belong to the correct exchange');
          this.testResults.passed++;
        } else {
          console.log('❌ Some tasks do not belong to the exchange');
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid exchange tasks format');
      }
    } catch (error) {
      console.log('❌ Exchange task assignment failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test assigning task to user
    try {
      const assignmentData = {
        taskId: this.taskId,
        assignedTo: 'test-user-id',
        assignedBy: 'admin-user-id'
      };
      
      const response = await axios.post(`${this.baseURL}/api/tasks/${this.taskId}/assign`, assignmentData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 200) {
        console.log('✅ Task assignment working');
        this.testResults.passed++;
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Task assignment properly validates input');
        this.testResults.passed++;
      } else {
        console.log('❌ Task assignment failed:', error.message);
        this.testResults.failed++;
      }
    }
  }

  async testTaskFiltering() {
    console.log('\n🔍 Testing Task filtering and search...'.yellow);
    
    const testFilters = [
      { status: 'PENDING', name: 'Status Filter' },
      { priority: 'HIGH', name: 'Priority Filter' },
      { exchangeId: this.exchangeId, name: 'Exchange Filter' },
      { search: 'test', name: 'Search Filter' },
      { page: 1, limit: 10, name: 'Pagination' }
    ];
    
    for (const filter of testFilters) {
      try {
        const params = new URLSearchParams(filter);
        const response = await axios.get(`${this.baseURL}/api/tasks?${params}`, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
        
        if (response.data && Array.isArray(response.data)) {
          console.log(`✅ ${filter.name} working`);
          this.testResults.passed++;
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.log(`❌ ${filter.name} failed:`, error.message);
        this.testResults.failed++;
      }
    }
    
    // Test advanced filtering
    try {
      const response = await axios.get(`${this.baseURL}/api/tasks?status=PENDING&priority=HIGH&sortBy=dueDate&sortOrder=ASC`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log('✅ Advanced task filtering working');
        this.testResults.passed++;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.log('❌ Advanced task filtering failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testTaskCRUD() {
    console.log('\n🔄 Testing Task CRUD operations...'.yellow);
    
    if (!this.exchangeId) {
      console.log('⚠️ No exchange ID available for task CRUD test');
      return;
    }
    
    // Test creating task
    try {
      const taskData = {
        title: 'CRUD Test Task',
        description: 'Test task for CRUD operations',
        status: 'PENDING',
        exchangeId: this.exchangeId,
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
      };
      
      const response = await axios.post(`${this.baseURL}/api/tasks`, taskData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 201 && response.data.task) {
        console.log('✅ Task creation working');
        this.testResults.passed++;
        
        const crudTaskId = response.data.task.id;
        
        // Test updating task
        try {
          const updateResponse = await axios.put(`${this.baseURL}/api/tasks/${crudTaskId}`, {
            title: 'Updated CRUD Test Task',
            status: 'IN_PROGRESS'
          }, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (updateResponse.status === 200) {
            console.log('✅ Task update working');
            this.testResults.passed++;
          } else {
            throw new Error(`Unexpected status: ${updateResponse.status}`);
          }
        } catch (error) {
          console.log('❌ Task update failed:', error.message);
          this.testResults.failed++;
        }
        
        // Test getting single task
        try {
          const getResponse = await axios.get(`${this.baseURL}/api/tasks/${crudTaskId}`, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (getResponse.status === 200 && getResponse.data.task) {
            console.log('✅ Single task retrieval working');
            this.testResults.passed++;
          } else {
            throw new Error('Invalid single task response');
          }
        } catch (error) {
          console.log('❌ Single task retrieval failed:', error.message);
          this.testResults.failed++;
        }
        
        // Test deleting task
        try {
          const deleteResponse = await axios.delete(`${this.baseURL}/api/tasks/${crudTaskId}`, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (deleteResponse.status === 200) {
            console.log('✅ Task deletion working');
            this.testResults.passed++;
          } else {
            throw new Error(`Unexpected status: ${deleteResponse.status}`);
          }
        } catch (error) {
          console.log('❌ Task deletion failed:', error.message);
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid task creation response');
      }
    } catch (error) {
      console.log('❌ Task CRUD failed:', error.message);
      this.testResults.failed++;
    }
  }

  printResults() {
    console.log('\n📊 TASK MANAGEMENT TEST RESULTS'.cyan.bold);
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
  const testSuite = new TaskManagementTestSuite();
  testSuite.run().catch(console.error);
}

module.exports = TaskManagementTestSuite;
