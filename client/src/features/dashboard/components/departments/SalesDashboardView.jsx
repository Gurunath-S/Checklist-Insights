import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Send, Users, CheckCircle, TrendingUp, Calendar, Clock, Activity } from 'lucide-react';
import ColorfulCard from '../common/ColorfulCard';
import DoubleMetricCard from '../common/DoubleMetricCard';

const SalesDashboardView = ({ 
  data, 
  formatDate, 
  handleUsersCardClick, 
  checklistChart,
  meetingsLimit,
  setMeetingsLimit,
  closuresLimit,
  setClosuresLimit
}) => {
  if (!data.salesData) return null;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-4">
        <ColorfulCard 
          color="from-indigo-600 to-indigo-800" 
          icon={<Send />} 
          label="Submissions" 
          value={data.submissionsCount || 0} 
        />
        <ColorfulCard 
          color="from-purple-500 to-purple-700" 
          icon={<Users />} 
          label="Sales Persons" 
          value={data.usersCount || data.salesData?.totalSalesPersons || 0} 
          onClick={handleUsersCardClick}
        />
        <ColorfulCard 
          color="from-emerald-500 to-emerald-700" 
          icon={<CheckCircle />} 
          label="Task Completed" 
          value={data.salesData?.totalTasksCompleted || 0} 
        />
        <ColorfulCard 
          color="from-rose-500 to-rose-700" 
          icon={<TrendingUp />} 
          label="Closures" 
          value={data.salesData?.totalClosures || 0} 
        />
        <ColorfulCard 
          color="from-amber-500 to-amber-700" 
          icon={<Calendar />} 
          label="Last Submitted" 
          value={formatDate(data.latestSubmissionDate)} 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart 1: Prospects Identified (Recent Months) */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-white mb-4 text-center">Prospects Identified (Recent Months)</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <AreaChart data={data.salesData.prospectsIdentified} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProspects" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorProspects)" dot={{r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Warm leads- Colleges (Recent Months) */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-white mb-4 text-center">Warm leads- Colleges (Recent Months)</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <AreaChart data={data.salesData.warmLeadsColleges} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWarmLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorWarmLeads)" dot={{r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: In- Person Meeting Attended (Recent Months) */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-white mb-4 text-center">In- Person Meeting Attended (Recent Months)</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <AreaChart data={data.salesData.meetingsTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorMeetings)" dot={{r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: In- Person Meeting Attended by Sales Person */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-white">In- Person Meeting Attended by Sales Person</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Show:</span>
              <select
                value={meetingsLimit}
                onChange={(e) => setMeetingsLimit(Number(e.target.value))}
                className="bg-white/5 border border-glass-border rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value={3} className="bg-slate-900 text-white">Top 3</option>
                <option value={5} className="bg-slate-900 text-white">Top 5</option>
                <option value={10} className="bg-slate-900 text-white">Top 10</option>
                <option value={9999} className="bg-slate-900 text-white">All</option>
              </select>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <BarChart data={data.salesData.meetingsByUser.slice(0, meetingsLimit)} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} width={130} interval={0} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={meetingsLimit <= 3 ? 24 : meetingsLimit <= 5 ? 18 : 12} label={{ position: 'right', fill: '#fff', fontSize: 10, fontWeight: 'bold' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Closure made by month and year */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-white mb-4 text-center">Closure made by month and year</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <AreaChart data={data.salesData.closuresTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorClosures" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="value" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorClosures)" dot={{r: 6, fill: '#ec4899', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Closure made by Sales Person */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-white">Closure made by Sales Person</h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Show:</span>
              <select
                value={closuresLimit}
                onChange={(e) => setClosuresLimit(Number(e.target.value))}
                className="bg-white/5 border border-glass-border rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value={3} className="bg-slate-900 text-white">Top 3</option>
                <option value={5} className="bg-slate-900 text-white">Top 5</option>
                <option value={10} className="bg-slate-900 text-white">Top 10</option>
                <option value={9999} className="bg-slate-900 text-white">All</option>
              </select>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <BarChart data={data.salesData.closuresByUser.slice(0, closuresLimit)} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} width={130} interval={0} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={closuresLimit <= 3 ? 24 : closuresLimit <= 5 ? 18 : 12} label={{ position: 'right', fill: '#fff', fontSize: 10, fontWeight: 'bold' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 7: Follow ups (Recent Months) */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-white mb-4 text-center">No of Follow ups (Recent Months)</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <AreaChart data={data.salesData.followUpsTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFollowUps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorFollowUps)" dot={{r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 8: Top checklist by input */}
        {checklistChart}
      </div>

      {/* ─── Sales Qualification Sub-Dashboard ─── */}
      {data.salesQualificationData && (
        <div className="space-y-6 mt-2">
          {/* Section Title */}
          <div className="flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-xs font-black uppercase tracking-widest text-accent px-3 py-1 bg-accent/10 border border-accent/20 rounded-full">
              Sales Qualification Insights
            </span>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ColorfulCard
              color="from-violet-600 to-violet-800"
              icon={<Users />}
              label="Client Qualifications"
              value={data.salesQualificationData.totalQualifications}
            />
            <ColorfulCard
              color="from-emerald-500 to-emerald-700"
              icon={<CheckCircle />}
              label="Qualified"
              value={data.salesQualificationData.qualifiedCount}
            />
            <ColorfulCard
              color="from-amber-500 to-amber-700"
              icon={<Clock />}
              label="Avg Wait Before Proposal"
              value={`${data.salesQualificationData.avgWaitBeforeProposal} days`}
            />
            <ColorfulCard
              color="from-rose-500 to-rose-700"
              icon={<Activity />}
              label="Dur. of Call / Meet"
              value={`${data.salesQualificationData.avgCallDuration} hrs`}
            />
          </div>

          {/* Charts Row: 3 gauges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gauge 1: Has Budget */}
            <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 shadow-xl flex flex-col items-center justify-center h-[280px] relative overflow-hidden">
              <h3 className="text-sm font-bold text-white mb-1 text-center">Has Budget?</h3>
              <div className="w-full flex-1 relative">
                <ResponsiveContainer width="100%" height="100%" debounce={100}>
                  <PieChart>
                    <defs>
                      <linearGradient id="sqBudgetGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="60%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                    <Pie
                      data={[
                        { name: 'Yes', value: data.salesQualificationData.hasBudgetPercent },
                        { name: 'No', value: Math.max(0, 100 - data.salesQualificationData.hasBudgetPercent) }
                      ]}
                      cx="50%" cy="80%"
                      startAngle={180} endAngle={0}
                      innerRadius="60%" outerRadius="90%"
                      dataKey="value" stroke="none"
                    >
                      <Cell fill="url(#sqBudgetGrad)" />
                      <Cell fill="rgba(255,255,255,0.06)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-2">
                  <span className="text-3xl font-extrabold text-white">{data.salesQualificationData.hasBudgetPercent}%</span>
                  <span className="text-[10px] text-text-muted font-bold mt-0.5">of prospects</span>
                </div>
              </div>
            </div>

            {/* Gauge 2: Prospect Received Brochure */}
            <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 shadow-xl flex flex-col items-center justify-center h-[280px] relative overflow-hidden">
              <h3 className="text-sm font-bold text-white mb-1 text-center">Prospect Received Brochure?</h3>
              <div className="w-full flex-1 relative">
                <ResponsiveContainer width="100%" height="100%" debounce={100}>
                  <PieChart>
                    <defs>
                      <linearGradient id="sqBrochureGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="60%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#f43f5e" />
                      </linearGradient>
                    </defs>
                    <Pie
                      data={[
                        { name: 'Yes', value: data.salesQualificationData.brochurePercent },
                        { name: 'No', value: Math.max(0, 100 - data.salesQualificationData.brochurePercent) }
                      ]}
                      cx="50%" cy="80%"
                      startAngle={180} endAngle={0}
                      innerRadius="60%" outerRadius="90%"
                      dataKey="value" stroke="none"
                    >
                      <Cell fill="url(#sqBrochureGrad)" />
                      <Cell fill="rgba(255,255,255,0.06)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-2">
                  <span className="text-3xl font-extrabold text-white">{data.salesQualificationData.brochurePercent}%</span>
                  <span className="text-[10px] text-text-muted font-bold mt-0.5">of prospects</span>
                </div>
              </div>
            </div>

            {/* Gauge 3: Referral */}
            <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 shadow-xl flex flex-col items-center justify-center h-[280px] relative overflow-hidden">
              <h3 className="text-sm font-bold text-white mb-1 text-center">Is a Referral?</h3>
              <div className="w-full flex-1 relative">
                <ResponsiveContainer width="100%" height="100%" debounce={100}>
                  <PieChart>
                    <defs>
                      <linearGradient id="sqReferralGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="60%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    <Pie
                      data={[
                        { name: 'Yes', value: data.salesQualificationData.referralPercent },
                        { name: 'No', value: Math.max(0, 100 - data.salesQualificationData.referralPercent) }
                      ]}
                      cx="50%" cy="80%"
                      startAngle={180} endAngle={0}
                      innerRadius="60%" outerRadius="90%"
                      dataKey="value" stroke="none"
                    >
                      <Cell fill="url(#sqReferralGrad)" />
                      <Cell fill="rgba(255,255,255,0.06)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-2">
                  <span className="text-3xl font-extrabold text-white">{data.salesQualificationData.referralPercent}%</span>
                  <span className="text-[10px] text-text-muted font-bold mt-0.5">of prospects</span>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width: Agreed for Follow-up Meeting trend */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-6 shadow-xl flex flex-col h-[350px]">
            <h3 className="text-base font-bold text-white mb-4 text-center">Agreed for Follow-up Meeting</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <AreaChart data={data.salesQualificationData.followUpMeetingTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sqFollowUpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#sqFollowUpGrad)" dot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 8 }} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesDashboardView;
