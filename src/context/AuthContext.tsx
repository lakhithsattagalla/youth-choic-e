import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

export type AuthStep = 'INPUT' | 'OTP_VERIFY';

export interface UserProfile {
  id?: string;
  email?: string;
  name: string;
  phone?: string;
  role?: 'CUSTOMER' | 'ADMIN';
  gender?: string;
  dob?: string;
  profile_img?: string;
}

export interface OtpResponse {
  success: boolean;
  requiresOtp?: boolean;
  sessionId: string;
  email: string;
  phone: string;
  message: string;
  delivery?: {
    email: boolean;
    sms: boolean;
  };
}

export interface GoogleAuthResult {
  isNewUser: boolean;
  googleUser?: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  };
  token?: string;
  user?: UserProfile;
}

interface AuthContextType {
  user: UserProfile | null;
  authStep: AuthStep;
  isLoading: boolean;
  error: string | null;
  infoMessage: string | null;
  attemptsLeft: number;
  activeSessionId: string | null;
  savedIdentifier: string;
  sendOTP: (identifier: string) => Promise<boolean>;
  verifyOTP: (code: string) => Promise<boolean>;
  logout: () => void;
  resetAuth: () => void;

  // Backward compatibility with API methods
  token: string | null;
  login: (email: string, pass: string) => Promise<void>;
  adminLogin: (email: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  sendOtp: (payload: any) => Promise<OtpResponse>;
  verifyOtp: (sessionId: string, otp: string) => Promise<void>;
  resendOtp: (sessionId: string) => Promise<OtpResponse>;
  loginWithGoogle: (payload: any) => Promise<GoogleAuthResult>;
  completeGoogleRegistration: (payload: any) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [authStep, setAuthStep] = useState<AuthStep>('INPUT');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [savedIdentifier, setSavedIdentifier] = useState<string>('');

  useEffect(() => {
    const savedUser = localStorage.getItem('store_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser({ name: savedUser, email: savedUser, role: 'CUSTOMER' });
      }
    } else if (token) {
      apiRequest('/auth/me')
        .then((res) => {
          setUser(res.user);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const sendOTP = async (identifier: string): Promise<boolean> => {
    if (isLoading) return false; // Duplicate request protection
    setIsLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const isEmail = identifier.includes('@');
      const isPhone = /^[0-9+ ]+$/.test(identifier);

      const payload: any = { purpose: 'login' };
      if (isEmail) payload.email = identifier.trim().toLowerCase();
      if (isPhone) payload.phone = identifier.trim();

      const res: OtpResponse = await apiRequest('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success && res.sessionId) {
        setActiveSessionId(res.sessionId);
        setSavedIdentifier(identifier);
        setAuthStep('OTP_VERIFY');
        setAttemptsLeft(5);
        setInfoMessage(res.message || 'OTP sent to your registered mobile number and email address.');
        return true;
      } else {
        setError(res.message || "Request failed. Please try again later.");
        return false;
      }
    } catch (err: any) {
      setError(err.message || "Request failed. Please try again later.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (code: string): Promise<boolean> => {
    if (isLoading) return false; // Duplicate request protection
    if (!activeSessionId) {
      setError('Session expired. Please request a new OTP.');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ sessionId: activeSessionId, otp: code.trim() })
      });

      if (res.token && res.user) {
        localStorage.setItem('token', res.token);
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('store_user', JSON.stringify(res.user));
        resetAuth();
        return true;
      } else {
        setAttemptsLeft((prev) => Math.max(0, prev - 1));
        setError(res.error || 'Invalid OTP code. Please check and try again.');
        return false;
      }
    } catch (err: any) {
      setAttemptsLeft((prev) => Math.max(0, prev - 1));
      setError(err.message || 'Invalid OTP code. Please check and try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('store_user');
    localStorage.removeItem('token');
    setToken(null);
    resetAuth();
  };

  const resetAuth = () => {
    setAuthStep('INPUT');
    setError(null);
    setInfoMessage(null);
    setAttemptsLeft(5);
    setActiveSessionId(null);
  };

  const login = async (email: string, pass: string) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    });
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('store_user', JSON.stringify(res.user));
  };

  const sendOtp = async (payload: any): Promise<OtpResponse> => {
    return await apiRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  };

  const verifyOtp = async (sessionId: string, otp: string) => {
    const res = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ sessionId, otp })
    });
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('store_user', JSON.stringify(res.user));
  };

  const resendOtp = async (sessionId: string): Promise<OtpResponse> => {
    return await apiRequest('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    });
  };

  const loginWithGoogle = async (payload: any): Promise<GoogleAuthResult> => {
    const res = await apiRequest('/auth/google/verify', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!res.isNewUser && res.token) {
      localStorage.setItem('token', res.token);
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('store_user', JSON.stringify(res.user));
    }

    return res;
  };

  const completeGoogleRegistration = async (payload: any) => {
    const res = await apiRequest('/auth/google/complete-profile', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('store_user', JSON.stringify(res.user));
  };

  const adminLogin = async (email: string, pass: string) => {
    const res = await apiRequest('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    });
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('store_user', JSON.stringify(res.user));
  };

  const register = async (data: any) => {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    localStorage.setItem('token', res.token);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('store_user', JSON.stringify(res.user));
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    const res = await apiRequest('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    setUser(res.user);
    localStorage.setItem('store_user', JSON.stringify(res.user));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        authStep,
        isLoading,
        error,
        infoMessage,
        attemptsLeft,
        activeSessionId,
        savedIdentifier,
        sendOTP,
        verifyOTP,
        logout,
        resetAuth,
        login,
        adminLogin,
        register,
        sendOtp,
        verifyOtp,
        resendOtp,
        loginWithGoogle,
        completeGoogleRegistration,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
};
