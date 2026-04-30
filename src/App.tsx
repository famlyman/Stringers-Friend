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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main transition-colors duration-300">
        <div className="text-center animate-fade-in">
          <img src="/logo.png" alt="Stringer's Friend" className="h-20 w-20 object-contain mx-auto mb-6 animate-bounce-subtle" />
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted font-semibold">Loading...</p>
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
    // Force clear auth regardless
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
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
        <Route element={user ? <Layout user={profile || user} onLogout={handleLogout} /> : <Navigate to="/" replace />}>
          <Route path="/dashboard" element={
            profile ? (
              profile.role === 'stringer' ? (
                profile.shop_id ? <Dashboard user={profile} /> : <Navigate to="/setup" replace />
              ) : <CustomerDashboard user={profile} />
            ) : loading ? (
              <div className="min-h-screen flex flex-col items-center justify-center bg-bg-main p-6">
                <div className="text-center max-w-sm w-full bg-bg-card rounded-3xl p-10 shadow-2xl border border-border-main animate-scale-in">
                  <img src="/logo.png" alt="Loading" className="h-16 w-16 object-contain mx-auto mb-6" />
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-6"></div>
                  <h2 className="text-xl font-black text-text-main mb-2 tracking-tight">Loading Profile</h2>
                  <p className="text-text-muted mb-8 text-sm">
                    We're retrieving your account information...
                  </p>
                </div>
              </div>
            ) : user ? (
              // Profile fetch failed but user exists - show retry option instead of blocking error
              <div className="min-h-screen flex flex-col items-center justify-center bg-bg-main p-6">
                <div className="text-center max-w-sm w-full bg-bg-card rounded-[2.5rem] p-10 shadow-2xl border border-border-main">
                  <h2 className="text-xl font-black text-text-main mb-2 tracking-tight">Connection Issue</h2>
                  <p className="text-text-muted mb-8 text-sm">
                    We had trouble loading your profile. This is often resolved by waiting a moment and trying again.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all active:scale-[0.98] mb-3"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full py-4 bg-bg-card text-text-main rounded-2xl font-bold hover:bg-bg-card/80 transition-all border border-border-main"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          } />
          <Route path="/setup" element={profile?.role === 'stringer' ? <ShopSetup user={profile} /> : <Navigate to="/" replace />} />
          <Route path="/inventory" element={profile?.role === 'stringer' ? <Inventory user={profile} /> : <Navigate to="/" replace />} />
          <Route path="/customers" element={profile?.role === 'stringer' ? <CustomerList user={profile} /> : <Navigate to="/" replace />} />
          <Route path="/messages" element={
            profile?.role === 'stringer' ? <Messages user={profile} /> : <CustomerMessages user={profile} />
          } />
          <Route path="/racquets" element={
            profile ? (
              profile.role === 'stringer' ? <Dashboard user={profile} initialTab="customers" /> : <CustomerDashboard user={profile} initialTab="racquets" />
            ) : <Navigate to="/" replace />
          } />
          <Route path="/profile" element={profile ? <Profile user={profile} /> : <Navigate to="/" replace />} />
          <Route path="/racquet-specs" element={profile?.role === 'stringer' ? <RacquetSpecsAdmin user={profile} /> : <Navigate to="/" replace />} />
        </Route>

        {/* Public Shop Slug - Should be last */}
        <Route path="/:slug" element={<PublicShop />} />
        
        {/* Fallback */}
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
