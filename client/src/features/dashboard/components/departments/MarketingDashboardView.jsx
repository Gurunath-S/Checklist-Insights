import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Send, Users, TrendingUp, Activity, CheckCircle, Rocket } from 'lucide-react';
import ColorfulCard from '../common/ColorfulCard';
import DoubleMetricCard from '../common/DoubleMetricCard';
import FunnelChart from '../common/FunnelChart';
import SpeedometerGauge from '../common/SpeedometerGauge';

const MarketingDashboardView = ({ data, formatDate, handleUsersCardClick, checklistChart }) => {
  if (!data.marketingData) return null;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 gap-4">
        <ColorfulCard 
          color="from-indigo-600 to-indigo-800" 
          icon={<Send />} 
          label="Total Submissions" 
          value={data.submissionsCount || 0} 
        />
        <ColorfulCard 
          color="from-purple-500 to-purple-700" 
          icon={<Users />} 
          label="Marketers" 
          value={data.usersCount || 0}
          onClick={handleUsersCardClick}
        />
        <ColorfulCard 
          color="from-blue-500 to-indigo-700" 
          icon={<TrendingUp />} 
          label="Impressions" 
          value={data.marketingData?.impressionsTotal || 0} 
        />
        <ColorfulCard 
          color="from-purple-500 to-purple-700" 
          icon={<Activity />} 
          label="CTA Clicks" 
          value={data.marketingData?.ctaClicksTotal || 0} 
        />
        <ColorfulCard 
          color="from-pink-500 to-pink-700" 
          icon={<CheckCircle />} 
          label="Conversions" 
          value={data.marketingData?.conversionsTotal || 0} 
        />
        <DoubleMetricCard
          color="from-amber-500 to-orange-700"
          icon={<Rocket />}
          label="Campaign Funnel"
          val1Label="Launched"
          val1={data.marketingData?.campaignsCount || 0}
          val2Label="Boosts"
          val2={data.marketingData?.boostsCount || 0}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <FunnelChart data={data.marketingData.funnel} />
        <SpeedometerGauge value={data.marketingData.goalAchievement} title="Goal Achievement" />
        
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-white mb-4 text-center">Campaigns Launched</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <AreaChart data={data.marketingData.campaignsLaunched} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCampaigns" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorCampaigns)" dot={{r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-white mb-4 text-center">Positive Reaction from Employees</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <AreaChart data={data.marketingData.employeeReactions} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEmployees" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEmployees)" dot={{r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-white mb-4 text-center">Positive Reaction from Partners</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <AreaChart data={data.marketingData.partnerReactions} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPartners" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="value" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorPartners)" dot={{r: 6, fill: '#ec4899', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {checklistChart}
      </div>
    </div>
  );
};

export default MarketingDashboardView;
