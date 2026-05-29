import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Users, Edit, Trash2, ChevronLeft, ChevronRight, X, Search,
  Building, Briefcase, ShieldAlert, Award, UserCheck, AlertTriangle
} from 'lucide-react';
import LoadingState from '../../UI/LoadingState';

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

const USER_TYPES = ['USER', 'ADMIN'];

export default function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [isLimitDropdownOpen, setIsLimitDropdownOpen] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterType, setFilterType] = useState('');

  // Dropdown UI states
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form states
  const [editName, setEditName] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editType, setEditType] = useState('');
  const [editOrgId, setEditOrgId] = useState('');
  const [organisations, setOrganisations] = useState([]);

  // Form Dropdown UI states
  const [isEditPositionOpen, setIsEditPositionOpen] = useState(false);
  const [isEditTypeOpen, setIsEditTypeOpen] = useState(false);
  const [isEditOrgOpen, setIsEditOrgOpen] = useState(false);
  
  // Status message
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const fetchUsers = useCallback(async (pageNumber) => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE}/insights/admin/users-list?page=${pageNumber}&limit=${limit}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filterPosition) url += `&position=${encodeURIComponent(filterPosition)}`;
      if (filterType) url += `&type=${encodeURIComponent(filterType)}`;

      const res = await axios.get(url);
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
      setPage(res.data.page || 1);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users list. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterPosition, filterType, limit]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers(1);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchUsers]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await axios.get(`${API_BASE}/insights/admin/summary`);
        setOrganisations(res.data.organisations || []);
      } catch (err) {
        console.error('Error fetching admin summary for organisations:', err);
      }
    };
    fetchMeta();
  }, []);

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 5000);
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditPosition(user.user_position);
    setEditType(user.user_type);
    setEditOrgId(user.organisation_id || '');
    setIsEditModalOpen(true);
    // Reset dropdown states
    setIsEditPositionOpen(false);
    setIsEditTypeOpen(false);
    setIsEditOrgOpen(false);
  };

  const handleDeleteClick = (user) => {
    if (user.id === currentUser.id) {
      showStatus('error', 'You cannot delete your own admin account.');
      return;
    }
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      showStatus('error', 'Name cannot be empty.');
      return;
    }
    try {
      await axios.put(`${API_BASE}/insights/admin/users/${selectedUser.id}`, {
        name: editName,
        user_position: editPosition,
        user_type: editType,
        organisation_id: editOrgId ? parseInt(editOrgId) : undefined
      });
      showStatus('success', 'User updated successfully!');
      setIsEditModalOpen(false);
      fetchUsers(page);
    } catch (err) {
      console.error('Failed to update user:', err);
      showStatus('error', err.response?.data?.error || 'Failed to update user.');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(`${API_BASE}/insights/admin/users/${selectedUser.id}`);
      showStatus('success', 'User deleted successfully!');
      setIsDeleteModalOpen(false);
      const nextPage = users.length === 1 && page > 1 ? page - 1 : page;
      fetchUsers(nextPage);
    } catch (err) {
      console.error('Failed to delete user:', err);
      showStatus('error', err.response?.data?.error || 'Failed to delete user.');
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
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="text-accent" size={24} />
            User Management
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Manage your organization users, edit system roles, or remove accounts.
          </p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2 text-xs font-bold text-white flex items-center gap-2">
          <UserCheck size={14} className="text-primary" />
          <span>Total Matches: {total}</span>
        </div>
      </div>

      {/* Search and Filters Row */}
      <div className="relative z-40 bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col md:flex-row items-stretch md:items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-glass-border rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent/40"
          />
        </div>

        {/* Custom Department / Position Filter */}
        <div className="relative w-full md:w-56">
          <button
            type="button"
            onClick={() => {
              setIsDeptDropdownOpen(!isDeptDropdownOpen);
              setIsTypeDropdownOpen(false);
            }}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white/5 border border-glass-border rounded-2xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 truncate">
              <Briefcase size={14} className="text-text-muted shrink-0" />
              <span className="truncate">
                {filterPosition ? filterPosition.replace(/_/g, ' ') : 'All Departments'}
              </span>
            </div>
            <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isDeptDropdownOpen ? 'rotate-90' : ''}`} />
          </button>
          
          {isDeptDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDeptDropdownOpen(false)}></div>
              <div className="absolute left-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-2xl p-2.5 shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  type="button"
                  onClick={() => {
                    setFilterPosition('');
                    setIsDeptDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${!filterPosition ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}
                >
                  All Departments
                </button>
                {POSITIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setFilterPosition(p);
                      setIsDeptDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${filterPosition === p ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}
                  >
                    {p.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Custom Role Type Filter */}
        <div className="relative w-full md:w-44">
          <button
            type="button"
            onClick={() => {
              setIsTypeDropdownOpen(!isTypeDropdownOpen);
              setIsDeptDropdownOpen(false);
            }}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white/5 border border-glass-border rounded-2xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 truncate">
              <Award size={14} className="text-text-muted shrink-0" />
              <span className="truncate">
                {filterType ? filterType : 'All Role Types'}
              </span>
            </div>
            <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isTypeDropdownOpen ? 'rotate-90' : ''}`} />
          </button>
          
          {isTypeDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsTypeDropdownOpen(false)}></div>
              <div className="absolute left-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-2xl p-2.5 shadow-2xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  type="button"
                  onClick={() => {
                    setFilterType('');
                    setIsTypeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${!filterType ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}
                >
                  All Role Types
                </button>
                {USER_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setFilterType(t);
                      setIsTypeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${filterType === t ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Clear Filters Button */}
        {(searchTerm || filterPosition || filterType) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterPosition('');
              setFilterType('');
            }}
            className="px-4 py-2.5 border border-danger/25 bg-danger/5 hover:bg-danger/10 text-danger text-xs font-bold rounded-2xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 shrink-0"
          >
            <X size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Status Messages */}
      {statusMsg.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold border transition-all duration-300 ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-danger/10 border-danger/30 text-danger'
        }`}>
          {statusMsg.text}
        </div>
      )}

      {/* Table Section */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="bg-bg-card border border-glass-border rounded-3xl p-12 text-center">
          <p className="text-danger text-sm font-medium mb-4">{error}</p>
          <button 
            onClick={() => fetchUsers(page)} 
            className="px-6 py-2.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-xl text-primary font-bold text-xs transition-all"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-glass-border bg-white/5 text-[10px] font-black uppercase tracking-widest text-text-muted">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Department / Position</th>
                  <th className="px-6 py-4">Organisation</th>
                  <th className="px-6 py-4">Role Type</th>
                  <th className="px-6 py-4">Date Added</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border text-xs">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-text-muted font-medium">
                      No matching users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={u.image || `https://ui-avatars.com/api/?name=${u.name}&background=6366f1&color=fff`} 
                            alt={u.name} 
                            className="w-8 h-8 rounded-lg border border-glass-border object-cover"
                          />
                          <div>
                            <p className="font-semibold text-white">{u.name}</p>
                            <p className="text-[10px] text-text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-white capitalize">
                        {u.user_position.replace(/_/g, ' ').toLowerCase()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-text-muted">
                        {u.organisation || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          u.user_type === 'ADMIN' 
                            ? 'bg-purple-500/15 border-purple-500/30 text-purple-400' 
                            : 'bg-primary/15 border-primary/30 text-primary-light'
                        }`}>
                          {u.user_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-muted font-medium">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(u)}
                            className="p-2 hover:bg-white/10 rounded-lg text-accent hover:text-white transition-all cursor-pointer"
                            title="Edit User"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(u)}
                            disabled={u.id === currentUser.id}
                            className={`p-2 rounded-lg transition-all ${
                              u.id === currentUser.id 
                                ? 'text-white/10 cursor-not-allowed' 
                                : 'text-danger hover:bg-danger/20 hover:text-white cursor-pointer'
                            }`}
                            title={u.id === currentUser.id ? "Cannot delete yourself" : "Delete User"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {users.length > 0 && (
            <div className="px-6 py-4 border-t border-glass-border bg-white/2 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black tracking-wider text-text-muted uppercase">
                  Page {page} of {totalPages} ({total} total)
                </span>
                <div className="relative">
                  <button 
                    onClick={() => setIsLimitDropdownOpen(!isLimitDropdownOpen)} 
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-glass-border rounded-xl text-[10px] font-bold text-white cursor-pointer hover:bg-white/10 transition-all active:scale-95"
                  >
                    <span>Show {limit}</span>
                    <ChevronRight size={12} className={`transition-transform ${isLimitDropdownOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {isLimitDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsLimitDropdownOpen(false)}></div>
                      <div className="absolute left-0 bottom-full mb-2 bg-bg-card border border-glass-border rounded-xl p-1.5 shadow-2xl z-50 min-w-[90px] space-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {[15, 30, 50].map(v => (
                          <button 
                            key={v} 
                            onClick={() => {
                              setLimit(v);
                              setPage(1);
                              setIsLimitDropdownOpen(false);
                            }} 
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
                  onClick={() => fetchUsers(page - 1)}
                  disabled={page === 1}
                  className={`p-1.5 rounded-lg border border-glass-border text-white transition-all ${
                    page === 1 
                      ? 'bg-white/2 text-white/20 cursor-not-allowed' 
                      : 'bg-white/5 hover:bg-white/10 cursor-pointer'
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                
                {(() => {
                  const pages = [];
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => fetchUsers(i)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${
                          page === i 
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                            : 'bg-white/5 border-glass-border text-text-muted hover:text-white hover:bg-white/10 cursor-pointer'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  return pages;
                })()}

                <button
                  onClick={() => fetchUsers(page + 1)}
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

      {/* Edit Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-card backdrop-blur-2xl border border-glass-border rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit className="text-accent" size={18} />
                Edit User Details
              </h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-text-muted hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white/5 border border-glass-border rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent/40"
                  required
                />
              </div>

              {/* Custom Selector for Position */}
              <div className="relative">
                <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">
                  Department / Position
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditPositionOpen(!isEditPositionOpen);
                    setIsEditTypeOpen(false);
                    setIsEditOrgOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white/5 border border-glass-border rounded-xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Briefcase size={14} className="text-text-muted shrink-0" />
                    <span className="truncate">
                      {editPosition ? editPosition.replace(/_/g, ' ') : 'Select Position...'}
                    </span>
                  </div>
                  <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isEditPositionOpen ? 'rotate-90' : ''}`} />
                </button>

                {isEditPositionOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsEditPositionOpen(false)}></div>
                    <div className="absolute left-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-xl p-2 shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      {POSITIONS.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setEditPosition(p);
                            setIsEditPositionOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all hover:bg-white/5 ${editPosition === p ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}
                        >
                          {p.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Custom Selector for Role Type */}
              <div className="relative">
                <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">
                  Role Type
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditTypeOpen(!isEditTypeOpen);
                    setIsEditPositionOpen(false);
                    setIsEditOrgOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white/5 border border-glass-border rounded-xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Award size={14} className="text-text-muted shrink-0" />
                    <span className="truncate">{editType || 'Select Role...'}</span>
                  </div>
                  <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isEditTypeOpen ? 'rotate-90' : ''}`} />
                </button>

                {isEditTypeOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsEditTypeOpen(false)}></div>
                    <div className="absolute left-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-xl p-2 shadow-2xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      {USER_TYPES.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setEditType(t);
                            setIsEditTypeOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all hover:bg-white/5 ${editType === t ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Custom Selector for Organisation */}
              <div className="relative">
                <label className="block text-[10px] font-black uppercase tracking-wider text-text-muted mb-1.5">
                  Organisation
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOrgOpen(!isEditOrgOpen);
                    setIsEditPositionOpen(false);
                    setIsEditTypeOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white/5 border border-glass-border rounded-xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building size={14} className="text-text-muted shrink-0" />
                    <span className="truncate">
                      {editOrgId ? (organisations.find(o => o.id === parseInt(editOrgId))?.organisation || 'Select Organisation...') : 'Select Organisation...'}
                    </span>
                  </div>
                  <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isEditOrgOpen ? 'rotate-90' : ''}`} />
                </button>

                {isEditOrgOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsEditOrgOpen(false)}></div>
                    <div className="absolute left-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-xl p-2 shadow-2xl z-50 max-h-40 overflow-y-auto custom-scrollbar space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      {organisations.map(o => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            setEditOrgId(o.id.toString());
                            setIsEditOrgOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all hover:bg-white/5 ${editOrgId === o.id.toString() ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}
                        >
                          {o.organisation}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-glass-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-glass-border bg-white/5 text-xs font-bold text-white hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-xs font-bold text-white hover:bg-primary/95 shadow-lg shadow-primary/20 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-card backdrop-blur-2xl border border-glass-border rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-danger/25 border border-danger/35 flex items-center justify-center text-danger mb-4 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-base font-extrabold text-white">Delete User Account?</h3>
              <p className="text-xs text-text-muted mt-2 leading-relaxed">
                You are about to delete <span className="text-white font-semibold">{selectedUser.name}</span> from the system.
              </p>
              <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-[10px] text-danger-light font-bold text-left mt-4 leading-normal">
                <ShieldAlert size={12} className="inline mr-1" />
                This action is permanent. It will delete all of the user's checklist submissions, templates, and positions.
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-glass-border">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-glass-border bg-white/5 text-xs font-bold text-white hover:bg-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-danger text-xs font-bold text-white hover:bg-danger/90 hover:scale-[1.02] shadow-lg shadow-danger/20 transition-all cursor-pointer"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
