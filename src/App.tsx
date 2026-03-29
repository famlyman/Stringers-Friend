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
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { signOut } from "firebase/auth";
import { auth } from "./lib/firebase";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
        <Route path="/scan/:qrCode" element={<ScanResult />} />
        
        <Route element={<Layout user={user?.profile || user} onLogout={handleLogout} />}>
          <Route path="/" element={
            user ? (
              user.profile ? (
                user.profile.role === 'stringer' ? (
                  user.profile.shop_id ? <Dashboard user={user.profile} /> : <Navigate to="/setup" />
                ) : <CustomerDashboard user={user.profile} />
              ) : (
                <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-neutral-500 dark:text-neutral-400">Loading profile...</p>
                  </div>
                </div>
              )
            ) : <Navigate to="/login" />
          } />
          <Route path="/setup" element={user?.profile?.role === 'stringer' ? <ShopSetup user={user.profile} /> : <Navigate to="/" />} />
          <Route path="/inventory" element={user?.profile?.role === 'stringer' ? <Inventory user={user.profile} /> : <Navigate to="/" />} />
          <Route path="/customers" element={user?.profile?.role === 'stringer' ? <CustomerList user={user.profile} /> : <Navigate to="/" />} />
          <Route path="/profile" element={<Profile user={user.profile} />} />
        </Route>
        <Route path="/:slug" element={<PublicShop />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
