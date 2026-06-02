import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Calendar, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import LoadingState from '../../UI/LoadingState';
import { getPaginationRange } from '../../UI/paginationHelper';
import { DATE_PRESETS, getPresetDates } from './ReportConstants';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export default function DepartmentReport() {
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDateOpen, setIsDateOpen] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLimitOpen, setIsLimitOpen] = useState(false);

  const fetchDepartments = useCallback(async (targetPage, targetLimit) => {
    Promise.resolve().then(() => setLoading(true));
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE}/insights/reports/departments?page=${targetPage}&limit=${targetLimit}`;
      
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      
      if (datePreset !== 'all' && datePreset !== 'custom') {
        const { start, end } = getPresetDates(datePreset);
        if (start) url += `&startDate=${encodeURIComponent(start)}`;
        if (end) url += `&endDate=${encodeURIComponent(end)}`;
      } else if (datePreset === 'custom') {
        if (startDate) {
          const start = new Date(startDate + 'T00:00:00').toISOString();
          url += `&startDate=${encodeURIComponent(start)}`;
        }
        if (endDate) {
          const end = new Date(endDate + 'T23:59:59').toISOString();
          url += `&endDate=${encodeURIComponent(end)}`;
        }
      }

      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setReports(res.data.departments || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
      setPage(res.data.page || 1);
    } catch (err) {
      console.error('Error fetching departments:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, datePreset, startDate, endDate]);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchDepartments(1, limit);
    }, 300);
    return () => clearTimeout(delay);
  }, [fetchDepartments, limit]);

  const handleLimitChange = (val) => {
    setLimit(val);
    setIsLimitOpen(false);
    fetchDepartments(1, val);
  };

  const handlePageChange = (targetPage) => {
    setPage(targetPage);
    fetchDepartments(targetPage, limit);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Department-specific Filters */}
      <div className="relative z-50 bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <span className="text-xs font-black uppercase tracking-wider text-white">Department-Wise Submission Breakdown</span>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Option */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input
                type="text"
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-glass-border rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>

            {/* Date Dropdown */}
            <div className="relative w-full sm:w-52">
              <button
                type="button"
                onClick={() => setIsDateOpen(!isDateOpen)}
                className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white/5 border border-glass-border rounded-xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 truncate">
                  <Calendar size={14} className="text-text-muted shrink-0" />
                  <span className="truncate">
                    {DATE_PRESETS.find(p => p.value === datePreset)?.label || 'All Time'}
                  </span>
                </div>
                <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isDateOpen ? 'rotate-90' : ''}`} />
              </button>
              {isDateOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDateOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-xl p-2.5 shadow-2xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {DATE_PRESETS.map((p) => (
                      <button key={p.value} type="button" onClick={() => { setDatePreset(p.value); setIsDateOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${datePreset === p.value ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {datePreset === 'custom' && (
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-glass-border/30 animate-in slide-in-from-top-2 duration-200">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Submission Date:</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full sm:w-40 bg-white/5 border border-glass-border rounded-xl px-3 py-1.5 text-xs text-white" />
            <span className="text-xs text-text-muted">to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full sm:w-40 bg-white/5 border border-glass-border rounded-xl px-3 py-1.5 text-xs text-white" />
          </div>
        )}
      </div>

      {/* Department Reports Table */}
      {loading ? (
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
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-text-muted font-semibold">
                    No departments found matching the criteria.
                  </td>
                </tr>
              ) : (
                reports.map((d, idx) => (
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

          {/* Department Report Pagination */}
          {reports.length > 0 && (
            <div className="px-6 py-4 border-t border-glass-border bg-white/2 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black tracking-wider text-text-muted uppercase">
                  Page {page} of {totalPages} ({total} total)
                </span>
                <div className="relative">
                  <button 
                    onClick={() => setIsLimitOpen(!isLimitOpen)} 
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-glass-border rounded-xl text-[10px] font-bold text-white cursor-pointer hover:bg-white/10 transition-all active:scale-95"
                  >
                    <span>Show {limit}</span>
                    <ChevronRight size={12} className={`transition-transform ${isLimitOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {isLimitOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsLimitOpen(false)}></div>
                      <div className="absolute left-0 bottom-full mb-2 bg-bg-card border border-glass-border rounded-xl p-1.5 shadow-2xl z-50 min-w-[90px] space-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {[15, 30, 50].map(v => (
                          <button 
                            key={v} 
                            onClick={() => handleLimitChange(v)} 
                            className={`w-full text-left px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${limit === v ? 'bg-primary/10 text-white' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
                          >
                            Show {v}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className={`p-1.5 rounded-lg border border-glass-border text-white transition-all ${
                    page === 1 
                      ? 'bg-white/2 text-white/20 cursor-not-allowed' 
                      : 'bg-white/5 hover:bg-white/10 cursor-pointer'
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                
                {getPaginationRange(page, totalPages).map((item, idx) => {
                  if (item === '...') {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        className="w-8 h-8 flex items-center justify-center text-text-muted select-none text-xs"
                      >
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={item}
                      onClick={() => handlePageChange(item)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${
                        page === item 
                          ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                          : 'bg-white/5 border-glass-border text-text-muted hover:text-white hover:bg-white/10 cursor-pointer'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className={`p-1.5 rounded-lg border border-glass-border text-white transition-all ${
                    page === totalPages 
                      ? 'bg-white/2 text-white/20 cursor-not-allowed' 
                      : 'bg-white/5 hover:bg-white/10 cursor-pointer'
                  }`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
