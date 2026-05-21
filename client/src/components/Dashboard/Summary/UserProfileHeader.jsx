import React from 'react';

const UserProfileHeader = ({ user }) => {
  return (
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-6 mb-8 text-center shadow-2xl shadow-black/20">
      <h1 className="text-2xl font-bold text-white mb-4">{user?.name || 'User'}</h1>
      
      <div className="flex justify-around border-t border-glass-border pt-4 mt-2 gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <span className="text-text-muted text-[0.7rem] uppercase tracking-widest font-bold">ID</span>
          <span className="text-sm font-semibold text-white">{user?.employeeId || 'N/A'}</span>
        </div>
        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <span className="text-text-muted text-[0.7rem] uppercase tracking-widest font-bold">Role</span>
          <span className="text-sm font-semibold text-white">{user?.role || 'Team Member'}</span>
        </div>
        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <span className="text-text-muted text-[0.7rem] uppercase tracking-widest font-bold">Email</span>
          <span className="text-sm font-semibold text-white truncate max-w-[200px]">
            {user?.email || 'user@example.com'}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <span className="text-text-muted text-[0.7rem] uppercase tracking-widest font-bold">First Date of Entry</span>
          <span className="text-sm font-semibold text-white">
            {user?.doj ? new Date(user.doj).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default UserProfileHeader;
