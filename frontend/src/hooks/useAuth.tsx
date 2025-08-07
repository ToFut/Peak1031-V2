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
        const refreshTokenValue = localStorage.getItem('refreshToken');
        
        if (token) {
          
          
          // SECURITY FIX: Remove client-side JWT parsing - let backend validate
          // Only perform basic format check without decoding sensitive data
          if (!token || typeof token !== 'string' || !token.includes('.')) {
            
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
            setLoading(false);
            return;
          }
          
          try {
            // Verify token with backend and get user data - backend handles expiry
            const userData = await apiService.getCurrentUser();
            
            setUser(userData);
          } catch (error: any) {
            // If token is expired and we have a refresh token, try to refresh
            if (error.message?.includes('expired') && refreshTokenValue) {
              console.log('🔄 Token expired during init, attempting refresh...');
              try {
                await apiService.refreshToken();
                // After refresh, try getting user data again
                const userData = await apiService.getCurrentUser();
                setUser(userData);
                console.log('✅ Token refresh successful during init');
              } catch (refreshError) {
                console.error('❌ Token refresh failed during init:', refreshError);
                // Clear tokens if refresh fails
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                setUser(null);
              }
            } else {
              // For other errors, clear tokens
              console.error('❌ Auth init error (non-expiry):', error);
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              setUser(null);
            }
          }
        } else {
          
        }
      } catch (error: any) {
        console.error('Error initializing auth:', error);
        // Clear tokens on any auth error
        
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

  // Set up periodic token refresh to prevent expiration
  useEffect(() => {
    if (!user) return;

    // Check token every 10 minutes and refresh if needed
    const intervalId = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const refreshTokenValue = localStorage.getItem('refreshToken');
        
        if (token && refreshTokenValue) {
          // Parse token to check expiry (base64 decode)
          const payload = JSON.parse(atob(token.split('.')[1]));
          const expiryTime = payload.exp * 1000; // Convert to milliseconds
          const currentTime = Date.now();
          const timeUntilExpiry = expiryTime - currentTime;
          
          // If token expires in less than 5 minutes, refresh it
          if (timeUntilExpiry < 5 * 60 * 1000) {
            console.log('🔄 Token expiring soon, refreshing proactively...');
            await apiService.refreshToken();
            console.log('✅ Proactive token refresh successful');
          }
        }
      } catch (error) {
        console.error('❌ Periodic token refresh check failed:', error);
      }
    }, 10 * 60 * 1000); // Check every 10 minutes

    return () => clearInterval(intervalId);
  }, [user]);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      
      
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
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      
      
      // Call backend logout endpoint
      await apiService.logout();
      
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // Clear user state
      setUser(null);
      
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