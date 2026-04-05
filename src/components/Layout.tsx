import { ReactNode, useState, useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Package, LogOut, User, Sun, Moon, MessageSquare, Clock } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { NotificationProvider, NotificationDropdown, useNotifications } from "../context/NotificationContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

interface LayoutProps {
  user: any;
  onLogout: () => void;
}

function LayoutContent({ user, onLogout }: LayoutProps) {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const { unreadCount } = useNotifications();
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const messagesQuery = user.role === 'stringer'
      ? query(collection(db, "messages"), where("shop_id", "==", user.shop_id), where("read", "==", false))
      : query(collection(db, "messages"), where("customer_email", "==", user.email), where("sender_role", "==", "stringer"), where("read", "==", false));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      if (user.role === 'stringer') {
        // Filter out messages sent by the stringer themselves
        const unread = snapshot.docs.filter(doc => doc.data().sender_role !== 'stringer').length;
        setMessageUnreadCount(unread);
      } else {
        setMessageUnreadCount(snapshot.size);
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return <Outlet />;

  const NavLinks = () => (
    <>
      {user.role === 'stringer' && (
        <>
          <Link to="/" className="flex flex-col md:flex-row items-center px-4 py-2 text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors group shrink-0">
            <LayoutDashboard className="w-5 h-5 md:w-4 md:h-4 md:mr-3 group-hover:text-primary" />
            <span className="mt-1 md:mt-0">Dashboard</span>
          </Link>
          <Link to="/customers" className="flex flex-col md:flex-row items-center px-4 py-2 text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors group shrink-0">
            <Users className="w-5 h-5 md:w-4 md:h-4 md:mr-3 group-hover:text-primary" />
            <span className="mt-1 md:mt-0">Customers</span>
          </Link>
          <Link to="/messages" className="flex flex-col md:flex-row items-center px-4 py-2 text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors group shrink-0 relative">
            <MessageSquare className="w-5 h-5 md:w-4 md:h-4 md:mr-3 group-hover:text-primary" />
            <span className="mt-1 md:mt-0">Messages</span>
            {messageUnreadCount > 0 && (
              <span className="absolute top-2 right-2 md:top-2 md:left-6 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </Link>
          <Link to="/inventory" className="flex flex-col md:flex-row items-center px-4 py-2 text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors group shrink-0">
            <Package className="w-5 h-5 md:w-4 md:h-4 md:mr-3 group-hover:text-primary" />
            <span className="mt-1 md:mt-0">Inventory</span>
          </Link>
          <Link to="/profile" className="flex flex-col md:flex-row items-center px-4 py-2 text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors group shrink-0">
            <User className="w-5 h-5 md:w-4 md:h-4 md:mr-3 group-hover:text-primary" />
            <span className="mt-1 md:mt-0">Profile</span>
          </Link>
        </>
      )}
      {user.role === 'customer' && (
        <>
          <Link to="/?tab=jobs" className="flex flex-col md:flex-row items-center px-4 py-2 text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors group shrink-0">
            <Clock className="w-5 h-5 md:w-4 md:h-4 md:mr-3 group-hover:text-primary" />
            <span className="mt-1 md:mt-0">My Jobs</span>
          </Link>
          <Link to="/?tab=racquets" className="flex flex-col md:flex-row items-center px-4 py-2 text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors group shrink-0">
            <Package className="w-5 h-5 md:w-4 md:h-4 md:mr-3 group-hover:text-primary" />
            <span className="mt-1 md:mt-0">My Bag</span>
          </Link>
          <Link to="/?tab=messages" className="flex flex-col md:flex-row items-center px-4 py-2 text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors group shrink-0 relative">
            <MessageSquare className="w-5 h-5 md:w-4 md:h-4 md:mr-3 group-hover:text-primary" />
            <span className="mt-1 md:mt-0">Messages</span>
            {messageUnreadCount > 0 && (
              <span className="absolute top-2 right-2 md:top-2 md:left-6 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </Link>
          <Link to="/profile" className="flex flex-col md:flex-row items-center px-4 py-2 text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors group shrink-0">
            <User className="w-5 h-5 md:w-4 md:h-4 md:mr-3 group-hover:text-primary" />
            <span className="mt-1 md:mt-0">Profile</span>
          </Link>
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-200">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-bg-card border-r border-border-main flex-col shadow-sm">
        <div className="p-6 bg-primary">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Stringers Friend</h1>
              <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-1">Shop Management</p>
            </div>
            <NotificationDropdown />
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-border-main">
          <div className="flex items-center px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
              {user.email ? user.email[0].toUpperCase() : "?"}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-text-main truncate">{user.email || "No Email"}</p>
              <p className="text-xs text-primary font-semibold capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-card border-t border-border-main px-2 py-2 flex overflow-x-auto no-scrollbar items-center z-50 scroll-smooth">
        <div className="flex flex-nowrap items-center space-x-1 min-w-max px-2">
          <NavLinks />
          <NotificationDropdown />
          <button
            onClick={onLogout}
            className="flex flex-col items-center px-4 py-2 text-xs font-medium text-red-600 shrink-0"
          >
            <LogOut className="w-5 h-5" />
            <span className="mt-1">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function Layout({ user, onLogout }: LayoutProps) {
  return (
    <NotificationProvider>
      <LayoutContent user={user} onLogout={onLogout} />
    </NotificationProvider>
  );
}
