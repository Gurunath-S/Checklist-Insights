import React from 'react';
import { User, Palette, Check, Sparkles, Moon, Sun, Leaf } from 'lucide-react';

const SettingsPage = ({ user, currentTheme, onChangeTheme }) => {
  const themes = [
    {
      id: 'classic',
      name: 'Classic Dark',
      description: 'Default deep slate & glowing indigo',
      icon: <Moon className="text-indigo-400" size={20} />,
      bgClass: 'bg-slate-950 border-slate-800',
      swatches: ['bg-[#6366f1]', 'bg-[#c084fc]', 'bg-[#020617]'],
    },
    {
      id: 'genie',
      name: 'Genie Mode',
      description: 'Mystical royal purple & magic gold',
      icon: <Sparkles className="text-amber-400 animate-pulse" size={20} />,
      bgClass: 'bg-[#080315] border-purple-900/40',
      swatches: ['bg-[#d946ef]', 'bg-[#fbbf24]', 'bg-[#080315]'],
      isGenie: true,
    },
    {
      id: 'sapphire',
      name: 'Ocean Sapphire',
      description: 'Deep ocean navy & electric sapphire',
      icon: <Palette className="text-blue-400" size={20} />,
      bgClass: 'bg-[#030712] border-blue-900/40',
      swatches: ['bg-[#3b82f6]', 'bg-[#06b6d4]', 'bg-[#030712]'],
    },
    {
      id: 'light',
      name: 'Light Glass',
      description: 'Clean minimalist sleek light layout',
      icon: <Sun className="text-amber-500" size={20} />,
      bgClass: 'bg-slate-50 border-slate-200',
      swatches: ['bg-[#4f46e5]', 'bg-[#7c3aed]', 'bg-[#f8fafc]'],
      darkText: true,
    },
  ];

  return (
    <div className="space-y-12 animate-[slideInRight_0.6s_cubic-bezier(0.23,1,0.32,1)]">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">System <span className="text-accent">Settings</span></h2>
        <p className="text-text-muted mt-2">Manage your workspace configuration and visual styling.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-10">
        
        {/* Left Side: Profile Card */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2.5rem] p-8 shadow-xl flex flex-col items-center text-center h-fit">
          <div className="relative mb-6">
            <img 
              src={user?.image || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=6366f1&color=fff`} 
              alt="User Avatar" 
              className="w-28 h-28 rounded-3xl object-cover border-4 border-glass-border shadow-2xl shadow-primary/20" 
            />
            <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg border border-glass-border">
              <User size={16} />
            </div>
          </div>

          <h3 className="text-2xl font-bold text-white mb-1">{user?.name || 'User'}</h3>
          <p className="text-sm text-text-muted mb-6">{user?.email || 'user@example.com'}</p>

          <div className="w-full space-y-4 pt-6 border-t border-glass-border text-left">
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-muted">Employee ID</span>
              <span className="font-semibold text-white">{user?.employeeId || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-muted">Current Role</span>
              <span className="font-semibold text-accent capitalize">{user?.role || 'Team Member'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-muted">Member Since</span>
              <span className="font-semibold text-white">
                {user?.doj ? new Date(user.doj).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Theme Switcher */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2.5rem] p-10 shadow-xl space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/15 border border-primary/25 rounded-xl text-primary">
              <Palette size={20} />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">Color Themes</h4>
              <p className="text-xs text-text-muted">Switch interface color styling dynamically</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {themes.map((theme) => {
              const isActive = currentTheme === theme.id;
              return (
                <div 
                  key={theme.id}
                  onClick={() => onChangeTheme(theme.id)}
                  className={`relative flex flex-col p-6 rounded-[2rem] border cursor-pointer select-none transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                    isActive 
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/5 scale-[1.02]' 
                      : 'border-glass-border bg-white/5 hover:bg-white/10'
                  } ${theme.isGenie && isActive ? 'shadow-amber-500/10 border-amber-400' : ''}`}
                >
                  {/* Selected Indicator Badge */}
                  {isActive && (
                    <span className={`absolute top-4 right-4 p-1 rounded-full shadow-lg ${
                      theme.isGenie ? 'bg-amber-400 text-slate-950' : 'bg-primary text-white'
                    }`}>
                      <Check size={14} className="stroke-[3]" />
                    </span>
                  )}

                  {/* Icon & Theme Title */}
                  <div className="flex items-center gap-3 mb-3">
                    {theme.icon}
                    <span className={`font-bold text-base ${isActive ? 'text-white' : 'text-white/80'}`}>
                      {theme.name}
                    </span>
                    {theme.isGenie && (
                      <span className="text-[0.65rem] font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/25 border border-amber-400/30 text-amber-300 uppercase animate-pulse">
                        Genie AI
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-text-muted leading-relaxed mb-6">
                    {theme.description}
                  </p>

                  {/* Swatches Visual Preview */}
                  <div className="flex gap-2.5 mt-auto bg-white/5 p-2.5 rounded-xl border border-glass-border w-fit">
                    {theme.swatches.map((swatch, idx) => (
                      <div 
                        key={idx} 
                        className={`w-5 h-5 rounded-full border border-white/10 ${swatch}`} 
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
