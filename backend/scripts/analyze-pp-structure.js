#!/usr/bin/env node

/**
 * ANALYZE PRACTICEPANTHER DATA STRUCTURE
 * Gets sample data from PP API to understand exact field structure
 */

require('dotenv').config();

const fs = require('fs');
const PracticePartnerService = require('../services/practicePartnerService');

class PPStructureAnalyzer {
  constructor() {
    this.ppService = new PracticePartnerService();
    this.samples = {};
  }

  async analyzePPStructure() {
    console.log('🔍 ANALYZING PRACTICEPANTHER DATA STRUCTURE');
    console.log('============================================');
    console.log(`Started: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Get sample data from each PP endpoint
      await this.getSample('users', '/users', 3);
      await this.getSample('contacts', '/contacts', 5);
      await this.getSample('matters', '/matters', 5);
      await this.getSample('tasks', '/tasks', 5);
      await this.getSample('invoices', '/invoices', 3);
      await this.getSample('expenses', '/expenses', 3);
      
      // Try time entries (might not exist)
      try {
        await this.getSample('time_entries', '/time_entries', 3);
      } catch (error) {
        console.log('⚠️  Time entries endpoint not available');
        this.samples.time_entries = { available: false, error: error.message };
      }

      // Analyze and save structure
      await this.analyzeStructures();
      await this.generateSQL();
      
      console.log('');
      console.log('🎉 PP Structure Analysis Complete!');
      console.log('📄 Check generated files:');
      console.log('   - pp-data-samples.json (raw sample data)');
      console.log('   - pp-structure-analysis.json (field analysis)');
      console.log('   - pp-optimized-schema.sql (database schema)');
      
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
    }
  }

  async getSample(entityType, endpoint, count = 5) {
    console.log(`📥 Getting ${entityType} sample data...`);
    
    try {
      const response = await this.ppService.client.get(endpoint, { 
        params: { limit: count } 
      });
      
      const data = Object.values(response.data) || [];
      console.log(`   ✅ Found ${data.length} ${entityType} records`);
      
      // Store sample data
      this.samples[entityType] = {
        available: true,
        count: data.length,
        samples: data,
        endpoint: endpoint
      };
      
      // Show first record structure
      if (data.length > 0) {
        const firstRecord = data[0];
        const fields = Object.keys(firstRecord);
        console.log(`   📋 Fields (${fields.length}): ${fields.slice(0, 10).join(', ')}${fields.length > 10 ? '...' : ''}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${entityType} failed:`, error.message);
      this.samples[entityType] = {
        available: false,
        error: error.message,
        endpoint: endpoint
      };
    }
    
    console.log('');
  }

  async analyzeStructures() {
    console.log('🔬 ANALYZING FIELD STRUCTURES');
    console.log('=============================');
    
    const analysis = {};
    
    Object.entries(this.samples).forEach(([entityType, data]) => {
      if (!data.available || !data.samples) return;
      
      console.log(`\\n📊 Analyzing ${entityType}:`);
      
      const fieldAnalysis = {};
      const samples = data.samples;
      
      // Analyze each field across all samples
      samples.forEach(record => {
        Object.entries(record).forEach(([fieldName, value]) => {
          if (!fieldAnalysis[fieldName]) {
            fieldAnalysis[fieldName] = {
              type: null,
              nullable: false,
              maxLength: 0,
              examples: [],
              uniqueValues: new Set()
            };
          }
          
          const field = fieldAnalysis[fieldName];
          
          // Determine type
          if (value === null || value === undefined) {
            field.nullable = true;
          } else {
            const valueType = typeof value;
            const detailedType = this.getDetailedType(value);
            
            if (!field.type) {
              field.type = detailedType;
            } else if (field.type !== detailedType) {
              field.type = 'mixed';
            }
            
            // Track max length for strings
            if (typeof value === 'string' && value.length > field.maxLength) {
              field.maxLength = value.length;
            }
            
            // Store examples (limit to 3)
            if (field.examples.length < 3 && !field.examples.includes(value)) {
              field.examples.push(value);
            }
            
            // Track unique values (for small sets)
            if (field.uniqueValues.size < 20) {
              field.uniqueValues.add(value);
            }
          }
        });
      });
      
      // Convert Sets to arrays for JSON serialization
      Object.values(fieldAnalysis).forEach(field => {
        field.uniqueValues = Array.from(field.uniqueValues);
      });
      
      analysis[entityType] = {
        recordCount: samples.length,
        fields: fieldAnalysis,
        fieldCount: Object.keys(fieldAnalysis).length
      };
      
      console.log(`   Fields: ${Object.keys(fieldAnalysis).length}`);
      console.log(`   Sample fields: ${Object.keys(fieldAnalysis).slice(0, 5).join(', ')}`);
    });
    
    // Save analysis
    fs.writeFileSync(
      '/Users/segevbin/Desktop/Peak1031 V1 /backend/pp-structure-analysis.json',
      JSON.stringify(analysis, null, 2)
    );
    
    // Save raw samples
    fs.writeFileSync(
      '/Users/segevbin/Desktop/Peak1031 V1 /backend/pp-data-samples.json',
      JSON.stringify(this.samples, null, 2)
    );
    
    console.log('\\n✅ Analysis saved to files');
  }

  getDetailedType(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'decimal';
    if (typeof value === 'string') {
      // Check if it looks like a date
      if (/^\\d{4}-\\d{2}-\\d{2}/.test(value)) return 'timestamp';
      if (/^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$/.test(value)) return 'email';
      return 'text';
    }
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  }

  async generateSQL() {
    console.log('\\n🛠️  GENERATING OPTIMIZED SCHEMA');
    console.log('================================');
    
    let sql = `-- ================================================================\\n`;
    sql += `-- PRACTICEPANTHER OPTIMIZED SCHEMA\\n`;
    sql += `-- Generated: ${new Date().toISOString()}\\n`;
    sql += `-- Based on actual PP API data structure\\n`;
    sql += `-- ================================================================\\n\\n`;
    
    // Read the analysis
    const analysis = JSON.parse(fs.readFileSync(
      '/Users/segevbin/Desktop/Peak1031 V1 /backend/pp-structure-analysis.json',
      'utf8'
    ));
    
    Object.entries(analysis).forEach(([entityType, data]) => {
      if (!data.fields) return;
      
      const tableName = this.getTableName(entityType);
      
      sql += `-- ${entityType.toUpperCase()} TABLE (${data.fieldCount} PP fields)\\n`;
      sql += `CREATE TABLE IF NOT EXISTS ${tableName} (\\n`;
      sql += `    -- Core system fields\\n`;
      sql += `    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\\n`;
      sql += `    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\\n`;
      sql += `    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\\n`;
      sql += `    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\\n\\n`;
      sql += `    -- PracticePanther fields (exact mapping)\\n`;
      
      // Generate columns for each PP field
      Object.entries(data.fields).forEach(([fieldName, fieldInfo]) => {
        const columnDef = this.generateColumnDefinition(fieldName, fieldInfo);
        sql += `    pp_${fieldName} ${columnDef},\\n`;
      });
      
      sql = sql.slice(0, -2) + '\\n'; // Remove last comma
      sql += `);\\n\\n`;
      
      // Add index for PP ID field
      const idField = Object.keys(data.fields).find(f => f === 'id');
      if (idField) {
        sql += `CREATE UNIQUE INDEX IF NOT EXISTS idx_${tableName}_pp_id ON ${tableName}(pp_id);\\n`;
      }
      
      sql += `\\n`;
    });
    
    // Add relationships and constraints
    sql += this.generateRelationships();
    
    // Save SQL
    fs.writeFileSync(
      '/Users/segevbin/Desktop/Peak1031 V1 /backend/pp-optimized-schema.sql',
      sql
    );
    
    console.log('✅ Optimized schema SQL generated');
  }

  getTableName(entityType) {
    const mapping = {
      'users': 'pp_users',
      'contacts': 'pp_contacts',
      'matters': 'pp_matters', // We'll map this to exchanges later
      'tasks': 'pp_tasks',
      'invoices': 'pp_invoices',
      'expenses': 'pp_expenses',
      'time_entries': 'pp_time_entries'
    };
    return mapping[entityType] || `pp_${entityType}`;
  }

  generateColumnDefinition(fieldName, fieldInfo) {
    const { type, nullable, maxLength, uniqueValues } = fieldInfo;
    
    let sqlType = 'TEXT';
    let constraints = '';
    
    // Map types to SQL types
    switch (type) {
      case 'integer':
        sqlType = 'INTEGER';
        break;
      case 'decimal':
        sqlType = 'DECIMAL(15,4)';
        break;
      case 'boolean':
        sqlType = 'BOOLEAN';
        break;
      case 'timestamp':
        sqlType = 'TIMESTAMP WITH TIME ZONE';
        break;
      case 'email':
        sqlType = 'VARCHAR(255)';
        break;
      case 'text':
        if (maxLength > 0) {
          if (maxLength <= 50) sqlType = 'VARCHAR(50)';
          else if (maxLength <= 255) sqlType = 'VARCHAR(255)';
          else sqlType = 'TEXT';
        }
        break;
      case 'array':
      case 'object':
        sqlType = 'JSONB';
        break;
      default:
        sqlType = 'TEXT';
    }
    
    // Add NOT NULL if not nullable
    if (!nullable && fieldName !== 'id') {
      // Don't add NOT NULL to most fields to be safe during sync
      // constraints += ' NOT NULL';
    }
    
    // Add default for booleans
    if (type === 'boolean' && uniqueValues.length > 0) {
      const mostCommon = uniqueValues[0];
      constraints += ` DEFAULT ${mostCommon}`;
    }
    
    // Add default for arrays/objects
    if (type === 'array') {
      constraints += ` DEFAULT '[]'`;
    } else if (type === 'object') {
      constraints += ` DEFAULT '{}'`;
    }
    
    return sqlType + constraints;
  }

  generateRelationships() {
    return `-- ================================================================\\n` +
           `-- RELATIONSHIPS AND INDEXES\\n` +
           `-- ================================================================\\n\\n` +
           `-- Add performance indexes\\n` +
           `CREATE INDEX IF NOT EXISTS idx_pp_contacts_account_ref ON pp_contacts(pp_account_ref_id);\\n` +
           `CREATE INDEX IF NOT EXISTS idx_pp_matters_account_ref ON pp_matters(pp_account_ref_id);\\n` +
           `CREATE INDEX IF NOT EXISTS idx_pp_tasks_matter_ref ON pp_tasks(pp_matter_ref_id);\\n` +
           `CREATE INDEX IF NOT EXISTS idx_pp_invoices_matter_ref ON pp_invoices(pp_matter_ref_id);\\n\\n` +
           `-- Add sync timestamp indexes\\n` +
           `CREATE INDEX IF NOT EXISTS idx_pp_contacts_synced ON pp_contacts(synced_at);\\n` +
           `CREATE INDEX IF NOT EXISTS idx_pp_matters_synced ON pp_matters(synced_at);\\n` +
           `CREATE INDEX IF NOT EXISTS idx_pp_tasks_synced ON pp_tasks(synced_at);\\n\\n`;
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new PPStructureAnalyzer();
  analyzer.analyzePPStructure()
    .then(() => {
      console.log('\\n🎉 Structure analysis completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    });
}

module.exports = PPStructureAnalyzer;