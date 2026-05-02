import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/SupabaseAuthContext";
import { supabase } from "../lib/supabase";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shopId = searchParams.get("shopId");
  const { signIn } = useAuth();

  const ensureCustomerRecord = async (userId: string, userEmail: string, userName: string) => {
    if (!shopId) return;
    
    try {
      const { data: existingCustomers, error: searchError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', userEmail)
        .eq('shop_id', shopId);

      if (searchError) {
        console.error("Error searching for customer:", searchError);
        return;
      }

      if (!existingCustomers || existingCustomers.length === 0) {
        const { error: insertError } = await supabase
          .from('customers')
          .insert({
            shop_id: shopId,
            profile_id: userId,
            first_name: userName || userEmail.split('@')[0],
            last_name: '',
            email: userEmail,
            phone: ""
          });

        if (insertError) {
          console.error("Error creating customer record:", insertError);
        }
      }
    } catch (err) {
      console.error("Error ensuring customer record:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        throw signInError;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await ensureCustomerRecord(user.id, user.email || email, user.user_metadata?.name || '');
      }
      
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: shopId ? { shopId } : undefined
        }
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      setError(err.message || "Failed to sign in with Google");
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const redirectUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectUrl}/`,
      });

      if (resetError) {
        throw resetError;
      }

      setResetSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4 transition-colors duration-300">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md">
        {/* Back to home */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="bg-bg-card rounded-3xl shadow-2xl border border-border-main overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="p-8 pb-0">
            <div className="flex items-center justify-center mb-6">
              <img src="/logo.png" alt="Stringer's Friend" className="h-14 w-14 object-contain" />
            </div>
            <h1 className="text-2xl font-black text-text-main text-center tracking-tight">Welcome Back</h1>
            <p className="text-text-muted text-center mt-1">Sign in to your account</p>
          </div>

          <div className="p-8">
            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-3 animate-slide-up">
                <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
                <p className="text-sm text-error font-medium">{error}</p>
              </div>
            )}

            {/* Success Alert */}
            {resetSent && (
              <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-2xl flex items-center gap-3 animate-slide-up">
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                <p className="text-sm text-success font-medium">Password reset email sent! Check your inbox.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-sm font-semibold text-text-main ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-bg-elevated border border-border-main rounded-2xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    placeholder="you@example.com"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" title="Password" className="text-sm font-semibold text-text-main ml-1">Password</label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-sm text-primary hover:text-primary-dark font-medium disabled:opacity-50 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 bg-bg-elevated border border-border-main rounded-2xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    placeholder="Enter your password"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-primary text-white py-3.5 rounded-2xl font-bold hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-main"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-bg-card text-sm text-text-muted">Or continue with</span>
              </div>
            </div>

            {/* Social Login */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-bg-elevated border border-border-main rounded-2xl font-semibold text-text-main hover:bg-bg-elevated/80 hover:border-primary/30 transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            {/* Register Link */}
            <p className="mt-8 text-center text-sm text-text-muted">
              Don't have an account?{" "}
              <Link to={shopId ? `/register?shopId=${shopId}` : "/register"} className="text-primary font-bold hover:text-primary-dark transition-colors">
                Register now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
