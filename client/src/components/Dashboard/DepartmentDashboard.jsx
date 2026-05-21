import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { Book, CheckCircle, TrendingUp, Calendar } from 'lucide-react';
import LoadingState from '../UI/LoadingState';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const DepartmentDashboard = ({ department, adminStartDate, adminEndDate }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDepartmentData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const params = {};
        if (adminStartDate) params.startDate = adminStartDate;
        if (adminEndDate) params.endDate = adminEndDate;

        const res = await axios.get(`${API_BASE}/insights/admin/department/${department}`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        setData(res.data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch department data", err);
        setError("Failed to load department insights.");
      } finally {
        setLoading(false);
      }
    };

    if (department) {
      fetchDepartmentData();
    }
  }, [department, adminStartDate, adminEndDate]);

  if (loading) return <LoadingState />;
  if (error) return <div className="text-danger text-center p-8">{error}</div>;
  if (!data) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white capitalize">{department.replace(/_/g, ' ')}</h2>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-text-muted text-xs font-bold uppercase tracking-widest mb-1">Submissions</span>
            <h3 className="text-2xl font-black text-primary leading-none">{data.submissionsCount}</h3>
          </div>
          <div className="text-primary opacity-80 p-2 bg-white/5 rounded-2xl border border-white/10">
            <Book size={24} strokeWidth={1.5} />
          </div>
        </div>

        {data.topKPIs?.map((kpi, idx) => (
          <div key={idx} className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-text-muted text-xs font-bold uppercase tracking-widest mb-1 line-clamp-1" title={kpi.label}>{kpi.label}</span>
              <h3 className="text-2xl font-black text-[#f59e0b] leading-none">{kpi.value}</h3>
            </div>
            <div className="text-[#f59e0b] opacity-80 p-2 bg-white/5 rounded-2xl border border-white/10">
              <CheckCircle size={24} strokeWidth={1.5} />
            </div>
          </div>
        ))}

        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-text-muted text-xs font-bold uppercase tracking-widest mb-1">Latest Date</span>
            <h3 className="text-sm font-black text-white leading-none mt-2">{formatDate(data.latestSubmissionDate)}</h3>
          </div>
          <div className="text-[#10b981] opacity-80 p-2 bg-white/5 rounded-2xl border border-white/10">
            <Calendar size={24} strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[380px]">
        {/* Checklist by Inputs */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-full">
          <h3 className="text-base font-bold text-white mb-4 text-center">Checklist by Inputs</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.checklistInputs} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--color-text-muted)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                />
                <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                  {data.checklistInputs?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Submissions (Recent Months) */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-full">
          <h3 className="text-base font-bold text-white mb-4 text-center">Submissions (Recent Months)</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.recentMonths} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="submissions" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorSub)" dot={{r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 12, fontWeight: 'bold' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentDashboard;
