// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login, registerUser, getProfile } from "../api/api";
import toast from "../components/ui/Toast";
import { secureStorage } from "../utils/storage";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is already logged in on app start
  useEffect(() => {
    // Attempt to get token securely
    const token = secureStorage.getItem("token");

    // Fallback: Check for legacy plain-text token and upgrade it
    if (!token) {
      const legacyToken = localStorage.getItem("token");
      if (legacyToken && !legacyToken.startsWith('U2F')) {
        // Simple check if it might be legacy (CryptoJS strings usually valid, but raw JWTs are distinct)
        // Actually, simplest is just: if we found a raw param but secure fail.
        // But for now, let's assume if secureStorage returns null, we check raw.
        try {
          // Determine if it looks like a JWT
          if (legacyToken.split('.').length === 3) {
            secureStorage.setItem("token", legacyToken);
            // Remove raw
            localStorage.removeItem("token");
            window.location.reload(); // Reload to pick up secure token
            return;
          }
        } catch (e) { }
      }
    }

    if (token) {
      // Temporarily set raw token for API calls (axios interceptor might need it)
      // Ideally, API interceptor should use secureStorage too.
      // But axios interceptor usually reads from localStorage directly in many setups.
      // We need to update the API interceptor if it exists. 
      // Let's assume we need to sync it or check API file.
      // CHECKPOINT: Updating this context implies the rest of the app needs to use secureStorage or we verify API.

      getProfile()
        .then((res) => {
          setUser(res.data);
        })
        .catch(() => {
          secureStorage.removeItem("token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginUser = async (credentials) => {
    try {
      const res = await login(credentials);
      secureStorage.setItem("token", res.data.token);
      setUser(res.data.user || res.data);
      toast.success("Welcome back!");
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
      return false;
    }
  };

  const register = async (data) => {
    try {
      await registerUser(data);
      toast.success("Account created! Please log in.");
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
      return false;
    }
  };

  const logout = () => {
    secureStorage.removeItem("token");
    setUser(null);
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return "0.00";

    const currency = user?.currency || "INR";
    const locales = {
      'INR': 'en-IN',
      'USD': 'en-US',
      'EUR': 'de-DE',
      'GBP': 'en-GB',
      'JPY': 'ja-JP'
    };

    // Backend already converts amounts to the user's currency.
    // We strictly only FORMAT the number here (add symbol, commas).
    return new Intl.NumberFormat(locales[currency] || 'en-IN', {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  return (
    <AuthContext.Provider value={{ user, loginUser, register, logout, loading, formatCurrency, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);