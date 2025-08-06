const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Exchange = sequelize.define('Exchange', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // PracticePanther Integration
  pp_matter_id: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: true, // Null for manual exchanges
    comment: 'PracticePanther Matter ID for synced exchanges'
  },
  
  // Exchange Identification
  exchange_number: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    comment: 'Unique exchange number (auto-generated)'
  },
  
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    },
    comment: 'Exchange name/title'
  },
  

  
  // Status Management
  status: {
    type: DataTypes.ENUM(
      'PENDING',      // Initial status
      '45D',          // 45-day identification period
      '180D',         // 180-day completion period
      'COMPLETED',    // Successfully completed
      'TERMINATED',   // Failed/terminated
      'ON_HOLD'       // Temporarily paused
    ),
    defaultValue: 'PENDING',
    allowNull: false,
    comment: '1031 Exchange status'
  },
  
  // Relationships
  client_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'contacts',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'Primary client contact ID'
  },
  
  coordinator_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'Assigned exchange coordinator (internal user)'
  },
  
  // Timeline Management
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Exchange start date'
  },
  
  identification_deadline: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '45-day identification deadline'
  },
  
  completion_deadline: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '180-day completion deadline'
  },
  
  completion_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Actual completion date'
  },
  
  // Financial Information
  exchange_value: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Total exchange value'
  },
  
  relinquished_value: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Value of relinquished property'
  },
  
  replacement_value: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Value of replacement property'
  },
  
  // Properties
  relinquished_property: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Relinquished property details'
  },
  
  relinquished_property_address: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Address of the relinquished property'
  },
  
  relinquished_sale_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    validate: {
      min: 0
    },
    comment: 'Sale price of the relinquished property'
  },
  
  relinquished_closing_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Closing date of the relinquished property sale'
  },
  
  replacement_properties: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of replacement property details'
  },
  
  // Exchange Type and Rules
  exchange_type: {
    type: DataTypes.ENUM(
      'SIMULTANEOUS',
      'DELAYED',
      'REVERSE',
      'IMPROVEMENT'
    ),
    defaultValue: 'DELAYED',
    allowNull: false,
    comment: 'Type of 1031 exchange'
  },
  
  // Compliance Tracking
  compliance_status: {
    type: DataTypes.ENUM(
      'COMPLIANT',
      'AT_RISK',
      'NON_COMPLIANT',
      'PENDING_REVIEW'
    ),
    defaultValue: 'PENDING_REVIEW',
    allowNull: false,
    comment: 'Current compliance status'
  },
  
  // Qualified Intermediary
  qi_company: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Qualified Intermediary company name'
  },
  
  qi_contact: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'QI contact information'
  },
  
  // Exchange Coordinator and Professionals
  exchange_coordinator_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Name of the exchange coordinator'
  },
  
  attorney_or_cpa: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Attorney or CPA handling the exchange'
  },
  
  bank_account_escrow: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Bank account or escrow information'
  },
  
  // Notes and Documentation
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Internal notes about the exchange'
  },
  
  client_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Client-facing notes'
  },
  
  documents: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of document URIs related to this exchange'
  },
  
  // Priority and Urgency
  priority: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT'),
    defaultValue: 'MEDIUM',
    allowNull: false,
    comment: 'Exchange priority level'
  },
  
  // Risk Assessment
  risk_level: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
    defaultValue: 'MEDIUM',
    allowNull: false,
    comment: 'Risk assessment level'
  },
  
  risk_factors: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Identified risk factors'
  },
  
  // PracticePanther Sync Data
  pp_data: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Full PracticePanther matter data for reference'
  },
  
  last_sync_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last sync with PracticePanther'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional flexible metadata'
  },
  
  // Tags for organization
  tags: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Tags for categorization and search'
  },
  
  // Activity Tracking
  last_activity_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last activity on this exchange'
  },
  
  // Soft Delete
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Soft delete timestamp'
  },
  
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether exchange is active'
  }
}, {
  tableName: 'exchanges',
  timestamps: true,
  paranoid: true, // Enable soft deletes
  deletedAt: 'deleted_at',
  
  indexes: [
    // Performance indexes
    { fields: ['pp_matter_id'], unique: true, where: { pp_matter_id: { [sequelize.Sequelize.Op.ne]: null } } },
    { fields: ['exchange_number'], unique: true },
    { fields: ['status'] },
    { fields: ['client_id'] },
    { fields: ['coordinator_id'] },
    { fields: ['priority'] },
    { fields: ['risk_level'] },
    { fields: ['compliance_status'] },
    { fields: ['is_active'] },
    { fields: ['last_activity_at'] },
    { fields: ['relinquished_closing_date'] },
    { fields: ['exchange_coordinator_name'] },
    
    // Composite indexes for common queries
    { fields: ['status', 'priority'] },
    { fields: ['coordinator_id', 'status'] },
    { fields: ['client_id', 'status'] },
    { fields: ['completion_deadline', 'status'] },
    
    // Search indexes
    { fields: ['name'], type: 'gin', operator: 'gin_trgm_ops' },
    { fields: ['exchange_name'], type: 'gin', operator: 'gin_trgm_ops' },
    { fields: ['tags'], type: 'gin' },
    { fields: ['metadata'], type: 'gin' },
    { fields: ['documents'], type: 'gin' }
  ],
  
  scopes: {
    // Active exchanges only
    active: {
      where: {
        is_active: true,
        deleted_at: null
      }
    },
    
    // Exchanges by status
    pending: { where: { status: 'PENDING' } },
    inProgress: { where: { status: ['45D', '180D'] } },
    completed: { where: { status: 'COMPLETED' } },
    
    // Priority-based scopes
    highPriority: { where: { priority: ['HIGH', 'URGENT'] } },
    urgent: { where: { priority: 'URGENT' } },
    
    // Risk-based scopes
    highRisk: { where: { risk_level: 'HIGH' } },
    atRisk: { where: { compliance_status: 'AT_RISK' } },
    
    // Time-based scopes
    recentActivity: {
      where: {
        last_activity_at: {
          [sequelize.Sequelize.Op.gte]: sequelize.Sequelize.literal("NOW() - INTERVAL '7 days'")
        }
      }
    },
    
    // Deadline-based scopes
    approachingDeadlines: {
      where: {
        [sequelize.Sequelize.Op.or]: [
          {
            identification_deadline: {
              [sequelize.Sequelize.Op.between]: [
                new Date(),
                sequelize.Sequelize.literal("NOW() + INTERVAL '7 days'")
              ]
            }
          },
          {
            completion_deadline: {
              [sequelize.Sequelize.Op.between]: [
                new Date(),
                sequelize.Sequelize.literal("NOW() + INTERVAL '14 days'")
              ]
            }
          }
        ]
      }
    },
    
    // Include common associations
    withDetails: {
      include: [
        { association: 'client', attributes: ['id', 'first_name', 'last_name', 'email', 'company'] },
        { association: 'coordinator', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { association: 'tasks', where: { status: { [sequelize.Sequelize.Op.ne]: 'COMPLETED' } }, required: false },
        { association: 'exchangeDocuments', attributes: ['id', 'filename', 'category', 'created_at'] }
      ]
    }
  },
  
  hooks: {
    // Before create hooks
    beforeCreate: async (exchange, options) => {
      // Generate exchange number if not provided
      if (!exchange.exchange_number) {
        const prefix = exchange.pp_matter_id ? 'PP' : 'MAN';
        const year = new Date().getFullYear();
        const count = await Exchange.count({ 
          where: { 
            exchange_number: { 
              [sequelize.Sequelize.Op.like]: `${prefix}-${year}-%` 
            } 
          } 
        });
        exchange.exchange_number = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
      }
      
      // Set initial activity timestamp
      exchange.last_activity_at = new Date();
      
      // Calculate deadlines if start date is provided
      if (exchange.start_date && !exchange.identification_deadline) {
        const startDate = new Date(exchange.start_date);
        exchange.identification_deadline = new Date(startDate.getTime() + (45 * 24 * 60 * 60 * 1000));
        exchange.completion_deadline = new Date(startDate.getTime() + (180 * 24 * 60 * 60 * 1000));
      }
    },
    
    // Before update hooks
    beforeUpdate: async (exchange, options) => {
      // Update activity timestamp
      exchange.last_activity_at = new Date();
      
      // Auto-complete if status changed to COMPLETED
      if (exchange.changed('status') && exchange.status === 'COMPLETED' && !exchange.completion_date) {
        exchange.completion_date = new Date();
      }
      
      // Update compliance status based on deadlines
      if (exchange.identification_deadline && exchange.completion_deadline) {
        const now = new Date();
        const idDeadline = new Date(exchange.identification_deadline);
        const compDeadline = new Date(exchange.completion_deadline);
        
        if (now > compDeadline && exchange.status !== 'COMPLETED') {
          exchange.compliance_status = 'NON_COMPLIANT';
        } else if (now > idDeadline && exchange.status === 'PENDING') {
          exchange.compliance_status = 'NON_COMPLIANT';
        } else if ((compDeadline - now) / (1000 * 60 * 60 * 24) <= 30) {
          exchange.compliance_status = 'AT_RISK';
        } else {
          exchange.compliance_status = 'COMPLIANT';
        }
      }
    },
    
    // After create hooks
    afterCreate: async (exchange, options) => {
      // Log exchange creation
      const AuditLog = sequelize.models.AuditLog;
      if (AuditLog) {
        await AuditLog.create({
          action: 'EXCHANGE_CREATED',
          entity_type: 'exchange',
          entity_id: exchange.id,
          details: {
            exchange_number: exchange.exchange_number,
            name: exchange.name,
            status: exchange.status,
            client_id: exchange.client_id
          }
        });
      }
    },
    
    // After update hooks
    afterUpdate: async (exchange, options) => {
      // Log significant changes
      const changes = exchange.changed();
      if (changes && changes.length > 0) {
        const AuditLog = sequelize.models.AuditLog;
        if (AuditLog) {
          await AuditLog.create({
            action: 'EXCHANGE_UPDATED',
            entity_type: 'exchange',
            entity_id: exchange.id,
            details: {
              changed_fields: changes,
              previous_values: exchange._previousDataValues,
              new_values: exchange.dataValues
            }
          });
        }
      }
    }
  }
});

// Instance methods
Exchange.prototype.calculateProgress = function() {
  const statusOrder = ['PENDING', '45D', '180D', 'COMPLETED'];
  const currentIndex = statusOrder.indexOf(this.status);
  return {
    percentage: currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0,
    stage: this.status,
    stageNumber: currentIndex + 1,
    totalStages: statusOrder.length,
    isCompleted: this.status === 'COMPLETED'
  };
};

Exchange.prototype.getDaysToDeadline = function() {
  const now = new Date();
  const deadlines = [];
  
  if (this.identification_deadline) {
    const idDays = Math.ceil((new Date(this.identification_deadline) - now) / (1000 * 60 * 60 * 24));
    deadlines.push({
      type: 'identification',
      days: idDays,
      date: this.identification_deadline,
      passed: idDays < 0
    });
  }
  
  if (this.completion_deadline) {
    const compDays = Math.ceil((new Date(this.completion_deadline) - now) / (1000 * 60 * 60 * 24));
    deadlines.push({
      type: 'completion',
      days: compDays,
      date: this.completion_deadline,
      passed: compDays < 0
    });
  }
  
  return deadlines;
};

Exchange.prototype.isOverdue = function() {
  const deadlines = this.getDaysToDeadline();
  return deadlines.some(deadline => deadline.passed && this.status !== 'COMPLETED');
};

Exchange.prototype.getUrgencyLevel = function() {
  if (this.status === 'COMPLETED') return 'none';
  if (this.isOverdue()) return 'critical';
  
  const deadlines = this.getDaysToDeadline();
  const minDays = Math.min(...deadlines.map(d => d.days).filter(d => d >= 0));
  
  if (minDays <= 3) return 'critical';
  if (minDays <= 7) return 'high';
  if (minDays <= 14) return 'medium';
  return 'low';
};

Exchange.prototype.addTag = async function(tag) {
  const currentTags = this.tags || [];
  if (!currentTags.includes(tag)) {
    currentTags.push(tag);
    await this.update({ tags: currentTags });
  }
};

Exchange.prototype.removeTag = async function(tag) {
  const currentTags = this.tags || [];
  const newTags = currentTags.filter(t => t !== tag);
  await this.update({ tags: newTags });
};

Exchange.prototype.updateActivity = async function() {
  await this.update({ last_activity_at: new Date() });
};

// Class methods
Exchange.getStatusCounts = async function() {
  const results = await this.findAll({
    attributes: [
      'status',
      [sequelize.fn('COUNT', '*'), 'count']
    ],
    where: { is_active: true },
    group: ['status'],
    raw: true
  });
  
  const counts = {};
  results.forEach(result => {
    counts[result.status] = parseInt(result.count);
  });
  
  return counts;
};

Exchange.getUpcomingDeadlines = async function(days = 30) {
  const futureDate = new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
  
  return await this.findAll({
    where: {
      is_active: true,
      status: { [sequelize.Sequelize.Op.ne]: 'COMPLETED' },
      [sequelize.Sequelize.Op.or]: [
        {
          identification_deadline: {
            [sequelize.Sequelize.Op.between]: [new Date(), futureDate]
          }
        },
        {
          completion_deadline: {
            [sequelize.Sequelize.Op.between]: [new Date(), futureDate]
          }
        }
      ]
    },
    include: [
      { association: 'client', attributes: ['first_name', 'last_name', 'email'] },
      { association: 'coordinator', attributes: ['first_name', 'last_name', 'email'] }
    ],
    order: [
      [sequelize.Sequelize.fn('LEAST', 
        sequelize.Sequelize.col('identification_deadline'), 
        sequelize.Sequelize.col('completion_deadline')
      ), 'ASC']
    ]
  });
};

Exchange.searchByTerm = async function(searchTerm, options = {}) {
  const { Op } = sequelize.Sequelize;
  return await this.findAll({
    where: {
      is_active: true,
      [Op.or]: [
        { name: { [Op.iLike]: `%${searchTerm}%` } },
        { exchange_number: { [Op.iLike]: `%${searchTerm}%` } },
        { notes: { [Op.iLike]: `%${searchTerm}%` } },
        { '$client.first_name$': { [Op.iLike]: `%${searchTerm}%` } },
        { '$client.last_name$': { [Op.iLike]: `%${searchTerm}%` } },
        { '$client.company$': { [Op.iLike]: `%${searchTerm}%` } }
      ]
    },
    include: [
      { association: 'client', attributes: ['first_name', 'last_name', 'email', 'company'] },
      { association: 'coordinator', attributes: ['first_name', 'last_name', 'email'] }
    ],
    ...options
  });
};

module.exports = Exchange;