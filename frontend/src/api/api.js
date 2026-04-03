// src/api/api.js
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Auto attach token
import { secureStorage } from "../utils/storage";

API.interceptors.request.use((config) => {
  const token = secureStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 → redirect to login
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      secureStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ---------- AUTH ----------
export const login = (data) => API.post("/auth/login", data);
export const registerUser = (data) => API.post("/auth/register", data);
export const forgotPassword = (data) => API.post("/auth/forgotpassword", data);

// ---------- USERS ----------
export const getProfile = () => API.get("/users/profile");
export const updateProfile = (data) => API.put("/users/profile", data);
export const uploadProfilePicture = (file) => {
  const formData = new FormData();
  formData.append("image", file);
  return API.post("/users/profile-picture", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const getLeaderboard = () => API.get("/users/leaderboard");

// ---------- TRANSACTIONS ----------
export const getTransactions = (params) => API.get("/transactions", { params });
export const addTransaction = (data) => API.post("/transactions", data);
export const updateTransaction = (id, data) => API.put(`/transactions/${id}`, data);
export const deleteTransaction = (id) => API.delete(`/transactions/${id}`);

// ---------- BUDGETS ----------
export const getBudgets = () => API.get("/budgets");
export const setBudget = (data) => API.post("/budgets", data);
export const deleteBudget = (id) => API.delete(`/budgets/${id}`);
export const recommendBudget = () => API.get("/budgets/recommend");

// ---------- INVESTMENTS ----------
export const getInvestments = () => API.get("/investments");
export const addInvestment = (data) => API.post("/investments", data);
export const deleteInvestment = (id) => API.delete(`/investments/${id}`);
export const sellInvestment = (id, data) => API.post(`/investments/${id}/sell`, data);
export const searchStocks = (query) => API.get(`/stocks/search?query=${query}`);
export const getStockDetail = (symbol) => API.get(`/stocks/${symbol}`);
export const getStockRecommendations = () => API.get("/stocks/recommendations");

// ---------- EMIS ----------
export const getEMIs = () => API.get("/emis");
export const addEMI = (data) => API.post("/emis", data);
export const deleteEMI = (id) => API.delete(`/emis/${id}`);

// ---------- ANALYTICS ----------
export const getDashboardAnalytics = () => API.get("/analytics/dashboard");
export const getBreakdown = () => API.get("/analytics/breakdown");
export const getMonthlyComparison = () => API.get("/analytics/monthly-comparison");
export const getForecast = () => API.get("/analytics/forecast");
export const exportTransactions = () => API.get("/reports/export", { responseType: 'blob' });
export const downloadReportPDF = (startDate, endDate) => API.get(`/reports/download-pdf?startDate=${startDate}&endDate=${endDate}`, { responseType: 'blob' });
export const emailReport = (data) => API.post("/reports/email-report", data);
export const getWealthDetails = () => API.get("/analytics/wealth");
export const getTrends = () => API.get("/analytics/trends");

// ---------- AI ----------
export const aiChat = (data) => API.post("/ai/chat", data);
export const scanReceipt = (file) => {
  const formData = new FormData();
  formData.append("receipt", file);
  return API.post("/ai/scan-receipt", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const scanBankStatement = (file) => {
  const formData = new FormData();
  formData.append("statement", file);
  return API.post("/ai/scan-statement", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};



export const addBulkTransactions = (data) => API.post("/transactions/bulk", data);

// ---------- FAMILY ----------
export const createFamily = (data) => API.post("/family/create", data);
export const joinFamily = (data) => API.post("/family/join", data);
export const getFamilyMembers = () => API.get("/family/members");
export const getFamilyAnalytics = () => API.get("/family/analytics");
export const leaveFamily = () => API.post("/family/leave");

// ---------- GOALS ----------
export const getGoals = () => API.get("/goals");
export const createGoal = (data) => API.post("/goals", data);
export const deleteGoal = (id) => API.delete(`/goals/${id}`);
export const addFundsToGoal = (id, data) => API.put(`/goals/${id}/add`, data);
export const redeemGoal = (id) => API.post(`/goals/${id}/redeem`);

// ---------- RECURRING ----------
export const getRecurring = () => API.get("/recurring");
export const createRecurring = (data) => API.post("/recurring", data);
export const deleteRecurring = (id) => API.delete(`/recurring/${id}`);
export const scanRecurringSubscriptions = () => API.post("/recurring/scan");

// ---------- NOTIFICATIONS ----------
export const getNotifications = () => API.get("/notifications");
export const markNotificationRead = (id) => API.put(`/notifications/${id}/read`);
export const deleteNotification = (id) => API.delete(`/notifications/${id}`);
export const clearNotifications = () => API.delete("/notifications");

export default API;