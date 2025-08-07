/**
 * Unified Services Export
 * Replaces the monolithic API service with focused, modular services
 */

// Base HTTP Client
export { httpClient } from './base/httpClient';

// Core Services
export { authService } from './auth/authService';
export { userService } from './users/userService';
export { exchangeService } from './exchanges/exchangeService';
export { contactService } from './contacts/contactService';
export { taskService } from './tasks/taskService';
export { documentService } from './documents/documentService';
export { messageService } from './messages/messageService';
export { dashboardService } from './dashboard/dashboardService';
export { syncService } from './sync/syncService';
export { notificationService } from './notifications/notificationService';

// Backward compatibility - create a unified API service for existing code
import { authService } from './auth/authService';
import { userService } from './users/userService';
import { exchangeService } from './exchanges/exchangeService';
import { contactService } from './contacts/contactService';
import { taskService } from './tasks/taskService';
import { documentService } from './documents/documentService';
import { messageService } from './messages/messageService';
import { dashboardService } from './dashboard/dashboardService';
import { syncService } from './sync/syncService';
import { notificationService } from './notifications/notificationService';

/**
 * Unified API Service for backward compatibility
 * Delegates to focused services while maintaining the same interface
 */
export const apiService = {
  // Authentication methods
  login: authService.login.bind(authService),
  logout: authService.logout.bind(authService),
  getCurrentUser: authService.getCurrentUser.bind(authService),
  refreshToken: authService.refreshToken.bind(authService),
  
  // User methods
  getUsers: userService.getUsers.bind(userService),
  createUser: userService.createUser.bind(userService),
  updateUser: userService.updateUser.bind(userService),
  deleteUser: userService.deleteUser.bind(userService),
  activateUser: userService.activateUser.bind(userService),
  deactivateUser: userService.deactivateUser.bind(userService),
  
  // Exchange methods
  getExchanges: exchangeService.getExchanges.bind(exchangeService),
  getExchange: exchangeService.getExchange.bind(exchangeService),
  createExchange: exchangeService.createExchange.bind(exchangeService),
  updateExchange: exchangeService.updateExchange.bind(exchangeService),
  
  // Contact methods
  getContacts: contactService.getContacts.bind(contactService),
  getContact: contactService.getContact.bind(contactService),
  
  // Task methods
  getTasks: taskService.getTasks.bind(taskService),
  getTask: taskService.getTask.bind(taskService),
  createTask: taskService.createTask.bind(taskService),
  updateTask: taskService.updateTask.bind(taskService),
  updateTaskStatus: taskService.updateTaskStatus.bind(taskService),
  
  // Document methods
  getDocuments: documentService.getDocuments.bind(documentService),
  uploadDocument: documentService.uploadDocument.bind(documentService),
  downloadDocument: documentService.downloadDocument.bind(documentService),
  deleteDocument: documentService.deleteDocument.bind(documentService),
  getDocumentTemplates: documentService.getDocumentTemplates.bind(documentService),
  
  // Message methods
  getMessages: messageService.getMessages.bind(messageService),
  sendMessage: messageService.sendMessage.bind(messageService),
  markMessageAsRead: messageService.markMessageAsRead.bind(messageService),
  
  // Dashboard methods
  getDashboardStats: dashboardService.getDashboardStats.bind(dashboardService),
  getDashboardOverview: dashboardService.getDashboardOverview.bind(dashboardService),
  getAuditLogs: dashboardService.getAuditLogs.bind(dashboardService),
  
  // Sync methods
  getPracticePartnerSyncStatus: syncService.getPracticePartnerSyncStatus.bind(syncService),
  startPracticePartnerSync: syncService.startPracticePartnerSync.bind(syncService),
  triggerSync: syncService.triggerSync.bind(syncService),
  getSyncLogs: syncService.getSyncLogs.bind(syncService),
  
  // Notification methods
  getNotifications: notificationService.getNotifications.bind(notificationService),
  markNotificationAsRead: notificationService.markNotificationAsRead.bind(notificationService),
  
  // Utility methods for backward compatibility
  isAuthenticated: () => !!localStorage.getItem('token'),
  getCurrentUserId: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return user.id;
  }
};

export default apiService;