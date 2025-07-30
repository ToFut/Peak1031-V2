import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiService } from '../services/api';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'client' | 'coordinator' | 'third_party' | 'agency';
  is_active: boolean;
  email_verified?: boolean; // Made optional since Supabase doesn't provide this
  two_fa_enabled: boolean;
  last_login?: string | null; // Made optional to match Supabase interface
  created_at: string;
  updated_at: string;
}

interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<{ requiresTwoFactor?: boolean }>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  setupTwoFactor: () => Promise<void>;
  verifyTwoFactor: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initializeAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const refreshTokenValue = localStorage.getItem('refreshToken');

      if (!token) {
        setLoading(false);
        return;
      }

      // Verify token is still valid
      try {
        const userProfile = await apiService.getCurrentUser();
        setUser(userProfile);
        
        // Update last activity
        localStorage.setItem('lastActivity', Date.now().toString());
        
      } catch (error: any) {
        console.error('Token validation failed:', error);
        
        // Try to refresh token if we have a refresh token
        if (refreshTokenValue) {
          try {
            await apiService.refreshToken();
            const userProfile = await apiService.getCurrentUser();
            setUser(userProfile);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            await clearAuthData();
          }
        } else {
          await clearAuthData();
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      await clearAuthData();
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize authentication state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Set up token refresh interval
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        refreshToken().catch(console.error);
      }, 50 * 60 * 1000); // Refresh every 50 minutes

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const login = async (credentials: LoginCredentials): Promise<{ requiresTwoFactor?: boolean }> => {
    try {
      setLoading(true);
      
      const response = await apiService.login({
        email: credentials.email,
        password: credentials.password,
        twoFactorCode: undefined
      });
      
      // Check if 2FA is required
      if (response.requiresTwoFactor) {
        return { requiresTwoFactor: true };
      }
      
      // Store user data
      setUser(response.user);
      
      // Update last activity
      localStorage.setItem('lastActivity', Date.now().toString());
      
      console.log('Login successful:', response.user.email);
      
      return { requiresTwoFactor: false };
      
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    try {
      setLoading(true);
      
      // For now, registration is not implemented with Supabase
      // Users should be created by admin
      throw new Error('Registration is currently disabled. Please contact an administrator.');
      
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearAuthData();
      console.log('Logout successful');
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      await apiService.refreshToken();
      
      // Update last activity
      localStorage.setItem('lastActivity', Date.now().toString());

      console.log('Token refreshed successfully');

    } catch (error: any) {
      console.error('Token refresh failed:', error);
      
      // If refresh fails, clear auth data and redirect to login
      await clearAuthData();
      throw error;
    }
  };

  const updateUser = (userData: Partial<User>): void => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const setupTwoFactor = async (): Promise<void> => {
    try {
      // 2FA not implemented with Supabase yet
      throw new Error('Two-factor authentication is not yet available');
    } catch (error: any) {
      console.error('2FA setup failed:', error);
      throw error;
    }
  };

  const verifyTwoFactor = async (code: string): Promise<void> => {
    try {
      // 2FA not implemented with Supabase yet
      throw new Error('Two-factor authentication is not yet available');
    } catch (error: any) {
      console.error('2FA verification failed:', error);
      throw error;
    }
  };

  const clearAuthData = async (): Promise<void> => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('lastActivity');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
    setupTwoFactor,
    verifyTwoFactor
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

// Hook for protected routes
export const useRequireAuth = () => {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login if not authenticated
      window.location.href = '/login';
    }
  }, [user, loading]);

  return { user, loading };
};

// Hook for checking if user has specific role
export const useRole = (requiredRole: string | string[]) => {
  const { user } = useAuth();
  
  const hasRole = () => {
    if (!user) return false;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    
    return user.role === requiredRole;
  };

  return {
    hasRole: hasRole(),
    userRole: user?.role,
    isAdmin: user?.role === 'admin'
  };
};

// Hook for session management
export const useSession = () => {
  const { refreshToken, logout } = useAuth();
  
  useEffect(() => {
    const checkSession = () => {
      const lastActivity = localStorage.getItem('lastActivity');
      const sessionTimeout = 60 * 60 * 1000; // 1 hour
      
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
        
        if (timeSinceLastActivity > sessionTimeout) {
          console.log('Session expired due to inactivity');
          logout();
          return;
        }
      }
      
      // Update last activity on user interaction
      localStorage.setItem('lastActivity', Date.now().toString());
    };

    // Check session on mount
    checkSession();

    // Set up activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, checkSession, true);
    });

    // Set up periodic session check
    const interval = setInterval(checkSession, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, checkSession, true);
      });
      clearInterval(interval);
    };
  }, [logout]);

  return {
    refreshToken,
    logout
  };
};

// Hook for authentication form state
export const useAuthForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    remember_me: false
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (type: 'login' | 'register'): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (type === 'register' && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    // Registration-specific validation
    if (type === 'register') {
      if (!formData.first_name) {
        newErrors.first_name = 'First name is required';
      }
      if (!formData.last_name) {
        newErrors.last_name = 'Last name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      remember_me: false
    });
    setErrors({});
    setIsSubmitting(false);
  };

  return {
    formData,
    errors,
    isSubmitting,
    setIsSubmitting,
    updateField,
    validateForm,
    resetForm,
    setErrors
  };
};

export default useAuth;