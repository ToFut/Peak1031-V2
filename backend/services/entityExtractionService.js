/**
 * Entity Extraction Service
 * Extracts contacts and users from PracticePanther data
 */

class EntityExtractionService {
  /**
   * Extract all entities from an exchange's PP data
   * @param {Object} exchange - Exchange data with pp_data
   * @returns {Array} Array of extracted entities
   */
  extractEntitiesFromExchange(exchange) {
    if (!exchange || !exchange.pp_data) {
      return [];
    }

    const entities = [];
    const ppData = exchange.pp_data;

    // 1. Extract Primary Client (account_ref)
    if (ppData.account_ref) {
      entities.push(this.parseAccountRef(ppData.account_ref, exchange.id));
    }

    // 2. Extract Assigned Users
    if (ppData.assigned_to_users && Array.isArray(ppData.assigned_to_users)) {
      ppData.assigned_to_users.forEach(user => {
        entities.push(this.parseAssignedUser(user, exchange.id));
      });
    }

    // 3. Extract Contact References from Custom Fields
    if (ppData.custom_field_values && Array.isArray(ppData.custom_field_values)) {
      ppData.custom_field_values.forEach(customField => {
        if (customField.contact_ref) {
          entities.push(this.parseCustomFieldContact(customField, exchange.id));
        }
      });
    }

    // 4. Extract Text-Based Entities
    const textEntities = this.parseTextEntities(exchange);
    entities.push(...textEntities);

    return entities.filter(entity => entity !== null);
  }

  /**
   * Parse account reference (primary client)
   * @param {Object} accountRef - PP account reference
   * @param {string} exchangeId - Exchange ID
   * @returns {Object} Entity object
   */
  parseAccountRef(accountRef, exchangeId) {
    return {
      source: 'pp_data.account_ref',
      type: 'contact',
      entity_type: 'client',
      pp_contact_id: accountRef.id,
      pp_account_ref_id: accountRef.id,
      display_name: accountRef.display_name,
      parsed_name: this.parseDisplayName(accountRef.display_name),
      contact_type: 'client',
      is_primary_contact: true,
      primary_exchange_id: exchangeId,
      pp_raw_data: accountRef,
      should_create_contact: true,
      should_add_as_participant: true,
      participant_role: 'client',
      should_set_as_client: true
    };
  }

  /**
   * Parse assigned user
   * @param {Object} user - PP assigned user
   * @param {string} exchangeId - Exchange ID
   * @returns {Object} Entity object
   */
  parseAssignedUser(user, exchangeId) {
    return {
      source: 'pp_data.assigned_to_users',
      type: 'user',
      entity_type: 'attorney',
      pp_user_id: user.id,
      display_name: user.display_name,
      email: user.email_address,
      parsed_name: this.parseDisplayName(user.display_name),
      role: 'coordinator', // Default role for PP users
      is_active: true,
      pp_raw_data: user,
      should_create_user: true,
      should_add_as_participant: true,
      participant_role: 'third_party',
      should_set_as_coordinator: true
    };
  }

  /**
   * Parse custom field contact reference
   * @param {Object} customField - PP custom field with contact_ref
   * @param {string} exchangeId - Exchange ID
   * @returns {Object} Entity object
   */
  parseCustomFieldContact(customField, exchangeId) {
    const contactType = this.determineContactType(customField.custom_field_ref.label);
    
    return {
      source: 'pp_data.custom_field_values[].contact_ref',
      type: 'contact',
      entity_type: contactType,
      custom_field_label: customField.custom_field_ref.label,
      pp_contact_id: customField.contact_ref.id,
      pp_account_ref_id: customField.contact_ref.account_ref?.id,
      display_name: customField.contact_ref.display_name,
      parsed_name: this.parseDisplayName(customField.contact_ref.display_name),
      contact_type: contactType,
      is_primary_contact: false,
      primary_exchange_id: exchangeId,
      pp_raw_data: customField.contact_ref,
      should_create_contact: true,
      should_add_as_participant: true,
      participant_role: 'third_party'
    };
  }

  /**
   * Parse text-based entities from exchange fields
   * @param {Object} exchange - Exchange data
   * @returns {Array} Array of text-based entities
   */
  parseTextEntities(exchange) {
    const entities = [];
    const exchangeId = exchange.id;

    // Define text field mappings
    const textFields = [
      { field: 'buyer_1_name', value: exchange.buyer_1_name, type: 'buyer' },
      { field: 'buyer_2_name', value: exchange.buyer_2_name, type: 'buyer' },
      { field: 'rep_1_seller_1_name', value: exchange.rep_1_seller_1_name, type: 'seller' },
      { field: 'rep_1_seller_2_name', value: exchange.rep_1_seller_2_name, type: 'seller' },
      { field: 'bank', value: exchange.bank, type: 'organization', is_company: true }
    ];

    // Extract referral from PP data if available
    if (exchange.pp_data && exchange.pp_data.custom_field_values) {
      const referralField = exchange.pp_data.custom_field_values.find(cf => 
        cf.custom_field_ref.label === 'Referral Source' && cf.value_string
      );
      
      const referralEmailField = exchange.pp_data.custom_field_values.find(cf => 
        cf.custom_field_ref.label === 'Referral Source Email' && cf.value_string
      );

      if (referralField) {
        textFields.push({ 
          field: 'referral_source', 
          value: referralField.value_string, 
          type: 'referral',
          email: referralEmailField?.value_string
        });
      }
    }

    // Process each text field
    textFields.forEach(item => {
      if (this.isValidTextValue(item.value)) {
        const entity = {
          source: `exchange.${item.field}`,
          type: 'contact',
          entity_type: item.type,
          display_name: item.value,
          parsed_name: item.is_company ? 
            { company: item.value } : 
            this.parseDisplayName(item.value),
          email: item.email || null,
          contact_type: item.type,
          is_primary_contact: false,
          primary_exchange_id: exchangeId,
          company: item.is_company ? item.value : null,
          should_create_contact: true,
          should_add_as_participant: item.type !== 'organization',
          participant_role: item.type === 'organization' ? null : 'third_party'
        };
        entities.push(entity);
      }
    });

    return entities;
  }

  /**
   * Parse display name into structured name parts
   * @param {string} displayName - Name to parse
   * @returns {Object} Parsed name object
   */
  parseDisplayName(displayName) {
    if (!displayName || typeof displayName !== 'string') {
      return { first_name: '', last_name: '' };
    }

    const trimmed = displayName.trim();
    
    // Check if it's likely a company/organization
    if (this.isCompanyName(trimmed)) {
      return { company: trimmed };
    }

    // Parse as person name
    const parts = trimmed.split(',').map(p => p.trim());
    
    if (parts.length >= 2) {
      // "Last, First" format
      return {
        first_name: parts[1].trim(),
        last_name: parts[0].trim()
      };
    } else {
      // "First Last" or single name format
      const nameParts = trimmed.split(' ').filter(part => part.length > 0);
      if (nameParts.length >= 2) {
        return {
          first_name: nameParts[0],
          last_name: nameParts.slice(1).join(' ')
        };
      } else {
        return {
          first_name: nameParts[0] || '',
          last_name: ''
        };
      }
    }
  }

  /**
   * Determine contact type based on custom field label
   * @param {string} label - Custom field label
   * @returns {string} Contact type
   */
  determineContactType(label) {
    const labelLower = label.toLowerCase();
    
    if (labelLower.includes('settlement') || labelLower.includes('escrow')) {
      return 'settlement_agent';
    }
    if (labelLower.includes('attorney') || labelLower.includes('lawyer')) {
      return 'attorney';
    }
    if (labelLower.includes('internal') || labelLower.includes('credit')) {
      return 'internal';
    }
    if (labelLower.includes('referral') || labelLower.includes('source')) {
      return 'referral';
    }
    
    return 'other';
  }

  /**
   * Check if a name appears to be a company
   * @param {string} name - Name to check
   * @returns {boolean} True if likely a company
   */
  isCompanyName(name) {
    const companyIndicators = [
      'bank', 'llc', 'inc', 'corp', 'company', 'title', 
      'escrow', 'trust', 'group', 'associates', 'partners',
      'law', 'legal', 'services', 'holdings', 'capital'
    ];
    
    const nameLower = name.toLowerCase();
    return companyIndicators.some(indicator => nameLower.includes(indicator));
  }

  /**
   * Check if a text value is valid for entity creation
   * @param {string} value - Value to check
   * @returns {boolean} True if valid
   */
  isValidTextValue(value) {
    return value && 
           typeof value === 'string' && 
           value.trim() !== '' && 
           value !== 'false' && 
           value !== 'null' && 
           value !== 'undefined';
  }

  /**
   * Get entity statistics from extraction results
   * @param {Array} entities - Extracted entities
   * @returns {Object} Statistics object
   */
  getExtractionStatistics(entities) {
    return {
      total: entities.length,
      users: entities.filter(e => e.type === 'user').length,
      contacts: entities.filter(e => e.type === 'contact').length,
      participants: entities.filter(e => e.should_add_as_participant).length,
      byType: entities.reduce((acc, entity) => {
        acc[entity.entity_type] = (acc[entity.entity_type] || 0) + 1;
        return acc;
      }, {}),
      bySource: entities.reduce((acc, entity) => {
        const sourceType = entity.source.split('.')[0];
        acc[sourceType] = (acc[sourceType] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

module.exports = new EntityExtractionService();