import { Link, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Key, 
  FileText, 
  Shield, 
  BarChart, 
  UserCog,
  LogOut,
  Menu,
  X,
  Settings,
  Bell,
  Activity,
} from 'lucide-react';
import { useState } from 'react';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Matches', href: '/admin/matches', icon: Calendar },
    { name: 'Registrations', href: '/admin/registrations', icon: FileText },
    { name: 'Players', href: '/admin/players', icon: Users },
    { name: 'Teams', href: '/admin/teams', icon: Users },
    { name: 'Room Credentials', href: '/admin/credentials', icon: Key },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart },
    { name: 'Notifications', href: '/admin/notifications', icon: Bell },
    { name: 'Security', href: '/admin/security', icon: Shield },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: Activity },
    { name: 'Storage', href: '/admin/storage', icon: Settings },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
    { name: 'Admin Users', href: '/admin/users', icon: UserCog },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-abyss-black flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-abyss-charcoal border-r border-glass-border transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-glass-border">
            <Link to="/admin/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center">
                <Shield className="w-6 h-6 text-abyss-black" />
              </div>
              <span className="font-display font-bold text-xl gradient-text">ADMIN</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-lg text-ghost-gray hover:text-ghost-white 
                  hover:bg-white/5 transition-all duration-200
                  ${isActive ? 'text-neon-violet bg-neon-violet/10 border-l-2 border-neon-violet' : ''}
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* User menu */}
          <div className="p-4 border-t border-glass-border">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center text-abyss-black font-bold">
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ghost-white truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-neon-violet capitalize">{user?.role?.toLowerCase()}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-abyss-charcoal border-b border-glass-border">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-ghost-white" />
            </button>
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center">
                <Shield className="w-5 h-5 text-abyss-black" />
              </div>
              <span className="font-display font-bold text-lg gradient-text">ADMIN</span>
            </Link>
            <div className="w-10" />
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden lg:flex items-center justify-between h-16 px-6 bg-abyss-charcoal/50 backdrop-blur-sm border-b border-glass-border">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-xl font-bold gradient-text">ADMIN PANEL</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-ghost-gray hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 p-4 lg:p-6 pt-20 lg:pt-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-abyss-charcoal border-r border-glass-border">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-glass-border flex items-center justify-between">
                <span className="font-display font-bold text-xl gradient-text">Admin Menu</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-white/5">
                  <X className="w-6 h-6 text-ghost-white" />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-3 rounded-lg text-ghost-gray hover:text-ghost-white 
                      hover:bg-white/5 transition-all duration-200
                      ${isActive ? 'text-neon-violet bg-neon-violet/10 border-l-2 border-neon-violet' : ''}
                    `}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="p-4 border-t border-glass-border">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

