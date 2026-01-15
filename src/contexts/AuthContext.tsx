/**
 * ReshADX - Authentication Context
 * Manages user authentication state across the application
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { api, AuthResponse, User } from '../api/client';

// Auth state interface
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Auth reducer
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
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
};

// Auth context interface
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginWithPhone: (phoneNumber: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  verifyPhone: (phoneNumber: string, otp: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  updateUser: (data: Partial<User>) => void;
}

// Register data interface
interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phoneNumber?: string;
  country?: string;
  dateOfBirth?: string;
  referralCode?: string;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token storage keys
const ACCESS_TOKEN_KEY = 'reshadx_access_token';
const REFRESH_TOKEN_KEY = 'reshadx_refresh_token';
const USER_KEY = 'reshadx_user';

// Token management utilities
const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const setStoredUser = (user: User) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

const getStoredUser = (): User | null => {
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
};

// Auth Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAccessToken();
      const storedUser = getStoredUser();

      if (token && storedUser) {
        // Verify token is still valid by fetching current user
        try {
          const user = await api.auth.getCurrentUser();
          dispatch({ type: 'AUTH_SUCCESS', payload: user });
        } catch (error) {
          // Token invalid, try to refresh
          try {
            await refreshToken();
          } catch {
            clearTokens();
            dispatch({ type: 'LOGOUT' });
          }
        }
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    };

    initializeAuth();
  }, []);

  // Login with email
  const login = async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await api.auth.login({ email, password });
      setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      setStoredUser(response.user);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'Login failed',
      });
      throw error;
    }
  };

  // Login with phone
  const loginWithPhone = async (phoneNumber: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await api.auth.loginWithPhone({ phoneNumber, password });
      setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      setStoredUser(response.user);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'Login failed',
      });
      throw error;
    }
  };

  // Register
  const register = async (data: RegisterData) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await api.auth.register(data);
      setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      setStoredUser(response.user);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
    } catch (error: any) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error.message || 'Registration failed',
      });
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Continue with logout even if API call fails
    }
    clearTokens();
    dispatch({ type: 'LOGOUT' });
  };

  // Verify email
  const verifyEmail = async (token: string) => {
    try {
      await api.auth.verifyEmail(token);
      if (state.user) {
        dispatch({
          type: 'UPDATE_USER',
          payload: { emailVerified: true },
        });
      }
    } catch (error: any) {
      throw new Error(error.message || 'Email verification failed');
    }
  };

  // Verify phone
  const verifyPhone = async (phoneNumber: string, otp: string) => {
    try {
      await api.auth.verifyPhone(phoneNumber, otp);
      if (state.user) {
        dispatch({
          type: 'UPDATE_USER',
          payload: { phoneVerified: true },
        });
      }
    } catch (error: any) {
      throw new Error(error.message || 'Phone verification failed');
    }
  };

  // Forgot password
  const forgotPassword = async (email: string) => {
    try {
      await api.auth.forgotPassword(email);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send reset email');
    }
  };

  // Reset password
  const resetPassword = async (token: string, newPassword: string) => {
    try {
      await api.auth.resetPassword(token, newPassword);
      // Log out after password reset
      clearTokens();
      dispatch({ type: 'LOGOUT' });
    } catch (error: any) {
      throw new Error(error.message || 'Password reset failed');
    }
  };

  // Refresh token
  const refreshToken = async () => {
    const token = getRefreshToken();
    if (!token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await api.auth.refreshToken(token);
      setTokens(response.accessToken, response.refreshToken);
    } catch (error) {
      clearTokens();
      dispatch({ type: 'LOGOUT' });
      throw error;
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Update user
  const updateUser = (data: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: data });
    if (state.user) {
      setStoredUser({ ...state.user, ...data });
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    loginWithPhone,
    register,
    logout,
    verifyEmail,
    verifyPhone,
    forgotPassword,
    resetPassword,
    refreshToken,
    clearError,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export token getter for API client
export const getToken = getAccessToken;
export const getRefresh = getRefreshToken;

export default AuthContext;
