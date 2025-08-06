import { useState, useEffect, createContext, useContext } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('authToken');
    if (token) {
      // TODO: Validate token with backend
      setUser({
        id: '1',
        email: 'admin@peak1031.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      });
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // TODO: Implement actual login
    setUser({
      id: '1',
      email,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });
    localStorage.setItem('authToken', 'dummy-token');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}; 