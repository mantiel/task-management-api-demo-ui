import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  authApi,
  userApi,
  getTokens,
  setTokens,
  clearAuth,
  getStoredUser,
  setStoredUser,
} from '../api/client';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchCurrentUser = useCallback(async () => {
    try {
      const userData = await userApi.getMe();
      setUser(userData);
      setStoredUser(userData);
      return userData;
    } catch (err) {
      console.warn('Error fetching user profile:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { accessToken } = getTokens();
      if (accessToken) {
        try {
          await fetchCurrentUser();
        } catch {
          clearAuth();
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      showToast('Your session has expired. Please log in again.', 'warning');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [fetchCurrentUser, showToast]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authApi.login(email, password);
      // response: { accessToken, refreshToken }
      setTokens(response.accessToken, response.refreshToken);
      
      const userData = await fetchCurrentUser();
      showToast(`Welcome back, ${userData?.username || 'User'}!`, 'success');
      return { success: true, user: userData };
    } catch (err) {
      const message = err.message || 'Error logging in';
      showToast(message, 'error');
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password, role = 'USER') => {
    setLoading(true);
    try {
      await authApi.register(username, email, password, role);
      showToast('Registration successful! Logging in...', 'success');
      // Automatically log in after registration
      return await login(email, password);
    } catch (err) {
      const message = err.message || 'Error registering';
      showToast(message, 'error');
      setLoading(false);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    const { refreshToken } = getTokens();
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (err) {
      console.warn('Logout API request note:', err);
    } finally {
      clearAuth();
      setUser(null);
      showToast('You have successfully logged out', 'info');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
