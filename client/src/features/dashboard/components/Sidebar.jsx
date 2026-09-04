import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Settings, 
  BarChart, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  HelpCircle, 
  GitBranch,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  UserCheck,
  FileText
} from 'lucide-react';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useDataStore } from '../../../store/useDataStore';

const Sidebar = ({ isAdmin, currentView, onNavigate, onLogout }) => {
  const { user, logout } = useAuthStore();
  const setIsTourOpen = useDataStore((state) => state.setIsTourOpen);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar_collapsed', String(nextState));
  };

  const isDashboardActive = currentView === 'dashboard' && !isAdmin;
  const isAdminActive = currentView === 'dashboard' && isAdmin;
  const isSettingsActive = currentView === 'settings';

  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(
    (currentView === 'dashboard' && isAdmin) || currentView === 'user-management' || currentView === 'reports' || currentView === 'template-dashboard'
  );

  const handleDashboardClick = () => {
    onNavigate('dashboard', false);
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
      useDataStore.getState().resetData();
    }
  };

  return (
    <aside 
      className={`relative bg-bg-card backdrop-blur-[40px] border-r border-glass-border flex flex-col p-4 h-screen sticky top-0 z-[100] transition-[width] duration-300 ease-in-out will-change-[width] select-none ${
        isCollapsed ? 'w-[72px]' : 'w-[250px]'
      }`}
    >
      {/* Floating Vertical Center Collapse/Expand Edge Button */}
      <button
        onClick={toggleCollapse}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        className="absolute top-1/2 -right-3.5 -translate-y-1/2 w-7 h-7 rounded-full bg-bg-card border border-glass-border shadow-xl text-text-muted hover:text-white hover:bg-primary hover:border-primary/50 transition-all duration-200 cursor-pointer flex items-center justify-center z-[110] group hover:scale-110 active:scale-95"
      >
        {isCollapsed ? (
          <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        ) : (
          <ChevronLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
        )}
      </button>

      {/* Header: Brand Logo & Top Toggle Button */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-8 px-1 h-10`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 hover:scale-105 transition-transform">
            <BarChart size={22} className="text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-extrabold tracking-tight text-white whitespace-nowrap animate-fade-in">
              Genie<span className="text-accent">AI</span>
            </span>
          )}
        </div>

        {/* Top Header Collapse Toggle Button */}
        {!isCollapsed && (
          <button
            onClick={toggleCollapse}
            title="Collapse Sidebar"
            aria-label="Collapse Sidebar"
            className="p-2 rounded-xl text-text-muted hover:text-white hover:bg-white/10 transition-all duration-200 cursor-pointer"
          >
            <PanelLeftClose size={20} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden no-scrollbar" id="sidebar-menu">
        {/* Main Menu */}
        <div>
          {!isCollapsed ? (
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-text-muted mb-2.5 pl-3">
              Main Menu
            </p>
          ) : (
            <div className="w-8 h-px bg-glass-border/60 mx-auto my-3" />
          )}

          {/* Dashboard Button with Floating Tooltip */}
          <div className="relative group/tooltip">
            <button 
              className={`flex items-center ${
                isCollapsed 
                  ? 'w-11 h-11 mx-auto justify-center' 
                  : 'w-full gap-3.5 p-2.5 text-left'
              } rounded-xl text-sm font-medium transition-all duration-200 mb-2 group cursor-pointer ${
                isDashboardActive 
                  ? 'bg-primary/20 text-white border border-primary/40 shadow-lg shadow-primary/10' 
                  : 'text-text-muted hover:bg-white/10 hover:text-white'
              }`} 
              onClick={handleDashboardClick}
            >
              <LayoutDashboard size={20} className={isDashboardActive ? 'text-primary shrink-0' : 'group-hover:scale-110 transition-transform shrink-0'} />
              {!isCollapsed && <span className="truncate">Dashboard</span>}
            </button>
            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-bg-card/95 backdrop-blur-xl border border-glass-border rounded-xl text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-x-1 pointer-events-none transition-all duration-200 shadow-2xl z-[150] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Dashboard</span>
              </div>
            )}
          </div>
          
          {user?.user_type?.trim() === 'ADMIN' && (
            <div className="relative">
              {/* Admin Menu Main Header */}
              <div className="relative group/tooltip">
                <button 
                  id="sidebar-admin-menu"
                  className={`flex items-center ${
                    isCollapsed 
                      ? 'w-11 h-11 mx-auto justify-center' 
                      : 'w-full justify-between p-2.5 text-left'
                  } rounded-xl text-sm font-medium transition-all duration-200 mb-1 group cursor-pointer ${
                    (isAdminActive || currentView === 'user-management' || currentView === 'reports' || currentView === 'template-dashboard')
                      ? 'bg-primary/15 text-white border border-primary/30' 
                      : 'text-text-muted hover:bg-white/10 hover:text-white'
                  }`} 
                  onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3.5'}`}>
                    <Users size={20} className={(isAdminActive || currentView === 'user-management') ? 'text-primary shrink-0' : 'group-hover:scale-110 transition-transform shrink-0'} />
                    {!isCollapsed && <span className="truncate">Admin Overview</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown 
                      size={16} 
                      className={`text-text-muted transition-transform duration-300 ${isAdminDropdownOpen ? 'rotate-180' : ''}`} 
                    />
                  )}
                </button>
                {isCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-bg-card/95 backdrop-blur-xl border border-glass-border rounded-xl text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-x-1 pointer-events-none transition-all duration-200 shadow-2xl z-[150] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Admin Controls</span>
                  </div>
                )}
              </div>

              {/* Collapsed Mode Sub-Component Icons with Tooltips */}
              {isCollapsed ? (
                <div className="flex flex-col items-center space-y-1.5 mt-2 pt-2 border-t border-glass-border/40">
                  <div className="relative group/tooltip">
                    <button
                      onClick={() => onNavigate('dashboard', true)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer ${
                        (currentView === 'dashboard' && isAdmin)
                          ? 'bg-primary/30 text-white border border-primary/50 shadow-md scale-105'
                          : 'text-text-muted hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <PieChart size={18} />
                    </button>
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-bg-card/95 backdrop-blur-xl border border-glass-border rounded-xl text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-x-1 pointer-events-none transition-all duration-200 shadow-2xl z-[150] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>Overview</span>
                    </div>
                  </div>

                  <div className="relative group/tooltip">
                    <button
                      onClick={() => onNavigate('user-management', true)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer ${
                        currentView === 'user-management'
                          ? 'bg-primary/30 text-white border border-primary/50 shadow-md scale-105'
                          : 'text-text-muted hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <UserCheck size={18} />
                    </button>
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-bg-card/95 backdrop-blur-xl border border-glass-border rounded-xl text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-x-1 pointer-events-none transition-all duration-200 shadow-2xl z-[150] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>User Management</span>
                    </div>
                  </div>

                  <div className="relative group/tooltip">
                    <button
                      onClick={() => onNavigate('reports', true)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer ${
                        currentView === 'reports'
                          ? 'bg-primary/30 text-white border border-primary/50 shadow-md scale-105'
                          : 'text-text-muted hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <FileText size={18} />
                    </button>
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-bg-card/95 backdrop-blur-xl border border-glass-border rounded-xl text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-x-1 pointer-events-none transition-all duration-200 shadow-2xl z-[150] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>Reports</span>
                    </div>
                  </div>

                  <div className="relative group/tooltip">
                    <button
                      onClick={() => onNavigate('template-dashboard', true)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer ${
                        currentView === 'template-dashboard'
                          ? 'bg-primary/30 text-white border border-primary/50 shadow-md scale-105'
                          : 'text-text-muted hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <GitBranch size={18} />
                    </button>
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-bg-card/95 backdrop-blur-xl border border-glass-border rounded-xl text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-x-1 pointer-events-none transition-all duration-200 shadow-2xl z-[150] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>Template Dashboard</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Expanded Mode Sub-Components with Icons */
                isAdminDropdownOpen && (
                  <div className="pl-6 space-y-1 my-1.5 animate-fade-in">
                    <button
                      id="sidebar-admin-overview"
                      onClick={() => onNavigate('dashboard', true)}
                      className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 text-left cursor-pointer ${
                        (currentView === 'dashboard' && isAdmin)
                          ? 'bg-primary/20 text-white font-black border border-primary/30'
                          : 'text-text-muted hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <PieChart size={15} className={(currentView === 'dashboard' && isAdmin) ? 'text-primary' : 'text-text-muted'} />
                      <span>Overview</span>
                    </button>
                    <button
                      id="sidebar-user-management"
                      onClick={() => onNavigate('user-management', true)}
                      className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 text-left cursor-pointer ${
                        currentView === 'user-management'
                          ? 'bg-primary/20 text-white font-black border border-primary/30'
                          : 'text-text-muted hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <UserCheck size={15} className={currentView === 'user-management' ? 'text-primary' : 'text-text-muted'} />
                      <span>User Management</span>
                    </button>
                    <button
                      id="sidebar-reports"
                      onClick={() => onNavigate('reports', true)}
                      className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 text-left cursor-pointer ${
                        currentView === 'reports'
                          ? 'bg-primary/20 text-white font-black border border-primary/30'
                          : 'text-text-muted hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <FileText size={15} className={currentView === 'reports' ? 'text-primary' : 'text-text-muted'} />
                      <span>Reports</span>
                    </button>
                    <button
                      id="sidebar-template-dashboard"
                      onClick={() => onNavigate('template-dashboard', true)}
                      className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 text-left cursor-pointer ${
                        currentView === 'template-dashboard'
                          ? 'bg-primary/20 text-white font-black border border-primary/30'
                          : 'text-text-muted hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <GitBranch size={15} className={currentView === 'template-dashboard' ? 'text-primary' : 'text-text-muted'} />
                      <span>Template Dashboard</span>
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Preferences Section */}
        <div>
          {!isCollapsed ? (
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-text-muted mb-2.5 pl-3">
              Preferences
            </p>
          ) : (
            <div className="w-8 h-px bg-glass-border/60 mx-auto my-3" />
          )}

          {/* Settings Button with Tooltip */}
          <div className="relative group/tooltip">
            <button 
              id="sidebar-settings"
              className={`flex items-center ${
                isCollapsed 
                  ? 'w-11 h-11 mx-auto justify-center' 
                  : 'w-full gap-3.5 p-2.5 text-left'
              } rounded-xl text-sm font-medium transition-all duration-200 mb-2 group cursor-pointer ${
                isSettingsActive 
                  ? 'bg-primary/20 text-white border border-primary/40 shadow-lg shadow-primary/10' 
                  : 'text-text-muted hover:bg-white/10 hover:text-white'
              }`}
              onClick={() => onNavigate('settings', false)}
            >
              <Settings size={20} className={isSettingsActive ? 'text-primary shrink-0' : 'group-hover:scale-110 transition-transform shrink-0'} />
              {!isCollapsed && <span className="truncate">Settings</span>}
            </button>
            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-bg-card/95 backdrop-blur-xl border border-glass-border rounded-xl text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-x-1 pointer-events-none transition-all duration-200 shadow-2xl z-[150] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Settings</span>
              </div>
            )}
          </div>

          {/* Help Tour Button with Tooltip */}
          <div className="relative group/tooltip">
            <button 
              className={`flex items-center ${
                isCollapsed 
                  ? 'w-11 h-11 mx-auto justify-center' 
                  : 'w-full gap-3.5 p-2.5 text-left'
              } rounded-xl text-sm font-medium text-text-muted hover:bg-white/10 hover:text-white transition-all duration-200 mb-2 group cursor-pointer`}
              onClick={() => setIsTourOpen(true)}
            >
              <HelpCircle size={20} className="group-hover:scale-110 transition-transform shrink-0" />
              {!isCollapsed && <span className="truncate">Help Tour</span>}
            </button>
            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-bg-card/95 backdrop-blur-xl border border-glass-border rounded-xl text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-x-1 pointer-events-none transition-all duration-200 shadow-2xl z-[150] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Help Tour</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* User Profile & Sign Out Footer */}
      <div className="mt-auto pt-6 border-t border-glass-border">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 p-2.5 bg-white/5 border border-glass-border rounded-xl mb-3">
            <img 
              src={user?.image || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=6366f1&color=fff`} 
              alt="User" 
              className="w-9 h-9 rounded-lg object-cover border-2 border-glass-border shrink-0" 
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-text-muted truncate">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
        ) : (
          <div className="relative group/tooltip flex justify-center mb-3">
            <img 
              src={user?.image || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=6366f1&color=fff`} 
              alt="User" 
              className="w-9 h-9 rounded-lg object-cover border-2 border-glass-border cursor-pointer hover:scale-105 transition-transform" 
            />
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-bg-card/95 backdrop-blur-xl border border-glass-border rounded-xl text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-x-1 pointer-events-none transition-all duration-200 shadow-2xl z-[150] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{user?.name || 'User'} ({user?.email || ''})</span>
            </div>
          </div>
        )}

        <div className="relative group/tooltip">
          <button 
            className={`flex items-center justify-center ${
              isCollapsed ? 'w-11 h-11 mx-auto' : 'w-full gap-3 p-2.5'
            } bg-danger/10 border border-danger/20 rounded-xl text-danger font-bold text-sm hover:bg-danger hover:text-white transition-all duration-200 shadow-lg shadow-danger/10 hover:shadow-danger/30 cursor-pointer`} 
            onClick={handleLogoutClick}
          >
            <LogOut size={18} className="shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
          {isCollapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-bg-card/95 backdrop-blur-xl border border-glass-border rounded-xl text-xs font-bold text-danger whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-x-1 pointer-events-none transition-all duration-200 shadow-2xl z-[150] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-danger" />
              <span>Sign Out</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
