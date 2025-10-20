import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://znlnibnxvamplhccbozt.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubG5pYm54dmFtcGxoY2Nib3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjIwNjMsImV4cCI6MjA3NjUzODA2M30.xWiWSG9nstPl3DjUAmpHhZLN5Yano7a1L0Yu6IPmD6g';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Auth service
export class AuthService {
  // Sign up with Supabase
  async signUp(email: string, password: string, userData: {
    firstName: string;
    lastName: string;
    role?: string;
    agencyId?: string;
  }) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: userData.role || 'CUSTOMER',
            agency_id: userData.agencyId
          }
        }
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  }

  // Sign in with Supabase
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  }

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { user, error: null };
    } catch (error) {
      console.error('Get current user error:', error);
      return { user: null, error };
    }
  }

  // Get session
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { session, error: null };
    } catch (error) {
      console.error('Get session error:', error);
      return { session: null, error };
    }
  }

  // Reset password
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error };
    }
  }

  // Update password
  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Update password error:', error);
      return { error };
    }
  }

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

// API service for backend communication
export class ApiService {
  private baseUrl: string;
  private supabaseUrl: string;

  constructor() {
    this.baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
    this.supabaseUrl = supabaseUrl;
  }

  // Get auth headers
  private async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    return headers;
  }

  // Generic API call method
  private async apiCall(endpoint: string, options: RequestInit = {}) {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error(`API call error (${endpoint}):`, error);
      throw error;
    }
  }

  // Auth endpoints
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
    agencyId?: string;
  }) {
    return this.apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async login(email: string, password: string) {
    return this.apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async logout() {
    return this.apiCall('/auth/logout', {
      method: 'POST'
    });
  }

  async getCurrentUser() {
    return this.apiCall('/auth/me');
  }

  async refreshTokens(refreshToken: string) {
    return this.apiCall('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.apiCall('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  async resetPassword(email: string) {
    return this.apiCall('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  // Submissions endpoints
  async getSubmissions(params: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.apiCall(`/api/submissions?${searchParams.toString()}`);
  }

  async getSubmission(id: string) {
    return this.apiCall(`/api/submissions/${id}`);
  }

  async createSubmission(submissionData: any) {
    return this.apiCall('/api/submissions', {
      method: 'POST',
      body: JSON.stringify(submissionData)
    });
  }

  async updateSubmission(id: string, updateData: any) {
    return this.apiCall(`/api/submissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  // Documents endpoints
  async uploadDocument(submissionId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('submissionId', submissionId);

    const headers = await this.getAuthHeaders();
    delete headers['Content-Type']; // Let browser set multipart/form-data

    const response = await fetch(`${this.baseUrl}/api/submissions/${submissionId}/documents`, {
      method: 'POST',
      headers,
      body: formData
    });

    return response.json();
  }

  // ACORD Forms endpoints
  async generateAcordForm(submissionId: string, formData: any) {
    return this.apiCall(`/api/submissions/${submissionId}/acord-forms`, {
      method: 'POST',
      body: JSON.stringify(formData)
    });
  }

  // Notifications endpoints
  async getNotifications(params: {
    page?: number;
    limit?: number;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return this.apiCall(`/api/notifications?${searchParams.toString()}`);
  }

  async markNotificationAsRead(id: string) {
    return this.apiCall(`/api/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  // Dashboard endpoints
  async getDashboardStats() {
    return this.apiCall('/api/dashboard/stats');
  }
}

// Real-time service
export class RealtimeService {
  private channels: Map<string, any> = new Map();

  // Subscribe to submissions updates
  subscribeToSubmissions(callback: (payload: any) => void) {
    const channel = supabase.channel('submissions');
    
    channel.on('broadcast', { event: 'submission_created' }, callback);
    channel.on('broadcast', { event: 'submission_updated' }, callback);
    
    channel.subscribe();
    this.channels.set('submissions', channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete('submissions');
    };
  }

  // Subscribe to notifications
  subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    const channel = supabase.channel(`notifications:${userId}`);
    
    channel.on('broadcast', { event: 'notification_created' }, callback);
    
    channel.subscribe();
    this.channels.set(`notifications:${userId}`, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(`notifications:${userId}`);
    };
  }

  // Subscribe to general updates
  subscribeToUpdates(callback: (payload: any) => void) {
    const channel = supabase.channel('general');
    
    channel.on('broadcast', { event: 'update' }, callback);
    
    channel.subscribe();
    this.channels.set('general', channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete('general');
    };
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    this.channels.forEach((channel) => {
      channel.unsubscribe();
    });
    this.channels.clear();
  }
}

// Export instances
export const authService = new AuthService();
export const apiService = new ApiService();
export const realtimeService = new RealtimeService();

// Export Supabase client for direct use
export default supabase;
