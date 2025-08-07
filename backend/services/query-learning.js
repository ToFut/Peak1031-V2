/**
 * Query Learning Service
 * 
 * This service stores successful query patterns and learns from user interactions
 * to improve the natural language to SQL translation over time.
 */

const fs = require('fs').promises;
const path = require('path');

class QueryLearningService {
  constructor() {
    this.learningDataPath = path.join(__dirname, '../data/query-learning.json');
    this.queryPatterns = new Map();
    this.userFeedback = new Map();
    this.successful_queries = [];
    this.failed_queries = [];
    this.initialized = false;
  }

  /**
   * Initialize the learning service and load existing data
   */
  async initialize() {
    try {
      await this.ensureDataDirectory();
      await this.loadLearningData();
      this.initialized = true;
      console.log('📚 Query Learning Service initialized');
    } catch (error) {
      console.warn('⚠️ Query Learning Service initialization failed:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Ensure the data directory exists
   */
  async ensureDataDirectory() {
    const dataDir = path.dirname(this.learningDataPath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  /**
   * Load existing learning data from disk
   */
  async loadLearningData() {
    try {
      const data = await fs.readFile(this.learningDataPath, 'utf8');
      const parsed = JSON.parse(data);
      
      this.successful_queries = parsed.successful_queries || [];
      this.failed_queries = parsed.failed_queries || [];
      
      // Rebuild query patterns map
      this.queryPatterns.clear();
      if (parsed.query_patterns) {
        for (const [pattern, data] of Object.entries(parsed.query_patterns)) {
          this.queryPatterns.set(pattern, data);
        }
      }
      
      console.log(`📚 Loaded ${this.successful_queries.length} successful queries and ${this.failed_queries.length} failed queries`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet, start with empty data
        console.log('📚 Starting with empty learning data');
        await this.saveLearningData();
      } else {
        throw error;
      }
    }
  }

  /**
   * Save learning data to disk
   */
  async saveLearningData() {
    try {
      const data = {
        successful_queries: this.successful_queries,
        failed_queries: this.failed_queries,
        query_patterns: Object.fromEntries(this.queryPatterns),
        last_updated: new Date().toISOString(),
        version: '1.0'
      };
      
      await fs.writeFile(this.learningDataPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('❌ Failed to save learning data:', error);
    }
  }

  /**
   * Record a successful query for learning
   */
  async recordSuccessfulQuery(originalQuery, generatedSQL, results, userId = null) {
    if (!this.initialized) return;
    
    try {
      const queryRecord = {
        id: Date.now().toString(),
        original_query: originalQuery.toLowerCase().trim(),
        generated_sql: generatedSQL,
        result_count: results.length,
        user_id: userId,
        timestamp: new Date().toISOString(),
        success: true
      };
      
      this.successful_queries.push(queryRecord);
      
      // Keep only the last 1000 successful queries
      if (this.successful_queries.length > 1000) {
        this.successful_queries = this.successful_queries.slice(-1000);
      }
      
      // Extract and store pattern
      await this.extractPattern(originalQuery, generatedSQL, true);
      
      // Save periodically (every 10 queries)
      if (this.successful_queries.length % 10 === 0) {
        await this.saveLearningData();
      }
      
      console.log(`📚 Recorded successful query: "${originalQuery}"`);
    } catch (error) {
      console.error('❌ Failed to record successful query:', error);
    }
  }

  /**
   * Record a failed query for learning
   */
  async recordFailedQuery(originalQuery, error, userId = null) {
    if (!this.initialized) return;
    
    try {
      const queryRecord = {
        id: Date.now().toString(),
        original_query: originalQuery.toLowerCase().trim(),
        error_message: error.message || error.toString(),
        user_id: userId,
        timestamp: new Date().toISOString(),
        success: false
      };
      
      this.failed_queries.push(queryRecord);
      
      // Keep only the last 500 failed queries
      if (this.failed_queries.length > 500) {
        this.failed_queries = this.failed_queries.slice(-500);
      }
      
      // Save periodically
      if (this.failed_queries.length % 5 === 0) {
        await this.saveLearningData();
      }
      
      console.log(`📚 Recorded failed query: "${originalQuery}" - ${error.message}`);
    } catch (error) {
      console.error('❌ Failed to record failed query:', error);
    }
  }

  /**
   * Extract patterns from queries for future matching
   */
  async extractPattern(originalQuery, generatedSQL, success) {
    try {
      const cleanQuery = originalQuery.toLowerCase().trim();
      
      // Extract key words and phrases
      const keywords = this.extractKeywords(cleanQuery);
      const queryType = this.determineQueryType(cleanQuery);
      const targetTable = this.extractTargetTable(generatedSQL);
      
      const patternKey = `${queryType}_${keywords.slice(0, 3).join('_')}`;
      
      if (this.queryPatterns.has(patternKey)) {
        const existing = this.queryPatterns.get(patternKey);
        existing.count++;
        existing.success_rate = success ? 
          (existing.success_rate * (existing.count - 1) + 1) / existing.count :
          (existing.success_rate * (existing.count - 1)) / existing.count;
        existing.last_seen = new Date().toISOString();
        
        if (success) {
          existing.successful_sql = generatedSQL;
        }
      } else {
        this.queryPatterns.set(patternKey, {
          pattern: patternKey,
          keywords: keywords,
          query_type: queryType,
          target_table: targetTable,
          example_query: cleanQuery,
          successful_sql: success ? generatedSQL : null,
          count: 1,
          success_rate: success ? 1.0 : 0.0,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Failed to extract pattern:', error);
    }
  }

  /**
   * Extract keywords from query
   */
  extractKeywords(query) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'me', 'my', 'all', 'show', 'get', 'find'];
    const words = query.toLowerCase().split(/\s+/).filter(word => 
      word.length > 2 && !stopWords.includes(word)
    );
    return words;
  }

  /**
   * Determine query type
   */
  determineQueryType(query) {
    if (query.includes('how many') || query.includes('count')) return 'count';
    if (query.includes('show') || query.includes('list') || query.includes('get')) return 'list';
    if (query.includes('recent') || query.includes('latest')) return 'recent';
    if (query.includes('active') || query.includes('open')) return 'status';
    if (query.includes('overdue') || query.includes('late')) return 'overdue';
    return 'general';
  }

  /**
   * Extract target table from SQL
   */
  extractTargetTable(sql) {
    if (!sql) return null;
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    return fromMatch ? fromMatch[1].toLowerCase() : null;
  }

  /**
   * Find similar patterns for query suggestion
   */
  findSimilarPatterns(query, limit = 5) {
    if (!this.initialized) return [];
    
    const keywords = this.extractKeywords(query.toLowerCase());
    const queryType = this.determineQueryType(query.toLowerCase());
    
    const scored_patterns = [];
    
    for (const [patternKey, pattern] of this.queryPatterns) {
      let score = 0;
      
      // Type match bonus
      if (pattern.query_type === queryType) {
        score += 10;
      }
      
      // Keyword overlap
      const overlap = keywords.filter(k => pattern.keywords.includes(k)).length;
      score += overlap * 5;
      
      // Success rate bonus
      score += pattern.success_rate * 3;
      
      // Frequency bonus
      score += Math.min(pattern.count, 10) * 0.5;
      
      if (score > 0) {
        scored_patterns.push({ ...pattern, score });
      }
    }
    
    return scored_patterns
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get learning statistics
   */
  getLearningStats() {
    return {
      total_successful_queries: this.successful_queries.length,
      total_failed_queries: this.failed_queries.length,
      unique_patterns: this.queryPatterns.size,
      success_rate: this.successful_queries.length / (this.successful_queries.length + this.failed_queries.length),
      last_query: this.successful_queries.length > 0 ? 
        this.successful_queries[this.successful_queries.length - 1].timestamp : null,
      initialized: this.initialized
    };
  }

  /**
   * Get query suggestions based on learned patterns
   */
  getQuerySuggestions(limit = 10) {
    if (!this.initialized || this.queryPatterns.size === 0) {
      return [
        "How many exchanges are in the system?",
        "Show me active exchanges",
        "List recent users",
        "Find overdue tasks",
        "Show me all contacts"
      ];
    }
    
    // Get most successful patterns
    const suggestions = Array.from(this.queryPatterns.values())
      .filter(p => p.success_rate > 0.5 && p.count > 2)
      .sort((a, b) => (b.success_rate * b.count) - (a.success_rate * a.count))
      .slice(0, limit)
      .map(p => p.example_query);
    
    return suggestions.length > 0 ? suggestions : [
      "How many exchanges are in the system?",
      "Show me active exchanges",
      "List recent users"
    ];
  }

  /**
   * Manual feedback to improve learning
   */
  async recordUserFeedback(queryId, feedback, userId = null) {
    if (!this.initialized) return;
    
    try {
      this.userFeedback.set(queryId, {
        feedback,
        user_id: userId,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📚 Recorded user feedback for query ${queryId}: ${feedback}`);
    } catch (error) {
      console.error('❌ Failed to record user feedback:', error);
    }
  }
}

module.exports = new QueryLearningService();