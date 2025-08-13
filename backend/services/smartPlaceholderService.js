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
    console.log('📊 Fetching all related data...');
    
    const data = {
      exchange: null,
      client: null,
      coordinator: null,
      participants: [],
      properties: [],
      tasks: []
    };
    
    try {
      // Fetch exchange
      const { data: exchange } = await this.supabase
        .from('exchanges')
        .select('*')
        .eq('id', exchangeId)
        .single();
      data.exchange = exchange;
      
      // Fetch client if exists
      if (exchange?.client_id) {
        const { data: client } = await this.supabase
          .from('contacts')
          .select('*')
          .eq('id', exchange.client_id)
          .single();
        data.client = client;
      }
      
      // Fetch coordinator if exists
      if (exchange?.coordinator_id) {
        const { data: coordinator } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', exchange.coordinator_id)
          .single();
        data.coordinator = coordinator;
      }
      
      // Fetch participants
      const { data: participants } = await this.supabase
        .from('exchange_participants')
        .select(`
          *,
          contact:contacts(*)
        `)
        .eq('exchange_id', exchangeId);
      data.participants = participants || [];
      
      // Fetch properties
      const { data: properties } = await this.supabase
        .from('properties')
        .select('*')
        .eq('exchange_id', exchangeId);
      data.properties = properties || [];
      
      console.log('✅ Related data fetched:', {
        hasExchange: !!data.exchange,
        hasClient: !!data.client,
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
    
    // Exchange/Matter mappings
    if (lowerPlaceholder.includes('matter.number') || lowerPlaceholder.includes('exchange.number')) {
      const result = exchange?.number || exchange?.exchange_number || exchange?.pp_matter_id || 'N/A';
      console.log(`🔍 Mapping "${placeholder}" → "${result}"`);
      return result;
    }
    
    if (lowerPlaceholder.includes('matter.name') || lowerPlaceholder.includes('exchange.name')) {
      return exchange?.name || exchange?.exchange_name || 'Unnamed Exchange';
    }
    
    if (lowerPlaceholder.includes('matter.client') || lowerPlaceholder.includes('client.name')) {
      return this.formatClientName(client) || 'Client Name Not Available';
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
    
    // Properties
    if (lowerPlaceholder.includes('relinquished') && lowerPlaceholder.includes('address')) {
      const relinquishedProperty = properties.find(p => p.property_type === 'relinquished');
      return relinquishedProperty?.address || 'Not specified';
    }
    
    if (lowerPlaceholder.includes('replacement') && lowerPlaceholder.includes('address')) {
      const replacementProperty = properties.find(p => p.property_type === 'replacement');
      return replacementProperty?.address || 'Not specified';
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