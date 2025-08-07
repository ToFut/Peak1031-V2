import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { apiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  // Initialize auth state from stored token
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          console.log('🔐 Found stored token, verifying with backend...');
          
          // SECURITY FIX: Remove client-side JWT parsing - let backend validate
          // Only perform basic format check without decoding sensitive data
          if (!token || typeof token !== 'string' || !token.includes('.')) {
            console.log('❌ Token format invalid');
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
            setLoading(false);
            return;
          }
          
          // Verify token with backend and get user data - backend handles expiry
          const userData = await apiService.getCurrentUser();
          console.log('✅ Token valid, user:', userData.email);
          setUser(userData);
        } else {
          console.log('🔐 No stored token found');
        }
      } catch (error: any) {
        console.error('Error initializing auth:', error);
        // Clear tokens on any auth error
        console.log('🔑 Clearing invalid tokens due to error:', error.message);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      console.log('🔐 Attempting login for:', email);
      
      const response = await apiService.login({ email, password });
      
      // Store tokens
      localStorage.setItem('token', response.token);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      
      // Store user data for persistence
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Set user state
      setUser(response.user);
      console.log('✅ Login successful for:', response.user.email);
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('👋 Logging out...');
      
      // Call backend logout endpoint
      await apiService.logout();
      
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // Clear user state
      setUser(null);
      console.log('✅ Logout successful');
    } catch (error: any) {
      console.error('❌ Logout failed:', error);
      // Even if logout fails, clear local state
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      await apiService.refreshToken();
      console.log('✅ Token refreshed successfully');
    } catch (error: any) {
      console.error('❌ Token refresh failed:', error);
      // Clear tokens and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
      throw error;
    }
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    try {
      if (!user) {
        throw new Error('No user to update');
      }
      
      const updatedUser = await apiService.updateUser(user.id, userData);
      setUser(updatedUser);
      console.log('✅ User updated successfully');
    } catch (error: any) {
      console.error('❌ User update failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;