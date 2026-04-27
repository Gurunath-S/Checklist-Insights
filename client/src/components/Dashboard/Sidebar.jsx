import React from 'react';
import { LayoutDashboard, Users, User, LogOut, Settings, BarChart } from 'lucide-react';

const Sidebar = ({ isAdmin, setIsAdmin, user, onLogout }) => {
  return (
    <aside className="w-[width-sidebar] bg-slate-950/70 backdrop-blur-[40px] border-r border-glass-border flex flex-col p-10 h-screen sticky top-0 z-100">
      <div className="flex items-center gap-4 mb-16 px-2">
        <div className="w-10 h-10 bg-linear-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <BarChart size={24} className="text-white" />
        </div>
        <span className="text-2xl font-extrabold tracking-tight text-white">
          Genie<span className="text-accent">AI</span>
        </span>
      </div>

      <nav className="flex-1">
        <div className="mb-10">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-text-muted mb-5 pl-4">
            Main Menu
          </p>
          <button 
            className={`w-full flex items-center gap-4 p-3.5 rounded-2xl text-sm font-medium transition-all duration-300 mb-2 text-left group ${
              !isAdmin ? 'bg-primary/15 text-white border border-primary/30 shadow-lg shadow-primary/10' : 'text-text-muted hover:bg-white/5 hover:text-white hover:translate-x-1'
            }`} 
            onClick={() => setIsAdmin(false)}
          >
            <LayoutDashboard size={20} className={!isAdmin ? 'text-primary' : 'group-hover:scale-110 transition-transform'} />
            <span>Dashboard</span>
          </button>
          <button 
            className={`w-full flex items-center gap-4 p-3.5 rounded-2xl text-sm font-medium transition-all duration-300 mb-2 text-left group ${
              isAdmin ? 'bg-primary/15 text-white border border-primary/30 shadow-lg shadow-primary/10' : 'text-text-muted hover:bg-white/5 hover:text-white hover:translate-x-1'
            }`} 
            onClick={() => setIsAdmin(true)}
          >
            <Users size={20} className={isAdmin ? 'text-primary' : 'group-hover:scale-110 transition-transform'} />
            <span>Admin Overview</span>
          </button>
        </div>

        <div className="mb-10">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-text-muted mb-5 pl-4">
            Analytics
          </p>
          <button className="w-full flex items-center gap-4 p-3.5 rounded-2xl text-sm font-medium text-text-muted hover:bg-white/5 hover:text-white hover:translate-x-1 transition-all duration-300 mb-2 text-left group">
            <BarChart size={20} className="group-hover:scale-110 transition-transform" />
            <span>Reports</span>
          </button>
          <button className="w-full flex items-center gap-4 p-3.5 rounded-2xl text-sm font-medium text-text-muted hover:bg-white/5 hover:text-white hover:translate-x-1 transition-all duration-300 mb-2 text-left group">
            <Settings size={20} className="group-hover:scale-110 transition-transform" />
            <span>Settings</span>
          </button>
        </div>
      </nav>

      <div className="mt-auto pt-8 border-t border-glass-border">
        <div className="flex items-center gap-4 p-4 bg-white/5 border border-glass-border rounded-2xl mb-6">
          <img 
            src={user?.image || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=6366f1&color=fff`} 
            alt="User" 
            className="w-11 h-11 rounded-xl object-cover border-2 border-glass-border" 
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-text-muted truncate">{user?.email || 'user@example.com'}</p>
          </div>
        </div>
        <button 
          className="w-full flex items-center justify-center gap-3 p-3.5 bg-danger/10 border border-danger/20 rounded-2xl text-danger font-bold text-sm hover:bg-danger hover:text-white hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-danger/10 hover:shadow-danger/30" 
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
