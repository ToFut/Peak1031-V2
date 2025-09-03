/**
 * Utility functions to transform object keys between snake_case and camelCase
 * This is needed to bridge the gap between database (snake_case) and frontend (camelCase)
 */

/**
 * Convert snake_case string to camelCase
 * @param {string} str - Snake case string
 * @returns {string} - Camel case string
 */
function snakeToCamel(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase string to snake_case
 * @param {string} str - Camel case string
 * @returns {string} - Snake case string
 */
function camelToSnake(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Recursively transform object keys from snake_case to camelCase
 * @param {any} obj - Object to transform
 * @returns {any} - Transformed object
 */
function transformToCamelCase(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => transformToCamelCase(item));
  }

  if (typeof obj === 'object') {
    const transformed = {};
    
    // List of PP fields that should NOT be converted to camelCase
    const preserveSnakeCase = [
      'day_45', 'day_180', 'client_vesting', 'bank', 'proceeds',
      'rel_property_address', 'rel_escrow_number', 'rel_value', 'rel_apn',
      'type_of_exchange', 'buyer_vesting', 'buyer_1_name', 'buyer_2_name',
      'rep_1_property_address', 'rep_1_value', 'rep_1_seller_1_name',
      'rep_1_seller_2_name', 'rep_1_apn', 'rep_1_escrow_number',
      'rep_1_purchase_contract_date', 'referral_source', 'referral_source_email',
      'pp_display_name', 'pp_matter_number', 'pp_matter_status', 'pp_responsible_attorney'
    ];
    
    for (const [key, value] of Object.entries(obj)) {
      // Preserve snake_case for PP fields, convert others to camelCase
      const transformedKey = preserveSnakeCase.includes(key) ? key : snakeToCamel(key);
      transformed[transformedKey] = transformToCamelCase(value);
    }
    
    return transformed;
  }

  return obj;
}

/**
 * Recursively transform object keys from camelCase to snake_case
 * @param {any} obj - Object to transform
 * @returns {any} - Transformed object
 */
function transformToSnakeCase(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => transformToSnakeCase(item));
  }

  if (typeof obj === 'object') {
    const transformed = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = camelToSnake(key);
      transformed[snakeKey] = transformToSnakeCase(value);
    }
    
    return transformed;
  }

  return obj;
}

/**
 * Transform database query results to match frontend expectations
 * Handles both single objects and arrays of objects
 * @param {any} data - Database query result
 * @returns {any} - Transformed data
 */
function transformDatabaseResult(data) {
  if (!data) return data;
  
  // Handle Sequelize model instances
  if (data.toJSON && typeof data.toJSON === 'function') {
    return transformToCamelCase(data.toJSON());
  }
  
  // Handle arrays of model instances
  if (Array.isArray(data)) {
    return data.map(item => {
      if (item && item.toJSON && typeof item.toJSON === 'function') {
        return transformToCamelCase(item.toJSON());
      }
      return transformToCamelCase(item);
    });
  }
  
  // Handle plain objects
  return transformToCamelCase(data);
}

/**
 * Transform frontend data to match database schema
 * @param {any} data - Frontend data
 * @returns {any} - Transformed data
 */
function transformForDatabase(data) {
  return transformToSnakeCase(data);
}

/**
 * Special transformation for Supabase compatibility
 * Handles specific field mappings for PP data
 * @param {Object} ppData - Practice Partner data
 * @returns {Object} - Transformed data
 */
function transformPPData(ppData) {
  if (!ppData || typeof ppData !== 'object') return ppData;
  
  const transformed = transformToCamelCase(ppData);
  
  // Handle specific PP field mappings
  const fieldMappings = {
    // Contact fields
    'firstName': 'first_name',
    'lastName': 'last_name',
    'ppContactId': 'pp_contact_id',
    
    // Exchange fields  
    'startDate': 'start_date',
    'completionDate': 'completion_date',
    'clientId': 'client_id',
    'coordinatorId': 'coordinator_id',
    'ppMatterId': 'pp_matter_id',
    'exchangeValue': 'exchange_value',
    
    // Task fields
    'dueDate': 'due_date',
    'assignedTo': 'assigned_to',
    'ppTaskId': 'pp_task_id',
    'exchangeId': 'exchange_id',
    
    // Common fields
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'lastSyncAt': 'last_sync_at'
  };
  
  // Apply reverse mappings for database storage
  const result = { ...transformed };
  for (const [camelKey, snakeKey] of Object.entries(fieldMappings)) {
    if (transformed[camelKey] !== undefined) {
      result[snakeKey] = transformed[camelKey];
      delete result[camelKey];
    }
  }
  
  return result;
}

/**
 * Transform API response to include proper field names and relationships
 * @param {Object} data - Raw database data
 * @param {Object} options - Transform options
 * @returns {Object} - Transformed API response
 */
function transformApiResponse(data, options = {}) {
  const { includeRelations = true, includeComputed = true } = options;
  
  if (!data) return data;
  
  let transformed = transformToCamelCase(data);
  
  // Add computed fields if requested
  if (includeComputed && typeof data === 'object') {
    // Add display names for contacts
    if (transformed.firstName && transformed.lastName) {
      transformed.displayName = `${transformed.firstName} ${transformed.lastName}`;
    }
    
    // Add status labels for exchanges
    if (transformed.status) {
      const statusLabels = {
        'PENDING': 'Pending',
        '45D': '45-Day Period',
        '180D': '180-Day Period', 
        'COMPLETED': 'Completed'
      };
      transformed.statusLabel = statusLabels[transformed.status] || transformed.status;
    }
    
    // Add urgency indicators
    if (transformed.dueDate) {
      const dueDate = new Date(transformed.dueDate);
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      
      transformed.isOverdue = daysUntilDue < 0;
      transformed.isUrgent = daysUntilDue <= 7 && daysUntilDue >= 0;
      transformed.daysUntilDue = daysUntilDue;
    }
  }
  
  return transformed;
}

module.exports = {
  snakeToCamel,
  camelToSnake,
  transformToCamelCase,
  transformToSnakeCase,
  transformDatabaseResult,
  transformForDatabase,
  transformPPData,
  transformApiResponse
};