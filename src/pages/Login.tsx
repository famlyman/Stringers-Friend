import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/SupabaseAuthContext";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      // Check if customer record exists for this shop
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
        // Create a new customer record for this shop
        const { error: insertError } = await supabase
          .from('customers')
          .insert({
            shop_id: shopId,
            user_id: userId,
            name: userName || userEmail.split('@')[0],
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

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await ensureCustomerRecord(user.id, user.email || email, user.user_metadata?.name || '');
      }
      
      navigate("/");
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

      // Note: After OAuth redirect, the customer record creation will be handled
      // in the AuthContext or a callback page
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
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg shadow-primary/20 rotate-3">
            <span className="text-2xl font-bold text-secondary">SF</span>
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Welcome Back</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">Sign in to manage your racquet shop</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        {resetSent && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400 text-sm rounded-xl">
            Password reset email sent! Check your inbox.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              placeholder="••••••••"
              disabled={loading}
            />
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-3 px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
            Google
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Don't have an account?{" "}
          <Link to={shopId ? `/register?shopId=${shopId}` : "/register"} className="text-primary font-bold hover:underline">
            Register now
          </Link>
        </p>
      </div>
    </div>
  );
}
