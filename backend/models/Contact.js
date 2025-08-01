const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Contact = sequelize.define('Contact', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // User relationship
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'Reference to the user who owns this contact'
  },
  
  // PracticePanther Integration
  ppContactId: {
    type: DataTypes.STRING(100),
    allowNull: true, // Allow null for manual contacts
    unique: true,
    comment: 'PracticePanther Contact ID for synced contacts'
  },
  
  // Basic Information
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    },
    comment: 'Contact first name'
  },
  
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    },
    comment: 'Contact last name'
  },
  
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true,
      notEmpty: true
    },
    comment: 'Contact email address'
  },
  
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Contact phone number'
  },
  
  company: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Company name'
  },
  
  position: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Job position or title'
  },
  
  // Contact Classification
  contactType: {
    type: DataTypes.ENUM(
      'Client', 'Broker', 'Attorney', 'CPA', 'Agent',
      'Escrow Officer', 'Title Company', 'Notary', 'Lender', 'Other'
    ),
    allowNull: true,
    comment: 'Type of contact'
  },
  
  // Address Information
  addressStreet: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Street address'
  },
  
  addressCity: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'City'
  },
  
  addressState: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'State'
  },
  
  addressZip: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'ZIP code'
  },
  
  // Legacy address field (for backward compatibility)
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Legacy address field (deprecated)'
  },
  
  // Contact Management
  source: {
    type: DataTypes.ENUM(
      'Referral', 'Website', 'Social Media', 'Event', 'Cold Call', 'Other'
    ),
    allowNull: true,
    comment: 'How this contact was acquired'
  },
  
  tags: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of tags for categorization'
  },
  
  preferredContactMethod: {
    type: DataTypes.ENUM('Email', 'Phone', 'Text'),
    allowNull: true,
    comment: 'Preferred method of contact'
  },
  
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether this is the primary contact'
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes about the contact'
  },
  
  relatedExchanges: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of exchange IDs this contact is related to'
  },
  
  // PracticePanther Sync Data
  ppData: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Full PracticePanther contact data for reference'
  },
  
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last sync with PracticePanther'
  }
}, {
  tableName: 'contacts',
  timestamps: true,
  underscored: true,
  
  indexes: [
    // Performance indexes
    { fields: ['user_id'] },
    { fields: ['pp_contact_id'], unique: true, where: { pp_contact_id: { [sequelize.Sequelize.Op.ne]: null } } },
    { fields: ['email'] },
    { fields: ['contact_type'] },
    { fields: ['source'] },
    { fields: ['is_primary'] },
    { fields: ['company'] },
    
    // Search indexes
    { fields: ['first_name', 'last_name'] },
    { fields: ['first_name'], type: 'gin', operator: 'gin_trgm_ops' },
    { fields: ['last_name'], type: 'gin', operator: 'gin_trgm_ops' },
    { fields: ['company'], type: 'gin', operator: 'gin_trgm_ops' },
    { fields: ['tags'], type: 'gin' },
    { fields: ['related_exchanges'], type: 'gin' }
  ],
  
  scopes: {
    // Active contacts only
    active: {
      where: {
        deleted_at: null
      }
    },
    
    // Contacts by type
    clients: { where: { contact_type: 'Client' } },
    brokers: { where: { contact_type: 'Broker' } },
    attorneys: { where: { contact_type: 'Attorney' } },
    cpas: { where: { contact_type: 'CPA' } },
    
    // Primary contacts
    primary: { where: { is_primary: true } },
    
    // Recent contacts
    recent: {
      where: {
        created_at: {
          [sequelize.Sequelize.Op.gte]: sequelize.Sequelize.literal("NOW() - INTERVAL '30 days'")
        }
      }
    },
    
    // Include common associations
    withDetails: {
      include: [
        { association: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { association: 'exchanges', attributes: ['id', 'name', 'status'] }
      ]
    }
  },
  
  hooks: {
    // Before create hooks
    beforeCreate: async (contact, options) => {
      // Set default contact type if not provided
      if (!contact.contactType) {
        contact.contactType = 'Client';
      }
      
      // Set default source if not provided
      if (!contact.source) {
        contact.source = 'Other';
      }
    },
    
    // Before update hooks
    beforeUpdate: async (contact, options) => {
      // Update related exchanges if contact type changes
      if (contact.changed('contactType')) {
        // Could trigger exchange updates here
      }
    },
    
    // After create hooks
    afterCreate: async (contact, options) => {
      // Log contact creation
      const AuditLog = sequelize.models.AuditLog;
      if (AuditLog) {
        await AuditLog.create({
          action: 'CONTACT_CREATED',
          entity_type: 'contact',
          entity_id: contact.id,
          details: {
            full_name: contact.getFullName(),
            email: contact.email,
            contact_type: contact.contactType
          }
        });
      }
    }
  }
});

// Instance methods
Contact.prototype.getFullName = function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
};

Contact.prototype.getAddress = function() {
  const parts = [
    this.addressStreet,
    this.addressCity,
    this.addressState,
    this.addressZip
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : this.address || '';
};

Contact.prototype.addTag = async function(tag) {
  const currentTags = this.tags || [];
  if (!currentTags.includes(tag)) {
    currentTags.push(tag);
    await this.update({ tags: currentTags });
  }
};

Contact.prototype.removeTag = async function(tag) {
  const currentTags = this.tags || [];
  const newTags = currentTags.filter(t => t !== tag);
  await this.update({ tags: newTags });
};

Contact.prototype.addRelatedExchange = async function(exchangeId) {
  const currentExchanges = this.relatedExchanges || [];
  if (!currentExchanges.includes(exchangeId)) {
    currentExchanges.push(exchangeId);
    await this.update({ relatedExchanges: currentExchanges });
  }
};

Contact.prototype.removeRelatedExchange = async function(exchangeId) {
  const currentExchanges = this.relatedExchanges || [];
  const newExchanges = currentExchanges.filter(id => id !== exchangeId);
  await this.update({ relatedExchanges: newExchanges });
};

Contact.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  values.fullName = this.getFullName();
  values.address = this.getAddress();
  return values;
};

module.exports = Contact; 