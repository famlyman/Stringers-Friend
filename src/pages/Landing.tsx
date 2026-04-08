import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/SupabaseAuthContext";

export default function Landing() {
  const { darkMode } = useTheme();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-bg-main transition-colors duration-300">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-black text-text-main mb-6 tracking-tight">
              Stringer's Friend
            </h1>
            <p className="text-xl md:text-2xl text-text-muted mb-8 max-w-3xl mx-auto">
              The complete racquet stringing management system for professional stringers and their customers
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-lg"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 bg-bg-card text-text-main rounded-2xl font-bold hover:bg-bg-card/80 transition-all active:scale-[0.98] border border-border-main"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-3xl md:text-4xl font-black text-text-main text-center mb-16">
          Everything You Need to Manage Your Stringing Business
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-bg-card rounded-3xl p-8 border border-border-main">
            <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-text-main mb-4">Customer Management</h3>
            <p className="text-text-muted">
              Keep track of all your customers, their racquets, and stringing preferences in one place.
            </p>
          </div>

          <div className="bg-bg-card rounded-3xl p-8 border border-border-main">
            <div className="w-12 h-12 bg-secondary/20 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-text-main mb-4">Inventory Tracking</h3>
            <p className="text-text-muted">
              Monitor your string inventory, get notified when supplies are low, and track usage patterns.
            </p>
          </div>

          <div className="bg-bg-card rounded-3xl p-8 border border-border-main">
            <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-text-main mb-4">QR Code System</h3>
            <p className="text-text-muted">
              Generate QR codes for racquets that customers can scan to view their stringing history and specifications.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-bg-card border-t border-border-main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-black text-text-main mb-6">
              Ready to Streamline Your Stringing Business?
            </h2>
            <p className="text-xl text-text-muted mb-8 max-w-2xl mx-auto">
              Join hundreds of professional stringers who trust Stringer's Friend to manage their business.
            </p>
            <Link
              to="/register"
              className="inline-block px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-lg"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
