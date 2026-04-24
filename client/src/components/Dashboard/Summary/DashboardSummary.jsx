import React from 'react';
import { Users, FileText, Layout, TrendingUp } from 'lucide-react';

const DashboardSummary = ({ data, isAdmin }) => {
  if (isAdmin) {
    return (
      <div className="grid-summary">
        <SummaryCard icon={<Users />} label="Total Users" value={data?.totalUsers} trend="+12%" />
        <SummaryCard icon={<FileText />} label="Submissions" value={data?.totalSubmissions} trend="+8%" />
        <SummaryCard icon={<Layout />} label="Templates" value={data?.totalTemplates} trend="Active" />
      </div>
    );
  }

  return (
    <div className="grid-summary">
      <SummaryCard icon={<FileText />} label="My Submissions" value={data?.summary?.totalSubmissions} trend="Ongoing" />
      <SummaryCard icon={<TrendingUp />} label="Completion Rate" value="94%" trend="+2.4%" />
      <SummaryCard icon={<Layout />} label="Active Tasks" value="12" trend="Normal" />
    </div>
  );
};

const SummaryCard = ({ icon, label, value, trend }) => (
  <div className="card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: '1rem', color: 'var(--primary)' }}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>{trend}</span>
    </div>
    <div style={{ marginTop: '1.5rem' }}>
      <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>{label}</p>
      <h3 style={{ margin: '0.5rem 0 0', fontSize: '2rem', fontWeight: 700 }}>{value || 0}</h3>
    </div>
  </div>
);

export default DashboardSummary;
