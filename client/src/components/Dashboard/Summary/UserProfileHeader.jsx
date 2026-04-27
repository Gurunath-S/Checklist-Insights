import React from 'react';

const UserProfileHeader = ({ user }) => {
  return (
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2.5rem] p-12 mb-12 text-center shadow-2xl shadow-black/20">
      <h1 className="text-5xl font-extrabold text-white mb-8">{user?.name || 'User'}</h1>
      
      <div className="flex justify-around border-t border-glass-border pt-8 mt-4 gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <span className="text-text-muted text-[0.7rem] uppercase tracking-widest font-bold">ID</span>
          <span className="text-base font-semibold text-white">IBTEMP015</span>
        </div>
        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <span className="text-text-muted text-[0.7rem] uppercase tracking-widest font-bold">Role</span>
          <span className="text-base font-semibold text-white">Jr Business Analyst</span>
        </div>
        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <span className="text-text-muted text-[0.7rem] uppercase tracking-widest font-bold">Email</span>
          <span className="text-base font-semibold text-white truncate max-w-[200px]">
            {user?.email || 'user@example.com'}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <span className="text-text-muted text-[0.7rem] uppercase tracking-widest font-bold">DOJ</span>
          <span className="text-base font-semibold text-white">02 Dec 2024</span>
        </div>
      </div>
    </div>
  );
};

export default UserProfileHeader;
