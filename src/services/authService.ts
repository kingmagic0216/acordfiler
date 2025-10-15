// Authentication service for user management
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'broker' | 'admin';
  avatar?: string;
  lastLogin?: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class AuthService {
  private currentUser: User | null = null;
  private listeners: ((state: AuthState) => void)[] = [];

  // Mock users for demo purposes
  private mockUsers: User[] = [
    {
      id: '1',
      email: 'admin@acord.com',
      name: 'Admin User',
      role: 'admin',
      lastLogin: new Date()
    },
    {
      id: '2',
      email: 'broker@acord.com',
      name: 'John Broker',
      role: 'broker',
      lastLogin: new Date()
    },
    {
      id: '3',
      email: 'customer@acord.com',
      name: 'Jane Customer',
      role: 'customer',
      lastLogin: new Date()
    }
  ];

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of state changes
  private notifyListeners(): void {
    const state: AuthState = {
      user: this.currentUser,
      isAuthenticated: !!this.currentUser,
      isLoading: false
    };
    this.listeners.forEach(listener => listener(state));
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Find user in mock data
      const user = this.mockUsers.find(u => u.email === email);
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // In a real app, you'd verify the password here
      if (password !== 'password') {
        return { success: false, error: 'Invalid password' };
      }

      // Update last login
      user.lastLogin = new Date();
      this.currentUser = user;

      // Store in localStorage
      localStorage.setItem('acord_user', JSON.stringify(user));
      
      this.notifyListeners();
      return { success: true, user };
    } catch (error) {
      return { success: false, error: 'Sign in failed' };
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    this.currentUser = null;
    localStorage.removeItem('acord_user');
    this.notifyListeners();
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  // Initialize auth state from localStorage
  initialize(): void {
    try {
      const stored = localStorage.getItem('acord_user');
      if (stored) {
        this.currentUser = JSON.parse(stored);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to initialize auth state:', error);
    }
  }

  // Get users (for admin)
  async getUsers(): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...this.mockUsers];
  }

  // Create new user (for admin)
  async createUser(userData: Omit<User, 'id' | 'lastLogin'>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newUser: User = {
        ...userData,
        id: String(this.mockUsers.length + 1),
        lastLogin: new Date()
      };

      this.mockUsers.push(newUser);
      return { success: true, user: newUser };
    } catch (error) {
      return { success: false, error: 'Failed to create user' };
    }
  }

  // Update user (for admin)
  async updateUser(id: string, updates: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const userIndex = this.mockUsers.findIndex(u => u.id === id);
      if (userIndex === -1) {
        return { success: false, error: 'User not found' };
      }

      this.mockUsers[userIndex] = { ...this.mockUsers[userIndex], ...updates };
      return { success: true, user: this.mockUsers[userIndex] };
    } catch (error) {
      return { success: false, error: 'Failed to update user' };
    }
  }

  // Delete user (for admin)
  async deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const userIndex = this.mockUsers.findIndex(u => u.id === id);
      if (userIndex === -1) {
        return { success: false, error: 'User not found' };
      }

      this.mockUsers.splice(userIndex, 1);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete user' };
    }
  }
}

export const authService = new AuthService();

