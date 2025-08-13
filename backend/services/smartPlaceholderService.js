const { createClient } = require('@supabase/supabase-js');
const PizZip = require('pizzip');
const AdmZip = require('adm-zip');

class SmartPlaceholderService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY  // Use SERVICE_KEY for full database access
    );
  }

  /**
   * Step 1: Scan document and extract ALL unique placeholders
   */
  async extractPlaceholdersFromTemplate(templateBuffer) {
    console.log('🔍 Scanning template for placeholders...');
    
    const placeholders = new Set();
    
    try {
      const zip = new AdmZip(templateBuffer);
      
      // Scan all XML files
      zip.getEntries().forEach(entry => {
        if (entry.entryName.endsWith('.xml') && !entry.entryName.includes('rels')) {
          const content = entry.getData().toString('utf8');
          
          // Extract all possible placeholder patterns
          this.extractPlaceholderPatterns(content, placeholders);
        }
      });
      
      const uniquePlaceholders = Array.from(placeholders).sort();
      console.log('📋 Found placeholders:', uniquePlaceholders.slice(0, 10), '...and', uniquePlaceholders.length - 10, 'more');
      
      return uniquePlaceholders;
    } catch (error) {
      console.error('❌ Error extracting placeholders:', error);
      return [];
    }
  }

  /**
   * Extract different placeholder patterns
   */
  extractPlaceholderPatterns(content, placeholders) {
    // Pattern 1: #Placeholder# format
    const hashPattern = /#([A-Za-z0-9_.\s]+)#/g;
    let match;
    while ((match = hashPattern.exec(content)) !== null) {
      placeholders.add(match[1].trim());
    }
    
    // Pattern 2: {Placeholder} format  
    const bracePattern = /\{([A-Za-z0-9_.\s]+)\}/g;
    while ((match = bracePattern.exec(content)) !== null) {
      placeholders.add(match[1].trim());
    }
    
    // Pattern 3: Detect broken placeholders (like "Matter.Client Vesting" without delimiters)
    const brokenPattern = /(?:Matter|Contact|Exchange|Client|User|QI|System|Financial|Property|Date|Coordinator)\.[A-Za-z0-9_.\s]+/g;
    while ((match = brokenPattern.exec(content)) !== null) {
      placeholders.add(match[0].trim());
    }
  }

  /**
   * Step 2: Intelligently map placeholders to database queries
   */
  async buildPlaceholderMap(placeholders, exchangeId) {
    console.log('🧠 Building intelligent placeholder map...');
    
    const placeholderMap = {};
    const dataCache = {};
    
    // Fetch all related data once
    const relatedData = await this.fetchAllRelatedData(exchangeId);
    
    // Map each placeholder
    for (const placeholder of placeholders) {
      const value = await this.mapPlaceholderToData(placeholder, relatedData);
      placeholderMap[placeholder] = value;
    }
    
    console.log('✅ Placeholder mapping complete');
    return placeholderMap;
  }

  /**
   * Fetch all related data for an exchange
   */
  async fetchAllRelatedData(exchangeId) {
    console.log('📊 Fetching all related data for exchange:', exchangeId);
    
    const data = {
      exchange: null,
      client: null,
      coordinator: null,
      participants: [],
      properties: [],
      tasks: []
    };
    
    try {
      // Fetch exchange with all its data
      const { data: exchange, error: exchangeError } = await this.supabase
        .from('exchanges')
        .select('*')
        .eq('id', exchangeId)
        .single();
        
      if (exchangeError) {
        console.error('❌ Error fetching exchange:', exchangeError);
        throw exchangeError;
      }
      
      data.exchange = exchange;
      console.log('✅ Exchange fetched:', exchange.name || exchange.exchange_name);
      
      // Try to extract client info from various sources
      // 1. First try to get from contacts table if client_id exists
      if (exchange?.client_id) {
        const { data: client } = await this.supabase
          .from('contacts')
          .select('*')
          .eq('id', exchange.client_id)
          .single();
        
        if (client) {
          data.client = client;
          console.log('✅ Client fetched from contacts:', client.first_name, client.last_name);
        }
      }
      
      // 2. If no client from contacts, try to extract from exchange fields
      if (!data.client && exchange) {
        // Try to extract client name from various sources
        let firstName = '';
        let lastName = '';
        
        // Try buyer_1_name first
        if (exchange.buyer_1_name) {
          const parts = exchange.buyer_1_name.split(' ');
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }
        // Then client_vesting
        else if (exchange.client_vesting) {
          const parts = exchange.client_vesting.split(' ');
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }
        // Finally, try to extract from exchange name (format: "LastName, FirstName - Property")
        else if (exchange.name || exchange.exchange_name) {
          const exchangeName = exchange.name || exchange.exchange_name;
          // Check if name follows "LastName, FirstName" pattern
          if (exchangeName.includes(',')) {
            const namePart = exchangeName.split(' - ')[0]; // Get part before property address
            const parts = namePart.split(',');
            if (parts.length >= 2) {
              lastName = parts[0].trim();
              firstName = parts[1].trim();
            }
          } else {
            // Otherwise just split by space
            const namePart = exchangeName.split(' - ')[0];
            const parts = namePart.split(' ');
            firstName = parts[0] || '';
            lastName = parts.slice(1).join(' ') || '';
          }
        }
        
        // Build a synthetic client from exchange data
        data.client = {
          first_name: firstName,
          last_name: lastName,
          email: exchange.client_email || '',
          phone: exchange.client_phone || '',
          street1: exchange.rel_property_address || exchange.property_sold_address || '',
          city: exchange.rel_property_city || '',
          state: exchange.rel_property_state || '',
          zip_postal_code: exchange.rel_property_zip || ''
        };
        console.log('✅ Client info extracted from exchange data:', firstName, lastName);
      }
      
      // 3. Check if pp_data has any useful information
      if (exchange?.pp_data && typeof exchange.pp_data === 'object') {
        // If pp_data is an array, use the first item
        const ppData = Array.isArray(exchange.pp_data) ? exchange.pp_data[0] : exchange.pp_data;
        if (ppData) {
          // Override with pp_data if available
          if (ppData['Contact.FirstName']) data.client.first_name = ppData['Contact.FirstName'];
          if (ppData['Contact.LastName']) data.client.last_name = ppData['Contact.LastName'];
          if (ppData['Contact.Email']) data.client.email = ppData['Contact.Email'];
          if (ppData['Contact.HomeNumber']) data.client.phone = ppData['Contact.HomeNumber'];
          if (ppData['Contact.Street1']) data.client.street1 = ppData['Contact.Street1'];
          if (ppData['Contact.City']) data.client.city = ppData['Contact.City'];
          if (ppData['Contact.ProvinceState']) data.client.state = ppData['Contact.ProvinceState'];
          if (ppData['Contact.ZipPostalCode']) data.client.zip_postal_code = ppData['Contact.ZipPostalCode'];
          console.log('✅ Client info enhanced from pp_data');
        }
      }
      
      // Fetch coordinator if exists
      if (exchange?.coordinator_id) {
        const { data: coordinator } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', exchange.coordinator_id)
          .single();
        data.coordinator = coordinator;
        if (coordinator) {
          console.log('✅ Coordinator fetched:', coordinator.first_name, coordinator.last_name);
        }
      }
      
      // Fetch participants (but don't fail if table doesn't exist)
      try {
        const { data: participants } = await this.supabase
          .from('exchange_participants')
          .select('*')
          .eq('exchange_id', exchangeId);
        data.participants = participants || [];
      } catch (e) {
        console.log('⚠️ Could not fetch participants (table may not exist)');
      }
      
      // Fetch properties (but don't fail if table doesn't exist)
      try {
        const { data: properties } = await this.supabase
          .from('properties')
          .select('*')
          .eq('exchange_id', exchangeId);
        data.properties = properties || [];
      } catch (e) {
        console.log('⚠️ Could not fetch properties (table may not exist)');
      }
      
      console.log('✅ Related data fetched:', {
        hasExchange: !!data.exchange,
        hasClient: !!data.client,
        clientName: data.client ? `${data.client.first_name} ${data.client.last_name}` : 'None',
        hasCoordinator: !!data.coordinator,
        participantsCount: data.participants.length,
        propertiesCount: data.properties.length
      });
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching related data:', error);
      return data;
    }
  }

  /**
   * Smart mapping of individual placeholder to data
   */
  mapPlaceholderToData(placeholder, data) {
    const { exchange, client, coordinator, participants, properties } = data;
    const lowerPlaceholder = placeholder.toLowerCase();
    
    // First check if we have pp_data that matches directly
    if (exchange?.pp_data && typeof exchange.pp_data === 'object') {
      const ppData = Array.isArray(exchange.pp_data) ? exchange.pp_data[0] : exchange.pp_data;
      if (ppData && ppData[placeholder]) {
        console.log(`🔍 Direct PP mapping "${placeholder}" → "${ppData[placeholder]}"`);
        return ppData[placeholder];
      }
    }
    
    // Exchange/Matter mappings
    if (lowerPlaceholder.includes('matter.number') || lowerPlaceholder.includes('exchange.number')) {
      const result = exchange?.exchange_number || exchange?.pp_matter_number || exchange?.pp_matter_id || exchange?.id || 'N/A';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    if (lowerPlaceholder.includes('matter.name') || lowerPlaceholder.includes('exchange.name')) {
      const result = exchange?.name || exchange?.exchange_name || 'Unnamed Exchange';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    if (lowerPlaceholder.includes('matter.client vesting')) {
      const result = exchange?.client_vesting || this.formatClientName(client) || 'Client Name Not Available';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    if (lowerPlaceholder.includes('matter.client') || lowerPlaceholder.includes('client.name')) {
      const result = this.formatClientName(client) || exchange?.client_vesting || exchange?.buyer_1_name || 'Client Name Not Available';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    // Client/Contact mappings
    if (lowerPlaceholder.includes('contact.firstname') || lowerPlaceholder.includes('client.firstname')) {
      const result = client?.first_name || 'N/A';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    if (lowerPlaceholder.includes('contact.lastname') || lowerPlaceholder.includes('client.lastname')) {
      const result = client?.last_name || 'N/A';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    if (lowerPlaceholder.includes('contact.email') || lowerPlaceholder.includes('client.email')) {
      const result = client?.email || 'N/A';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    if (lowerPlaceholder.includes('contact.phone') || lowerPlaceholder.includes('client.phone')) {
      const result = client?.phone_mobile || client?.phone_work || client?.phone || 'N/A';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    if (lowerPlaceholder.includes('contact.fee')) {
      const result = this.formatCurrency(exchange?.fee || 0);
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    if (lowerPlaceholder.includes('contact.street') || lowerPlaceholder.includes('contact.address')) {
      return client?.address || client?.street1 || '';
    }
    
    if (lowerPlaceholder.includes('contact.city')) {
      return client?.city || '';
    }
    
    if (lowerPlaceholder.includes('contact.state')) {
      return client?.state || client?.region || '';
    }
    
    if (lowerPlaceholder.includes('contact.zip') || lowerPlaceholder.includes('postalcode')) {
      return client?.zip_postal_code || client?.zip || client?.postal_code || '';
    }
    
    // Exchange details
    if (lowerPlaceholder.includes('exchange.value') || lowerPlaceholder.includes('matter.value')) {
      const value = exchange?.exchange_value || exchange?.value || 0;
      return this.formatCurrency(value);
    }
    
    if (lowerPlaceholder.includes('exchange.status') || lowerPlaceholder.includes('matter.status')) {
      return exchange?.status || exchange?.new_status || 'Active';
    }
    
    if (lowerPlaceholder.includes('exchange.type') || lowerPlaceholder.includes('matter.type')) {
      return exchange?.exchange_type || 'Delayed Exchange';
    }
    
    // Properties - check multiple possible fields
    if (lowerPlaceholder.includes('rel') && lowerPlaceholder.includes('property') && lowerPlaceholder.includes('address')) {
      const result = exchange?.rel_property_address || exchange?.property_sold_address || exchange?.relinquished_property_address || 'Not specified';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    if (lowerPlaceholder.includes('relinquished') && lowerPlaceholder.includes('address')) {
      const relinquishedProperty = properties.find(p => p.property_type === 'relinquished');
      const result = relinquishedProperty?.address || exchange?.rel_property_address || exchange?.property_sold_address || 'Not specified';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    if ((lowerPlaceholder.includes('rep') || lowerPlaceholder.includes('replacement')) && lowerPlaceholder.includes('address')) {
      const replacementProperty = properties.find(p => p.property_type === 'replacement');
      const result = replacementProperty?.address || exchange?.rep_1_property_address || exchange?.property_bought_address || 'Not specified';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    // Settlement agents and escrow info
    if (lowerPlaceholder.includes('rel') && lowerPlaceholder.includes('settlement')) {
      if (lowerPlaceholder.includes('firstname')) return exchange?.rel_settlement_agent_first_name || '';
      if (lowerPlaceholder.includes('lastname')) return exchange?.rel_settlement_agent_last_name || '';
      if (lowerPlaceholder.includes('company')) return exchange?.rel_escrow_company || '';
      if (lowerPlaceholder.includes('street1')) return exchange?.rel_settlement_street1 || '';
      if (lowerPlaceholder.includes('city')) return exchange?.rel_settlement_city || '';
      if (lowerPlaceholder.includes('state')) return exchange?.rel_settlement_state || '';
      if (lowerPlaceholder.includes('zip')) return exchange?.rel_settlement_zip || '';
    }
    
    if (lowerPlaceholder.includes('rep') && lowerPlaceholder.includes('settlement')) {
      if (lowerPlaceholder.includes('firstname')) return exchange?.rep_settlement_agent_first_name || '';
      if (lowerPlaceholder.includes('lastname')) return exchange?.rep_settlement_agent_last_name || '';
      if (lowerPlaceholder.includes('company')) return exchange?.rep_escrow_company || '';
      if (lowerPlaceholder.includes('street1')) return exchange?.rep_settlement_street1 || '';
      if (lowerPlaceholder.includes('city')) return exchange?.rep_settlement_city || '';
      if (lowerPlaceholder.includes('state')) return exchange?.rep_settlement_state || '';
      if (lowerPlaceholder.includes('zip')) return exchange?.rep_settlement_zip || '';
    }
    
    // Escrow numbers
    if (lowerPlaceholder.includes('rel') && lowerPlaceholder.includes('escrow')) {
      return exchange?.rel_escrow_number || '';
    }
    if (lowerPlaceholder.includes('rep') && lowerPlaceholder.includes('escrow')) {
      return exchange?.rep_1_escrow_number || '';
    }
    
    // User/Coordinator mappings (User often refers to coordinator in templates)
    if (lowerPlaceholder.includes('user.firstname') || lowerPlaceholder.includes('coordinator.firstname')) {
      const result = coordinator?.first_name || 'N/A';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    if (lowerPlaceholder.includes('user.lastname') || lowerPlaceholder.includes('coordinator.lastname')) {
      const result = coordinator?.last_name || 'N/A';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    if (lowerPlaceholder.includes('user.title') || lowerPlaceholder.includes('coordinator.title')) {
      const result = coordinator?.title || 'Exchange Coordinator';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    if (lowerPlaceholder.includes('user.email') || lowerPlaceholder.includes('coordinator.email')) {
      const result = coordinator?.email || 'N/A';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    // Coordinator (general)
    if (lowerPlaceholder.includes('coordinator') && !lowerPlaceholder.includes('.')) {
      return coordinator?.name || coordinator?.email || 'Not assigned';
    }
    
    // Default fallback
    console.log(`⚠️ No mapping found for placeholder: ${placeholder}`);
    return `[${placeholder}]`; // Show unmapped placeholders clearly
  }

  /**
   * Step 3: Clean and inject data into template
   */
  async injectDataIntoTemplate(templateBuffer, placeholderMap) {
    console.log('💉 Injecting data into template...');
    
    try {
      const zip = new AdmZip(templateBuffer);
      let modifiedCount = 0;
      
      zip.getEntries().forEach(entry => {
        if (entry.entryName.endsWith('.xml') && !entry.entryName.includes('rels')) {
          let content = entry.getData().toString('utf8');
          let wasModified = false;
          
          // Replace all mapped placeholders
          for (const [placeholder, value] of Object.entries(placeholderMap)) {
            const cleanValue = this.sanitizeValue(value);
            
            // Multiple replacement patterns
            const patterns = [
              `#${placeholder}#`,
              `{${placeholder}}`,
              placeholder // For broken placeholders without delimiters
            ];
            
            patterns.forEach(pattern => {
              if (content.includes(pattern)) {
                content = content.replace(new RegExp(this.escapeRegExp(pattern), 'g'), cleanValue);
                wasModified = true;
                modifiedCount++;
              }
            });
          }
          
          if (wasModified) {
            zip.updateFile(entry, Buffer.from(content, 'utf8'));
          }
        }
      });
      
      console.log(`✅ Made ${modifiedCount} placeholder replacements`);
      return zip.toBuffer();
    } catch (error) {
      console.error('❌ Error injecting data:', error);
      throw error;
    }
  }

  // Helper methods
  formatClientName(client) {
    if (!client) return null;
    const firstName = client.first_name || client.firstName || '';
    const lastName = client.last_name || client.lastName || '';
    return `${firstName} ${lastName}`.trim() || null;
  }

  formatCurrency(amount) {
    if (!amount) return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num || 0);
  }

  sanitizeValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  }

  /**
   * Main method: Process template with smart placeholder system
   */
  async processTemplate(templateBuffer, exchangeId) {
    console.log('🚀 Starting smart placeholder processing...');
    
    try {
      // Step 1: Extract all placeholders
      const placeholders = await this.extractPlaceholdersFromTemplate(templateBuffer);
      
      // Step 2: Build placeholder map
      const placeholderMap = await this.buildPlaceholderMap(placeholders, exchangeId);
      
      // Step 3: Inject data
      const processedBuffer = await this.injectDataIntoTemplate(templateBuffer, placeholderMap);
      
      console.log('✅ Smart placeholder processing complete!');
      return processedBuffer;
    } catch (error) {
      console.error('❌ Smart placeholder processing failed:', error);
      throw error;
    }
  }
}

module.exports = SmartPlaceholderService;