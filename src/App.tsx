import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/SupabaseAuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";

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

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-bg-main">
    <div className="text-center animate-fade-in">
      <img src="/logo.png" alt="Stringer's Friend" className="h-16 w-16 object-contain mx-auto mb-6" />
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-text-muted text-sm font-medium">Loading...</p>
    </div>
  </div>
);

function AppRoutes() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/login";
  };

  // If logged in but profile is still null after loading, show a sync error
  if (user && !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-main p-6 text-center">
        <h2 className="text-xl font-black text-text-main mb-2">Sync Delayed</h2>
        <p className="text-text-muted mb-8 text-sm max-w-xs">
          We found your session but couldn't load your profile. This usually fixes itself in a few seconds.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full max-w-xs py-4 bg-primary text-white rounded-2xl font-bold mb-3"
        >
          Try Again
        </button>
        <button
          onClick={handleLogout}
          className="w-full max-w-xs py-4 bg-bg-card text-text-main rounded-2xl font-bold border border-border-main"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" replace />} />
        <Route path="/r/:id" element={<RacquetPage />} />
        <Route path="/scan/:qrCode" element={<ScanResult />} />
        
        {/* Protected Routes Wrapper */}
        <Route element={user ? <Layout user={profile || user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}>
          <Route path="/dashboard" element={
            profile?.role === 'stringer' ? (
              profile.shop_id ? <Dashboard user={profile} /> : <Navigate to="/setup" replace />
            ) : <CustomerDashboard user={profile!} />
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

        <Route path="/:slug" element={<PublicShop />} />
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
