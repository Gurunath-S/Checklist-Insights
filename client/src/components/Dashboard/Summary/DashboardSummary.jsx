import React from 'react';
import { Users, FileText, Layout, TrendingUp, Send, CheckCircle, Rocket, RefreshCcw, Headphones } from 'lucide-react';

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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '1.5rem', marginBottom: '3rem' }}>
      <div className="colorful-grid">
        <ColorfulCard color="card-blue" icon={<Send />} label="Submissions" value="419" />
        <ColorfulCard color="card-yellow" icon={<CheckCircle />} label="Completed" value="279" />
        <ColorfulCard color="card-purple" icon={<Rocket />} label="Deploy to GIFT" value="217" />
        <ColorfulCard color="card-deep-blue" icon={<RefreshCcw />} label="Updated / Day" value="28" />
        <ColorfulCard color="card-orange" icon={<Headphones />} label="Interview" value="5" />
      </div>
      
      <div className="task-day-box">
        <h4>Task / Day</h4>
        <span className="value">3</span>
      </div>
    </div>
  );
};

const ColorfulCard = ({ color, icon, label, value }) => (
  <div className={`colorful-card ${color}`}>
    {React.cloneElement(icon, { size: 32 })}
    <span className="label">{label}</span>
    <span className="value">{value}</span>
  </div>
);

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
