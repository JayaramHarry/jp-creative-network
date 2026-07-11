import React, { createContext, useState, useEffect } from 'react';
import API from '../services/api.js';
import translations from '../services/translations.js';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState(localStorage.getItem('lang') || 'en');

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'te' : 'en';
    setLanguage(nextLang);
    localStorage.setItem('lang', nextLang);
  };

  const t = (key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  useEffect(() => {
    const checkLoggedIn = async () => {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        try {
          const parsed = JSON.parse(storedUserInfo);
          const { data } = await API.get('/auth/me');
          if (data.success) {
            const { success, ...userData } = data;
            setUser({ ...userData, token: parsed.token });
          } else {
            logout();
          }
        } catch (err) {
          console.error('Session expired or token invalid');
          logout();
        }
      }
      setLoading(false);
    };
    checkLoggedIn();
  }, []);

  const register = async (name, email, password) => {
    try {
      setError(null);
      const { data } = await API.post('/auth/register', { name, email, password });
      if (data.success) {
        return { success: true, email: data.email, testCode: data.testCode };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const { data } = await API.post('/auth/login', { email, password });
      if (data.success) {
        setUser(data);
        localStorage.setItem('userInfo', JSON.stringify(data));
        return { success: true };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      setError(msg);
      return {
        success: false,
        message: msg,
        isEmailVerified: err.response?.data?.isEmailVerified,
        email: err.response?.data?.email,
        testCode: err.response?.data?.testCode,
      };
    }
  };

  const verifyEmail = async (email, code) => {
    try {
      setError(null);
      const { data } = await API.post('/auth/verify-email', { email, code });
      if (data.success) {
        setUser(data);
        localStorage.setItem('userInfo', JSON.stringify(data));
        return { success: true };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const resendVerificationCode = async (email) => {
    try {
      setError(null);
      const { data } = await API.post('/auth/resend-verification', { email });
      if (data.success) {
        return { success: true, message: data.message, testCode: data.testCode };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend code';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userInfo');
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      const { data } = await API.post('/auth/forgot-password', { email });
      return { success: true, message: data.message, testCode: data.testCode };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit reset request';
      return { success: false, message: msg };
    }
  };

  const resetPassword = async (email, code, newPassword) => {
    try {
      setError(null);
      const { data } = await API.post('/auth/reset-password', { email, code, newPassword });
      if (data.success) {
        return { success: true, message: data.message };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password';
      setError(msg);
      return { success: false, message: msg };
    }
  };

  const getGreeting = () => {
    if (!user) return '';
    const hour = new Date().getHours();
    const firstName = user.name.split(' ')[0];
    if (hour < 12) {
      return `Good Morning, ${firstName} ☀️`;
    } else if (hour < 17) {
      return `Good Afternoon, ${firstName} 🌤️`;
    } else if (hour < 22) {
      return `Good Evening, ${firstName} 🌙`;
    } else {
      return `Good Night, ${firstName} 🌠`;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        register,
        login,
        logout,
        forgotPassword,
        verifyEmail,
        resendVerificationCode,
        resetPassword,
        getGreeting,
        language,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
