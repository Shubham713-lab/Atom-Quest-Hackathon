import { useState, useContext } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  Target, LogOut, Menu, X, Users, Shield, Activity, 
  FileText, LayoutDashboard, PlusCircle, CheckSquare, PieChart 
} from 'lucide-react';
import NotificationBell from '../common/NotificationBell';

const ROLE_BADGE_COLORS = {
  ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
  MANAGER: 'bg-blue-100 text-blue-800 border-blue-200',
  EMPLOYEE: 'bg-green-100 text-green-800 border-green-200',
};

const SidebarLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  // Define navigation config based on role
  const getNavLinks = () => {
    if (!user) return [];
    
    switch (user.role) {
      case 'ADMIN':
        return [
          { name: 'Analytics & Insights', path: '/admin/analytics', icon: PieChart },
          { name: 'Users & Cycles', path: '/admin/users', icon: Users },
          { name: 'Goal Governance', path: '/admin/governance', icon: Shield },
          { name: 'Completion Tracker', path: '/admin/completion', icon: Activity },
          { name: 'Escalation Engine', path: '/admin/escalations', icon: Shield },
          { name: 'Audit Trail', path: '/admin/audit', icon: FileText },
          { name: 'Push Shared KPI', path: '/goals/shared/create', icon: Target },
        ];
      case 'MANAGER':
        return [
          { name: 'Team Dashboard', path: '/manager/team', icon: LayoutDashboard },
          { name: 'Push Shared KPI', path: '/goals/shared/create', icon: Target },
        ];
      case 'EMPLOYEE':
        return [
          { name: 'My Goals', path: '/employee/goals', icon: Target },
          { name: 'Create Goal', path: '/goals/create', icon: PlusCircle },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-600 rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">GoalPortal</span>
          </div>
          {/* Mobile close button */}
          <button onClick={closeSidebar} className="ml-auto lg:hidden text-gray-500 hover:bg-gray-100 p-1 rounded-md">
            <X size={20} />
          </button>
        </div>

        {/* User Profile Summary */}
        {user && (
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white text-base font-bold shadow-sm">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                <span className={`inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${ROLE_BADGE_COLORS[user.role] || 'bg-gray-100'}`}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={closeSidebar}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-primary-50 text-primary-700 shadow-sm border border-primary-100/50 relative overflow-hidden' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-600 rounded-r-full" />}
                    <Icon size={18} className={isActive ? 'text-primary-600' : 'text-gray-400'} />
                    {link.name}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 relative">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="p-1.5 bg-primary-600 rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">GoalPortal</span>
          </div>
          
          {/* Desktop Left (Empty for now) */}
          <div className="hidden lg:block"></div>

          <div className="flex items-center gap-3 ml-auto">
            <NotificationBell />
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md"
            >
              <Menu size={24} />
            </button>
          </div>
        </header>

        {/* Scrollable Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout;
