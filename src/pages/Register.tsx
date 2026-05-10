import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/SupabaseAuthContext";
import { supabase } from "../lib/supabase";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, AlertCircle, User, Briefcase, Users } from "lucide-react";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"stringer" | "customer">("stringer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shopId = searchParams.get("shopId");
  const { signUp } = useAuth();

  useEffect(() => {
    if (shopId) {
      setRole("customer");
    }
  }, [shopId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const { data, error: signUpError } = await signUp(email, password, { role });
      
      if (signUpError) {
        throw signUpError;
      }

      const userId = data?.user?.id;
      
      if (!userId) {
        throw new Error("Failed to create user account");
      }

      if (role === "customer") {
        const nameParts = email.split('@')[0].split(/[._-]/);
        const firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
        const lastName = nameParts.length > 1 ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : '';

        if (shopId) {
          // 1. Create a customer entry for this specific shop
          const { error: insertError } = await supabase
            .from('customers')
            .insert({
              shop_id: shopId,
              profile_id: userId,
              first_name: firstName,
              last_name: lastName,
              email: email,
              phone: ""
            });

          if (insertError) {
            console.error("Error creating customer record:", insertError);
          }
        }

        // 2. Link ANY existing customer records (from other shops) that match this email
        await supabase
          .from('customers')
          .update({ profile_id: userId })
          .eq('email', email)
          .is('profile_id', null);
        
        navigate("/dashboard");
      } else if (role === "stringer") {
        console.log("Stringer registered, redirecting to shop setup");
        navigate("/setup");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account");
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
            <h1 className="text-2xl font-black text-text-main text-center tracking-tight">Create Account</h1>
            <p className="text-text-muted text-center mt-1">Join Stringer's Friend today</p>
          </div>

          <div className="p-8">
            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-3 animate-slide-up">
                <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
                <p className="text-sm text-error font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Account Type Selector */}
              {!shopId && (
                <div className="space-y-3">
                  <label htmlFor="role-selection" className="text-sm font-semibold text-text-main ml-1">I am a...</label>
                  <div id="role-selection" className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      id="role-stringer"
                      onClick={() => setRole("stringer")}
                      disabled={loading}
                      className={`relative p-4 rounded-2xl border-2 transition-all ${
                        role === "stringer"
                          ? "bg-primary/5 border-primary text-primary"
                          : "bg-bg-elevated border-border-main text-text-muted hover:border-primary/30"
                      }`}
                    >
                      <Briefcase className="w-6 h-6 mx-auto mb-2" />
                      <span className="block text-sm font-bold">Stringer</span>
                      <span className="block text-xs mt-1 opacity-70">Run a stringing business</span>
                      {role === "stringer" && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      id="role-customer"
                      onClick={() => setRole("customer")}
                      disabled={loading}
                      className={`relative p-4 rounded-2xl border-2 transition-all ${
                        role === "customer"
                          ? "bg-secondary/5 border-secondary text-secondary"
                          : "bg-bg-elevated border-border-main text-text-muted hover:border-secondary/30"
                      }`}
                    >
                      <Users className="w-6 h-6 mx-auto mb-2" />
                      <span className="block text-sm font-bold">Customer</span>
                      <span className="block text-xs mt-1 opacity-70">Get my racquets strung</span>
                      {role === "customer" && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="register-email" className="text-sm font-semibold text-text-main ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    id="register-email"
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
                <label htmlFor="register-password" title="Password" className="text-sm font-semibold text-text-main ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 bg-bg-elevated border border-border-main rounded-2xl text-text-main placeholder:text-text-muted/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    placeholder="Create a strong password"
                    disabled={loading}
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-text-muted ml-1">Must be at least 6 characters</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-primary text-white py-3.5 rounded-2xl font-bold hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>Create Account</>
                )}
              </button>
            </form>

            {/* Terms */}
            <p className="mt-6 text-center text-xs text-text-muted">
              By creating an account, you agree to our{" "}
              <a href="#" className="text-primary hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </p>

            {/* Sign In Link */}
            <p className="mt-6 text-center text-sm text-text-muted">
              Already have an account?{" "}
              <Link to={shopId ? `/login?shopId=${shopId}` : "/login"} className="text-primary font-bold hover:text-primary-dark transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
