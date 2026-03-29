import { ReactNode } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Package, LogOut, User, Sun, Moon, MessageSquare, Clock } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface LayoutProps {
  user: any;
  onLogout: () => void;
}

export default function Layout({ user, onLogout }: LayoutProps) {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();

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
          <Link to="/messages" className="flex flex-col md:flex-row items-center px-4 py-2 text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors group shrink-0">
            <MessageSquare className="w-5 h-5 md:w-4 md:h-4 md:mr-3 group-hover:text-primary" />
            <span className="mt-1 md:mt-0">Messages</span>
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
          <Link to="/" className="flex flex-col md:flex-row items-center px-4 py-2 text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors group shrink-0">
            <Clock className="w-5 h-5 md:w-4 md:h-4 md:mr-3 group-hover:text-primary" />
            <span className="mt-1 md:mt-0">My Jobs</span>
          </Link>
          <Link to="/racquets" className="flex flex-col md:flex-row items-center px-4 py-2 text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors group shrink-0">
            <Package className="w-5 h-5 md:w-4 md:h-4 md:mr-3 group-hover:text-primary" />
            <span className="mt-1 md:mt-0">My Bag</span>
          </Link>
          <Link to="/messages" className="flex flex-col md:flex-row items-center px-4 py-2 text-xs md:text-sm font-medium text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-primary/10 hover:text-primary dark:hover:text-primary transition-colors group shrink-0">
            <MessageSquare className="w-5 h-5 md:w-4 md:h-4 md:mr-3 group-hover:text-primary" />
            <span className="mt-1 md:mt-0">Messages</span>
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
    <div className={`min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col md:flex-row font-sans transition-colors duration-200`}>
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex-col shadow-sm">
        <div className="p-6 bg-primary">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">StringerPro</h1>
              <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-1">Shop Management</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
              {user.email ? user.email[0].toUpperCase() : "?"}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{user.email || "No Email"}</p>
              <p className="text-xs text-primary font-semibold capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-2 py-2 flex overflow-x-auto no-scrollbar items-center z-50 scroll-smooth">
        <div className="flex flex-nowrap items-center space-x-1 min-w-max px-2">
          <NavLinks />
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
