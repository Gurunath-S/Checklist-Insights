import React from 'react';
import { LayoutDashboard, Users, User, LogOut, Settings, BarChart } from 'lucide-react';

const Sidebar = ({ isAdmin, setIsAdmin, user, onLogout }) => {
  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <BarChart size={24} color="var(--accent)" />
        </div>
        <span className="brand-name">Genie<span className="text-accent">AI</span></span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group">
          <p className="nav-label">Main Menu</p>
          <button className="nav-item active">
            <LayoutDashboard size={20} />
            <span>Overview</span>
          </button>
          <button className="nav-item" onClick={() => setIsAdmin(!isAdmin)}>
            {isAdmin ? <User size={20} /> : <Users size={20} />}
            <span>{isAdmin ? 'User View' : 'Admin View'}</span>
          </button>
        </div>

        <div className="nav-group">
          <p className="nav-label">Settings</p>
          <button className="nav-item">
            <Settings size={20} />
            <span>Preferences</span>
          </button>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <img src={user?.image || 'https://via.placeholder.com/40'} alt="User" className="profile-img" />
          <div className="user-info">
            <p className="user-name">{user?.name || 'User'}</p>
            <p className="user-email">{user?.email || ''}</p>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
