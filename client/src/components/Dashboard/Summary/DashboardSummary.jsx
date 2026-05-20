import React from 'react';
import { Users, FileText, Layout, TrendingUp, Send, CheckCircle, Rocket, RefreshCcw, Headphones, Tag, Grid2x2, Calendar } from 'lucide-react';

const DashboardSummary = ({ data, isAdmin, adminStartDate, setAdminStartDate, adminEndDate, setAdminEndDate, hideKPIs }) => {
  if (isAdmin) {
    return (
      <div className={`grid grid-cols-1 ${hideKPIs ? 'flex justify-end' : 'md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_2fr]'} gap-5 mb-6`}>
        {!hideKPIs && (
          <>
            <AdminKPICard icon={<Users />} label="Users" value={data?.totalUsers} />
            <AdminKPICard icon={<Tag />} label="Tags" value={data?.totalTags} />
            <AdminKPICard icon={<Layout />} label="Templates" value={data?.totalTemplates} />
            <AdminKPICard icon={<Grid2x2 />} label="Items" value={data?.totalItems} />
          </>
        )}
        
        {/* Date Filter Card */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2rem] p-5 shadow-xl flex flex-col justify-center">
          <div className="text-text-muted text-xs font-bold uppercase tracking-widest mb-3">Filter by Date</div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 relative">
              <input 
                type="date" 
                value={adminStartDate}
                onChange={(e) => setAdminStartDate(e.target.value)}
                className="w-full bg-white/5 border border-glass-border rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-primary/50 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert cursor-pointer"
              />
            </div>
            <span className="text-text-muted text-xs font-bold">TO</span>
            <div className="flex-1 relative">
              <input 
                type="date" 
                value={adminEndDate}
                onChange={(e) => setAdminEndDate(e.target.value)}
                className="w-full bg-white/5 border border-glass-border rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-primary/50 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-6 mb-12">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <ColorfulCard color="from-blue-500 to-blue-700" icon={<Send />} label="Submissions" value={summary.totalSubmissions || 0} />
        <ColorfulCard color="from-yellow-500 to-yellow-700" icon={<CheckCircle />} label="Tasks Worked" value={summary.totalTasksWorked || 0} />
        <ColorfulCard color="from-purple-500 to-purple-700" icon={<Rocket />} label="Completed" value={summary.totalTasksCompleted || 0} />
        <ColorfulCard color="from-blue-600 to-blue-800" icon={<RefreshCcw />} label="AI Hours Saved" value={summary.totalAiTimeSaved || 0} />
        <ColorfulCard color="from-orange-500 to-orange-700" icon={<Headphones />} label="Bugs Fixed" value={summary.totalBugsFixed || 0} />
      </div>
      
      <div className={`rounded-3xl p-6 text-center flex flex-col justify-center border-2 shadow-xl shadow-black/20 transition-all duration-500 ${
        summary.todaySubmitted 
          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' 
          : 'bg-amber-500/10 border-amber-500/50 text-amber-500 animate-pulse'
      }`}>
        <h4 className="text-[0.7rem] font-black uppercase tracking-widest mb-1 opacity-80">Today's Status</h4>
        <span className="text-2xl font-black italic uppercase">
          {summary.todaySubmitted ? 'Entered' : 'Pending'}
        </span>
        <div className={`w-2 h-2 rounded-full mx-auto mt-2 ${summary.todaySubmitted ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
      </div>
    </div>
  );
};

const ColorfulCard = ({ color, icon, label, value }) => (
  <div className={`bg-linear-to-br ${color} rounded-3xl p-6 flex flex-col items-center justify-center gap-2 text-white shadow-xl shadow-black/20 hover:-translate-y-2 hover:scale-105 transition-all duration-300 cursor-default aspect-square lg:aspect-auto`}>
    {React.cloneElement(icon, { size: 32, className: "opacity-90" })}
    <span className="text-[0.7rem] font-bold uppercase tracking-wide opacity-80">{label}</span>
    <span className="text-3xl font-extrabold">{value}</span>
  </div>
);

const SummaryCard = ({ icon, label, value, trend }) => (
  <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-8 shadow-xl shadow-black/10">
    <div className="flex justify-between items-start">
      <div className="bg-primary/10 p-3 rounded-2xl text-primary border border-primary/20">
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <span className="text-xs text-success font-bold bg-success/10 px-2 py-1 rounded-full">{trend}</span>
    </div>
    <div className="mt-6">
      <p className="text-text-muted text-sm font-medium mb-1">{label}</p>
      <h3 className="text-3xl font-bold text-white">{value || 0}</h3>
    </div>
  </div>
);

const AdminKPICard = ({ icon, label, value }) => (
  <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2rem] p-5 shadow-xl flex items-center justify-between gap-4">
    <div className="flex flex-col">
      <span className="text-text-muted text-xs font-bold uppercase tracking-widest mb-1">{label}</span>
      <h3 className="text-4xl font-black text-white leading-none">{value || 0}</h3>
    </div>
    <div className="text-primary opacity-80 p-3 bg-white/5 rounded-2xl border border-white/10">
      {React.cloneElement(icon, { size: 32, strokeWidth: 1.5 })}
    </div>
  </div>
);

export default DashboardSummary;
