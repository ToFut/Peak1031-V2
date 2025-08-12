/**
 * GPT-Powered SQL Query Service
 * Converts natural language queries into safe SQL queries for exchange analysis
 */

const supabaseService = require('./supabase');

class GPTQueryService {
  constructor() {
    this.allowedTables = ['exchanges', 'users', 'contacts', 'tasks', 'documents', 'messages'];
    this.allowedColumns = {
      exchanges: [
        'id', 'exchange_number', 'name', 'exchange_type', 'status',
        'relinquished_property_value', 'replacement_property_value', 'exchange_value',
        'sale_date', 'identification_deadline', 'exchange_deadline',
        'client_id', 'coordinator_id', 'created_at', 'updated_at'
      ],
      users: ['id', 'first_name', 'last_name', 'email', 'role', 'is_active', 'created_at'],
      contacts: ['id', 'first_name', 'last_name', 'email', 'company', 'type', 'created_at'],
      tasks: ['id', 'title', 'status', 'priority', 'due_date', 'exchange_id', 'assigned_to', 'created_at'],
      documents: ['id', 'filename', 'category', 'exchange_id', 'uploaded_by', 'created_at'],
      messages: ['id', 'content', 'sender_id', 'exchange_id', 'created_at']
    };

    // Pre-built query templates for common requests
    this.classicQueries = {
      'total_exchange_value': {
        name: 'Total Exchange Value',
        description: 'Sum of all exchange values',
        sql: `
          SELECT 
            COALESCE(SUM(exchange_value), 0) as total_value,
            COUNT(*) as exchange_count,
            COALESCE(AVG(exchange_value), 0) as average_value
          FROM exchanges 
          WHERE status != 'cancelled'
        `,
        resultType: 'single'
      },

      'active_exchanges_by_coordinator': {
        name: 'Active Exchanges by Coordinator',
        description: 'Count of active exchanges grouped by coordinator',
        sql: `
          SELECT 
            u.first_name || ' ' || u.last_name as coordinator_name,
            COUNT(e.id) as active_exchanges,
            COALESCE(SUM(e.exchange_value), 0) as total_value
          FROM exchanges e
          LEFT JOIN users u ON e.coordinator_id = u.id
          WHERE e.status = 'active'
          GROUP BY e.coordinator_id, u.first_name, u.last_name
          ORDER BY active_exchanges DESC
        `,
        resultType: 'multiple'
      },

      'exchanges_by_status': {
        name: 'Exchanges by Status',
        description: 'Count and value of exchanges grouped by status',
        sql: `
          SELECT 
            status,
            COUNT(*) as count,
            COALESCE(SUM(exchange_value), 0) as total_value,
            COALESCE(AVG(exchange_value), 0) as average_value
          FROM exchanges
          GROUP BY status
          ORDER BY count DESC
        `,
        resultType: 'multiple'
      },

      'upcoming_deadlines': {
        name: 'Upcoming Deadlines',
        description: 'Exchanges with approaching 45-day or 180-day deadlines',
        sql: `
          SELECT 
            e.exchange_number,
            e.name,
            e.identification_deadline,
            e.exchange_deadline,
            (e.identification_deadline - CURRENT_DATE) as days_to_45_deadline,
            (e.exchange_deadline - CURRENT_DATE) as days_to_180_deadline,
            u.first_name || ' ' || u.last_name as coordinator
          FROM exchanges e
          LEFT JOIN users u ON e.coordinator_id = u.id
          WHERE e.status = 'active' 
            AND (e.identification_deadline <= CURRENT_DATE + INTERVAL '30 days' OR e.exchange_deadline <= CURRENT_DATE + INTERVAL '30 days')
          ORDER BY e.identification_deadline ASC NULLS LAST
        `,
        resultType: 'multiple'
      },

      'high_value_exchanges': {
        name: 'High Value Exchanges (>$5M)',
        description: 'Exchanges with value greater than $5 million',
        sql: `
          SELECT 
            e.exchange_number,
            e.name,
            e.exchange_value,
            e.status,
            u.first_name || ' ' || u.last_name as coordinator
          FROM exchanges e
          LEFT JOIN users u ON e.coordinator_id = u.id
          WHERE e.exchange_value > 5000000
          ORDER BY e.exchange_value DESC
        `,
        resultType: 'multiple'
      },

      'monthly_performance': {
        name: 'Monthly Performance',
        description: 'Exchange completion and value trends by month',
        sql: `
          SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as exchanges_started,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as exchanges_completed,
            COALESCE(SUM(exchange_value), 0) as total_value
          FROM exchanges
          WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY month DESC
        `,
        resultType: 'multiple'
      },

      'user_activity_summary': {
        name: 'User Activity Summary',
        description: 'Summary of user roles and activity levels',
        sql: `
          SELECT 
            role,
            COUNT(*) as user_count,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_users
          FROM users
          GROUP BY role
          ORDER BY user_count DESC
        `,
        resultType: 'multiple'
      },

      'exchange_completion_rate': {
        name: 'Exchange Completion Rate',
        description: 'Success rate and completion statistics',
        sql: `
          SELECT 
            COUNT(*) as total_exchanges,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
            ROUND(
              COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / 
              NULLIF(COUNT(CASE WHEN status IN ('completed', 'failed', 'cancelled') THEN 1 END), 0), 
              2
            ) as completion_rate_percent
          FROM exchanges
          WHERE status IN ('completed', 'failed', 'cancelled')
        `,
        resultType: 'single'
      }
    };
  }

  /**
   * Execute a classic (pre-built) query
   */
  async executeClassicQuery(queryKey, params = {}) {
    try {
      const queryTemplate = this.classicQueries[queryKey];
      if (!queryTemplate) {
        throw new Error(`Classic query '${queryKey}' not found`);
      }

      console.log(`📊 Executing classic query: ${queryTemplate.name}`);

      // Execute the query
      // Execute the query directly without RPC
      let data, error;
      
      // Direct query implementation for each classic query
      console.log('Executing direct query for:', queryKey);
      
      // For now, let's execute specific queries directly
      if (queryKey === 'total_exchange_value') {
          const result = await supabaseService.client
            .from('exchanges')
            .select('exchange_value, relinquished_property_value, replacement_property_value')
            .neq('status', 'cancelled');
          
          if (result.error) {
            error = result.error;
          } else {
            // Use exchange_value if available, otherwise use the max of relinquished/replacement values
            const values = result.data.map(e => {
              if (e.exchange_value) return e.exchange_value;
              const relinquished = e.relinquished_property_value || 0;
              const replacement = e.replacement_property_value || 0;
              return Math.max(relinquished, replacement);
            });
            const total = values.reduce((sum, val) => sum + val, 0);
            const avg = values.length > 0 ? total / values.length : 0;
            data = [{
              total_value: total,
              exchange_count: values.length,
              average_value: avg
            }];
          }
        } else if (queryKey === 'exchanges_by_status') {
          const result = await supabaseService.client
            .from('exchanges')
            .select('status, exchange_value, relinquished_property_value, replacement_property_value');
          
          if (result.error) {
            error = result.error;
          } else {
            const grouped = {};
            result.data.forEach(ex => {
              const value = ex.exchange_value || Math.max(
                ex.relinquished_property_value || 0,
                ex.replacement_property_value || 0
              );
              if (!grouped[ex.status]) {
                grouped[ex.status] = { count: 0, total: 0, values: [] };
              }
              grouped[ex.status].count++;
              grouped[ex.status].total += value;
              grouped[ex.status].values.push(value);
            });
            
            data = Object.entries(grouped).map(([status, stats]) => ({
              status,
              count: stats.count,
              total_value: stats.total,
              average_value: stats.values.length > 0 ? stats.total / stats.values.length : 0
            }));
          }
      } else if (queryKey === 'upcoming_deadlines') {
        const result = await supabaseService.client
          .from('exchanges')
          .select(`
            id,
            exchange_number,
            name,
            identification_deadline,
            exchange_deadline,
            status,
            coordinator_id,
            coordinator:people!coordinator_id(first_name, last_name)
          `)
          .in('status', ['45D', '180D', 'active', 'Active', 'In Progress']);
        
        if (result.error) {
          error = result.error;
        } else {
          const now = new Date();
          const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          
          data = result.data
            .map(ex => {
              const id45 = ex.identification_deadline ? new Date(ex.identification_deadline) : null;
              const ex180 = ex.exchange_deadline ? new Date(ex.exchange_deadline) : null;
              const days45 = id45 ? Math.ceil((id45 - now) / (1000 * 60 * 60 * 24)) : null;
              const days180 = ex180 ? Math.ceil((ex180 - now) / (1000 * 60 * 60 * 24)) : null;
              
              return {
                exchange_number: ex.exchange_number,
                name: ex.name,
                identification_deadline: ex.identification_deadline,
                exchange_deadline: ex.exchange_deadline,
                days_to_45_deadline: days45,
                days_to_180_deadline: days180,
                coordinator: ex.coordinator ? 
                  `${ex.coordinator.first_name} ${ex.coordinator.last_name}` : 'N/A'
              };
            })
            .filter(ex => {
              // Include if either deadline is within 30 days
              return (ex.days_to_45_deadline !== null && ex.days_to_45_deadline <= 30) ||
                     (ex.days_to_180_deadline !== null && ex.days_to_180_deadline <= 30);
            })
            .sort((a, b) => {
              // Sort by whichever deadline is closer
              const aDays = Math.min(
                a.days_to_45_deadline !== null ? a.days_to_45_deadline : Infinity,
                a.days_to_180_deadline !== null ? a.days_to_180_deadline : Infinity
              );
              const bDays = Math.min(
                b.days_to_45_deadline !== null ? b.days_to_45_deadline : Infinity,
                b.days_to_180_deadline !== null ? b.days_to_180_deadline : Infinity
              );
              return aDays - bDays;
            });
        }
      } else if (queryKey === 'exchange_completion_rate') {
        const result = await supabaseService.client
          .from('exchanges')
          .select('status');
        
        if (result.error) {
          error = result.error;
        } else {
          const total = result.data.length;
          const completed = result.data.filter(e => e.status === 'COMPLETED' || e.status === 'completed').length;
          const failed = result.data.filter(e => e.status === 'FAILED' || e.status === 'failed').length;
          const cancelled = result.data.filter(e => e.status === 'CANCELLED' || e.status === 'cancelled').length;
          const finalizedTotal = completed + failed + cancelled;
          
          data = [{
            total_exchanges: total,
            completed: completed,
            failed: failed,
            cancelled: cancelled,
            completion_rate_percent: finalizedTotal > 0 ? Math.round((completed / finalizedTotal) * 100) : 0
          }];
        }
      } else if (queryKey === 'monthly_performance') {
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        
        const result = await supabaseService.client
          .from('exchanges')
          .select('created_at, status, exchange_value, relinquished_property_value, replacement_property_value')
          .gte('created_at', twelveMonthsAgo.toISOString());
        
        if (result.error) {
          error = result.error;
        } else {
          const monthlyData = {};
          
          result.data.forEach(ex => {
            const date = new Date(ex.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                month: monthKey,
                exchanges_started: 0,
                exchanges_completed: 0,
                total_value: 0
              };
            }
            
            monthlyData[monthKey].exchanges_started++;
            if (ex.status === 'COMPLETED' || ex.status === 'completed') {
              monthlyData[monthKey].exchanges_completed++;
            }
            
            const value = ex.exchange_value || Math.max(
              ex.relinquished_property_value || 0,
              ex.replacement_property_value || 0
            );
            monthlyData[monthKey].total_value += value;
          });
          
          data = Object.values(monthlyData).sort((a, b) => b.month.localeCompare(a.month));
        }
      } else if (queryKey === 'user_activity_summary') {
        const result = await supabaseService.client
          .from('users')
          .select('role, is_active, created_at');
        
        if (result.error) {
          error = result.error;
        } else {
          const roleData = {};
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          
          result.data.forEach(user => {
            if (!roleData[user.role]) {
              roleData[user.role] = {
                role: user.role,
                user_count: 0,
                active_users: 0,
                recent_users: 0
              };
            }
            
            roleData[user.role].user_count++;
            if (user.is_active) {
              roleData[user.role].active_users++;
            }
            if (new Date(user.created_at) >= thirtyDaysAgo) {
              roleData[user.role].recent_users++;
            }
          });
          
          data = Object.values(roleData).sort((a, b) => b.user_count - a.user_count);
        }
      } else if (queryKey === 'active_exchanges_by_coordinator') {
        const result = await supabaseService.client
          .from('exchanges')
          .select(`
            coordinator_id,
            status,
            exchange_value,
            relinquished_property_value,
            replacement_property_value,
            coordinator:people!coordinator_id(first_name, last_name)
          `)
          .in('status', ['45D', '180D', 'active', 'Active', 'In Progress']);
        
        if (result.error) {
          error = result.error;
        } else {
          const coordinatorData = {};
          
          result.data.forEach(ex => {
            const coordinatorName = ex.coordinator ? 
              `${ex.coordinator.first_name} ${ex.coordinator.last_name}` : 'Unassigned';
            
            if (!coordinatorData[coordinatorName]) {
              coordinatorData[coordinatorName] = {
                coordinator_name: coordinatorName,
                active_exchanges: 0,
                total_value: 0
              };
            }
            
            coordinatorData[coordinatorName].active_exchanges++;
            const value = ex.exchange_value || Math.max(
              ex.relinquished_property_value || 0,
              ex.replacement_property_value || 0
            );
            coordinatorData[coordinatorName].total_value += value;
          });
          
          data = Object.values(coordinatorData).sort((a, b) => b.active_exchanges - a.active_exchanges);
        }
      } else if (queryKey === 'high_value_exchanges') {
        const result = await supabaseService.client
          .from('exchanges')
          .select(`
            exchange_number,
            name,
            exchange_value,
            relinquished_property_value,
            replacement_property_value,
            status,
            coordinator:people!coordinator_id(first_name, last_name)
          `);
        
        if (result.error) {
          error = result.error;
        } else {
          data = result.data
            .map(ex => {
              const value = ex.exchange_value || Math.max(
                ex.relinquished_property_value || 0,
                ex.replacement_property_value || 0
              );
              return {
                exchange_number: ex.exchange_number,
                name: ex.name,
                exchange_value: value,
                status: ex.status,
                coordinator: ex.coordinator ? 
                  `${ex.coordinator.first_name} ${ex.coordinator.last_name}` : 'N/A'
              };
            })
            .filter(ex => ex.exchange_value > 5000000)
            .sort((a, b) => b.exchange_value - a.exchange_value);
        }
      } else {
        // For other queries, throw an error for now
        error = new Error(`Direct query implementation not available for: ${queryKey}`);
      }

      if (error) {
        console.error('Classic query error:', error);
        throw new Error(`Query execution failed: ${error.message}`);
      }

      return {
        queryName: queryTemplate.name,
        description: queryTemplate.description,
        resultType: queryTemplate.resultType,
        data: data || [],
        executedAt: new Date().toISOString(),
        queryType: 'classic'
      };

    } catch (error) {
      console.error('Classic query execution error:', error);
      throw new Error(`Failed to execute classic query: ${error.message}`);
    }
  }

  /**
   * Get all available classic queries
   */
  getClassicQueries() {
    return Object.keys(this.classicQueries).map(key => ({
      key,
      name: this.classicQueries[key].name,
      description: this.classicQueries[key].description,
      resultType: this.classicQueries[key].resultType
    }));
  }

  /**
   * Convert natural language to SQL (GPT-powered)
   * Note: In production, this would call OpenAI API or local GPT model
   */
  async convertNaturalLanguageToSQL(naturalQuery) {
    try {
      console.log(`🤖 Converting natural language query: "${naturalQuery}"`);

      // For now, implement pattern matching for common queries
      // In production, replace with actual GPT/LLM integration
      const sqlQuery = this.parseNaturalLanguage(naturalQuery);

      if (!sqlQuery) {
        throw new Error('Could not understand the query. Try rephrasing or use a classic query.');
      }

      // Validate the generated SQL
      const validation = this.validateSQL(sqlQuery);
      if (!validation.isValid) {
        throw new Error(`Generated query is not safe: ${validation.errors.join(', ')}`);
      }

      return {
        originalQuery: naturalQuery,
        generatedSQL: sqlQuery,
        isValid: true,
        suggestedImprovements: validation.suggestions || []
      };

    } catch (error) {
      console.error('Natural language conversion error:', error);
      throw new Error(`Failed to convert query: ${error.message}`);
    }
  }

  /**
   * Execute a natural language query
   */
  async executeNaturalLanguageQuery(naturalQuery) {
    try {
      console.log(`🤖 Processing natural language query: "${naturalQuery}"`);
      
      // Check if this matches a classic query pattern first
      const lowerQuery = naturalQuery.toLowerCase();
      
      // COUNT QUERIES - Handle "how many" questions first
      if ((lowerQuery.includes('how many') || lowerQuery.includes('count')) && lowerQuery.includes('exchange')) {
        console.log('🔢 Detected count query for exchanges');
        const result = await supabaseService.client
          .from('exchanges')
          .select('*', { count: 'exact', head: true });
        
        if (result.error) {
          throw new Error(`Count query failed: ${result.error.message}`);
        }
        
        return {
          originalQuery: naturalQuery,
          queryName: 'Total Exchange Count',
          description: `Total number of exchanges in the system`,
          data: [{
            total_exchanges: result.count || 0,
            query_type: 'count'
          }],
          executedAt: new Date().toISOString(),
          queryType: 'ai_generated',
          generatedSQL: 'SELECT COUNT(*) as total_exchanges FROM exchanges'
        };
      }
      
      // VALUE QUERIES
      if (lowerQuery.includes('total') && (lowerQuery.includes('value') || lowerQuery.includes('sum'))) {
        return await this.executeClassicQuery('total_exchange_value');
      }
      
      // STATUS QUERIES
      if (lowerQuery.includes('status') && (lowerQuery.includes('breakdown') || lowerQuery.includes('group'))) {
        return await this.executeClassicQuery('exchanges_by_status');
      }
      
      // DEADLINE QUERIES
      if (lowerQuery.includes('deadline') || lowerQuery.includes('upcoming') || lowerQuery.includes('due')) {
        return await this.executeClassicQuery('upcoming_deadlines');
      }
      
      // HIGH VALUE QUERIES
      if (lowerQuery.includes('high value') || lowerQuery.includes('expensive') || lowerQuery.includes('over')) {
        return await this.executeClassicQuery('high_value_exchanges');
      }
      
      // COMPLETION RATE QUERIES
      if (lowerQuery.includes('completion') && lowerQuery.includes('rate')) {
        return await this.executeClassicQuery('exchange_completion_rate');
      }
      
      // PERFORMANCE QUERIES
      if (lowerQuery.includes('monthly') || lowerQuery.includes('performance')) {
        return await this.executeClassicQuery('monthly_performance');
      }
      
      // Default fallback - show recent exchanges
      console.log('🔍 No specific pattern matched, returning recent exchanges');
      
      const result = await supabaseService.client
        .from('exchanges')
        .select(`
          id,
          exchange_number,
          name,
          status,
          exchange_value,
          relinquished_property_value,
          replacement_property_value,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (result.error) {
        throw new Error(`Query execution failed: ${result.error.message}`);
      }
      
      // Process the data to include calculated exchange values
      const data = (result.data || []).map(ex => ({
        ...ex,
        exchange_value: ex.exchange_value || Math.max(
          ex.relinquished_property_value || 0,
          ex.replacement_property_value || 0
        )
      }));

      return {
        originalQuery: naturalQuery,
        queryName: 'Recent Exchanges',
        description: 'Showing recent exchanges as no specific pattern was matched',
        data: data,
        executedAt: new Date().toISOString(),
        queryType: 'ai_interpreted',
        suggestions: [
          'Try queries like: "Show total exchange value"',
          '"Show exchanges by status"',
          '"Show upcoming deadlines"',
          '"Show high value exchanges"'
        ]
      };

    } catch (error) {
      console.error('Natural language query execution error:', error);
      throw new Error(`Failed to execute AI query: ${error.message}`);
    }
  }

  /**
   * Simple pattern matching for natural language (placeholder for GPT)
   */
  parseNaturalLanguage(query) {
    const lowerQuery = query.toLowerCase();

    // Count patterns - Handle "how many" questions
    if ((lowerQuery.includes('how many') || lowerQuery.includes('count')) && lowerQuery.includes('exchange')) {
      return `
        SELECT 
          COUNT(*) as total_exchanges,
          'count' as query_type
        FROM exchanges
      `;
    }

    // Total value patterns
    if (lowerQuery.includes('total value') || lowerQuery.includes('sum of values')) {
      return `
        SELECT 
          COALESCE(SUM(exchange_value), 0) as total_value,
          COUNT(*) as exchange_count
        FROM exchanges 
        WHERE status != 'cancelled'
      `;
    }

    // Active exchanges patterns
    if (lowerQuery.includes('active exchanges') && lowerQuery.includes('coordinator')) {
      return `
        SELECT 
          u.first_name || ' ' || u.last_name as coordinator,
          COUNT(e.id) as active_count
        FROM exchanges e
        LEFT JOIN users u ON e.coordinator_id = u.id
        WHERE e.status = 'active'
        GROUP BY e.coordinator_id, u.first_name, u.last_name
        ORDER BY active_count DESC
      `;
    }

    // Status breakdown patterns
    if (lowerQuery.includes('exchanges by status') || lowerQuery.includes('status breakdown')) {
      return `
        SELECT 
          status,
          COUNT(*) as count,
          COALESCE(SUM(exchange_value), 0) as total_value
        FROM exchanges
        GROUP BY status
        ORDER BY count DESC
      `;
    }

    // High value patterns
    if (lowerQuery.includes('high value') || lowerQuery.includes('expensive')) {
      const amount = this.extractAmount(lowerQuery) || 5000000;
      return `
        SELECT 
          exchange_number,
          name,
          exchange_value,
          status
        FROM exchanges
        WHERE exchange_value > ${amount}
        ORDER BY exchange_value DESC
      `;
    }

    // Deadline patterns
    if (lowerQuery.includes('deadline') || lowerQuery.includes('due soon')) {
      return `
        SELECT 
          exchange_number,
          name,
          identification_deadline,
          exchange_deadline,
          (identification_deadline - CURRENT_DATE) as days_to_45_deadline,
          (exchange_deadline - CURRENT_DATE) as days_to_180_deadline
        FROM exchanges
        WHERE status = 'active' 
          AND (identification_deadline <= CURRENT_DATE + INTERVAL '30 days' OR exchange_deadline <= CURRENT_DATE + INTERVAL '30 days')
        ORDER BY identification_deadline ASC NULLS LAST
      `;
    }

    // User count patterns
    if (lowerQuery.includes('how many users') || lowerQuery.includes('user count')) {
      return `
        SELECT 
          role,
          COUNT(*) as user_count,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
        FROM users
        GROUP BY role
        ORDER BY user_count DESC
      `;
    }

    return null; // Could not parse
  }

  /**
   * Extract monetary amounts from natural language
   */
  extractAmount(query) {
    const patterns = [
      /\$?(\d+)(?:k|thousand)/i,
      /\$?(\d+)(?:m|million)/i,
      /\$?(\d+)(?:b|billion)/i,
      /\$?(\d+(?:\.\d+)?)/
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        let amount = parseFloat(match[1]);
        if (query.toLowerCase().includes('k') || query.toLowerCase().includes('thousand')) {
          amount *= 1000;
        } else if (query.toLowerCase().includes('m') || query.toLowerCase().includes('million')) {
          amount *= 1000000;
        } else if (query.toLowerCase().includes('b') || query.toLowerCase().includes('billion')) {
          amount *= 1000000000;
        }
        return amount;
      }
    }

    return null;
  }

  /**
   * Validate SQL query for security
   */
  validateSQL(sql) {
    const errors = [];
    const suggestions = [];
    const upperSQL = sql.toUpperCase();

    // Security checks
    const dangerousKeywords = [
      'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE',
      'EXEC', 'EXECUTE', 'SP_', 'XP_', '--', '/*', '*/', ';--', 'UNION ALL SELECT'
    ];

    for (const keyword of dangerousKeywords) {
      if (upperSQL.includes(keyword)) {
        errors.push(`Dangerous keyword detected: ${keyword}`);
      }
    }

    // Table validation
    const tables = this.extractTableNames(sql);
    for (const table of tables) {
      if (!this.allowedTables.includes(table.toLowerCase())) {
        errors.push(`Table '${table}' is not allowed`);
      }
    }

    // Column validation (basic)
    const columns = this.extractColumnNames(sql);
    // Note: This is simplified - in production, you'd want more sophisticated column validation

    // Suggestions
    if (!upperSQL.includes('LIMIT') && upperSQL.includes('SELECT')) {
      suggestions.push('Consider adding a LIMIT clause for better performance');
    }

    if (upperSQL.includes('SELECT *')) {
      suggestions.push('Consider selecting specific columns instead of using SELECT *');
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions,
      extractedTables: tables,
      extractedColumns: columns
    };
  }

  /**
   * Extract table names from SQL
   */
  extractTableNames(sql) {
    const tablePattern = /(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
    const matches = [];
    let match;

    while ((match = tablePattern.exec(sql)) !== null) {
      matches.push(match[1]);
    }

    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Extract column names from SQL (simplified)
   */
  extractColumnNames(sql) {
    // This is a simplified extraction - in production, use a proper SQL parser
    const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/is);
    if (!selectMatch) return [];

    const selectClause = selectMatch[1];
    if (selectClause.trim() === '*') return ['*'];

    // Split by comma and clean up
    return selectClause
      .split(',')
      .map(col => col.trim().replace(/\s+AS\s+.*/i, ''))
      .filter(col => col.length > 0);
  }

  /**
   * Get query suggestions based on context
   */
  getQuerySuggestions(context = {}) {
    const suggestions = [
      'Show me all active exchanges',
      'What is the total value of all exchanges?',
      'Which exchanges are due soon?',
      'Show high value exchanges over $5 million',
      'How many users do we have by role?',
      'What is our exchange completion rate?',
      'Show exchanges by coordinator',
      'What are our monthly performance trends?'
    ];

    // Add context-specific suggestions
    if (context.userRole === 'admin') {
      suggestions.push(
        'Show system performance metrics',
        'Which coordinators are most active?',
        'What are our risk factors?'
      );
    }

    if (context.currentPage === 'exchanges') {
      suggestions.push(
        'Show exchanges created this month',
        'Which exchanges need attention?',
        'Show completed exchanges with their values'
      );
    }

    return suggestions;
  }
}

module.exports = new GPTQueryService();