// API service for communicating with the backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  // Set authentication token
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // Get authentication headers
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<ApiResponse> {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }): Promise<ApiResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });

    this.setToken(null);
    return response;
  }

  async getCurrentUser(): Promise<ApiResponse> {
    return this.request('/auth/me');
  }

  async refreshToken(): Promise<ApiResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  // Submission methods
  async getSubmissions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/submissions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getSubmission(id: string): Promise<ApiResponse> {
    return this.request(`/submissions/${id}`);
  }

  async createSubmission(submissionData: any): Promise<ApiResponse> {
    return this.request('/submissions', {
      method: 'POST',
      body: JSON.stringify(submissionData),
    });
  }

  async updateSubmission(id: string, updateData: any): Promise<ApiResponse> {
    return this.request(`/submissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteSubmission(id: string): Promise<ApiResponse> {
    return this.request(`/submissions/${id}`, {
      method: 'DELETE',
    });
  }

  async getSubmissionStats(): Promise<ApiResponse> {
    return this.request('/submissions/stats/overview');
  }

  // Document methods
  async uploadDocuments(submissionId: string, files: File[]): Promise<ApiResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const headers = this.getHeaders();
    delete headers['Content-Type']; // Let browser set Content-Type for FormData

    return this.request(`/documents/${submissionId}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  async getDocuments(submissionId: string): Promise<ApiResponse> {
    return this.request(`/documents/${submissionId}/files`);
  }

  async downloadDocument(submissionId: string, documentId: string): Promise<Blob> {
    const url = `${this.baseURL}/documents/${submissionId}/files/${documentId}/download`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to download document');
    }

    return response.blob();
  }

  async deleteDocument(submissionId: string, documentId: string): Promise<ApiResponse> {
    return this.request(`/documents/${submissionId}/files/${documentId}`, {
      method: 'DELETE',
    });
  }

  // ACORD form methods
  async generateACORDForm(submissionId: string, formType: string, options?: any): Promise<Blob> {
    const url = `${this.baseURL}/acord/generate/${submissionId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ formType, ...options }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate ACORD form');
    }

    return response.blob();
  }

  async generateCOI(submissionId: string, coiData: any): Promise<Blob> {
    const url = `${this.baseURL}/acord/coi/${submissionId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(coiData),
    });

    if (!response.ok) {
      throw new Error('Failed to generate COI');
    }

    return response.blob();
  }

  async getACORDForms(submissionId?: string): Promise<ApiResponse> {
    const endpoint = submissionId ? `/acord/${submissionId}` : '/acord';
    return this.request(endpoint);
  }

  async updateACORDFormStatus(acordFormId: string, status: string, signedBy?: string): Promise<ApiResponse> {
    return this.request(`/acord/${acordFormId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, signedBy }),
    });
  }

  // User management methods (admin only)
  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getUser(id: string): Promise<ApiResponse> {
    return this.request(`/users/${id}`);
  }

  async createUser(userData: any): Promise<ApiResponse> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, updateData: any): Promise<ApiResponse> {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getUserStats(): Promise<ApiResponse> {
    return this.request('/users/stats/overview');
  }

  // Admin methods
  async getFieldMappings(params?: any): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/admin/field-mappings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async createFieldMapping(mappingData: any): Promise<ApiResponse> {
    return this.request('/admin/field-mappings', {
      method: 'POST',
      body: JSON.stringify(mappingData),
    });
  }

  async updateFieldMapping(id: string, updateData: any): Promise<ApiResponse> {
    return this.request(`/admin/field-mappings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteFieldMapping(id: string): Promise<ApiResponse> {
    return this.request(`/admin/field-mappings/${id}`, {
      method: 'DELETE',
    });
  }

  async getAuditLogs(params?: any): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/admin/audit-logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getSystemSettings(): Promise<ApiResponse> {
    return this.request('/admin/settings');
  }

  async updateSystemSettings(settings: any): Promise<ApiResponse> {
    return this.request('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
  }

  async exportAuditLogs(params?: any): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `${this.baseURL}/admin/export/audit-logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to export audit logs');
    }

    return response.blob();
  }

  async getAdminStats(): Promise<ApiResponse> {
    return this.request('/admin/stats/overview');
  }

  // Notification methods
  async getNotifications(params?: any): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/notifications${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async markNotificationAsRead(id: string): Promise<ApiResponse> {
    return this.request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse> {
    return this.request('/notifications/read-all', {
      method: 'PUT',
    });
  }

  async deleteNotification(id: string): Promise<ApiResponse> {
    return this.request(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  async getNotificationStats(): Promise<ApiResponse> {
    return this.request('/notifications/stats');
  }
}

// Create singleton instance
export const apiService = new ApiService();
export default apiService;

