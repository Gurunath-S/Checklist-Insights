import React from 'react';

const UserProfileHeader = ({ user }) => {
  return (
    <div className="user-profile-header">
      <h1>{user?.name || 'Karthick'}</h1>
      
      <div className="profile-stats-bar">
        <div className="stat-item">
          <span className="stat-label">ID</span>
          <span className="stat-value">IBTEMP015</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Role</span>
          <span className="stat-value">Jr Business Analyst</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Email</span>
          <span className="stat-value">{user?.email || 'karthick@ibacustechlabs.in'}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">DOJ</span>
          <span className="stat-value">02 December 2024</span>
        </div>
      </div>
    </div>
  );
};

export default UserProfileHeader;
