import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { Zap, Users, Package, QrCode, ArrowRight, CheckCircle2, Clock, Shield, Sparkles, Trophy, X, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/SupabaseAuthContext";

export default function Landing() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const racquetId = searchParams.get('r') || window.location.pathname.split('/r/')[1];
  
  // Removed auto-redirect to prevent infinite loops during auth initialization
  
  console.log('Landing - racquetId:', racquetId, 'path:', window.location.pathname);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [racquet, setRacquet] = useState<any>(null);

  useEffect(() => {
    if (!racquetId) return;
    
    const fetchRacquet = async () => {
      try {
        const { data, error } = await supabase
          .from('racquets')
          .select('*, customers(*)')
          .eq('id', racquetId)
          .single();
        
        if (error || !data) {
          setError("Racquet not found");
        } else {
          setRacquet(data);
        }
      } catch (e) {
        setError("Error loading racquet");
      } finally {
        setLoading(false);
      }
    };
    
    fetchRacquet();
  }, [racquetId]);

  // Show racquet details if loaded
  if (racquetId && (loading || racquet || error)) {
    return (
      <div className="min-h-screen bg-bg-main p-4">
        <div className="max-w-md mx-auto bg-bg-card rounded-3xl border border-border-main p-6 shadow-2xl">
          <button 
            onClick={() => window.location.href = '/'}
            className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600"
          >
            <X className="w-5 h-5" />
          </button>
          
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          
          {error && (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
              <Link to="/" className="text-primary hover:underline mt-4 block">Go to Stringers Friend</Link>
            </div>
          )}
          
          {racquet && (
            <div>
              <h1 className="text-2xl font-bold text-primary mb-1">{racquet.brand} {racquet.model}</h1>
              <p className="text-neutral-500 mb-6">S/N: {racquet.serial_number || 'N/A'}</p>
              
              <div className="space-y-4">
                <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-xl">
                  <p className="text-xs text-neutral-400 uppercase">Current Strings</p>
                  <p className="font-medium">{racquet.current_string_main || 'Not set'}</p>
                  {racquet.current_string_cross && <p className="text-sm text-neutral-600">{racquet.current_string_cross}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-xl">
                    <p className="text-xs text-neutral-400 uppercase">Mains Tension</p>
                    <p className="font-medium">{racquet.current_tension_main || '?'} lbs</p>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-xl">
                    <p className="text-xs text-neutral-400 uppercase">Cross Tension</p>
                    <p className="font-medium">{racquet.current_tension_cross || '?'} lbs</p>
                  </div>
                </div>
                
                {racquet.head_size && (
                  <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-xl">
                    <p className="text-xs text-neutral-400 uppercase">Head Size</p>
                    <p className="font-medium">{racquet.head_size} sq in</p>
                  </div>
                )}
                
                {racquet.string_pattern_mains && (
                  <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-xl">
                    <p className="text-xs text-neutral-400 uppercase">String Pattern</p>
                    <p className="font-medium">{racquet.string_pattern_mains}x{racquet.string_pattern_crosses}</p>
                  </div>
                )}
              </div>
              
              <Link 
                to={`/scan/${racquet.id}`}
                className="mt-6 block w-full text-center bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary/90"
              >
                View Full Details
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Users,
      title: "Customer Management",
      description: "Keep track of all your customers, their racquets, and stringing preferences in one organized place.",
      color: "from-emerald-500 to-teal-500"
    },
    {
      icon: Package,
      title: "Inventory Tracking",
      description: "Monitor your string inventory, get low-stock alerts, and track usage patterns to never run out.",
      color: "from-amber-500 to-orange-500"
    },
    {
      icon: QrCode,
      title: "QR Code System",
      description: "Generate QR codes for racquets. Customers scan to view stringing history and specs instantly.",
      color: "from-violet-500 to-purple-500"
    },
    {
      icon: Clock,
      title: "Job Status Tracking",
      description: "Real-time job status updates keep both stringers and customers informed at every step.",
      color: "from-cyan-500 to-blue-500"
    }
  ];

  const stats = [
    { value: "10K+", label: "Racquets Strung" },
    { value: "2K+", label: "Happy Customers" },
    { value: "500+", label: "Stringers" },
    { value: "99.9%", label: "Uptime" }
  ];

  const testimonials = [
    {
      quote: "Stringer's Friend transformed how I manage my stringing business. The QR system is a game-changer for my regulars!",
      author: "Mike Thompson",
      role: "Pro Stringer, Chicago",
      avatar: "MT"
    },
    {
      quote: "Finally, a simple way to track my racquets and know exactly when they need restringing. Love the notifications!",
      author: "Sarah Chen",
      role: "Tennis Enthusiast",
      avatar: "SC"
    }
  ];

  return (
    <div className="min-h-screen bg-bg-main transition-colors duration-300 overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-mesh"></div>
        <div className={`absolute top-0 -left-40 w-96 h-96 rounded-full blur-3xl ${darkMode ? 'bg-primary/10' : 'bg-primary/20'} animate-float`}></div>
        <div className={`absolute bottom-0 -right-40 w-96 h-96 rounded-full blur-3xl ${darkMode ? 'bg-secondary/10' : 'bg-secondary/20'} animate-float`} style={{ animationDelay: '1s' }}></div>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl ${darkMode ? 'bg-accent/5' : 'bg-accent/10'} animate-pulse-glow`}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Stringer's Friend" className="h-10 w-10 object-contain" />
              <span className="text-xl font-black text-text-main tracking-tight">Stringer's Friend</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-text-muted hover:text-text-main transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-text-muted hover:text-text-main transition-colors">How It Works</a>
              <a href="#testimonials" className="text-sm font-medium text-text-muted hover:text-text-main transition-colors">Reviews</a>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-text-main hover:text-primary transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 bg-gradient-primary text-white text-sm font-bold rounded-full hover:shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 lg:pt-32 lg:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="text-center lg:text-left stagger-children">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-semibold mb-6 animate-slide-up">
                <Sparkles className="w-4 h-4" />
                <span>Trusted by Pro Stringers</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-text-main leading-tight tracking-tight mb-6 animate-slide-up">
                Stringing Made{' '}
                <span className="gradient-text">Simple</span>
                <br />& Delightful
              </h1>
              
              <p className="text-lg sm:text-xl text-text-muted mb-8 max-w-lg mx-auto lg:mx-0 animate-slide-up">
                The complete racquet stringing management system. Track jobs, manage inventory, and keep customers happy—all in one beautiful app.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12 animate-slide-up">
                <Link
                  to="/register"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-primary text-white font-bold rounded-full hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-1 active:translate-y-0"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-text-muted animate-slide-up">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span>No credit card required</span>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative animate-fade-in">
              <div className="relative z-10">
                <div className="bg-bg-card rounded-3xl p-6 shadow-2xl border border-border-main">
                  {/* Mock Dashboard Preview */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 rounded-full bg-error"></div>
                    <div className="w-3 h-3 rounded-full bg-warning"></div>
                    <div className="w-3 h-3 rounded-full bg-success"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                          <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-text-main">Active Jobs</p>
                          <p className="text-sm text-text-muted">5 pending</p>
                        </div>
                      </div>
                      <span className="text-3xl font-black text-primary">12</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-bg-elevated rounded-xl">
                        <p className="text-xs text-text-muted mb-1">This Week</p>
                        <p className="text-2xl font-bold text-text-main">28</p>
                        <p className="text-xs text-success">+15%</p>
                      </div>
                      <div className="p-4 bg-bg-elevated rounded-xl">
                        <p className="text-xs text-text-muted mb-1">Revenue</p>
                        <p className="text-2xl font-bold text-text-main">$840</p>
                        <p className="text-xs text-success">+22%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-secondary/20 rounded-full blur-xl -z-10"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/20 rounded-full blur-xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-border-main bg-bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl sm:text-4xl font-black text-primary mb-1">{stat.value}</p>
                <p className="text-sm text-text-muted font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-text-main tracking-tight mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-text-muted">
              Powerful features designed specifically for racquet stringing professionals
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-bg-card rounded-2xl p-6 border border-border-main hover:border-primary/30 transition-all duration-300 card-hover animate-slide-up"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4 shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-text-main mb-2">{feature.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{feature.description}</p>
                
                {/* Hover glow effect */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 -z-10`}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 lg:py-32 bg-bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-text-main tracking-tight mb-4">
              How It Works
            </h2>
            <p className="text-lg text-text-muted">
              Get started in minutes, not hours
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create Your Shop", description: "Sign up and set up your stringing shop profile in under 2 minutes." },
              { step: "02", title: "Add Customers", description: "Import or add customers with their racquet details and stringing preferences." },
              { step: "03", title: "Manage Jobs", description: "Create jobs, track status, and notify customers when their racquet is ready." }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-bg-card rounded-2xl p-8 border border-border-main h-full">
                  <div className="text-6xl font-black text-primary/10 mb-4">{item.step}</div>
                  <h3 className="text-xl font-bold text-text-main mb-2">{item.title}</h3>
                  <p className="text-text-muted">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-border-accent" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-text-main tracking-tight mb-4">
              Loved by Stringers
            </h2>
            <p className="text-lg text-text-muted">
              Join thousands of happy stringers and tennis enthusiasts
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-bg-card rounded-2xl p-8 border border-border-main relative">
                <div className="text-5xl text-primary/20 absolute top-4 right-6">"</div>
                <p className="text-text-main text-lg leading-relaxed mb-6 relative z-10">{testimonial.quote}</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-text-main">{testimonial.author}</p>
                    <p className="text-sm text-text-muted">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-primary rounded-3xl p-12 lg:p-16 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-white text-sm font-semibold mb-6">
                <Zap className="w-4 h-4" />
                <span>Start your free trial today</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
                Ready to Level Up?
              </h2>
              <p className="text-lg text-white/80 mb-8">
                Join hundreds of professional stringers who trust Stringer's Friend to manage their business.
              </p>
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2 px-10 py-4 bg-white text-primary font-bold rounded-full hover:shadow-xl transition-all hover:-translate-y-1 active:translate-y-0"
              >
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex items-center justify-center gap-6 mt-6 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Secure & Private</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Cancel Anytime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-main py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Stringer's Friend" className="h-8 w-8 object-contain" />
              <span className="text-lg font-bold text-text-main">Stringer's Friend</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-text-muted">
              <a href="#" className="hover:text-text-main transition-colors">Privacy</a>
              <a href="#" className="hover:text-text-main transition-colors">Terms</a>
              <a href="#" className="hover:text-text-main transition-colors">Contact</a>
            </div>
            <p className="text-sm text-text-muted">
              Made with ♥ for tennis stringers
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
