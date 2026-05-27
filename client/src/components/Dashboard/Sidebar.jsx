import React, { useState } from 'react';
import { LayoutDashboard, Users, LogOut, Settings, BarChart, ChevronDown } from 'lucide-react';

const Sidebar = ({ isAdmin, setIsAdmin, currentView, setCurrentView, user, onLogout }) => {
  const isDashboardActive = currentView === 'dashboard' && !isAdmin;
  const isAdminActive = currentView === 'dashboard' && isAdmin;
  const isSettingsActive = currentView === 'settings';

  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(
    (currentView === 'dashboard' && isAdmin) || currentView === 'user-management'
  );

  const handleDashboardClick = () => {
    setCurrentView('dashboard');
    setIsAdmin(false);
  };

  return (
    <aside className="w-[width-sidebar] bg-bg-card backdrop-blur-[40px] border-r border-glass-border flex flex-col p-6 h-screen sticky top-0 z-100 transition-colors duration-500">
      <div className="flex items-center gap-4 mb-10 px-2">
        <div className="w-10 h-10 bg-linear-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-all duration-500">
          <BarChart size={24} className="text-white" />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-white">
          Genie<span className="text-accent">AI</span>
        </span>
      </div>

      <nav className="flex-1">
        <div className="mb-6">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-text-muted mb-3 pl-4">
            Main Menu
          </p>
          <button 
            className={`w-full flex items-center gap-4 p-2.5 rounded-xl text-sm font-medium transition-all duration-300 mb-2 text-left group cursor-pointer ${
              isDashboardActive 
                ? 'bg-primary/15 text-white border border-primary/30 shadow-lg shadow-primary/10' 
                : 'text-text-muted hover:bg-white/5 hover:text-white hover:translate-x-1'
            }`} 
            onClick={handleDashboardClick}
          >
            <LayoutDashboard size={20} className={isDashboardActive ? 'text-primary' : 'group-hover:scale-110 transition-transform'} />
            <span>Dashboard</span>
          </button>
          
          <div className="relative">
            <button 
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-medium transition-all duration-300 mb-1 text-left group cursor-pointer ${
                (isAdminActive || currentView === 'user-management')
                  ? 'bg-primary/10 text-white border border-primary/20' 
                  : 'text-text-muted hover:bg-white/5 hover:text-white'
              }`} 
              onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
            >
              <div className="flex items-center gap-4">
                <Users size={20} className={(isAdminActive || currentView === 'user-management') ? 'text-primary' : 'group-hover:scale-110 transition-transform'} />
                <span>Admin Overview</span>
              </div>
              <ChevronDown 
                size={16} 
                className={`text-text-muted transition-transform duration-300 ${isAdminDropdownOpen ? 'rotate-180' : ''}`} 
              />
            </button>

            {isAdminDropdownOpen && (
              <div className="pl-6 space-y-1 mb-2">
                <button
                  onClick={() => {
                    setCurrentView('dashboard');
                    setIsAdmin(true);
                  }}
                  className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 text-left cursor-pointer ${
                    (currentView === 'dashboard' && isAdmin)
                      ? 'bg-primary/20 text-white font-black'
                      : 'text-text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${currentView === 'dashboard' && isAdmin ? 'bg-primary' : 'bg-transparent border border-text-muted'}`} />
                  <span>Overview</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentView('user-management');
                    setIsAdmin(true);
                  }}
                  className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 text-left cursor-pointer ${
                    currentView === 'user-management'
                      ? 'bg-primary/20 text-white font-black'
                      : 'text-text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${currentView === 'user-management' ? 'bg-primary' : 'bg-transparent border border-text-muted'}`} />
                  <span>User Management</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-text-muted mb-3 pl-4">
            Analytics
          </p>
          <button 
            className={`w-full flex items-center gap-4 p-2.5 rounded-xl text-sm font-medium transition-all duration-300 mb-2 text-left group cursor-pointer ${
              currentView === 'reports' 
                ? 'bg-primary/15 text-white border border-primary/30 shadow-lg shadow-primary/10' 
                : 'text-text-muted hover:bg-white/5 hover:text-white hover:translate-x-1'
            }`}
            onClick={() => setCurrentView('reports')}
          >
            <BarChart size={20} className={currentView === 'reports' ? 'text-primary' : 'group-hover:scale-110 transition-transform'} />
            <span>Reports</span>
          </button>
          <button 
            className={`w-full flex items-center gap-4 p-2.5 rounded-xl text-sm font-medium transition-all duration-300 mb-2 text-left group cursor-pointer ${
              isSettingsActive 
                ? 'bg-primary/15 text-white border border-primary/30 shadow-lg shadow-primary/10' 
                : 'text-text-muted hover:bg-white/5 hover:text-white hover:translate-x-1'
            }`}
            onClick={() => setCurrentView('settings')}
          >
            <Settings size={20} className={isSettingsActive ? 'text-primary' : 'group-hover:scale-110 transition-transform'} />
            <span>Settings</span>
          </button>
        </div>
      </nav>

      <div className="mt-auto pt-8 border-t border-glass-border">
        <div className="flex items-center gap-4 p-3 bg-white/5 border border-glass-border rounded-xl mb-4">
          <img 
            src={user?.image || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=6366f1&color=fff`} 
            alt="User" 
            className="w-9 h-9 rounded-lg object-cover border-2 border-glass-border" 
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-text-muted truncate">{user?.email || 'user@example.com'}</p>
          </div>
        </div>
        <button 
          className="w-full flex items-center justify-center gap-3 p-2.5 bg-danger/10 border border-danger/20 rounded-xl text-danger font-bold text-sm hover:bg-danger hover:text-white hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-danger/10 hover:shadow-danger/30 cursor-pointer" 
          onClick={onLogout}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
