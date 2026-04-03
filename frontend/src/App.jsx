import { useState, useEffect, lazy, Suspense } from "react"; // Added useState
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast"; // Added toast import
import { Helmet } from "react-helmet-async";
import { WifiOff } from 'lucide-react'; // Import icon for toast

import Layout from "./components/layout/Layout";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import GlobalErrorBoundary from "./components/ui/GlobalErrorBoundary";
import NotFound from "./pages/NotFound";

import OfflinePage from "./pages/OfflinePage";
import useOnlineStatus from "./hooks/useOnlineStatus";

// Lazy imports
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Budget = lazy(() => import("./pages/Budget"));
const Investments = lazy(() => import("./pages/Investments"));
const Goals = lazy(() => import("./pages/Goals"));
const Family = lazy(() => import("./pages/Family"));
const EMI = lazy(() => import("./pages/EMI"));
const Recurring = lazy(() => import("./pages/Recurring"));
const Profile = lazy(() => import("./pages/Profile"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Landing = lazy(() => import("./pages/Landing"));
const Simulator = lazy(() => import("./pages/Simulator"));

// Protected Route Component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const isOnline = useOnlineStatus();
  const [isOfflineDismissed, setIsOfflineDismissed] = useState(false);

  // Reset dismissal when back online
  useEffect(() => {
    if (isOnline) {
      if (isOfflineDismissed) {
        toast.success("You are back online!", { id: 'online-status' });
      }
      setIsOfflineDismissed(false);
    } else if (!isOfflineDismissed) {
      // Optional: Just let the full page handle it first
    } else {
      // If offline but dismissed, show a persistent toast
      toast("You are currently offline. Showing cached data.", {
        icon: <WifiOff className="text-orange-500" size={18} />,
        duration: 5000,
        id: 'offline-status',
        style: {
          border: '1px solid #fdba74',
          padding: '16px',
          color: '#c2410c',
        },
      });
    }
  }, [isOnline, isOfflineDismissed]);

  // If completely offline and not dismissed, show the offline page
  if (!isOnline && !isOfflineDismissed) {
    return <OfflinePage onContinueOffline={() => setIsOfflineDismissed(true)} />;
  }

  return (
    <GlobalErrorBoundary>
      <Helmet>
        <title>FinanceHub - Smart Financial Management</title>
        <meta name="description" content="Manage your finances, track spending, and plan your budget with AI-powered insights." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />

        {/* Security Headers */}
        <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' http://localhost:*; frame-src 'self';" />
        <meta http-equiv="X-Content-Type-Options" content="nosniff" />
        <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      </Helmet>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          },
          success: {
            style: {
              background: '#059669', // Emerald 600
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#059669',
            },
          },
          error: {
            style: {
              background: '#DC2626', // Red 600
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#DC2626',
            },
          },
        }}
      />

      <Suspense fallback={
        <div className="flex h-screen w-full items-center justify-center bg-gray-50">
          <LoadingSpinner />
        </div>
      }>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Add a direct route for testing offline page if needed */}
          <Route path="/offline" element={<OfflinePage />} />

          {/* 404 Route (Public) */}
          <Route path="/404" element={<NotFound />} />

          {/* Protected Routes with Layout */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>

                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/budget" element={<Budget />} />
                    <Route path="/investments" element={<Investments />} />
                    <Route path="/goals" element={<Goals />} />
                    <Route path="/family" element={<Family />} />
                    <Route path="/emi" element={<EMI />} />
                    <Route path="/recurring" element={<Recurring />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/simulator" element={<Simulator />} />
                    {/* Fallback to 404 for unknown routes within authenticated area */}
                    <Route path="*" element={<Navigate to="/404" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </GlobalErrorBoundary>
  );
}
