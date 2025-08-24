/**
 * PracticePanther Token Administration Routes
 * 
 * Provides endpoints for monitoring and managing PP OAuth tokens
 */

const express = require('express');
const router = express.Router();
const PPTokenManager = require('../services/ppTokenManager');
const PracticePartnerService = require('../services/practicePartnerService');

// Try to import sync service if available
let syncService = null;
try {
  syncService = require('../services/scheduledSyncService');
} catch (error) {
  console.log('ℹ️ Scheduled sync service not available');
}

// Import comprehensive sync service for full data sync
const ComprehensivePPSyncService = require('../services/comprehensive-pp-sync');

// Initialize services
const tokenManager = new PPTokenManager();
const ppService = PracticePartnerService.instance || new PracticePartnerService();

/**
 * GET /api/admin/pp-token/status
 * Get current PP token status with detailed information
 */
router.get('/status', async (req, res) => {
  try {
    console.log('🔍 PP Admin: Checking token status...');
    
    const status = await tokenManager.getTokenStatus();
    const storedToken = await tokenManager.getStoredToken();
    
    // Calculate time since last refresh
    let lastRefreshInfo = null;
    if (storedToken && storedToken.provider_data?.refreshed_at) {
      const refreshedAt = new Date(storedToken.provider_data.refreshed_at);
      const timeSinceRefresh = Date.now() - refreshedAt.getTime();
      const hoursSinceRefresh = Math.floor(timeSinceRefresh / (1000 * 60 * 60));
      const minutesSinceRefresh = Math.floor((timeSinceRefresh % (1000 * 60 * 60)) / (1000 * 60));
      
      lastRefreshInfo = {
        refreshed_at: refreshedAt.toISOString(),
        time_since_refresh: `${hoursSinceRefresh}h ${minutesSinceRefresh}m ago`,
        hours_since_refresh: hoursSinceRefresh
      };
    }
    
    // Get token creation info
    let tokenInfo = null;
    if (storedToken) {
      tokenInfo = {
        created_at: storedToken.created_at,
        last_used_at: storedToken.last_used_at,
        expires_at: storedToken.expires_at,
        token_type: storedToken.token_type,
        scope: storedToken.scope,
        has_refresh_token: !!storedToken.refresh_token
      };
    }
    
    res.json({
      success: true,
      token_status: status,
      token_info: tokenInfo,
      last_refresh: lastRefreshInfo,
      environment: {
        client_id_configured: !!process.env.PP_CLIENT_ID,
        client_secret_configured: !!process.env.PP_CLIENT_SECRET,
        supabase_configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ PP Admin: Error getting token status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get token status',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/pp-token/refresh
 * Manually refresh the PP token
 */
router.post('/refresh', async (req, res) => {
  try {
    console.log('🔄 PP Admin: Manual token refresh requested...');
    
    // Get stored token first
    const storedToken = await tokenManager.getStoredToken();
    
    if (!storedToken) {
      return res.status(404).json({
        success: false,
        error: 'No stored token found',
        message: 'OAuth authorization required first'
      });
    }
    
    if (!storedToken.refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'No refresh token available',
        message: 'Cannot refresh token without refresh_token'
      });
    }
    
    // Attempt refresh
    const result = await tokenManager.refreshToken(storedToken.refresh_token);
    
    if (result) {
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        expires_at: result.expires_at,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Token refresh failed',
        message: 'Refresh token may be expired or invalid'
      });
    }
    
  } catch (error) {
    console.error('❌ PP Admin: Error refreshing token:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/pp-token/auth-url
 * Generate OAuth authorization URL
 */
router.get('/auth-url', (req, res) => {
  try {
    const redirectUri = req.query.redirect_uri || `${req.protocol}://${req.get('host')}/api/admin/pp-token/callback`;
    const state = req.query.state || 'admin-setup';
    
    const authUrl = tokenManager.generateAuthUrl(redirectUri, state);
    
    res.json({
      success: true,
      auth_url: authUrl,
      redirect_uri: redirectUri,
      state: state,
      instructions: [
        '1. Visit the auth_url to authorize the application',
        '2. You will be redirected back with an authorization code',
        '3. The code will be automatically exchanged for tokens'
      ]
    });
    
  } catch (error) {
    console.error('❌ PP Admin: Error generating auth URL:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate auth URL',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/pp-token/callback
 * OAuth callback endpoint
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;
    
    if (oauthError) {
      console.error('❌ PP OAuth Error:', oauthError);
      return res.status(400).json({
        success: false,
        error: 'OAuth authorization failed',
        message: oauthError
      });
    }
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code',
        message: 'No authorization code provided'
      });
    }
    
    console.log('🔄 PP Admin: Processing OAuth callback...');
    
    const redirectUri = `${req.protocol}://${req.get('host')}/api/admin/pp-token/callback`;
    const tokenData = await tokenManager.exchangeCodeForToken(code, redirectUri);
    
    console.log('✅ PP Admin: OAuth setup completed successfully');
    
    // Return success page or JSON based on Accept header
    const acceptsJson = req.headers.accept && req.headers.accept.includes('application/json');
    
    if (acceptsJson) {
      res.json({
        success: true,
        message: 'PracticePanther OAuth setup completed successfully',
        token_info: {
          expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
          has_refresh_token: !!tokenData.refresh_token,
          scope: tokenData.scope
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // Return HTML success page
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>PracticePanther OAuth - Success</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { color: #28a745; }
            .info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .code { background: #f8f9fa; padding: 10px; border-radius: 3px; font-family: monospace; }
          </style>
        </head>
        <body>
          <h1 class="success">✅ PracticePanther OAuth Setup Complete</h1>
          <div class="info">
            <p><strong>Success!</strong> Your PracticePanther integration is now authorized and ready to use.</p>
            <p><strong>Token expires:</strong> ${new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()}</p>
            <p><strong>Auto-refresh:</strong> ${tokenData.refresh_token ? 'Enabled' : 'Not available'}</p>
          </div>
          <p>You can now close this window and return to your application.</p>
          <div class="code">
            <strong>Next steps:</strong><br>
            • Test the connection: GET /api/admin/pp-token/status<br>
            • Your PracticePanther API calls will now work automatically<br>
            • Tokens will auto-refresh when needed
          </div>
        </body>
        </html>
      `);
    }
    
  } catch (error) {
    console.error('❌ PP Admin: OAuth callback error:', error.message);
    res.status(500).json({
      success: false,
      error: 'OAuth callback failed',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/pp-token/test
 * Test PP API connection
 */
router.post('/test', async (req, res) => {
  try {
    console.log('🧪 PP Admin: Testing API connection...');
    
    // Try to make a simple API call
    const testResult = await ppService.authenticate();
    
    // Try to get user info or simple endpoint
    let apiTestResult = null;
    try {
      // This is a simple endpoint that should work if authentication is successful
      const response = await ppService.client.get('/user');
      apiTestResult = {
        success: true,
        endpoint: '/user',
        status: response.status,
        data: response.data ? 'Data received' : 'No data'
      };
    } catch (apiError) {
      apiTestResult = {
        success: false,
        endpoint: '/user',
        error: apiError.message,
        status: apiError.response?.status
      };
    }
    
    res.json({
      success: true,
      message: 'PP API connection test completed',
      auth_test: testResult,
      api_test: apiTestResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ PP Admin: API test failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'API test failed',
      message: error.message
    });
  }
});

/**
 * DELETE /api/admin/pp-token/revoke
 * Revoke/deactivate current tokens
 */
router.delete('/revoke', async (req, res) => {
  try {
    console.log('🗑️ PP Admin: Revoking tokens...');
    
    await tokenManager.deactivateTokens();
    
    res.json({
      success: true,
      message: 'All PracticePanther tokens have been deactivated',
      note: 'You will need to re-authorize to use PP API again',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ PP Admin: Error revoking tokens:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke tokens',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/pp-token/sync-status
 * Get PracticePanther sync status and last sync information
 */
router.get('/sync-status', async (req, res) => {
  try {
    console.log('🔍 PP Admin: Checking sync status...');
    
    // Get token status first
    const tokenStatus = await tokenManager.getTokenStatus();
    
    // Check if sync service is available
    if (!syncService) {
      return res.json({
        success: true,
        sync_available: false,
        message: 'Sync service not configured',
        token_status: tokenStatus,
        timestamp: new Date().toISOString()
      });
    }
    
    // Get sync status from database or service
    let lastSyncInfo = null;
    try {
      // Try to get last sync information from audit logs or sync service
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      // Get recent sync activities from audit logs
      const { data: syncLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .ilike('action', '%sync%')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (syncLogs && syncLogs.length > 0) {
        const lastSync = syncLogs[0];
        const timeSinceSync = Date.now() - new Date(lastSync.created_at).getTime();
        const hoursSinceSync = Math.floor(timeSinceSync / (1000 * 60 * 60));
        const minutesSinceSync = Math.floor((timeSinceSync % (1000 * 60 * 60)) / (1000 * 60));
        
        lastSyncInfo = {
          last_sync_at: lastSync.created_at,
          last_sync_action: lastSync.action,
          time_since_sync: `${hoursSinceSync}h ${minutesSinceSync}m ago`,
          hours_since_sync: hoursSinceSync,
          sync_details: lastSync.details,
          recent_syncs: syncLogs.length
        };
      }
    } catch (dbError) {
      console.log('⚠️ Could not get sync history:', dbError.message);
    }
    
    res.json({
      success: true,
      sync_available: true,
      token_status: tokenStatus,
      last_sync: lastSyncInfo,
      sync_service_active: !!syncService,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ PP Admin: Error getting sync status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/pp-token/trigger-sync
 * Manually trigger a PracticePanther sync
 */
router.post('/trigger-sync', async (req, res) => {
  try {
    console.log('🔄 PP Admin: Manual sync requested...');
    
    // Check token status first
    const tokenStatus = await tokenManager.getTokenStatus();
    
    if (tokenStatus.status === 'no_token') {
      return res.status(400).json({
        success: false,
        error: 'No PP token available',
        message: 'Complete OAuth setup first before syncing',
        token_status: tokenStatus
      });
    }
    
    if (!syncService) {
      return res.status(400).json({
        success: false,
        error: 'Sync service not available',
        message: 'Scheduled sync service is not configured'
      });
    }
    
    // Get sync options from request - FORCE comprehensive sync to get ALL data
    const { 
      sync_contacts = true, 
      sync_matters = true, 
      sync_tasks = true,
      force_full_sync = false,
      use_comprehensive_sync = false // Disabled due to schema mismatch issues
    } = req.body;
    
    // FORCE use regular sync but with NO LIMITS
    console.log('🚀 Using FIXED regular sync service (NO LIMITS - increased pagination)');
    
    // Log sync start
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    await supabase
      .from('audit_logs')
      .insert({
        entity_type: 'system',
        action: 'PP_MANUAL_SYNC_STARTED',
        details: {
          sync_contacts,
          sync_matters,
          sync_tasks,
          force_full_sync,
          triggered_by: req.user?.id || 'admin',
          trigger_type: 'manual'
        },
        created_at: new Date().toISOString()
      });
    
    // Trigger the sync (this will run in background)
    let syncPromise;
    
    if (use_comprehensive_sync) {
      // Use comprehensive sync service that fetches ALL data without limits
      console.log('🚀 Using COMPREHENSIVE sync service (NO LIMITS - fetches ALL data)');
      const comprehensiveSync = new ComprehensivePPSyncService();
      syncPromise = comprehensiveSync.syncAll();
    } else {
      // Use regular sync with limitations
      syncPromise = performSync(sync_contacts, sync_matters, sync_tasks, force_full_sync);
    }
    
    // Don't wait for completion - return immediately
    res.json({
      success: true,
      message: 'PracticePanther sync started successfully',
      sync_options: {
        sync_contacts,
        sync_matters,
        sync_tasks,
        force_full_sync
      },
      note: 'Sync is running in background. Check sync-status for progress.',
      timestamp: new Date().toISOString()
    });
    
    // Handle sync completion in background
    syncPromise.then(async (result) => {
      await supabase
        .from('audit_logs')
        .insert({
          entity_type: 'system',
          action: 'PP_MANUAL_SYNC_COMPLETED',
          details: {
            ...result,
            triggered_by: req.user?.id || 'admin'
          },
          created_at: new Date().toISOString()
        });
      console.log('✅ PP Manual sync completed:', result);
    }).catch(async (error) => {
      await supabase
        .from('audit_logs')
        .insert({
          entity_type: 'system',
          action: 'PP_MANUAL_SYNC_FAILED',
          details: {
            error: error.message,
            triggered_by: req.user?.id || 'admin'
          },
          created_at: new Date().toISOString()
        });
      console.error('❌ PP Manual sync failed:', error);
    });
    
  } catch (error) {
    console.error('❌ PP Admin: Error triggering sync:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger sync',
      message: error.message
    });
  }
});

/**
 * Helper function to perform the actual sync using incremental methods
 */
async function performSync(syncContacts, syncMatters, syncTasks, forceFullSync) {
  try {
    console.log(`🔄 Starting ${forceFullSync ? 'FULL' : 'INCREMENTAL'} sync...`);
    
    const results = {
      contacts: { synced: 0, errors: 0, strategy: 'incremental' },
      matters: { synced: 0, errors: 0, strategy: 'incremental' },
      tasks: { synced: 0, errors: 0, strategy: 'incremental' }
    };
    
    // Get sync timestamps for incremental sync
    const syncTimestamps = await loadSyncTimestamps();
    const startTime = new Date();
    
    // Add results for new tables
    results.notes = { synced: 0, errors: 0, strategy: 'incremental' };
    results.invoices = { synced: 0, errors: 0, strategy: 'incremental' };
    results.expenses = { synced: 0, errors: 0, strategy: 'incremental' };
    results.users = { synced: 0, errors: 0, strategy: 'incremental' };
    
    // Use scheduled sync service methods if available and not forcing full sync
    if (!forceFullSync && syncService) {
      console.log('📊 Strategy: Using INCREMENTAL sync - only changed records since last sync');
      
      if (syncMatters) {
        try {
          await syncMattersIncremental(syncTimestamps, results);
        } catch (error) {
          results.matters.errors = 1;
          console.error('❌ Incremental matters sync error:', error.message);
        }
      }
      
      if (syncContacts) {
        try {
          await syncAccountsIncremental(syncTimestamps, results);
          await syncContactsIncremental(syncTimestamps, results);
        } catch (error) {
          results.contacts.errors = 1;
          console.error('❌ Incremental contacts sync error:', error.message);
        }
      }
      
      if (syncTasks) {
        try {
          await syncTasksIncremental(syncTimestamps, results);
        } catch (error) {
          results.tasks.errors = 1;
          console.error('❌ Incremental tasks sync error:', error.message);
        }
      }
      
      // Sync additional tables
      try {
        await syncNotesIncremental(syncTimestamps, results);
      } catch (error) {
        results.notes.errors = 1;
        console.error('❌ Incremental notes sync error:', error.message);
      }
      
      try {
        await syncInvoicesIncremental(syncTimestamps, results);
      } catch (error) {
        results.invoices.errors = 1;
        console.error('❌ Incremental invoices sync error:', error.message);
      }
      
      try {
        await syncExpensesIncremental(syncTimestamps, results);
      } catch (error) {
        results.expenses.errors = 1;
        console.error('❌ Incremental expenses sync error:', error.message);
      }
      
      try {
        await syncUsersIncremental(syncTimestamps, results);
      } catch (error) {
        results.users.errors = 1;
        console.error('❌ Incremental users sync error:', error.message);
      }
      
      // Update sync timestamps after successful sync
      const endTime = new Date().toISOString();
      await updateSyncTimestamps(endTime);
      
    } else {
      // Fallback to full sync
      console.log('📊 Strategy: Using FULL sync - fetching all data (up to 1000 per type)');
      results.contacts.strategy = 'full';
      results.matters.strategy = 'full';
      results.tasks.strategy = 'full';
      results.notes.strategy = 'full';
      results.invoices.strategy = 'full';
      results.expenses.strategy = 'full';
      results.users.strategy = 'full';
      
      // Get token for direct API calls
      const fullSyncToken = await tokenManager.getValidAccessToken();
      const axios = require('axios');
      
      if (syncContacts) {
        try {
          const contactsResponse = await axios.get('https://app.practicepanther.com/api/v2/contacts', {
            headers: { 'Authorization': `Bearer ${fullSyncToken}`, 'Accept': 'application/json' },
            params: { per_page: 1000 }
          });
          results.contacts.synced = contactsResponse.data?.length || 0;
          console.log(`✅ Full sync: ${results.contacts.synced} contacts fetched`);
        } catch (error) {
          results.contacts.errors = 1;
          console.error('❌ Full contacts sync error:', error.message);
        }
      }
      
      if (syncMatters) {
        try {
          const mattersResponse = await axios.get('https://app.practicepanther.com/api/v2/matters', {
            headers: { 'Authorization': `Bearer ${fullSyncToken}`, 'Accept': 'application/json' },
            params: { per_page: 1000 }
          });
          results.matters.synced = mattersResponse.data?.length || 0;
          console.log(`✅ Full sync: ${results.matters.synced} matters fetched`);
        } catch (error) {
          results.matters.errors = 1;
          console.error('❌ Full matters sync error:', error.message);
        }
      }
      
      if (syncTasks) {
        try {
          const tasksResponse = await axios.get('https://app.practicepanther.com/api/v2/tasks', {
            headers: { 'Authorization': `Bearer ${fullSyncToken}`, 'Accept': 'application/json' },
            params: { per_page: 1000, status: 'NotCompleted' }
          });
          results.tasks.synced = tasksResponse.data?.length || 0;
          console.log(`✅ Full sync: ${results.tasks.synced} tasks fetched`);
        } catch (error) {
          results.tasks.errors = 1;
          console.error('❌ Full tasks sync error:', error.message);
        }
      }
      
      // Sync additional tables in full sync
      try {
        const notesResponse = await axios.get('https://app.practicepanther.com/api/v2/notes', {
          headers: { 'Authorization': `Bearer ${fullSyncToken}`, 'Accept': 'application/json' },
          params: { per_page: 1000 }
        });
        results.notes.synced = notesResponse.data?.length || 0;
        console.log(`✅ Full sync: ${results.notes.synced} notes fetched`);
      } catch (error) {
        results.notes.errors = 1;
        console.error('❌ Full notes sync error:', error.message);
      }
      
      try {
        const invoicesResponse = await axios.get('https://app.practicepanther.com/api/v2/invoices', {
          headers: { 'Authorization': `Bearer ${fullSyncToken}`, 'Accept': 'application/json' },
          params: { per_page: 1000 }
        });
        results.invoices.synced = invoicesResponse.data?.length || 0;
        console.log(`✅ Full sync: ${results.invoices.synced} invoices fetched`);
      } catch (error) {
        results.invoices.errors = 1;
        console.error('❌ Full invoices sync error:', error.message);
      }
      
      try {
        const expensesResponse = await axios.get('https://app.practicepanther.com/api/v2/expenses', {
          headers: { 'Authorization': `Bearer ${fullSyncToken}`, 'Accept': 'application/json' },
          params: { per_page: 1000 }
        });
        results.expenses.synced = expensesResponse.data?.length || 0;
        console.log(`✅ Full sync: ${results.expenses.synced} expenses fetched`);
      } catch (error) {
        results.expenses.errors = 1;
        console.error('❌ Full expenses sync error:', error.message);
      }
      
      try {
        const usersResponse = await axios.get('https://app.practicepanther.com/api/v2/users', {
          headers: { 'Authorization': `Bearer ${fullSyncToken}`, 'Accept': 'application/json' },
          params: { per_page: 1000 }
        });
        results.users.synced = usersResponse.data?.length || 0;
        console.log(`✅ Full sync: ${results.users.synced} PP users fetched`);
      } catch (error) {
        results.users.errors = 1;
        console.error('❌ Full PP users sync error:', error.message);
      }
    }
    
    const syncDuration = Math.round((Date.now() - startTime.getTime()) / 1000);
    
    return {
      success: true,
      results,
      sync_strategy: forceFullSync ? 'full' : 'incremental',
      sync_duration: `${syncDuration} seconds`,
      total_synced: results.contacts.synced + results.matters.synced + results.tasks.synced + 
                    results.notes.synced + results.invoices.synced + results.expenses.synced + results.users.synced,
      total_errors: results.contacts.errors + results.matters.errors + results.tasks.errors +
                    results.notes.errors + results.invoices.errors + results.expenses.errors + results.users.errors,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    throw new Error(`Sync failed: ${error.message}`);
  }
}

/**
 * Load sync timestamps (fallback to 24 hours ago if none stored)
 */
async function loadSyncTimestamps() {
  const fallbackTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return {
    matters: fallbackTime,
    accounts: fallbackTime,
    contacts: fallbackTime,
    tasks: fallbackTime,
    notes: fallbackTime
  };
}

/**
 * Incremental sync for matters (only updated since last sync)
 */
async function syncMattersIncremental(timestamps, results) {
  const lastSync = timestamps.matters;
  console.log(`⚖️  Syncing matters updated since: ${lastSync}`);
  
  const axios = require('axios');
  const token = await tokenManager.getValidAccessToken();

  const response = await axios.get('https://app.practicepanther.com/api/v2/matters', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    params: {
      updated_since: lastSync,
      per_page: 1000
    }
  });

  const updatedMatters = response.data;
  results.matters.synced = updatedMatters?.length || 0;
  
  if (updatedMatters && updatedMatters.length > 0) {
    console.log(`✅ Processing ${updatedMatters.length} matter updates...`);
  } else {
    console.log('✅ No matter updates - exchange data is current');
  }
}

/**
 * Incremental sync for accounts (only updated since last sync)
 */
async function syncAccountsIncremental(timestamps, results) {
  const lastSync = timestamps.accounts;
  console.log(`👥 Syncing accounts updated since: ${lastSync}`);

  const axios = require('axios');
  const token = await tokenManager.getValidAccessToken();

  const response = await axios.get('https://app.practicepanther.com/api/v2/accounts', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    params: {
      updated_since: lastSync,
      per_page: 1000
    }
  });

  const updatedAccounts = response.data;
  results.contacts.synced = updatedAccounts?.length || 0;
  
  if (updatedAccounts && updatedAccounts.length > 0) {
    console.log(`✅ Processing ${updatedAccounts.length} account updates...`);
  } else {
    console.log('✅ No account updates - client data is current');
  }
}

/**
 * Incremental sync for tasks (only new tasks since last sync)
 */
async function syncTasksIncremental(timestamps, results) {
  const lastSync = timestamps.tasks;
  console.log(`📝 Syncing new tasks created since: ${lastSync}`);

  const axios = require('axios');
  const { createClient } = require('@supabase/supabase-js');
  const token = await tokenManager.getValidAccessToken();
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const response = await axios.get('https://app.practicepanther.com/api/v2/tasks', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    params: {
      created_since: lastSync,
      status: 'NotCompleted',
      per_page: 1000
    }
  });

  const newTasks = response.data;
  
  if (newTasks && newTasks.length > 0) {
    console.log(`✅ Processing ${newTasks.length} new tasks...`);
    
    // Transform and insert tasks
    const tasksToUpsert = newTasks.map(task => ({
      pp_id: task.id,
      account_ref_id: task.account_ref?.id || null,
      account_ref_display_name: task.account_ref?.display_name || null,
      matter_ref_id: task.matter_ref?.id || null,
      matter_ref_display_name: task.matter_ref?.display_name || null,
      subject: task.subject,
      notes: task.notes,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date ? new Date(task.due_date).toISOString() : null,
      assigned_to_users: task.assigned_to_users || [],
      assigned_to_contacts: task.assigned_to_contacts || [],
      tags: task.tags || [],
      pp_created_at: task.created_at ? new Date(task.created_at).toISOString() : null,
      pp_updated_at: task.updated_at ? new Date(task.updated_at).toISOString() : null,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { data, error } = await supabase
      .from('pp_tasks')
      .upsert(tasksToUpsert, { 
        onConflict: 'pp_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('❌ Error saving tasks:', error.message);
      results.tasks.errors = 1;
    } else {
      console.log(`💾 Saved ${newTasks.length} tasks to database`);
    }
  } else {
    console.log('✅ No new tasks - no new action items');
  }
  
  results.tasks.synced = newTasks?.length || 0;
}

/**
 * Incremental sync for direct contacts endpoint
 */
async function syncContactsIncremental(timestamps, results) {
  const lastSync = timestamps.contacts;
  console.log(`📧 Syncing contacts updated since: ${lastSync}`);

  const axios = require('axios');
  const { createClient } = require('@supabase/supabase-js');
  const token = await tokenManager.getValidAccessToken();
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const response = await axios.get('https://app.practicepanther.com/api/v2/contacts', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    params: {
      updated_since: lastSync,
      per_page: 1000
    }
  });

  const updatedContacts = response.data;
  
  if (updatedContacts && updatedContacts.length > 0) {
    console.log(`✅ Processing ${updatedContacts.length} contact updates...`);
    
    // Transform and insert/update contacts
    const contactsToUpsert = updatedContacts.map(contact => ({
      pp_id: contact.id,
      account_ref_id: contact.account_ref?.id || null,
      account_ref_display_name: contact.account_ref?.display_name || null,
      is_primary_contact: contact.is_primary_contact,
      display_name: contact.display_name,
      first_name: contact.first_name,
      middle_name: contact.middle_name,
      last_name: contact.last_name,
      phone_mobile: contact.phone_mobile,
      phone_home: contact.phone_home,
      phone_fax: contact.phone_fax,
      phone_work: contact.phone_work,
      email: contact.email,
      notes: contact.notes,
      custom_field_values: contact.custom_field_values || [],
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { data, error } = await supabase
      .from('pp_contacts')
      .upsert(contactsToUpsert, { 
        onConflict: 'pp_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('❌ Error saving contacts:', error.message);
      results.contacts.errors = 1;
    } else {
      console.log(`💾 Saved ${updatedContacts.length} contacts to database`);
    }
  } else {
    console.log('✅ No contact updates - contact data is current');
  }
  
  results.contacts.synced += updatedContacts?.length || 0;
}

/**
 * Incremental sync for notes
 */
async function syncNotesIncremental(timestamps, results) {
  const lastSync = timestamps.notes;
  console.log(`📝 Syncing notes created since: ${lastSync}`);

  const axios = require('axios');
  const { createClient } = require('@supabase/supabase-js');
  const token = await tokenManager.getValidAccessToken();
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const response = await axios.get('https://app.practicepanther.com/api/v2/notes', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    params: {
      created_since: lastSync,
      per_page: 1000
    }
  });

  const newNotes = response.data;
  
  if (newNotes && newNotes.length > 0) {
    console.log(`✅ Processing ${newNotes.length} new notes...`);
    
    // Transform and insert notes
    const notesToUpsert = newNotes.map(note => ({
      pp_id: note.id,
      account_ref_id: note.account_ref?.id || null,
      account_ref_display_name: note.account_ref?.display_name || null,
      matter_ref_id: note.matter_ref?.id || null,
      matter_ref_display_name: note.matter_ref?.display_name || null,
      subject: note.subject || null,
      content: note.content || note.notes || null,
      note_type: note.note_type || note.type || null,
      is_private: note.is_private || false,
      pp_created_at: note.created_at ? new Date(note.created_at).toISOString() : null,
      pp_updated_at: note.updated_at ? new Date(note.updated_at).toISOString() : null,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { data, error } = await supabase
      .from('pp_notes')
      .upsert(notesToUpsert, { 
        onConflict: 'pp_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('❌ Error saving notes:', error.message);
      results.notes.errors = 1;
    } else {
      console.log(`💾 Saved ${newNotes.length} notes to database`);
    }
  } else {
    console.log('✅ No new notes');
  }
  
  results.notes.synced = newNotes?.length || 0;
}

/**
 * Incremental sync for invoices
 */
async function syncInvoicesIncremental(timestamps, results) {
  const lastSync = timestamps.invoices;
  console.log(`💰 Syncing invoices updated since: ${lastSync}`);

  const axios = require('axios');
  const { createClient } = require('@supabase/supabase-js');
  const token = await tokenManager.getValidAccessToken();
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const response = await axios.get('https://app.practicepanther.com/api/v2/invoices', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    params: {
      updated_since: lastSync,
      per_page: 1000
    }
  });

  const updatedInvoices = response.data;
  
  if (updatedInvoices && updatedInvoices.length > 0) {
    console.log(`✅ Processing ${updatedInvoices.length} invoice updates...`);
    
    // Transform and insert invoices
    const invoicesToUpsert = updatedInvoices.map(invoice => ({
      pp_id: invoice.id,
      account_ref_id: invoice.account_ref?.id || null,
      account_ref_display_name: invoice.account_ref?.display_name || null,
      matter_ref_id: invoice.matter_ref?.id || null,
      matter_ref_display_name: invoice.matter_ref?.display_name || null,
      issue_date: invoice.issue_date ? new Date(invoice.issue_date).toISOString().split('T')[0] : null,
      due_date: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : null,
      items_time_entries: invoice.items_time_entries || [],
      items_expenses: invoice.items_expenses || [],
      items_flat_fees: invoice.items_flat_fees || [],
      subtotal: invoice.subtotal || 0,
      tax: invoice.tax || 0,
      discount: invoice.discount || 0,
      total: invoice.total || 0,
      total_paid: invoice.total_paid || 0,
      total_outstanding: invoice.total_outstanding || 0,
      invoice_type: invoice.invoice_type,
      pp_created_at: invoice.created_at ? new Date(invoice.created_at).toISOString() : null,
      pp_updated_at: invoice.updated_at ? new Date(invoice.updated_at).toISOString() : null,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { data, error } = await supabase
      .from('pp_invoices')
      .upsert(invoicesToUpsert, { 
        onConflict: 'pp_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('❌ Error saving invoices:', error.message);
      results.invoices.errors = 1;
    } else {
      console.log(`💾 Saved ${updatedInvoices.length} invoices to database`);
    }
  } else {
    console.log('✅ No invoice updates');
  }
  
  results.invoices.synced = updatedInvoices?.length || 0;
}

/**
 * Incremental sync for expenses  
 */
async function syncExpensesIncremental(timestamps, results) {
  const lastSync = timestamps.expenses;
  console.log(`💵 Syncing expenses updated since: ${lastSync}`);

  const axios = require('axios');
  const { createClient } = require('@supabase/supabase-js');
  const token = await tokenManager.getValidAccessToken();
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const response = await axios.get('https://app.practicepanther.com/api/v2/expenses', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    params: {
      updated_since: lastSync,
      per_page: 1000
    }
  });

  const updatedExpenses = response.data;
  
  if (updatedExpenses && updatedExpenses.length > 0) {
    console.log(`✅ Processing ${updatedExpenses.length} expense updates...`);
    
    // Transform and insert expenses
    const expensesToUpsert = updatedExpenses.map(expense => ({
      pp_id: expense.id,
      is_billable: expense.is_billable || false,
      is_billed: expense.is_billed || false,
      date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : null,
      qty: expense.qty || 0,
      price: expense.price || 0,
      amount: expense.amount || 0,
      description: expense.description || null,
      private_notes: expense.private_notes || null,
      account_ref_id: expense.account_ref?.id || null,
      account_ref_display_name: expense.account_ref?.display_name || null,
      matter_ref_id: expense.matter_ref?.id || null,
      matter_ref_display_name: expense.matter_ref?.display_name || null,
      billed_by_user_ref: expense.billed_by_user_ref || null,
      expense_category_ref: expense.expense_category_ref || null,
      pp_created_at: expense.created_at ? new Date(expense.created_at).toISOString() : null,
      pp_updated_at: expense.updated_at ? new Date(expense.updated_at).toISOString() : null,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { data, error } = await supabase
      .from('pp_expenses')
      .upsert(expensesToUpsert, { 
        onConflict: 'pp_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('❌ Error saving expenses:', error.message);
      results.expenses.errors = 1;
    } else {
      console.log(`💾 Saved ${updatedExpenses.length} expenses to database`);
    }
  } else {
    console.log('✅ No expense updates');
  }
  
  results.expenses.synced = updatedExpenses?.length || 0;
}

/**
 * Incremental sync for users
 */
async function syncUsersIncremental(timestamps, results) {
  const lastSync = timestamps.users;
  console.log(`👥 Syncing PP users updated since: ${lastSync}`);

  const axios = require('axios');
  const { createClient } = require('@supabase/supabase-js');
  const token = await tokenManager.getValidAccessToken();
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const response = await axios.get('https://app.practicepanther.com/api/v2/users', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    params: {
      updated_since: lastSync,
      per_page: 1000
    }
  });

  const updatedUsers = response.data;
  
  if (updatedUsers && updatedUsers.length > 0) {
    console.log(`✅ Processing ${updatedUsers.length} PP user updates...`);
    
    // Transform and insert users
    const usersToUpsert = updatedUsers.map(user => ({
      pp_id: user.id,
      is_active: user.is_active || false,
      display_name: user.display_name || null,
      first_name: user.first_name || null,
      middle_name: user.middle_name || null,
      last_name: user.last_name || null,
      email: user.email || null,
      pp_created_at: user.created_at ? new Date(user.created_at).toISOString() : null,
      pp_updated_at: user.updated_at ? new Date(user.updated_at).toISOString() : null,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { data, error } = await supabase
      .from('pp_users')
      .upsert(usersToUpsert, { 
        onConflict: 'pp_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('❌ Error saving PP users:', error.message);
      results.users.errors = 1;
    } else {
      console.log(`💾 Saved ${updatedUsers.length} PP users to database`);
    }
  } else {
    console.log('✅ No PP user updates');
  }
  
  results.users.synced = updatedUsers?.length || 0;
}

/**
 * Update sync timestamps after successful sync
 */
async function updateSyncTimestamps(timestamp) {
  console.log(`📅 Updated sync timestamps to: ${timestamp}`);
  // TODO: Save to persistent storage (database or file)
  // For now, they reset after service restart (24 hour fallback handles this)
}

module.exports = router;