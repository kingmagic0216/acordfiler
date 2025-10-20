import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, authService } from '../services/supabaseService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: {
    firstName: string;
    lastName: string;
    role?: string;
    agencyId?: string;
  }) => Promise<{ data: any; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            console.log('User signed in');
            break;
          case 'SIGNED_OUT':
            console.log('User signed out');
            break;
          case 'TOKEN_REFRESHED':
            console.log('Token refreshed');
            break;
          case 'PASSWORD_RECOVERY':
            console.log('Password recovery initiated');
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, userData: {
    firstName: string;
    lastName: string;
    role?: string;
    agencyId?: string;
  }) => {
    try {
      setLoading(true);
      const result = await authService.signUp(email, password, userData);
      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await authService.signIn(email, password);
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const result = await authService.signOut();
      return result;
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: error as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const result = await authService.resetPassword(email);
      return result;
    } catch (error) {
      console.error('Reset password error:', error);
      return { error: error as AuthError };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const result = await authService.updatePassword(newPassword);
      return result;
    } catch (error) {
      console.error('Update password error:', error);
      return { error: error as AuthError };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for real-time subscriptions
export const useRealtime = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const channel = supabase.channel('connection-status');
    
    channel.on('system', { event: 'connected' }, () => {
      setIsConnected(true);
    });

    channel.on('system', { event: 'disconnected' }, () => {
      setIsConnected(false);
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return { isConnected };
};

// Hook for notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to notifications
    const channel = supabase.channel(`notifications:${user.id}`);
    
    channel.on('broadcast', { event: 'notification_created' }, (payload) => {
      console.log('New notification:', payload);
      setNotifications(prev => [payload.notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true, read_at: new Date() }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Call API to mark as read
      const { apiService } = await import('../services/supabaseService');
      await apiService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead
  };
};

// Hook for submissions with real-time updates
export const useSubmissions = (params: {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
} = {}) => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { apiService } = await import('../services/supabaseService');
      const result = await apiService.getSubmissions(params);
      
      setSubmissions(result.data.submissions);
      setPagination(result.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [params.page, params.limit, params.status, params.priority]);

  useEffect(() => {
    // Subscribe to real-time updates
    const { realtimeService } = require('../services/supabaseService');
    
    const unsubscribe = realtimeService.subscribeToSubmissions((payload) => {
      console.log('Real-time submission update:', payload);
      
      if (payload.event === 'submission_created') {
        setSubmissions(prev => [payload.submission, ...prev]);
      } else if (payload.event === 'submission_updated') {
        setSubmissions(prev => 
          prev.map(submission => 
            submission.id === payload.submission.id 
              ? payload.submission 
              : submission
          )
        );
      }
    });

    return unsubscribe;
  }, []);

  return {
    submissions,
    loading,
    error,
    pagination,
    refetch: fetchSubmissions
  };
};
