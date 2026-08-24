import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { List, ChevronDown, Activity, Users, PlusCircle } from 'lucide-react';
import LoadingState from '../../../components/common/LoadingState';
import { 
  getAdminUsersListApi, 
  deleteAdminUserApi, 
  enableAdminUserApi, 
  addErodeInternUserApi, 
  removeErodeInternUserApi, 
  excludeAdminUserApi 
} from '../../admin/services/adminService';
import { 
  getDepartmentDetailsApi, 
  getDepartmentChartDataApi, 
  getDepartmentUsersApi 
} from '../services/dashboardService';

// Import modular dashboard views
import HRDashboardView from './departments/HRDashboardView';
import SalesDashboardView from './departments/SalesDashboardView';
import DTDashboardView from './departments/DTDashboardView';
import MarketingDashboardView from './departments/MarketingDashboardView';
import DevDashboardView from './departments/DevDashboardView';
import DataAnalyticsDashboardView from './departments/DataAnalyticsDashboardView';
import TestingDashboardView from './departments/TestingDashboardView';
import ErodeInternDashboardView from './departments/ErodeInternDashboardView';
import GenericDashboardView from './departments/GenericDashboardView';

const DepartmentDashboard = ({ department, adminStartDate, adminEndDate, onDoubleClickItem }) => {
  const isHR = department && (department.toUpperCase() === 'HUMAN RESOURCE' || department.toUpperCase() === 'HUMAN_RESOURCE' || department.toUpperCase() === 'HR');
  const isSales = department && department.toUpperCase() === 'SALES';
  const isDT = department && (department.toUpperCase() === 'DIGITAL TRANSFORMATION' || department.toUpperCase() === 'DIGITAL_TRANSFORMATION' || department.toUpperCase() === 'DT');
  const isMarketing = department && (department.toUpperCase() === 'MARKETING' || department.toUpperCase() === 'MARKETTNG');
  const isDev = department && (department.toUpperCase() === 'FULL_STACK_DEVELOPER' || department.toUpperCase() === 'DEVELOPMENT' || department.toUpperCase() === 'DEV');
  const isDataAnalytics = department && (department.toUpperCase() === 'POWER_BI_DEVELOPER' || department.toUpperCase() === 'POWER BI DEVELOPER' || department.toUpperCase() === 'DATA_ANALYTICS' || department.toUpperCase() === 'DATA ANALYTICS');
  const isTesting = department && (department.toUpperCase() === 'TESTING' || department.toUpperCase() === 'QA TESTING' || department.toUpperCase() === 'QA_TESTING');
  const isErodeIntern = department && (department.toUpperCase() === 'ERODE_INTERN' || department.toUpperCase() === 'ERODE_INTERNS' || department.toUpperCase() === 'ERODE INTERNS');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedDepartment, setLoadedDepartment] = useState(null);

  const [isLimitDropdownOpen, setIsLimitDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [chartData, setChartData] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingChart, setLoadingChart] = useState(false);
  const [meetingsLimit, setMeetingsLimit] = useState(3);
  const [closuresLimit, setClosuresLimit] = useState(3);
  const [analyticsTimeOption, setAnalyticsTimeOption] = useState('monthly');
  const [testingTimeOption, setTestingTimeOption] = useState('monthly');

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [deptUsers, setDeptUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(null);

  const handleSearchUsers = async (val) => {
    setSearchTerm(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const searchData = await getAdminUsersListApi(`/insights/admin/users-list?search=${encodeURIComponent(val)}&limit=10`);
      const filtered = (searchData.users || []).filter(
        orgUser => !deptUsers.some(du => du.id === orgUser.id)
      );
      setSearchResults(filtered);
    } catch (err) {
      console.error("Failed to search users", err);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleAddIntern = async (orgUser) => {
    setIsAddingUser(orgUser.id);
    try {
      await addErodeInternUserApi(orgUser.id);
      await fetchDeptUsers();
      refreshDashboardData();
      setSearchResults(prev => prev.filter(u => u.id !== orgUser.id));
      setSearchTerm('');
    } catch (err) {
      console.error("Failed to add user to erode interns", err);
      alert(err.response?.data?.error || "Failed to add user to Erode Interns");
    } finally {
      setIsAddingUser(null);
    }
  };

  const handleRemoveIntern = async (user) => {
    setActionInProgress(user.id);
    try {
      await removeErodeInternUserApi(user.id);
      await fetchDeptUsers();
      refreshDashboardData();
    } catch (err) {
      console.error("Failed to remove user from erode interns", err);
      alert(err.response?.data?.error || "Failed to remove user");
    } finally {
      setActionInProgress(null);
    }
  };

  const refreshDashboardData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const fetchDeptUsers = async () => {
    if (!department) return;
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const usersData = await getDepartmentUsersApi(department);
      setDeptUsers(usersData);
    } catch (err) {
      console.error("Failed to fetch department users", err);
      setUsersError("Failed to load department users.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUsersCardClick = () => {
    setIsUsersModalOpen(true);
    fetchDeptUsers();
  };

  const handleToggleExclude = async (user) => {
    setActionInProgress(user.id);
    try {
      const targetExclude = !user.exclude_from_reports;
      await excludeAdminUserApi(user.id, targetExclude);
      setDeptUsers(prev => prev.map(u => u.id === user.id ? { ...u, exclude_from_reports: targetExclude } : u));
      refreshDashboardData();
    } catch (err) {
      console.error("Failed to toggle user data exclusion", err);
      alert(err.response?.data?.error || "Failed to update data exclusion status");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleDeactivate = async (user) => {
    setActionInProgress(user.id);
    try {
      const isActive = user.user_type !== 'DISABLED';
      if (isActive) {
        await deleteAdminUserApi(user.id);
        setDeptUsers(prev => prev.map(u => u.id === user.id ? { ...u, user_type: 'DISABLED' } : u));
      } else {
        await enableAdminUserApi(user.id);
        setDeptUsers(prev => prev.map(u => u.id === user.id ? { ...u, user_type: 'USER' } : u));
      }
      refreshDashboardData();
    } catch (err) {
      console.error("Failed to toggle user activation status", err);
      alert(err.response?.data?.error || "Failed to update user status");
    } finally {
      setActionInProgress(null);
    }
  };

  useEffect(() => {
    const fetchDepartmentData = async () => {
      setLoading(true);
      try {
        const params = {};
        if (adminStartDate) params.startDate = adminStartDate;
        if (adminEndDate) params.endDate = adminEndDate;

        const detailsData = await getDepartmentDetailsApi(department, params);
        setData(detailsData);
        setLoadedDepartment(department);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch department data", err);
        setError("Failed to load department insights.");
        setLoadedDepartment(null);
      } finally {
        setLoading(false);
      }
    };

    if (department) {
      fetchDepartmentData();
    }
  }, [department, adminStartDate, adminEndDate, refreshTrigger]);

  useEffect(() => {
    Promise.resolve().then(() => setPage(1));
  }, [department, adminStartDate, adminEndDate]);

  useEffect(() => {
    if (!department) return;

    const fetchChartData = async () => {
      setLoadingChart(true);
      try {
        const params = { page, limit };
        if (adminStartDate) params.startDate = adminStartDate;
        if (adminEndDate) params.endDate = adminEndDate;

        const resData = await getDepartmentChartDataApi(department, params);
        setChartData(resData.data || []);
        setTotalPages(resData.totalPages || 1);
      } catch (err) {
        console.error('Error fetching paginated department chart data:', err);
      } finally {
        setLoadingChart(false);
      }
    };

    fetchChartData();
  }, [department, page, limit, adminStartDate, adminEndDate, refreshTrigger]);

  const isDataLoadedForCurrentDept = data && loadedDepartment === department;
  if (loading && !isDataLoadedForCurrentDept) return <LoadingState />;
  if (error) return <div className="text-danger text-center p-8">{error}</div>;
  if (!data) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#ec4899', '#8b5cf6'];

  const renderChecklistByInputs = () => (
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px] relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold text-white">Top {limit} Checklist by Inputs in this department</h3>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              onClick={() => setIsLimitDropdownOpen(!isLimitDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-bg-card backdrop-blur-xl border border-glass-border rounded-xl text-[11px] font-bold text-white shadow-lg hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
            >
              <List size={12} className="text-accent" />
              <span>Top {limit}</span>
              <ChevronDown size={12} className={`transition-transform duration-300 ${isLimitDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isLimitDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsLimitDropdownOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-32 bg-bg-card backdrop-blur-2xl border border-glass-border rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="text-[10px] font-bold text-white/40 px-2.5 py-1.5 uppercase tracking-wider border-b border-glass-border/30 mb-1">
                    Show Rows
                  </div>
                  {[5, 10, 20, 50].map((val) => (
                    <button
                      key={val}
                      onClick={() => { setLimit(val); setPage(1); setIsLimitDropdownOpen(false); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors flex items-center justify-between ${limit === val ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
                    >
                      <span>Top {val}</span>
                      {limit === val && <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1 bg-bg-card backdrop-blur-xl border border-glass-border rounded-xl px-1 py-1 shadow-lg">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-0.5 text-xs font-bold text-text-main disabled:opacity-30 hover:bg-white/10 rounded-lg cursor-pointer transition-all"
            >
              &lt;
            </button>
            <span className="text-[10px] font-bold px-1 text-text-muted min-w-[36px] text-center">
              {page} / {totalPages || 1}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2 py-0.5 text-xs font-bold text-text-main disabled:opacity-30 hover:bg-white/10 rounded-lg cursor-pointer transition-all"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        {loadingChart && chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
            <Activity size={32} className="opacity-30 animate-pulse text-primary mb-2" />
            <span className="text-xs font-bold">Loading Data...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
            No data available for this range.
          </div>
        ) : (
          <div className={`w-full h-full transition-opacity duration-300 ${loadingChart ? 'opacity-50 pointer-events-none' : ''}`}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
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
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]} 
                  barSize={40}
                  onDoubleClick={(evtData) => {
                    if (evtData && evtData.name) {
                      onDoubleClickItem?.(evtData.name);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );

  const checklistChart = renderChecklistByInputs();

  const renderDashboardView = () => {
    if (isHR) {
      return (
        <HRDashboardView 
          data={data} 
          formatDate={formatDate} 
          handleUsersCardClick={handleUsersCardClick} 
          checklistChart={checklistChart} 
        />
      );
    }
    if (isSales) {
      return (
        <SalesDashboardView 
          data={data} 
          formatDate={formatDate} 
          handleUsersCardClick={handleUsersCardClick} 
          checklistChart={checklistChart}
          meetingsLimit={meetingsLimit}
          setMeetingsLimit={setMeetingsLimit}
          closuresLimit={closuresLimit}
          setClosuresLimit={setClosuresLimit}
        />
      );
    }
    if (isDT) {
      return (
        <DTDashboardView 
          data={data} 
          formatDate={formatDate} 
          handleUsersCardClick={handleUsersCardClick} 
          checklistChart={checklistChart} 
        />
      );
    }
    if (isMarketing) {
      return (
        <MarketingDashboardView 
          data={data} 
          formatDate={formatDate} 
          handleUsersCardClick={handleUsersCardClick} 
          checklistChart={checklistChart} 
        />
      );
    }
    if (isDev) {
      return (
        <DevDashboardView 
          data={data} 
          formatDate={formatDate} 
          handleUsersCardClick={handleUsersCardClick} 
          checklistChart={checklistChart} 
        />
      );
    }
    if (isDataAnalytics) {
      return (
        <DataAnalyticsDashboardView 
          data={data} 
          formatDate={formatDate} 
          handleUsersCardClick={handleUsersCardClick} 
          checklistChart={checklistChart}
          analyticsTimeOption={analyticsTimeOption}
          setAnalyticsTimeOption={setAnalyticsTimeOption}
        />
      );
    }
    if (isTesting) {
      return (
        <TestingDashboardView 
          data={data} 
          formatDate={formatDate} 
          handleUsersCardClick={handleUsersCardClick}
          testingTimeOption={testingTimeOption}
          setTestingTimeOption={setTestingTimeOption}
        />
      );
    }
    if (isErodeIntern) {
      return (
        <ErodeInternDashboardView 
          data={data} 
          formatDate={formatDate} 
          handleUsersCardClick={handleUsersCardClick} 
          checklistChart={checklistChart} 
        />
      );
    }

    return (
      <GenericDashboardView 
        data={data} 
        department={department}
        formatDate={formatDate} 
        handleUsersCardClick={handleUsersCardClick} 
        checklistChart={checklistChart} 
      />
    );
  };

  return (
    <div className={`space-y-8 animate-fade-in transition-all duration-300 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white capitalize">{isDataAnalytics ? 'Data Analytics' : department.replace(/_/g, ' ')}</h2>
      </div>

      {renderDashboardView()}

      {isUsersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            onClick={() => setIsUsersModalOpen(false)}
          ></div>
          
          <div className="relative w-full max-w-4xl bg-bg-card backdrop-blur-2xl border border-glass-border rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="text-primary" />
                  <span>{isDataAnalytics ? 'Data Analytics' : department.replace(/_/g, ' ')} Department Members</span>
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  Manage user profiles, exclude data from reports, or deactivate accounts.
                </p>
              </div>
              <button 
                onClick={() => setIsUsersModalOpen(false)}
                className="p-2 text-text-muted hover:text-white rounded-xl hover:bg-white/5 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 min-h-[200px]">
              {isErodeIntern && (
                <div className="mb-6 bg-white/5 border border-glass-border/30 rounded-2xl p-4 flex flex-col gap-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <PlusCircle size={16} className="text-primary" />
                    <span>Add User to Erode Interns</span>
                  </h4>
                  <div className="flex gap-2 relative">
                    <div className="flex-1 relative">
                      <input 
                        type="text"
                        placeholder="Search users by name or email..."
                        value={searchTerm}
                        onChange={(e) => handleSearchUsers(e.target.value)}
                        className="w-full bg-white/5 border border-glass-border rounded-xl px-4 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-primary transition-all"
                      />
                      {searchingUsers && (
                        <div className="absolute right-3 top-2.5">
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="bg-bg-card border border-glass-border rounded-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-white/5 mt-1 shadow-2xl z-50">
                      {searchResults.map(orgUser => (
                        <div key={orgUser.id} className="flex items-center justify-between p-2 hover:bg-white/5 transition-all text-xs">
                          <div className="flex items-center gap-2">
                            {orgUser.User?.image ? (
                              <img src={orgUser.User.image} alt={orgUser.User.name} className="w-6 h-6 rounded-full object-cover border border-white/10" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-black uppercase text-[9px]">
                                {(orgUser.User?.name || 'US').slice(0, 2)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-white">{orgUser.User?.name}</div>
                              <div className="text-[10px] text-text-muted">{orgUser.User?.email} • {orgUser.user_position || 'No Position'}</div>
                            </div>
                          </div>
                          <button
                            disabled={isAddingUser === orgUser.id}
                            onClick={() => handleAddIntern(orgUser)}
                            className="px-3 py-1 bg-primary hover:bg-primary-hover text-white text-[10px] font-black rounded-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            {isAddingUser === orgUser.id ? 'Adding...' : 'Add to Interns'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {loadingUsers ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                  <span className="text-xs text-text-muted font-bold">Loading department members...</span>
                </div>
              ) : usersError ? (
                <div className="text-center py-12 text-rose-500 text-sm font-semibold">
                  {usersError}
                </div>
              ) : deptUsers.length === 0 ? (
                <div className="text-center py-12 text-text-muted text-sm font-semibold">
                  No members found in this department.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-text-muted font-black">
                        <th className="pb-3 pl-2">User</th>
                        <th className="pb-3">Email</th>
                        <th className="pb-3 text-center">Status</th>
                        <th className="pb-3 text-center">Report Exclusion</th>
                        <th className="pb-3 pr-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {deptUsers.map(u => {
                        const isExcluded = u.exclude_from_reports;
                        const isDisabled = u.user_type === 'DISABLED';
                        const isWorking = actionInProgress === u.id;
                        
                        return (
                          <tr key={u.id} className="text-xs text-white hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 pl-2 flex items-center gap-2.5 font-bold">
                              {u.image ? (
                                <img src={u.image} alt={u.name} className="w-7 h-7 rounded-full object-cover border border-white/10" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-black uppercase text-[10px]">
                                  {u.name.slice(0, 2)}
                                </div>
                              )}
                              <span>{u.name}</span>
                            </td>
                            <td className="py-3 text-text-muted font-medium">{u.email}</td>
                            <td className="py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide ${isDisabled ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                {isDisabled ? 'INACTIVE' : 'ACTIVE'}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide ${isExcluded ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                {isExcluded ? 'EXCLUDED' : 'INCLUDED'}
                              </span>
                            </td>
                            <td className="py-3 pr-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  disabled={isWorking}
                                  onClick={() => handleToggleExclude(u)}
                                  className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${isExcluded ? 'bg-slate-500/10 border-slate-500/20 text-slate-300 hover:bg-slate-500/20' : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'}`}
                                >
                                  {isWorking ? '...' : isExcluded ? 'Include Data' : 'Exclude Data'}
                                </button>
                                {isErodeIntern ? (
                                  <button
                                    disabled={isWorking}
                                    onClick={() => handleRemoveIntern(u)}
                                    className="px-3 py-1 rounded-xl text-[10px] font-bold transition-all border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                  >
                                    {isWorking ? '...' : 'Remove'}
                                  </button>
                                ) : (
                                  <button
                                    disabled={isWorking}
                                    onClick={() => handleToggleDeactivate(u)}
                                    className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${isDisabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'}`}
                                  >
                                    {isWorking ? '...' : isDisabled ? 'Activate' : 'Deactivate'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button 
                onClick={() => setIsUsersModalOpen(false)}
                className="px-4 py-2 bg-white/5 border border-glass-border hover:bg-white/10 text-white font-bold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentDashboard;
