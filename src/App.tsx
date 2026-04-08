import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ShopSetup from "./pages/ShopSetup";
import Dashboard from "./pages/Dashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import Inventory from "./pages/Inventory";
import CustomerList from "./pages/CustomerList";
import ScanResult from "./pages/ScanResult";
import PublicShop from "./pages/PublicShop";
import Profile from "./pages/Profile";
import Landing from "./pages/Landing";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./context/SupabaseAuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./utils/clearAuth"; // Load auth clearing utility

function AppRoutes() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-muted font-medium">Initializing...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={!user ? <Landing /> : <Navigate to="/dashboard" replace />} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />
      <Route path="/scan/:qrCode" element={<ScanResult />} />
      
      {/* Protected Routes Wrapper */}
      <Route element={user ? <Layout user={profile || user} onLogout={handleLogout} /> : <Navigate to="/" replace />}>
        <Route path="/dashboard" element={
          profile ? (
            profile.role === 'stringer' ? (
              profile.shop_id ? <Dashboard user={profile} /> : <Navigate to="/setup" replace />
            ) : <CustomerDashboard user={profile} />
          ) : (
            <div className="min-h-screen flex flex-col items-center justify-center bg-bg-main p-6">
              <div className="text-center max-w-sm w-full bg-bg-card rounded-[2.5rem] p-10 shadow-2xl border border-border-main">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-6"></div>
                <h2 className="text-xl font-black text-text-main mb-2 tracking-tight">Loading Profile</h2>
                <p className="text-text-muted mb-8 text-sm">
                  We're retrieving your account information. If this takes too long, your profile might be missing.
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full py-4 bg-neutral-100 dark:bg-neutral-800 text-text-main rounded-2xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all active:scale-[0.98]"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )
        } />
        <Route path="/setup" element={profile?.role === 'stringer' ? <ShopSetup user={profile} /> : <Navigate to="/" replace />} />
        <Route path="/inventory" element={profile?.role === 'stringer' ? <Inventory user={profile} /> : <Navigate to="/" replace />} />
        <Route path="/customers" element={profile?.role === 'stringer' ? <CustomerList user={profile} /> : <Navigate to="/" replace />} />
        <Route path="/messages" element={
          profile ? (
            profile.role === 'stringer' ? <Dashboard user={profile} initialTab="messages" /> : <CustomerDashboard user={profile} initialTab="messages" />
          ) : <Navigate to="/" replace />
        } />
        <Route path="/racquets" element={
          profile ? (
            profile.role === 'stringer' ? <Dashboard user={profile} initialTab="customers" /> : <CustomerDashboard user={profile} initialTab="racquets" />
          ) : <Navigate to="/" replace />
        } />
        <Route path="/profile" element={profile ? <Profile user={profile} /> : <Navigate to="/" replace />} />
      </Route>

      {/* Public Shop Slug - Should be last */}
      <Route path="/:slug" element={<PublicShop />} />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
