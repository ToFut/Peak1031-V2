/**
 * Sync Service - Handles PracticePanther sync operations
 * Extracted from the monolithic API service
 */

import { httpClient } from '../base/httpClient';

export class SyncService {
  // Practice Partner Sync Operations
  async getPracticePartnerSyncStatus(): Promise<any> {
    return httpClient.get('/sync/practice-partner/status');
  }

  async startPracticePartnerSync(syncType?: string): Promise<any> {
    return httpClient.post('/sync/practice-partner/start', { syncType });
  }

  async getPracticePartnerSyncHistory(): Promise<any> {
    return httpClient.get('/sync/practice-partner/history');
  }

  async getPracticePartnerSyncStatistics(): Promise<any> {
    return httpClient.get('/sync/practice-partner/statistics');
  }

  async triggerSync(syncType: string): Promise<any> {
    return httpClient.post('/sync/trigger', { syncType });
  }

  async getSyncStatus(): Promise<any> {
    return httpClient.get('/sync/status');
  }

  async getSyncLogs(): Promise<any> {
    return httpClient.get('/sync/logs');
  }

  // Sync Management
  async pauseSync(): Promise<void> {
    await httpClient.post('/sync/pause');
  }

  async resumeSync(): Promise<void> {
    await httpClient.post('/sync/resume');
  }

  async forceSyncStop(): Promise<void> {
    await httpClient.post('/sync/stop');
  }

  async getSyncConfiguration(): Promise<any> {
    return httpClient.get('/sync/configuration');
  }

  async updateSyncConfiguration(config: any): Promise<any> {
    return httpClient.put('/sync/configuration', config);
  }
}

export const syncService = new SyncService();