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
import { SimpleAuthProvider, PasswordGate, useSimpleAuth } from "./context/SimpleAuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { useState, useEffect } from "react";

function AppRoutes() {
  const { isAuthenticated, logout } = useSimpleAuth();

  const handleLogout = () => {
    logout();
  };

  // Mock user profile for the app
  const mockUser = {
    id: '1',
    email: 'user@stringersfriend.com',
    name: 'Stringer User',
    role: 'stringer'
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={!isAuthenticated ? <Landing /> : <Navigate to="/dashboard" replace />} />
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" replace />} />
      <Route path="/scan/:qrCode" element={<ScanResult />} />
      
      {/* Protected Routes Wrapper */}
      <Route element={isAuthenticated ? <Layout user={mockUser} onLogout={handleLogout} /> : <Navigate to="/" replace />}>
        <Route path="/dashboard" element={
          mockUser.role === 'stringer' ? (
            <Dashboard user={mockUser} />
          ) : <CustomerDashboard user={mockUser} />
        } />
        <Route path="/setup" element={mockUser.role === 'stringer' ? <ShopSetup user={mockUser} /> : <Navigate to="/" replace />} />
        <Route path="/inventory" element={mockUser.role === 'stringer' ? <Inventory user={mockUser} /> : <Navigate to="/" replace />} />
        <Route path="/customers" element={mockUser.role === 'stringer' ? <CustomerList user={mockUser} /> : <Navigate to="/" replace />} />
        <Route path="/messages" element={
          mockUser.role === 'stringer' ? <Dashboard user={mockUser} initialTab="messages" /> : <CustomerDashboard user={mockUser} initialTab="messages" />
        } />
        <Route path="/racquets" element={
          mockUser.role === 'stringer' ? <Dashboard user={mockUser} initialTab="customers" /> : <CustomerDashboard user={mockUser} initialTab="racquets" />
        } />
        <Route path="/profile" element={<Profile user={mockUser} />} />
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
      <SimpleAuthProvider>
        <PasswordGate>
          <ThemeProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ThemeProvider>
        </PasswordGate>
      </SimpleAuthProvider>
    </ErrorBoundary>
  );
}
