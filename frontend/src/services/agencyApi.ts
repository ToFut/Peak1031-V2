/**
 * Agency API Service
 * Professional API layer for agency management
 * Handles all HTTP requests for agency operations
 */

// API base URL - use backend URL directly
const API_BASE_URL = 'http://localhost:5001';  // Direct backend URL

// Types
export interface Agency {
  id: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  email: string;
  company?: string;
  phone_primary?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  contact_type: string[];
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, any>;
  stats?: AgencyStats;
  users?: AgencyUser[];
  third_parties?: ThirdPartyAssignment[];
}

export interface AgencyStats {
  third_parties: number;
  users: number;
  exchanges: {
    total: number;
    active: number;
    completed: number;
    totalValue: number;
  };
  performance: {
    average_score: number;
    success_rate: number;
  };
}

export interface AgencyUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  last_login?: string;
}

export interface ThirdPartyAssignment {
  id: string;
  third_party_contact_id: string;
  display_name: string;
  email: string;
  company?: string;
  assignment_id: string;
  performance_score: number;
  can_view_performance: boolean;
  assignment_date: string;
}

export interface CreateAgencyRequest {
  agencyData: {
    first_name: string;
    last_name: string;
    display_name?: string;
    email: string;
    company?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    metadata?: Record<string, any>;
  };
  userData?: {
    email: string;
    first_name?: string;
    last_name?: string;
    password?: string;
    permissions?: Record<string, boolean>;
  };
}

export interface AgencyListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeStats?: boolean;
}

export interface AgencyListResponse {
  success: boolean;
  data: Agency[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AssignThirdPartiesRequest {
  thirdPartyIds: string[];
  can_view_performance?: boolean;
  can_assign_exchanges?: boolean;
}

export interface BulkImportRequest {
  agencies: Array<{
    first_name: string;
    last_name: string;
    email: string;
    company?: string;
    [key: string]: any;
  }>;
  options?: {
    createUsers?: boolean;
    sendWelcomeEmails?: boolean;
  };
}

class AgencyApiService {
  private baseUrl: string;

  constructor() {
    // Use direct backend URL
    this.baseUrl = `${API_BASE_URL}/api/agencies`;
    console.log('[AgencyApiService] Base URL set to:', this.baseUrl);
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || 'Request failed');
    }
    return response.json();
  }

  /**
   * Get all agencies with pagination and filters
   */
  async getAgencies(params: AgencyListParams = {}): Promise<AgencyListResponse> {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    const url = `${this.baseUrl}${queryString ? `?${queryString}` : ''}`;
    console.log('[agencyApi] Fetching agencies from:', url);
    console.log('[agencyApi] baseUrl:', this.baseUrl);
    console.log('[agencyApi] API_BASE_URL:', API_BASE_URL);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    console.log('[agencyApi] Response status:', response.status);
    if (!response.ok) {
      console.error('[agencyApi] Response not OK:', response.status, response.statusText);
    }

    return this.handleResponse<AgencyListResponse>(response);
  }

  /**
   * Get single agency by ID
   */
  async getAgencyById(agencyId: string): Promise<{ success: boolean; data: Agency }> {
    const response = await fetch(`${this.baseUrl}/${agencyId}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    return this.handleResponse(response);
  }

  /**
   * Create new agency
   */
  async createAgency(request: CreateAgencyRequest): Promise<{ success: boolean; data: any }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });

    return this.handleResponse(response);
  }

  /**
   * Update agency
   */
  async updateAgency(agencyId: string, updates: Partial<Agency>): Promise<{ success: boolean; data: Agency }> {
    const response = await fetch(`${this.baseUrl}/${agencyId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });

    return this.handleResponse(response);
  }

  /**
   * Delete or deactivate agency
   */
  async deleteAgency(agencyId: string, hardDelete: boolean = false): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/${agencyId}${hardDelete ? '?hard=true' : ''}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    return this.handleResponse(response);
  }

  /**
   * Assign third parties to agency
   */
  async assignThirdParties(
    agencyId: string, 
    request: AssignThirdPartiesRequest
  ): Promise<{ success: boolean; data: any[]; message: string }> {
    const response = await fetch(`${this.baseUrl}/${agencyId}/third-parties`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });

    return this.handleResponse(response);
  }

  /**
   * Remove third parties from agency
   */
  async removeThirdParties(
    agencyId: string, 
    thirdPartyIds: string[]
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/${agencyId}/third-parties`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      body: JSON.stringify({ thirdPartyIds })
    });

    return this.handleResponse(response);
  }

  /**
   * Get agency statistics
   */
  async getAgencyStats(agencyId: string): Promise<{ success: boolean; data: AgencyStats }> {
    const response = await fetch(`${this.baseUrl}/${agencyId}/stats`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    return this.handleResponse(response);
  }

  /**
   * Get available third parties for assignment
   */
  async getAvailableThirdParties(agencyId?: string): Promise<{ success: boolean; data: any[] }> {
    const url = agencyId 
      ? `${this.baseUrl}/${agencyId}/available-third-parties`
      : `/api/contacts?type=third_party`;  // Use relative URL for proxy

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    return this.handleResponse(response);
  }

  /**
   * Bulk import agencies
   */
  async bulkImportAgencies(request: BulkImportRequest): Promise<{ 
    success: boolean; 
    results: {
      success: Array<{ agency: string; id: string }>;
      failed: Array<{ agency: string; error: string }>;
      total: number;
    }
  }> {
    const response = await fetch(`${this.baseUrl}/bulk-import`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });

    return this.handleResponse(response);
  }

  /**
   * Export agencies to CSV
   */
  async exportAgencies(format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/export?format=${format}`, {
      method: 'GET',
      headers: {
        'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
      }
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  }

  /**
   * Search agencies
   */
  async searchAgencies(query: string): Promise<Agency[]> {
    const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    const result = await this.handleResponse<{ success: boolean; data: Agency[] }>(response);
    return result.data;
  }

  /**
   * Get agency activity log
   */
  async getAgencyActivityLog(agencyId: string, days: number = 30): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      action: string;
      timestamp: string;
      user: string;
      details: any;
    }>;
  }> {
    const response = await fetch(`${this.baseUrl}/${agencyId}/activity?days=${days}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    return this.handleResponse(response);
  }

  /**
   * Update agency permissions
   */
  async updateAgencyPermissions(
    agencyId: string, 
    permissions: Record<string, boolean>
  ): Promise<{ success: boolean; data: any }> {
    const response = await fetch(`${this.baseUrl}/${agencyId}/permissions`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ permissions })
    });

    return this.handleResponse(response);
  }

  /**
   * Resend welcome email to agency user
   */
  async resendWelcomeEmail(agencyId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/${agencyId}/users/${userId}/resend-welcome`, {
      method: 'POST',
      headers: this.getHeaders()
    });

    return this.handleResponse(response);
  }
}

// Export singleton instance
export const agencyApi = new AgencyApiService();

// Export class for testing
export default AgencyApiService;