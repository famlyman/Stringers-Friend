import { ReactNode, useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Package, LogOut, User, Sun, Moon, MessageSquare, Bell, X, Home, FileText, Settings } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";

interface LayoutProps {
  user: any;
  onLogout: () => void;
}

interface NavItem {
  path: string;
  icon: any;
  label: string;
  badge?: number;
}

function LayoutContent({ user, onLogout }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkPushStatus = async () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        // Show prompt if permission not granted (default or denied)
        const lastPrompt = localStorage.getItem('lastPushPrompt');
        const now = Date.now();
        if (Notification.permission !== 'granted' && (!lastPrompt || now - parseInt(lastPrompt) > 24 * 60 * 60 * 1000)) {
          setShowPushPrompt(true);
        }
      }
    };

    checkPushStatus();
  }, [user]);

  if (!user) return <Outlet />;

  const stringerNavItems: NavItem[] = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/customers", icon: Users, label: "Customers" },
    { path: "/messages", icon: MessageSquare, label: "Messages" },
    { path: "/inventory", icon: Package, label: "Inventory" },
    { path: "/racquet-specs", icon: Settings, label: "Racquet Specs" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  const customerNavItems: NavItem[] = [
    { path: "/dashboard?tab=jobs", icon: FileText, label: "My Jobs" },
    { path: "/dashboard?tab=racquets", icon: Package, label: "My Bag" },
    { path: "/messages", icon: MessageSquare, label: "Messages" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  const navItems = user.role === 'stringer' ? stringerNavItems : customerNavItems;

  const isActive = (path: string) => {
    if (path.includes('?')) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-200">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-72 bg-bg-card border-r border-border-main flex-col shadow-xl fixed h-full z-30">
        {/* Logo & Branding */}
        <div className="p-6 border-b border-border-main">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img src="/logo.png" alt="Stringer's Friend" className="h-12 w-12 object-contain transition-transform group-hover:scale-105" />
            </div>
            <div>
              <h1 className="text-lg font-black text-text-main tracking-tight">Stringer's Friend</h1>
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Shop Portal</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${
                isActive(item.path)
                  ? "bg-gradient-primary text-white shadow-lg shadow-primary/20"
                  : "text-text-muted hover:text-text-main hover:bg-bg-elevated"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive(item.path) ? '' : 'opacity-70 group-hover:opacity-100'}`} />
              <span>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-border-main">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-text-muted hover:text-text-main hover:bg-bg-elevated transition-all mb-2"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* User Info */}
          <div className="flex items-center gap-3 px-4 py-3 bg-bg-elevated rounded-xl mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-sm">
              {user.email ? user.email[0].toUpperCase() : "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-main truncate">{user.full_name || user.email?.split('@')[0] || "User"}</p>
              <p className="text-xs text-primary font-medium capitalize">{user.role}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-error/80 hover:text-error hover:bg-error/10 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-bg-card/80 backdrop-blur-lg border-b border-border-main">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Stringer's Friend" className="h-8 w-8 object-contain" />
            <span className="font-bold text-text-main">SF</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-bg-elevated transition-all"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-error/80 hover:text-error hover:bg-error/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-card/80 backdrop-blur-lg border-t border-border-main px-2 py-2 pb-safe">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[60px] ${
                isActive(item.path)
                  ? "text-primary"
                  : "text-text-muted"
              }`}
            >
              <div className="relative">
                <item.icon className="w-6 h-6" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[8px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 pt-16 md:pt-0 pb-20 md:pb-0 relative min-h-screen">
        {/* Push Notification Prompt */}
        {showPushPrompt && (
          <div className="sticky top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-30 mx-auto md:mx-0">
            <div className="bg-gradient-primary text-white p-4 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-between gap-4 animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Stay Updated</p>
                  <p className="text-xs text-white/80">Enable notifications for alerts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setShowPushPrompt(false);
                    localStorage.setItem('lastPushPrompt', Date.now().toString());
                    
                    // Trigger OneSignal slidedown using v16 API
                    const win = window as any;
                    try {
                      if (win.OneSignalDeferred) {
                        win.OneSignalDeferred.push(async (OneSignal: any) => {
                          // v16 uses OneSignal.Slidedown.promptPush()
                          if (OneSignal.Slidedown && OneSignal.Slidedown.promptPush) {
                            await OneSignal.Slidedown.promptPush();
                          } else if (OneSignal.showSlidedownPermissionPrompt) {
                            // fallback for older SDK
                            await OneSignal.showSlidedownPermissionPrompt();
                          }
                        });
                      } else if (win.OneSignal) {
                        if (win.OneSignal.Slidedown && win.OneSignal.Slidedown.promptPush) {
                          await win.OneSignal.Slidedown.promptPush();
                        }
                      }
                    } catch (e) {
                      console.log('OneSignal prompt error:', e);
                    }
                  }}
                  className="px-4 py-2 bg-white text-primary rounded-xl text-xs font-bold hover:bg-white/90 transition-all whitespace-nowrap"
                >
                  Enable
                </button>
                <button
                  onClick={() => {
                    setShowPushPrompt(false);
                    localStorage.setItem('lastPushPrompt', Date.now().toString());
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function Layout({ user, onLogout }: LayoutProps) {
  return <LayoutContent user={user} onLogout={onLogout} />;
}
