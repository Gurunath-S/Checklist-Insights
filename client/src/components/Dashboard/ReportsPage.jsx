import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Search, Briefcase, Calendar, ChevronLeft, ChevronRight,
  X, Eye, CheckCircle2, Circle, Hash, ToggleLeft, MessageSquare,
  ClipboardCheck, Clock, Award, Building, User, Layers, ArrowUpRight,
  XCircle
} from 'lucide-react';
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
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

  // Tag Report Tab States
  const [tagDatePreset, setTagDatePreset] = useState('all');
  const [tagStartDate, setTagStartDate] = useState('');
  const [tagEndDate, setTagEndDate] = useState('');
  const [tagReports, setTagReports] = useState([]);
  const [tagLoading, setTagLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [isTagDateOpen, setIsTagDateOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [tagPositionFilter, setTagPositionFilter] = useState('all');
  const [tagRecurrenceFilter, setTagRecurrenceFilter] = useState('all');
  const [isTagPosOpen, setIsTagPosOpen] = useState(false);
  const [isTagRecurOpen, setIsTagRecurOpen] = useState(false);
  const [tagScrollTop, setTagScrollTop] = useState(0);

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

  // Derived state: Tag filters
  const filteredTags = tagReports.filter(t => {
    const matchesSearch = t.tag_name.toLowerCase().includes(tagSearch.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(tagSearch.toLowerCase()));
    const matchesPosition = tagPositionFilter === 'all' || t.user_position === tagPositionFilter;
    const matchesRecurrence = tagRecurrenceFilter === 'all' || t.recurrent === tagRecurrenceFilter;
    return matchesSearch && matchesPosition && matchesRecurrence;
  });

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

  // Fetch tag summary
  const fetchTags = async () => {
    setTagLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE}/insights/reports/tags?`;
      
      if (tagDatePreset !== 'all' && tagDatePreset !== 'custom') {
        const { start, end } = getPresetDates(tagDatePreset);
        if (start) url += `&startDate=${encodeURIComponent(start)}`;
        if (end) url += `&endDate=${encodeURIComponent(end)}`;
      } else if (tagDatePreset === 'custom') {
        if (tagStartDate) {
          const start = new Date(tagStartDate + 'T00:00:00').toISOString();
          url += `&startDate=${encodeURIComponent(start)}`;
        }
        if (tagEndDate) {
          const end = new Date(tagEndDate + 'T23:59:59').toISOString();
          url += `&endDate=${encodeURIComponent(end)}`;
        }
      }

      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data || [];
      setTagReports(data);
      if (data.length > 0) {
        if (!selectedTag) {
          setSelectedTag(data[0]);
        } else {
          const updated = data.find(t => t.tag_id === selectedTag.tag_id);
          if (updated) setSelectedTag(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
    } finally {
      setTagLoading(false);
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
    if (activeTab === 'tags') {
      fetchTags();
    }
  }, [tagDatePreset, tagStartDate, tagEndDate, activeTab]);

  useEffect(() => {
    if (activeTab === 'tags' && tagReports.length > 0) {
      const filtered = tagReports.filter(t => {
        const matchesSearch = t.tag_name.toLowerCase().includes(tagSearch.toLowerCase()) ||
          (t.description && t.description.toLowerCase().includes(tagSearch.toLowerCase()));
        const matchesPosition = tagPositionFilter === 'all' || t.user_position === tagPositionFilter;
        const matchesRecurrence = tagRecurrenceFilter === 'all' || t.recurrent === tagRecurrenceFilter;
        return matchesSearch && matchesPosition && matchesRecurrence;
      });

      if (filtered.length > 0) {
        const stillExists = filtered.find(t => t.tag_id === selectedTag?.tag_id);
        if (!stillExists) {
          setSelectedTag(filtered[0]);
        }
      } else {
        setSelectedTag(null);
      }
    }
  }, [tagSearch, tagPositionFilter, tagRecurrenceFilter, tagReports, activeTab]);

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
          { id: 'tags', label: 'Tag Reports', icon: Hash },
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
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-6 py-4">Owner / Creator</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Total Submissions</th>
                    <th className="px-6 py-4">Responses Logged</th>
                    <th className="px-6 py-4">Average Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border text-xs">
                  {tplReports.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-text-muted font-semibold">
                        No templates submissions found for the specified filters.
                      </td>
                    </tr>
                  ) : (
                    tplReports.map((t, idx) => (
                      <tr key={idx} className="hover:bg-white/2 transition-colors">
                        <td className="px-6 py-4 font-bold text-accent">
                          {t.template_name}
                        </td>
                        <td className="px-6 py-4 text-text-muted font-medium">
                          {t.template_created_at ? new Date(t.template_created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <User size={12} className="text-text-muted shrink-0" />
                              <span className="font-semibold text-white truncate max-w-[140px]" title={`Owner: ${t.owner_name}`}>{t.owner_name}</span>
                            </div>
                            {t.owner_name !== t.creator_name ? (
                              <span className="text-[9px] text-text-muted mt-0.5 truncate max-w-[140px]" title={`Creator: ${t.creator_name}`}>Creator: {t.creator_name}</span>
                            ) : (
                              <span className="text-[9px] text-text-muted mt-0.5">Creator & Owner</span>
                            )}
                          </div>
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

      {/* ── Tab 5: Tag Summary ───────────────────────────────────────────── */}
      {activeTab === 'tags' && (
        <div className="space-y-6 animate-fade-in">
          {/* Tag-specific Filters */}
          <div className="relative z-50 bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span className="text-xs font-black uppercase tracking-wider text-white">Tag Performance & Relationship Insights</span>
              <div className="relative w-full sm:w-52">
                <button
                  type="button"
                  onClick={() => setIsTagDateOpen(!isTagDateOpen)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white/5 border border-glass-border rounded-xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Calendar size={14} className="text-text-muted shrink-0" />
                    <span className="truncate">
                      {DATE_PRESETS.find(p => p.value === tagDatePreset)?.label || 'All Time'}
                    </span>
                  </div>
                  <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isTagDateOpen ? 'rotate-90' : ''}`} />
                </button>
                {isTagDateOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsTagDateOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-xl p-2.5 shadow-2xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      {DATE_PRESETS.map((p) => (
                        <button key={p.value} type="button" onClick={() => { setTagDatePreset(p.value); setIsTagDateOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${tagDatePreset === p.value ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            {tagDatePreset === 'custom' && (
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-glass-border/30 animate-in slide-in-from-top-2 duration-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Submission Date:</span>
                <input type="date" value={tagStartDate} onChange={(e) => setTagStartDate(e.target.value)} className="w-full sm:w-40 bg-white/5 border border-glass-border rounded-xl px-3 py-1.5 text-xs text-white" />
                <span className="text-xs text-text-muted">to</span>
                <input type="date" value={tagEndDate} onChange={(e) => setTagEndDate(e.target.value)} className="w-full sm:w-40 bg-white/5 border border-glass-border rounded-xl px-3 py-1.5 text-xs text-white" />
              </div>
            )}

            {/* Search, Position and Recurrence Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-glass-border/30">
              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search tag name or desc..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="w-full bg-white/5 border border-glass-border rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-accent/40 transition-all placeholder:text-text-muted/65"
                />
              </div>

              {/* User Position Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTagPosOpen(!isTagPosOpen)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white/5 border border-glass-border rounded-xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
                >
                  <span className="truncate">
                    Position: {tagPositionFilter === 'all' ? 'All Positions' : tagPositionFilter.replace(/_/g, ' ')}
                  </span>
                  <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isTagPosOpen ? 'rotate-90' : ''}`} />
                </button>
                {isTagPosOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsTagPosOpen(false)}></div>
                    <div className="absolute left-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-xl p-2.5 shadow-2xl z-50 space-y-1 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                      <button type="button" onClick={() => { setTagPositionFilter('all'); setIsTagPosOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${tagPositionFilter === 'all' ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}>
                        All Positions
                      </button>
                      {Array.from(new Set(tagReports.map(t => t.user_position).filter(Boolean))).map((pos) => (
                        <button key={pos} type="button" onClick={() => { setTagPositionFilter(pos); setIsTagPosOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${tagPositionFilter === pos ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}>
                          {pos.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Recurrence Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTagRecurOpen(!isTagRecurOpen)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white/5 border border-glass-border rounded-xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
                >
                  <span className="truncate">
                    Recurrence: {tagRecurrenceFilter === 'all' ? 'All Recurrences' : tagRecurrenceFilter}
                  </span>
                  <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isTagRecurOpen ? 'rotate-90' : ''}`} />
                </button>
                {isTagRecurOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsTagRecurOpen(false)}></div>
                    <div className="absolute left-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-xl p-2.5 shadow-2xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      <button type="button" onClick={() => { setTagRecurrenceFilter('all'); setIsTagRecurOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${tagRecurrenceFilter === 'all' ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}>
                        All Recurrences
                      </button>
                      {Array.from(new Set(tagReports.map(t => t.recurrent).filter(Boolean))).map((rec) => (
                        <button key={rec} type="button" onClick={() => { setTagRecurrenceFilter(rec); setIsTagRecurOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${tagRecurrenceFilter === rec ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}>
                          {rec}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {tagLoading ? (
            <LoadingState />
          ) : tagReports.length === 0 ? (
            <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-12 text-center text-text-muted font-semibold">
              No tag submissions found for the specified filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Tags List */}
              <div className="lg:col-span-5 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted px-1">Tags List ({filteredTags.length})</p>
                <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredTags.length === 0 ? (
                    <div className="p-8 border border-glass-border/40 border-dashed rounded-2xl flex items-center justify-center text-text-muted text-xs font-semibold bg-white/2">
                      No tags match the selected filters.
                    </div>
                  ) : (
                    filteredTags.map((t) => {
                    const isSelected = selectedTag?.tag_id === t.tag_id;
                    return (
                      <button
                        key={t.tag_id}
                        type="button"
                        onClick={() => setSelectedTag(t)}
                        className={`w-full text-left p-4 rounded-3xl border transition-all duration-300 cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-br from-primary/15 to-accent/10 border-accent/40 shadow-xl shadow-accent/5'
                            : 'bg-bg-card border-glass-border/60 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-xl ${isSelected ? 'bg-accent/20 text-accent' : 'bg-white/5 text-text-muted'}`}>
                              <Hash size={16} />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-white uppercase tracking-wider">{t.tag_name}</h4>
                              <p className="text-[10px] text-text-muted mt-0.5 line-clamp-1">{t.description || 'No description'}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            t.recurrent === 'YES' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-text-muted'
                          }`}>
                            {t.recurrent}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-glass-border/30 pt-3">
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-text-muted block">Templates</span>
                            <span className="text-xs font-bold text-white">{t.templates_count}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-text-muted block">Submissions</span>
                            <span className="text-xs font-bold text-white">{t.total_submissions}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-text-muted block">Compliance</span>
                            <span className="text-xs font-black text-accent">{t.avg_completion_rate}%</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
                </div>
              </div>

              {/* Right Column: Visual Relations & Details */}
              <div className="lg:col-span-7 space-y-6">
                {selectedTag && (
                  <>
                    {/* Visual 1: SVG Connection Graph */}
                    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 shadow-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest text-white">Relationship Graph</h4>
                          <p className="text-[9px] text-text-muted mt-0.5">Visualization of connected checklist templates</p>
                        </div>
                        <span className="text-[10px] font-bold text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-xl">
                          {selectedTag?.templates_count || 0} Connected
                        </span>
                      </div>

                      {(!selectedTag?.templates || selectedTag.templates.length === 0) ? (
                        <div className="h-[300px] border border-glass-border/40 border-dashed rounded-2xl flex items-center justify-center text-text-muted text-xs font-medium bg-white/2">
                          No checklist templates connected to this tag.
                        </div>
                      ) : (
                        <div className="relative h-[300px] border border-glass-border/30 rounded-2xl bg-white/2 overflow-hidden">
                          {/* SVG connections behind everything */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                            <defs>
                              <linearGradient id="glowing-connector-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8" />
                              </linearGradient>
                            </defs>
                            {selectedTag?.templates?.map((tpl, idx) => {
                              const itemHeight = 68; // 56px card + 12px gap
                              const cardCenterY = 52 + (idx * itemHeight) - tagScrollTop;
                              
                              // Check if the connection point is within the container bounds (top-6 to bottom-6 viewport)
                              const isVisible = cardCenterY >= 28 && cardCenterY <= 272;
                              if (!isVisible) return null;

                              return (
                                <g key={tpl.template_id}>
                                  {/* Curve line */}
                                  <path
                                    d={`M 164 150 C 195 150, 203 ${cardCenterY}, 230 ${cardCenterY}`}
                                    stroke="url(#glowing-connector-grad)"
                                    strokeWidth="2"
                                    fill="none"
                                    className="opacity-70 transition-all duration-75"
                                  />
                                  {/* Pulsing indicator node */}
                                  <circle cx={230} cy={cardCenterY} r="4" fill="#6366f1" className="opacity-75 animate-pulse" />
                                  <circle cx={230} cy={cardCenterY} r="2" fill="#10b981" />
                                </g>
                              );
                            })}
                          </svg>

                          {/* Left Center Node: Selected Tag */}
                          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center p-4 rounded-3xl bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-accent/50 shadow-2xl shadow-accent/15 w-[140px] text-center shrink-0 z-20">
                            <div className="p-2 bg-accent/20 rounded-2xl text-accent mb-2">
                              <Hash size={20} />
                            </div>
                            <span className="text-[11px] font-black text-white uppercase tracking-wider block truncate max-w-full" title={selectedTag.tag_name}>{selectedTag.tag_name}</span>
                            <span className="text-[9px] text-text-muted mt-1">Creator: {selectedTag.creator_name}</span>
                          </div>

                          {/* Right Side: Scrollable Templates Column */}
                          <div 
                            onScroll={handleTagScroll}
                            className="absolute left-[234px] right-6 top-6 bottom-6 overflow-y-auto pr-1 space-y-3 custom-scrollbar py-1 z-20"
                          >
                            {selectedTag?.templates?.map((tpl) => (
                              <div
                                key={tpl.template_id}
                                className="relative h-[56px] flex items-center pl-5 pr-4 rounded-2xl bg-bg-card/95 border border-glass-border/45 hover:border-accent/40 shadow-xl transition-all duration-300"
                              >
                                {/* Decorative Connector Point */}
                                <div className="absolute left-0 top-1/2 -translate-x-1 w-2.5 h-2.5 bg-accent rounded-full border-2 border-bg-card shadow-sm shadow-accent/45" />
                                
                                <div className="flex items-center gap-3 w-full">
                                  <div className="p-2 bg-primary/10 rounded-xl text-primary-light shrink-0">
                                    <Layers size={14} />
                                  </div>
                                  <div className="truncate flex-1">
                                    <p className="text-[11px] font-black text-white leading-normal truncate" title={tpl.template_name}>
                                      {tpl.template_name}
                                    </p>
                                    <p className="text-[9px] text-text-muted mt-0.5 truncate">
                                      Priority: {tpl.priority} | Created: {formatDate(tpl.created_at)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Visual 2: Tag Comparison Chart */}
                    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 shadow-xl space-y-4">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-white">Tag Performance Chart</h4>
                        <p className="text-[9px] text-text-muted mt-0.5">Average compliance rates compared (Top 10 matched tags)</p>
                      </div>

                      <div className="h-[200px] w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={filteredTags.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="tag_name" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 9 }} />
                            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 9 }} />
                            <RechartsTooltip
                              contentStyle={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                              labelClassName="text-white font-bold"
                              itemStyle={{ color: '#accent' }}
                            />
                            <Bar dataKey="avg_completion_rate" name="Compliance Rate" radius={[6, 6, 0, 0]}>
                              {filteredTags.slice(0, 10).map((t, idx) => (
                                <Cell
                                  key={idx}
                                  fill={t.tag_id === selectedTag?.tag_id ? 'url(#active-bar-grad)' : 'url(#inactive-bar-grad)'}
                                />
                              ))}
                            </Bar>
                            {/* Gradients */}
                            <defs>
                              <linearGradient id="active-bar-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="100%" stopColor="#059669" />
                              </linearGradient>
                              <linearGradient id="inactive-bar-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.1" />
                              </linearGradient>
                            </defs>
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Visual 3: Connected Templates Details Table */}
                    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 shadow-xl space-y-4">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-white">Connected Checklist Templates details</h4>
                        <p className="text-[9px] text-text-muted mt-0.5">Submission volumes and compliance rates for templates under this tag</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-glass-border bg-white/5 text-[9px] font-black uppercase tracking-widest text-text-muted">
                              <th className="px-4 py-3">Template Name</th>
                              <th className="px-4 py-3">Owner / Creator</th>
                              <th className="px-4 py-3">Priority</th>
                              <th className="px-4 py-3">Activity</th>
                              <th className="px-4 py-3">Compliance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-glass-border/30">
                            {selectedTag?.templates?.map((tpl) => (
                              <tr key={tpl.template_id} className="hover:bg-white/2 transition-colors">
                                <td className="px-4 py-3 text-xs font-bold text-accent">
                                  {tpl.template_name}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-semibold text-white truncate max-w-[120px]">{tpl.owner_name}</span>
                                    {tpl.owner_name !== tpl.creator_name && (
                                      <span className="text-[8px] text-text-muted">Creator: {tpl.creator_name}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                                    tpl.priority === 'HIGH' 
                                      ? 'bg-danger/15 border-danger/30 text-danger' 
                                      : tpl.priority === 'MEDIUM' 
                                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                                      : 'bg-primary/15 border-primary/30 text-primary-light'
                                  }`}>
                                    {tpl.priority}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-[10px] text-white">
                                  <div className="flex flex-col">
                                    <span className="font-bold">{tpl.total_submissions} submissions</span>
                                    <span className="text-[8px] text-text-muted">{tpl.total_responses} entries</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col gap-1 w-24">
                                    <span className="text-[9px] font-bold text-white">{tpl.avg_completion_rate}% Compliance</span>
                                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-accent rounded-full" 
                                        style={{ width: `${tpl.avg_completion_rate}%` }} 
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
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
