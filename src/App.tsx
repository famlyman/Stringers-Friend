import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/SupabaseAuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy load pages to improve initial load performance
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Messages = lazy(() => import("./pages/Messages"));
const CustomerMessages = lazy(() => import("./pages/CustomerMessages"));
const ShopSetup = lazy(() => import("./pages/ShopSetup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const CustomerList = lazy(() => import("./pages/CustomerList"));
const ScanResult = lazy(() => import("./pages/ScanResult"));
const RacquetPage = lazy(() => import("./pages/RacquetPage"));
const PublicShop = lazy(() => import("./pages/PublicShop"));
const Profile = lazy(() => import("./pages/Profile"));
const Landing = lazy(() => import("./pages/Landing"));
const RacquetSpecsAdmin = lazy(() => import("./pages/RacquetSpecsAdmin"));

// Loading fallback for Suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-bg-main">
    <div className="text-center">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-text-muted text-sm font-medium">Loading page...</p>
    </div>
  </div>
);

function AppRoutes() {
  const { user, profile, loading, signOut } = useAuth();

  // STABLE LOADING STATE
  // Do not perform any redirect logic while loading is true.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="text-center">
          <img src="/logo.png" alt="Stringer's Friend" className="h-20 w-20 object-contain mx-auto mb-6 animate-pulse" />
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted font-semibold tracking-tight">Syncing your session...</p>
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
    window.location.href = "/login";
  };

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />
        <Route path="/r/:id" element={<RacquetPage />} />
        <Route path="/scan/:qrCode" element={<ScanResult />} />
        
        {/* Protected Routes Wrapper */}
        <Route element={user ? <Layout user={profile || user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}>
          <Route path="/dashboard" element={
            profile ? (
              profile.role === 'stringer' ? (
                profile.shop_id ? <Dashboard user={profile} /> : <Navigate to="/setup" replace />
              ) : <CustomerDashboard user={profile} />
            ) : (
              <div className="min-h-screen flex items-center justify-center bg-bg-main p-6">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-text-muted">Finalizing workspace...</p>
                </div>
              </div>
            )
          } />
          <Route path="/setup" element={profile?.role === 'stringer' ? <ShopSetup user={profile} /> : <Navigate to="/" replace />} />
          <Route path="/inventory" element={profile?.role === 'stringer' ? <Inventory user={profile} /> : <Navigate to="/" replace />} />
          <Route path="/customers" element={profile?.role === 'stringer' ? <CustomerList user={profile} /> : <Navigate to="/" replace />} />
          <Route path="/messages" element={
            profile?.role === 'stringer' ? <Messages user={profile} /> : <CustomerMessages user={profile} />
          } />
          <Route path="/profile" element={profile ? <Profile user={profile} /> : <Navigate to="/" replace />} />
          <Route path="/racquet-specs" element={profile?.role === 'stringer' ? <RacquetSpecsAdmin user={profile} /> : <Navigate to="/" replace />} />
        </Route>

        {/* Public Shop Slug */}
        <Route path="/:slug" element={<PublicShop />} />
        
        {/* Simple Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
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
