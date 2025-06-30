import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterData } from '../types';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_UPDATE_USER'; payload: User };

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'AUTH_CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'AUTH_UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const checkAuth = async () => {
    if (!apiService.isAuthenticated()) {
      dispatch({ type: 'AUTH_LOGOUT' });
      return;
    }

    try {
      dispatch({ type: 'AUTH_START' });
      const user = await apiService.getProfile();
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error: any) {
      console.error('Auth check failed:', error);
      dispatch({ type: 'AUTH_LOGOUT' });
      // Don't show error toast for auth check failures
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await apiService.login(credentials);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
      toast.success('Welcome back!');
    } catch (error: any) {
      const message = error.message || 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      toast.error(message);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await apiService.register(data);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
      toast.success('Account created successfully!');
    } catch (error: any) {
      const message = error.message || 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      dispatch({ type: 'AUTH_LOGOUT' });
      toast.success('Logged out successfully');
    } catch (error) {
      // Even if logout fails on server, clear local state
      dispatch({ type: 'AUTH_LOGOUT' });
      toast.success('Logged out successfully');
    }
  };

  const updateUser = (user: User) => {
    dispatch({ type: 'AUTH_UPDATE_USER', payload: user });
  };

  const clearError = () => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    clearError,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
