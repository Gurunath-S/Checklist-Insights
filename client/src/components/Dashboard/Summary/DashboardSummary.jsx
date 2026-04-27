import React from 'react';
import { Users, FileText, Layout, TrendingUp, Send, CheckCircle, Rocket, RefreshCcw, Headphones } from 'lucide-react';

const DashboardSummary = ({ data, isAdmin }) => {
  if (isAdmin) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <SummaryCard icon={<Users />} label="Total Users" value={data?.totalUsers} trend="+12%" />
        <SummaryCard icon={<FileText />} label="Submissions" value={data?.totalSubmissions} trend="+8%" />
        <SummaryCard icon={<Layout />} label="Templates" value={data?.totalTemplates} trend="Active" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-6 mb-12">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <ColorfulCard color="from-blue-500 to-blue-700" icon={<Send />} label="Submissions" value="419" />
        <ColorfulCard color="from-yellow-500 to-yellow-700" icon={<CheckCircle />} label="Completed" value="279" />
        <ColorfulCard color="from-purple-500 to-purple-700" icon={<Rocket />} label="Deploy to GIFT" value="217" />
        <ColorfulCard color="from-blue-600 to-blue-800" icon={<RefreshCcw />} label="Updated / Day" value="28" />
        <ColorfulCard color="from-orange-500 to-orange-700" icon={<Headphones />} label="Interview" value="5" />
      </div>
      
      <div className="bg-white text-slate-950 rounded-3xl p-8 text-center flex flex-col justify-center border-2 border-black shadow-xl shadow-black/20">
        <h4 className="text-sm font-extrabold uppercase tracking-wider mb-2">Task / Day</h4>
        <span className="text-5xl font-black italic">3</span>
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

export default DashboardSummary;
