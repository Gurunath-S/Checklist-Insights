import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Search, Briefcase, Calendar, ChevronLeft, ChevronRight,
  X, Eye, CheckCircle2, Circle, Hash, ToggleLeft, MessageSquare,
  ClipboardCheck, Clock, Award, Building, User, Layers, ArrowUpRight,
  XCircle
} from 'lucide-react';
import LoadingState from '../UI/LoadingState';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const POSITIONS = [
  'FULL_STACK_DEVELOPER',
  'POWER_BI_DEVELOPER',
  'SALES',
  'HUMAN_RESOURCE',
  'TESTING',
  'SALESFORCE',
  'PUBLIC'
];

const DATE_PRESETS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Custom Range', value: 'custom' }
];

export default function ReportsPage({ currentUser }) {
  const [activeTab, setActiveTab] = useState('submissions');

  // 1. Detailed Submissions Tab States
  const [subSearch, setSubSearch] = useState('');
  const [subPosition, setSubPosition] = useState('');
  const [subDatePreset, setSubDatePreset] = useState('all');
  const [subStartDate, setSubStartDate] = useState('');
  const [subEndDate, setSubEndDate] = useState('');
  const [subPage, setSubPage] = useState(1);
  const [subLimit, setSubLimit] = useState(15);
  const [subTotal, setSubTotal] = useState(0);
  const [subTotalPages, setSubTotalPages] = useState(1);
  const [subReports, setSubReports] = useState([]);
  const [subLoading, setSubLoading] = useState(true);

  // 2. Department Report Tab States
  const [deptDatePreset, setDeptDatePreset] = useState('all');
  const [deptStartDate, setDeptStartDate] = useState('');
  const [deptEndDate, setDeptEndDate] = useState('');
  const [deptReports, setDeptReports] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);

  // 3. Template Report Tab States
  const [tplDatePreset, setTplDatePreset] = useState('all');
  const [tplStartDate, setTplStartDate] = useState('');
  const [tplEndDate, setTplEndDate] = useState('');
  const [tplReports, setTplReports] = useState([]);
  const [tplLoading, setTplLoading] = useState(false);

  // 4. User Compliance Tab States
  const [userSearch, setUserSearch] = useState('');
  const [userDatePreset, setUserDatePreset] = useState('all');
  const [userStartDate, setUserStartDate] = useState('');
  const [userEndDate, setUserEndDate] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userLimit, setUserLimit] = useState(15);
  const [userTotal, setUserTotal] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userReports, setUserReports] = useState([]);
  const [userLoading, setUserLoading] = useState(false);

  // Dropdown UI States
  const [isSubPosOpen, setIsSubPosOpen] = useState(false);
  const [isSubDateOpen, setIsSubDateOpen] = useState(false);
  const [isSubLimitOpen, setIsSubLimitOpen] = useState(false);
  const [isDeptDateOpen, setIsDeptDateOpen] = useState(false);
  const [isTplDateOpen, setIsTplDateOpen] = useState(false);
  const [isUserDateOpen, setIsUserDateOpen] = useState(false);
  const [isUserLimitOpen, setIsUserLimitOpen] = useState(false);

  // Details Modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDetails, setReportDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const getPresetDates = (preset) => {
    const now = new Date();
    let start = '';
    let end = '';

    if (preset === 'today') {
      start = new Date(now.setHours(0,0,0,0)).toISOString();
      end = new Date(now.setHours(23,59,59,999)).toISOString();
    } else if (preset === 'week') {
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
      start = new Date(firstDay.setHours(0,0,0,0)).toISOString();
      end = new Date().toISOString();
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      start = new Date(firstDay.setHours(0,0,0,0)).toISOString();
      end = new Date().toISOString();
    }
    return { start, end };
  };

  // 1. Fetch detailed submissions
  const fetchSubmissions = async (pageNumber = subPage, currentLimit = subLimit) => {
    setSubLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE}/insights/reports?page=${pageNumber}&limit=${currentLimit}`;
      
      if (subSearch) url += `&search=${encodeURIComponent(subSearch)}`;
      if (subPosition) url += `&position=${encodeURIComponent(subPosition)}`;

      if (subDatePreset !== 'all' && subDatePreset !== 'custom') {
        const { start, end } = getPresetDates(subDatePreset);
        if (start) url += `&startDate=${encodeURIComponent(start)}`;
        if (end) url += `&endDate=${encodeURIComponent(end)}`;
      } else if (subDatePreset === 'custom') {
        if (subStartDate) {
          const start = new Date(subStartDate + 'T00:00:00').toISOString();
          url += `&startDate=${encodeURIComponent(start)}`;
        }
        if (subEndDate) {
          const end = new Date(subEndDate + 'T23:59:59').toISOString();
          url += `&endDate=${encodeURIComponent(end)}`;
        }
      }

      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setSubReports(res.data.reports || []);
      setSubTotal(res.data.total || 0);
      setSubTotalPages(res.data.totalPages || 1);
      setSubPage(res.data.page || 1);
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setSubLoading(false);
    }
  };

  // 2. Fetch department performance
  const fetchDepartments = async () => {
    setDeptLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE}/insights/reports/departments?`;
      
      if (deptDatePreset !== 'all' && deptDatePreset !== 'custom') {
        const { start, end } = getPresetDates(deptDatePreset);
        if (start) url += `&startDate=${encodeURIComponent(start)}`;
        if (end) url += `&endDate=${encodeURIComponent(end)}`;
      } else if (deptDatePreset === 'custom') {
        if (deptStartDate) {
          const start = new Date(deptStartDate + 'T00:00:00').toISOString();
          url += `&startDate=${encodeURIComponent(start)}`;
        }
        if (deptEndDate) {
          const end = new Date(deptEndDate + 'T23:59:59').toISOString();
          url += `&endDate=${encodeURIComponent(end)}`;
        }
      }

      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setDeptReports(res.data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    } finally {
      setDeptLoading(false);
    }
  };

  // 3. Fetch template summary
  const fetchTemplates = async () => {
    setTplLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE}/insights/reports/templates?`;
      
      if (tplDatePreset !== 'all' && tplDatePreset !== 'custom') {
        const { start, end } = getPresetDates(tplDatePreset);
        if (start) url += `&startDate=${encodeURIComponent(start)}`;
        if (end) url += `&endDate=${encodeURIComponent(end)}`;
      } else if (tplDatePreset === 'custom') {
        if (tplStartDate) {
          const start = new Date(tplStartDate + 'T00:00:00').toISOString();
          url += `&startDate=${encodeURIComponent(start)}`;
        }
        if (tplEndDate) {
          const end = new Date(tplEndDate + 'T23:59:59').toISOString();
          url += `&endDate=${encodeURIComponent(end)}`;
        }
      }

      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setTplReports(res.data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setTplLoading(false);
    }
  };

  // 4. Fetch user compliance report
  const fetchUsersReport = async (pageNumber = userPage, currentLimit = userLimit) => {
    setUserLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE}/insights/reports/users?page=${pageNumber}&limit=${currentLimit}`;
      
      if (userSearch) url += `&search=${encodeURIComponent(userSearch)}`;

      if (userDatePreset !== 'all' && userDatePreset !== 'custom') {
        const { start, end } = getPresetDates(userDatePreset);
        if (start) url += `&startDate=${encodeURIComponent(start)}`;
        if (end) url += `&endDate=${encodeURIComponent(end)}`;
      } else if (userDatePreset === 'custom') {
        if (userStartDate) {
          const start = new Date(userStartDate + 'T00:00:00').toISOString();
          url += `&startDate=${encodeURIComponent(start)}`;
        }
        if (userEndDate) {
          const end = new Date(userEndDate + 'T23:59:59').toISOString();
          url += `&endDate=${encodeURIComponent(end)}`;
        }
      }

      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setUserReports(res.data.users || []);
      setUserTotal(res.data.total || 0);
      setUserTotalPages(res.data.totalPages || 1);
      setUserPage(res.data.page || 1);
    } catch (err) {
      console.error('Error fetching user compliance report:', err);
    } finally {
      setUserLoading(false);
    }
  };

  // ─── Debounces / Hooks ──────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'submissions') {
      const delay = setTimeout(() => fetchSubmissions(1, subLimit), 300);
      return () => clearTimeout(delay);
    }
  }, [subSearch, subPosition, subDatePreset, subStartDate, subEndDate, activeTab]);

  useEffect(() => {
    if (activeTab === 'departments') {
      fetchDepartments();
    }
  }, [deptDatePreset, deptStartDate, deptEndDate, activeTab]);

  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates();
    }
  }, [tplDatePreset, tplStartDate, tplEndDate, activeTab]);

  useEffect(() => {
    if (activeTab === 'users') {
      const delay = setTimeout(() => fetchUsersReport(1, userLimit), 300);
      return () => clearTimeout(delay);
    }
  }, [userSearch, userDatePreset, userStartDate, userEndDate, activeTab]);

  const handleSubLimitChange = (val) => {
    setSubLimit(val);
    setIsSubLimitOpen(false);
    fetchSubmissions(1, val);
  };

  const handleUserLimitChange = (val) => {
    setUserLimit(val);
    setIsUserLimitOpen(false);
    fetchUsersReport(1, val);
  };

  const inspectReportDetails = async (report) => {
    setSelectedReport(report);
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const token = localStorage.getItem('token');
      const dateParam = report.checklist_date
        ? String(report.checklist_date).slice(0, 10)
        : String(report.submitted_day).slice(0, 10);
      const res = await axios.get(
        `${API_BASE}/insights/reports/detail?userId=${report.organisation_user_id}&templateId=${report.template_id}&date=${dateParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReportDetails(res.data || []);
    } catch (err) {
      console.error(err);
      setDetailsError('Failed to fetch details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart className="text-accent animate-pulse" size={24} />
            Checklist Reports
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Access multi-dimensional analytics. View department, template, user compliance or detailed logs.
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-white/5 border border-glass-border rounded-2xl w-max max-w-full">
        {[
          { id: 'submissions', label: 'Detailed Submissions', icon: ClipboardCheck },
          { id: 'departments', label: 'Department Reports', icon: Building },
          { id: 'templates', label: 'Template Reports', icon: Layers },
          { id: 'users', label: 'User Reports', icon: User }
        ].map(tab => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isActive 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <IconComp size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Detailed Submissions ────────────────────────────────────── */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          {/* Submissions Filter Panel */}
          <div className="relative z-50 bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
              
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search by user or template name..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  className="w-full bg-white/5 border border-glass-border rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent/40"
                />
              </div>

              {/* Department Dropdown */}
              <div className="relative w-full lg:w-56">
                <button
                  type="button"
                  onClick={() => {
                    setIsSubPosOpen(!isSubPosOpen);
                    setIsSubDateOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white/5 border border-glass-border rounded-2xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Briefcase size={14} className="text-text-muted shrink-0" />
                    <span className="truncate">
                      {subPosition ? subPosition.replace(/_/g, ' ') : 'All Departments'}
                    </span>
                  </div>
                  <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isSubPosOpen ? 'rotate-90' : ''}`} />
                </button>
                
                {isSubPosOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsSubPosOpen(false)}></div>
                    <div className="absolute left-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-2xl p-2.5 shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      <button
                        type="button"
                        onClick={() => { setSubPosition(''); setIsSubPosOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${!subPosition ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}
                      >
                        All Departments
                      </button>
                      {POSITIONS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => { setSubPosition(p); setIsSubPosOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${subPosition === p ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}
                        >
                          {p.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Date Preset Dropdown */}
              <div className="relative w-full lg:w-48">
                <button
                  type="button"
                  onClick={() => {
                    setIsSubDateOpen(!isSubDateOpen);
                    setIsSubPosOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white/5 border border-glass-border rounded-2xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Calendar size={14} className="text-text-muted shrink-0" />
                    <span className="truncate">
                      {DATE_PRESETS.find(p => p.value === subDatePreset)?.label || 'All Time'}
                    </span>
                  </div>
                  <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isSubDateOpen ? 'rotate-90' : ''}`} />
                </button>
                
                {isSubDateOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsSubDateOpen(false)}></div>
                    <div className="absolute left-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-2xl p-2.5 shadow-2xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      {DATE_PRESETS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => { setSubDatePreset(p.value); setIsSubDateOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${subDatePreset === p.value ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Clear button */}
              {(subSearch || subPosition || subDatePreset !== 'all') && (
                <button
                  onClick={() => {
                    setSubSearch('');
                    setSubPosition('');
                    setSubDatePreset('all');
                    setSubStartDate('');
                    setSubEndDate('');
                  }}
                  className="px-4 py-2.5 border border-danger/25 bg-danger/5 hover:bg-danger/10 text-danger text-xs font-bold rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <X size={14} />
                  <span>Reset</span>
                </button>
              )}

            </div>

            {/* Custom Dates Input panel */}
            {subDatePreset === 'custom' && (
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-glass-border/30 animate-in slide-in-from-top-2 duration-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Submission Date:</span>
                <input
                  type="date"
                  value={subStartDate}
                  onChange={(e) => setSubStartDate(e.target.value)}
                  className="w-full sm:w-40 bg-white/5 border border-glass-border rounded-xl px-3 py-1.5 text-xs text-white"
                />
                <span className="text-xs text-text-muted">to</span>
                <input
                  type="date"
                  value={subEndDate}
                  onChange={(e) => setSubEndDate(e.target.value)}
                  className="w-full sm:w-40 bg-white/5 border border-glass-border rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>
            )}
          </div>

          {/* Submissions List Table */}
          {subLoading ? (
            <LoadingState />
          ) : (
            <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-glass-border bg-white/5 text-[10px] font-black uppercase tracking-widest text-text-muted">
                      <th className="px-6 py-4">Submitted By</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Template</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Completion</th>
                      <th className="px-6 py-4 text-center">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border text-xs">
                    {subReports.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12 text-text-muted font-semibold">
                          No matching submissions found.
                        </td>
                      </tr>
                    ) : (
                      subReports.map((r, idx) => {
                        const pct = r.items_count > 0 ? Math.round((r.completed_count / r.items_count) * 100) : 0;
                        const isBackdated = r.selected_date && String(r.submitted_day).slice(0,10) !== String(r.checklist_date || r.selected_date).slice(0,10);
                        return (
                          <tr key={idx} className="hover:bg-white/2 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img src={r.user_image || `https://ui-avatars.com/api/?name=${r.user_name}&background=6366f1&color=fff`} className="w-8 h-8 rounded-lg object-cover" />
                                <div>
                                  <p className="font-bold text-white">{r.user_name}</p>
                                  <p className="text-[10px] text-text-muted">{r.user_email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 capitalize font-semibold text-white">
                              {r.user_position ? r.user_position.replace(/_/g, ' ').toLowerCase() : 'public'}
                            </td>
                            <td className="px-6 py-4 font-semibold text-accent">{r.template_name}</td>
                            <td className="px-6 py-4 text-white">
                              <p className="font-semibold">{formatDate(r.checklist_date || r.submitted_day)}</p>
                              {isBackdated && (
                                <p className="text-[10px] text-amber-400 font-medium mt-0.5 flex items-center gap-1">
                                  <Clock size={11} />
                                  <span>Submitted: {formatDate(r.submitted_day)}</span>
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1 w-28">
                                <span className="text-[10px] font-bold text-white flex justify-between">
                                  <span>{pct}%</span>
                                  <span className="text-text-muted">{r.completed_count}/{r.items_count}</span>
                                </span>
                                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center">
                                <button onClick={() => inspectReportDetails(r)} className="p-2 hover:bg-white/10 rounded-lg text-primary hover:text-white transition-all cursor-pointer">
                                  <Eye size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {subReports.length > 0 && (
                <div className="px-6 py-4 border-t border-glass-border bg-white/2 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black tracking-wider text-text-muted uppercase">
                      Page {subPage} of {subTotalPages} ({subTotal} total)
                    </span>
                    <div className="relative">
                      <button onClick={() => setIsSubLimitOpen(!isSubLimitOpen)} className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-glass-border rounded-xl text-[10px] font-bold text-white">
                        <span>Show {subLimit}</span>
                        <ChevronRight size={12} className={`transition-transform ${isSubLimitOpen ? 'rotate-90' : ''}`} />
                      </button>
                      {isSubLimitOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsSubLimitOpen(false)}></div>
                          <div className="absolute left-0 bottom-full mb-2 bg-bg-card border border-glass-border rounded-xl p-1.5 shadow-2xl z-50 min-w-[90px] space-y-0.5">
                            {[15, 30, 50].map(v => (
                              <button key={v} onClick={() => handleSubLimitChange(v)} className="w-full text-left px-2 py-1 rounded-lg text-xs font-semibold text-text-muted hover:bg-white/5 hover:text-white">
                                Show {v}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => fetchSubmissions(subPage - 1)} disabled={subPage === 1} className="p-1 border border-glass-border rounded-lg text-white hover:bg-white/10 disabled:opacity-20">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => fetchSubmissions(subPage + 1)} disabled={subPage === subTotalPages} className="p-1 border border-glass-border rounded-lg text-white hover:bg-white/10 disabled:opacity-20">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Department Summary ─────────────────────────────────────── */}
      {activeTab === 'departments' && (
        <div className="space-y-6 animate-fade-in">
          {/* Department-specific Filters */}
          <div className="relative z-50 bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span className="text-xs font-black uppercase tracking-wider text-white">Department-Wise Submission Breakdown</span>
              <div className="relative w-full sm:w-52">
                <button
                  type="button"
                  onClick={() => setIsDeptDateOpen(!isDeptDateOpen)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white/5 border border-glass-border rounded-xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Calendar size={14} className="text-text-muted shrink-0" />
                    <span className="truncate">
                      {DATE_PRESETS.find(p => p.value === deptDatePreset)?.label || 'All Time'}
                    </span>
                  </div>
                  <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isDeptDateOpen ? 'rotate-90' : ''}`} />
                </button>
                {isDeptDateOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDeptDateOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-xl p-2.5 shadow-2xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      {DATE_PRESETS.map((p) => (
                        <button key={p.value} type="button" onClick={() => { setDeptDatePreset(p.value); setIsDeptDateOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${deptDatePreset === p.value ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            {deptDatePreset === 'custom' && (
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-glass-border/30 animate-in slide-in-from-top-2 duration-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Submission Date:</span>
                <input type="date" value={deptStartDate} onChange={(e) => setDeptStartDate(e.target.value)} className="w-full sm:w-40 bg-white/5 border border-glass-border rounded-xl px-3 py-1.5 text-xs text-white" />
                <span className="text-xs text-text-muted">to</span>
                <input type="date" value={deptEndDate} onChange={(e) => setDeptEndDate(e.target.value)} className="w-full sm:w-40 bg-white/5 border border-glass-border rounded-xl px-3 py-1.5 text-xs text-white" />
              </div>
            )}
          </div>

          {/* Department Reports Table */}
          {deptLoading ? (
            <LoadingState />
          ) : (
            <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-glass-border bg-white/5 text-[10px] font-black uppercase tracking-widest text-text-muted">
                    <th className="px-6 py-4">Department / Position</th>
                    <th className="px-6 py-4">Total Submissions</th>
                    <th className="px-6 py-4">Compliance Score</th>
                    <th className="px-6 py-4">Active Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border text-xs">
                  {deptReports.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-12 text-text-muted font-semibold">
                        No submissions recorded for any department in this range.
                      </td>
                    </tr>
                  ) : (
                    deptReports.map((d, idx) => (
                      <tr key={idx} className="hover:bg-white/2 transition-colors">
                        <td className="px-6 py-4 font-bold text-white capitalize">
                          {d.department.replace(/_/g, ' ').toLowerCase()}
                        </td>
                        <td className="px-6 py-4 font-semibold text-accent-light">
                          {d.total_submissions} submissions
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 w-32">
                            <span className="text-[10px] font-bold text-white">{d.avg_completion_rate}% Completion</span>
                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${d.avg_completion_rate}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-text-muted">
                          {d.total_users} {d.total_users === 1 ? 'user' : 'users'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Template Summary ───────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="space-y-6 animate-fade-in">
          {/* Template-specific Filters */}
          <div className="relative z-50 bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span className="text-xs font-black uppercase tracking-wider text-white">Template Performance Summaries</span>
              <div className="relative w-full sm:w-52">
                <button
                  type="button"
                  onClick={() => setIsTplDateOpen(!isTplDateOpen)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white/5 border border-glass-border rounded-xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Calendar size={14} className="text-text-muted shrink-0" />
                    <span className="truncate">
                      {DATE_PRESETS.find(p => p.value === tplDatePreset)?.label || 'All Time'}
                    </span>
                  </div>
                  <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isTplDateOpen ? 'rotate-90' : ''}`} />
                </button>
                {isTplDateOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsTplDateOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-xl p-2.5 shadow-2xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      {DATE_PRESETS.map((p) => (
                        <button key={p.value} type="button" onClick={() => { setTplDatePreset(p.value); setIsTplDateOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${tplDatePreset === p.value ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            {tplDatePreset === 'custom' && (
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-glass-border/30 animate-in slide-in-from-top-2 duration-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Submission Date:</span>
                <input type="date" value={tplStartDate} onChange={(e) => setTplStartDate(e.target.value)} className="w-full sm:w-40 bg-white/5 border border-glass-border rounded-xl px-3 py-1.5 text-xs text-white" />
                <span className="text-xs text-text-muted">to</span>
                <input type="date" value={tplEndDate} onChange={(e) => setTplEndDate(e.target.value)} className="w-full sm:w-40 bg-white/5 border border-glass-border rounded-xl px-3 py-1.5 text-xs text-white" />
              </div>
            )}
          </div>

          {/* Template Reports Table */}
          {tplLoading ? (
            <LoadingState />
          ) : (
            <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-glass-border bg-white/5 text-[10px] font-black uppercase tracking-widest text-text-muted">
                    <th className="px-6 py-4">Checklist Template</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Total Submissions</th>
                    <th className="px-6 py-4">Responses Logged</th>
                    <th className="px-6 py-4">Average Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border text-xs">
                  {tplReports.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-12 text-text-muted font-semibold">
                        No templates submissions found for the specified filters.
                      </td>
                    </tr>
                  ) : (
                    tplReports.map((t, idx) => (
                      <tr key={idx} className="hover:bg-white/2 transition-colors">
                        <td className="px-6 py-4 font-bold text-accent">
                          {t.template_name}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            t.priority === 'HIGH' 
                              ? 'bg-danger/15 border-danger/30 text-danger' 
                              : t.priority === 'MEDIUM' 
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                              : 'bg-primary/15 border-primary/30 text-primary-light'
                          }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-white">
                          {t.total_submissions} submissions
                        </td>
                        <td className="px-6 py-4 text-text-muted font-medium">
                          {t.total_responses} entries
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 w-32">
                            <span className="text-[10px] font-bold text-white">{t.avg_completion_rate}% Compliance</span>
                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${t.avg_completion_rate}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 4: User Compliance Report ─────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-fade-in">
          {/* User-specific Filters */}
          <div className="relative z-50 bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
              
              {/* Search user */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search by user name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-white/5 border border-glass-border rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-accent/40"
                />
              </div>

              {/* Date dropdown */}
              <div className="relative w-full lg:w-52">
                <button
                  type="button"
                  onClick={() => setIsUserDateOpen(!isUserDateOpen)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white/5 border border-glass-border rounded-xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Calendar size={14} className="text-text-muted shrink-0" />
                    <span className="truncate">
                      {DATE_PRESETS.find(p => p.value === userDatePreset)?.label || 'All Time'}
                    </span>
                  </div>
                  <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isUserDateOpen ? 'rotate-90' : ''}`} />
                </button>
                {isUserDateOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserDateOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-xl p-2.5 shadow-2xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      {DATE_PRESETS.map((p) => (
                        <button key={p.value} type="button" onClick={() => { setUserDatePreset(p.value); setIsUserDateOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${userDatePreset === p.value ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Clear button */}
              {(userSearch || userDatePreset !== 'all') && (
                <button
                  onClick={() => {
                    setUserSearch('');
                    setUserDatePreset('all');
                    setUserStartDate('');
                    setUserEndDate('');
                  }}
                  className="px-4 py-2.5 border border-danger/25 bg-danger/5 hover:bg-danger/10 text-danger text-xs font-bold rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <X size={14} />
                  <span>Reset</span>
                </button>
              )}

            </div>

            {/* Custom Range */}
            {userDatePreset === 'custom' && (
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-glass-border/30 animate-in slide-in-from-top-2 duration-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Submission Date:</span>
                <input type="date" value={userStartDate} onChange={(e) => setUserStartDate(e.target.value)} className="w-full sm:w-40 bg-white/5 border border-glass-border rounded-xl px-3 py-1.5 text-xs text-white" />
                <span className="text-xs text-text-muted">to</span>
                <input type="date" value={userEndDate} onChange={(e) => setUserEndDate(e.target.value)} className="w-full sm:w-40 bg-white/5 border border-glass-border rounded-xl px-3 py-1.5 text-xs text-white" />
              </div>
            )}
          </div>

          {/* User Compliance Table */}
          {userLoading ? (
            <LoadingState />
          ) : (
            <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-glass-border bg-white/5 text-[10px] font-black uppercase tracking-widest text-text-muted">
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Department / Position</th>
                      <th className="px-6 py-4">Total Submissions</th>
                      <th className="px-6 py-4">Compliance Rating</th>
                      <th className="px-6 py-4">Last Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border text-xs">
                    {userReports.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-12 text-text-muted font-semibold">
                          No users found matching search criteria.
                        </td>
                      </tr>
                    ) : (
                      userReports.map((u, idx) => (
                        <tr key={idx} className="hover:bg-white/2 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={u.user_image || `https://ui-avatars.com/api/?name=${u.user_name}&background=6366f1&color=fff`} className="w-8 h-8 rounded-lg object-cover" />
                              <div>
                                <p className="font-bold text-white">{u.user_name}</p>
                                <p className="text-[10px] text-text-muted">{u.user_email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 capitalize font-semibold text-white">
                            {u.user_position ? u.user_position.replace(/_/g, ' ').toLowerCase() : 'public'}
                          </td>
                          <td className="px-6 py-4 font-semibold text-accent-light">
                            {u.total_submissions} checklists
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 w-32">
                              <span className="text-[10px] font-bold text-white">{u.avg_completion_rate}% Completion</span>
                              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${u.avg_completion_rate}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-text-muted font-semibold">
                            {formatDate(u.last_submission_date)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* User Report Pagination */}
              {userReports.length > 0 && (
                <div className="px-6 py-4 border-t border-glass-border bg-white/2 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black tracking-wider text-text-muted uppercase">
                      Page {userPage} of {userTotalPages} ({userTotal} total)
                    </span>
                    <div className="relative">
                      <button onClick={() => setIsUserLimitOpen(!isUserLimitOpen)} className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-glass-border rounded-xl text-[10px] font-bold text-white">
                        <span>Show {userLimit}</span>
                        <ChevronRight size={12} className={`transition-transform ${isUserLimitOpen ? 'rotate-90' : ''}`} />
                      </button>
                      {isUserLimitOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsUserLimitOpen(false)}></div>
                          <div className="absolute left-0 bottom-full mb-2 bg-bg-card border border-glass-border rounded-xl p-1.5 shadow-2xl z-50 min-w-[90px] space-y-0.5">
                            {[15, 30, 50].map(v => (
                              <button key={v} onClick={() => handleUserLimitChange(v)} className="w-full text-left px-2 py-1 rounded-lg text-xs font-semibold text-text-muted hover:bg-white/5 hover:text-white">
                                Show {v}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => fetchUsersReport(userPage - 1)} disabled={userPage === 1} className="p-1 border border-glass-border rounded-lg text-white hover:bg-white/10 disabled:opacity-20">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => fetchUsersReport(userPage + 1)} disabled={userPage === userTotalPages} className="p-1 border border-glass-border rounded-lg text-white hover:bg-white/10 disabled:opacity-20">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Inspection Modal (Universal Details Inspector) ──────────────── */}
      {selectedReport && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-card backdrop-blur-2xl border border-glass-border rounded-3xl p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-glass-border/30 pb-4 mb-4 shrink-0">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider bg-accent/15 border border-accent/25 text-accent px-2 py-0.5 rounded-full">
                  Detailed Submission Log
                </span>
                <h3 className="text-base font-extrabold text-white mt-1.5">
                  {selectedReport.template_name}
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  Submitted by <span className="text-white font-semibold">{selectedReport.user_name}</span> for <span className="text-white font-semibold">{formatDate(selectedReport.checklist_date || selectedReport.submitted_day)}</span>
                  {selectedReport.selected_date && String(selectedReport.submitted_day).slice(0,10) !== String(selectedReport.checklist_date || selectedReport.selected_date).slice(0,10) && (
                    <span className="text-amber-400 font-medium ml-1.5">
                      (Submitted: {formatDate(selectedReport.submitted_day)})
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-1.5 hover:bg-white/10 rounded-lg text-text-muted hover:text-white transition-all cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 py-1 space-y-3">
              {detailsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-text-muted">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
                  <p className="text-xs">Loading items responses...</p>
                </div>
              ) : detailsError ? (
                <div className="py-12 text-center text-danger font-semibold text-xs bg-danger/5 border border-danger/15 rounded-2xl">
                  {detailsError}
                </div>
              ) : reportDetails.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-xs">
                  No responses recorded in this submission.
                </div>
              ) : (
                reportDetails.map((item, idx) => {
                  const isNumeric = item.input_type === 'Numeric';
                  const isDone = item.status;
                  const hasComment = item.comments && item.comments.trim().length > 0;
                  return (
                    <div key={idx} className="bg-white/5 border border-glass-border rounded-xl px-3 py-2 flex items-center justify-between gap-4 hover:bg-white/8 transition-all">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isNumeric ? 'bg-white/5 text-text-muted border border-glass-border' : (isDone ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-rose-500/15 text-rose-400 border border-rose-500/25')}`}>
                          {isNumeric ? <Hash size={14} /> : (isDone ? <CheckCircle2 size={14} /> : <XCircle size={14} />)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white leading-snug break-words whitespace-normal">{item.checklist_name}</p>
                          {hasComment && (
                            <p className="text-[10px] text-text-muted mt-0.5 flex items-start gap-1">
                              <MessageSquare size={11} className="shrink-0 mt-0.5 text-primary" />
                              <span className="italic leading-normal break-words whitespace-normal">{item.comments}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {isNumeric ? (
                          <span className="text-sm font-black text-primary-light">{item.input ?? '—'}</span>
                        ) : (
                          <span className={`flex items-center gap-1 text-xs font-black uppercase tracking-wider ${isDone ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isDone ? <><CheckCircle2 size={13} /> Yes</> : <><XCircle size={13} /> No</>}
                          </span>
                        )}
                        <span className="text-[8px] font-black uppercase tracking-widest text-text-muted bg-white/5 px-2 py-0.5 rounded-full border border-glass-border">
                          {isNumeric ? 'numeric' : 'boolean'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-glass-border/30 shrink-0">
              <button onClick={() => setSelectedReport(null)} className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-glass-border text-xs font-bold text-white rounded-xl">
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
