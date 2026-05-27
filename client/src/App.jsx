import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, LogOut, Users, ChevronDown, List, Search } from 'lucide-react';
import Sidebar from './components/Dashboard/Sidebar';
import LoginPage from './components/Auth/LoginPage';
import UserProfileHeader from './components/Dashboard/Summary/UserProfileHeader';
import DashboardSummary from './components/Dashboard/Summary/DashboardSummary';
import InsightsChart from './components/Dashboard/Charts/InsightsChart';
import ActivityExplorer from './components/Dashboard/Activity/ActivityExplorer';
import DepartmentDashboard from './components/Dashboard/DepartmentDashboard';
import LoadingState from './components/UI/LoadingState';
import SettingsPage from './components/Dashboard/SettingsPage';
import UserManagement from './components/Dashboard/UserManagement';
import ReportsPage from './components/Dashboard/ReportsPage';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [data, setData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(!!localStorage.getItem('token')); // Start loading if we have a token to verify
  const [error, setError] = useState(null);
  
  // Global Date Filters
  const [datePreset, setDatePreset] = useState('all-time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('Overview');

  // Department-Specific Date Filters
  const [deptDatePreset, setDeptDatePreset] = useState('all-time');
  const [deptStartDate, setDeptStartDate] = useState('');
  const [deptEndDate, setDeptEndDate] = useState('');

  // Multi-view navigation and Color Themes
  const [currentView, setCurrentView] = useState('dashboard');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'classic';
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState([]);

  // Admin User Selector & Inspection local states
  const [adminUsers, setAdminUsers] = useState([]);
  const [inspectedUser, setInspectedUser] = useState(null);
  const [inspectedData, setInspectedData] = useState(null);
  const [inspectedMetrics, setInspectedMetrics] = useState([]);
  const [inspectedSearch, setInspectedSearch] = useState('');
  const [isInspectDropdownOpen, setIsInspectDropdownOpen] = useState(false);
  const [loadingInspect, setLoadingInspect] = useState(false);

  useEffect(() => {
    if (!isAdmin && data?.itemStats && data.itemStats.length > 0) {
      // Auto-initialize to all Yes/No (Boolean) and time-related items by default
      const defaultMetrics = data.itemStats
        .filter(item => {
          const lowercaseName = item.name.toLowerCase();
          
          // Exclude AI usage question from default selection
          if (lowercaseName.includes('did you use any ai') || lowercaseName.includes('use any ai for work')) {
            return false;
          }
          
          return (
            item.type === 'Boolean' || 
            item.isTimeAverage || 
            item.isTaskAverage ||
            ['time', 'hour', 'duration', 'clock', 'minutes', 'tasks worked', 'task worked'].some(k => lowercaseName.includes(k))
          );
        })
        .map(item => item.name);
      
      if (defaultMetrics.length > 0) {
        setSelectedMetrics(defaultMetrics);
      } else {
        setSelectedMetrics(data.itemStats.slice(0, 4).map(item => item.name));
      }
    }
  }, [data, isAdmin]);

  useEffect(() => {
    if (!user || !user.id) {
      document.documentElement.setAttribute('data-theme', 'classic');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme, user]);

  useEffect(() => {
    // 1. Setup Axios Interceptors
    const requestInterceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    const responseInterceptor = axios.interceptors.response.use(
      (response) => {
        // If the server sends a new token (Sliding Session), save it
        if (response.data && response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        return response;
      },
      (error) => {
        if (error.response && error.response.status === 401) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    // 2. Professional Session Validation (Verify Token with Backend)
    const validateSession = async () => {
      // Check if we just came back from a Google OAuth redirect
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const googleAccessToken = hashParams.get('access_token');
      if (googleAccessToken) {
        // Clean the hash so it doesn't linger in the URL bar
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        
        setLoading(true);
        try {
          const res = await axios.post(`${API_BASE}/auth/google`, { 
            token: googleAccessToken,
            isAccessToken: true
          });
          const { token, user: loggedUser } = res.data;
          
          setUser(loggedUser);
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(loggedUser));
        } catch (err) {
          console.error('Google Login Failed:', err);
          const errMsg = err.response?.data?.error || err.message;
          alert(`Google Login failed: ${errMsg}`);
        } finally {
          setLoading(false);
        }
        return;
      }

      // First, check if we just came back from a Microsoft redirect
      const pendingMsalToken = sessionStorage.getItem('msal_pending_token');
      if (pendingMsalToken) {
        sessionStorage.removeItem('msal_pending_token');
        setLoading(true);
        try {
          const res = await axios.post(`${API_BASE}/auth/microsoft`, { 
            accessToken: pendingMsalToken 
          });
          const { token, user: loggedUser } = res.data;
          
          setUser(loggedUser);
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(loggedUser));
        } catch (err) {
          console.error('Microsoft Login Failed:', err);
          const errMsg = err.response?.data?.error || err.message;
          alert(`Microsoft Login failed: ${errMsg}`);
        } finally {
          setLoading(false);
        }
        return;
      }

      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (!token || !savedUser) {
        handleLogout();
        return;
      }

      setLoading(true);
      try {
        // Call the new verify endpoint
        const res = await axios.get(`${API_BASE}/auth/verify`);
        const { user: verifiedUser, token: newToken } = res.data;
        
        setUser(verifiedUser);
        localStorage.setItem('user', JSON.stringify(verifiedUser));
        localStorage.setItem('token', newToken);
      } catch (err) {
        console.error('Session validation failed:', err);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    validateSession();

    // Cleanup interceptors on unmount
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const getDatesForPreset = (preset) => {
    if (preset === 'custom') {
      return { start: '', end: '' };
    }

    const now = new Date();
    let start = null;
    let end = null;

    switch (preset) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
        break;
      case 'this-week': {
        const day = now.getDay();
        const diff = now.getDate() - day; 
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        end = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
        break;
      }
      case 'last-week': {
        const day = now.getDay();
        const diff = now.getDate() - day - 7;
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        end = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
        break;
      }
      case 'this-month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'last-month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'this-year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'last-year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
      default:
        start = null;
        end = null;
    }

    const formatDate = (d) => {
      if (!d) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    return {
      start: formatDate(start),
      end: formatDate(end)
    };
  };

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      return;
    }
    const { start, end } = getDatesForPreset(preset);
    setStartDate(start);
    setEndDate(end);
  };

  const handleDeptPresetChange = (preset) => {
    setDeptDatePreset(preset);
    if (preset === 'custom') {
      return;
    }
    const { start, end } = getDatesForPreset(preset);
    setDeptStartDate(start);
    setDeptEndDate(end);
  };

  useEffect(() => {
    // Reset department filters back to all-time when changing departments
    setDeptDatePreset('all-time');
    setDeptStartDate('');
    setDeptEndDate('');
  }, [selectedDepartment]);

  useEffect(() => {
    if (user && user.id) {
      fetchData();
    }
  }, [isAdmin, user, startDate, endDate]);

  // Load all users when Admin view is loaded
  useEffect(() => {
    if (isAdmin && user) {
      const fetchAdminUsers = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${API_BASE}/insights/admin/users`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setAdminUsers(res.data || []);
        } catch (err) {
          console.error("Failed to load admin user selector directory", err);
        }
      };
      fetchAdminUsers();
    }
  }, [isAdmin, user]);

  const fetchInspectedUserData = async (inspectedUserId) => {
    if (!inspectedUserId) return;
    setLoadingInspect(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/insights/personal/${inspectedUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setInspectedData(response.data);
      
      // Auto-initialize inspectedMetrics based on the fetched stats
      if (response.data?.itemStats) {
        const defaultMetrics = response.data.itemStats
          .filter(item => {
            const lowercaseName = item.name.toLowerCase();
            if (lowercaseName.includes('did you use any ai') || lowercaseName.includes('use any ai for work')) {
              return false;
            }
            return (
              item.type === 'Boolean' || 
              item.isTimeAverage || 
              item.isTaskAverage ||
              ['time', 'hour', 'duration', 'clock', 'minutes', 'tasks worked', 'task worked'].some(k => lowercaseName.includes(k))
            );
          })
          .map(item => item.name);
        
        if (defaultMetrics.length > 0) {
          setInspectedMetrics(defaultMetrics);
        } else {
          setInspectedMetrics(response.data.itemStats.slice(0, 4).map(item => item.name));
        }
      }
    } catch (err) {
      console.error("Failed to load inspected user data:", err);
    } finally {
      setLoadingInspect(false);
    }
  };

  // Re-fetch inspected user details on date range change
  useEffect(() => {
    if (inspectedUser) {
      fetchInspectedUserData(inspectedUser.id);
    }
  }, [inspectedUser, startDate, endDate]);

  const fetchData = async () => {
    if (!user || !user.id) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      if (isAdmin) {
        const response = await axios.get(`${API_BASE}/insights/admin/summary`, {
          params
        });
        setData(response.data);
      } else {
        const response = await axios.get(`${API_BASE}/insights/personal/${user.id}`, {
          params
        });
        setData(response.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      const { credential, access_token } = credentialResponse;
      const tokenToSend = credential || access_token;
      const isAccessToken = !!access_token;
      
      const res = await axios.post(`${API_BASE}/auth/google`, { 
        token: tokenToSend,
        isAccessToken
      });
      const { token, user: loggedUser } = res.data;
      
      setUser(loggedUser);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedUser));
    } catch (err) {
      console.error('Login Failed:', err);
      alert('Login failed. Please check backend connection.');
    }
  };

  const handleMicrosoftLoginSuccess = async (accessToken) => {
    try {
      const res = await axios.post(`${API_BASE}/auth/microsoft`, { 
        accessToken 
      });
      const { token, user: loggedUser } = res.data;
      
      setUser(loggedUser);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedUser));
    } catch (err) {
      console.error('Microsoft Login Failed:', err);
      const errMsg = err.response?.data?.error || err.message;
      alert(`Microsoft Login failed: ${errMsg}`);
    }
  };


  const handleLogout = () => {
    setUser(null);
    setData(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Prevent flash of login page while validating session
  if (loading && !user) {
    return <LoadingState />;
  }

  // Login view is isolated to fix alignment issues
  if (!user || !user.id) {
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess} 
        onMicrosoftLoginSuccess={handleMicrosoftLoginSuccess}
        onLoginError={() => alert('Login Failed')} 
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-dark text-text-main font-outfit">
      {/* Premium Background Elements */}
      <div className="app-bg"></div>
      <div className="blob"></div>
      <div className="blob-2"></div>

      <Sidebar 
        user={user}
        onLogout={() => setShowLogoutConfirm(true)} 
        isAdmin={isAdmin} 
        setIsAdmin={setIsAdmin} 
        currentView={currentView}
        setCurrentView={setCurrentView}
      />

      <main className="flex-1 p-6 lg:p-8 z-10 overflow-y-auto">
        {currentView === 'settings' ? (
          <SettingsPage 
            user={user} 
            currentTheme={theme} 
            onChangeTheme={setTheme} 
          />
        ) : currentView === 'user-management' ? (
          <UserManagement currentUser={user} />
        ) : currentView === 'reports' ? (
          <ReportsPage currentUser={user} />
        ) : (
          <>
            {!isAdmin && <UserProfileHeader user={user} />}
            
            <header className="mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
                    {isAdmin ? 'Admin' : 'Performance'} <span className="text-accent">Insights</span>
                  </h1>
                  <p className="text-text-muted mt-1 text-sm">
                    {isAdmin ? 'System-wide analytics overview.' : 'Your personalized checklist performance data.'}
                  </p>
                </div>
              </div>
            </header>

            {loading ? (
              <LoadingState />
            ) : error ? (
              <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2.5rem] p-16 text-center">
                <p className="text-danger text-xl mb-6">{error}</p>
                <button 
                  onClick={fetchData} 
                  className="px-8 py-3 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-full text-primary font-semibold transition-all"
                >
                  Retry
                </button>
              </div>
            ) : isAdmin ? (
              <div className="space-y-8">
                {/* Admin Header with Filters & User Search */}
                <div className="relative z-50 bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 shadow-xl flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
                  {/* Left: Department Selector Tab Bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => { setSelectedDepartment('Overview'); setInspectedUser(null); setInspectedData(null); }}
                      className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${selectedDepartment === 'Overview' && !inspectedUser ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30' : 'bg-white/5 border-glass-border text-text-muted hover:text-white hover:bg-white/10'}`}
                    >
                      System Overview
                    </button>
                    {data?.usersByPositionTags?.map(tag => (
                      <button
                        key={tag.name}
                        onClick={() => { setSelectedDepartment(tag.name); setInspectedUser(null); setInspectedData(null); }}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border cursor-pointer capitalize ${selectedDepartment === tag.name && !inspectedUser ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30' : 'bg-white/5 border-glass-border text-text-muted hover:text-white hover:bg-white/10'}`}
                      >
                        {tag.name.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Right: Search User Selector Dropdown */}
                  <div className="relative w-full lg:w-72">
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1.5 px-1 flex items-center justify-between">
                      <span>User Performance Explorer</span>
                      {inspectedUser && <span className="text-accent animate-pulse">Inspecting</span>}
                    </div>
                    <button
                      onClick={() => setIsInspectDropdownOpen(!isInspectDropdownOpen)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white/5 border border-glass-border rounded-2xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Users size={14} className="text-accent shrink-0" />
                        <span className="truncate">
                          {inspectedUser ? inspectedUser.name : 'Select user to view details...'}
                        </span>
                      </div>
                      <ChevronDown size={14} className={`text-text-muted transition-transform duration-300 ${isInspectDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isInspectDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsInspectDropdownOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-2xl p-2.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                          {/* Search Input inside Dropdown */}
                          <div className="mb-2 relative">
                            <input
                              type="text"
                              placeholder="Search by name, email..."
                              value={inspectedSearch}
                              onChange={(e) => setInspectedSearch(e.target.value)}
                              className="w-full bg-white/5 border border-glass-border rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent/40"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                            {(() => {
                              const filtered = adminUsers.filter(u => {
                                const cleanDept = selectedDepartment.replace(/_/g, ' ').toLowerCase();
                                const userBelongs = selectedDepartment === 'Overview' || (
                                  u.all_positions 
                                    ? u.all_positions.some(pos => pos.replace(/_/g, ' ').toLowerCase() === cleanDept) 
                                    : u.user_position.replace(/_/g, ' ').toLowerCase() === cleanDept
                                );
                                if (!userBelongs) return false;

                                if (!inspectedSearch) return true;
                                const query = inspectedSearch.toLowerCase();
                                return (
                                  u.name.toLowerCase().includes(query) ||
                                  u.email.toLowerCase().includes(query) ||
                                  u.user_position.toLowerCase().includes(query)
                                );
                              });

                              if (filtered.length === 0) {
                                return (
                                  <div className="text-center py-3 text-text-muted text-xs">
                                    No users found for {selectedDepartment === 'Overview' ? 'this search' : `the ${selectedDepartment.replace(/_/g, ' ')} department`}
                                  </div>
                                );
                              }

                              return filtered.map((u) => (
                                <button
                                  key={u.id}
                                  onClick={() => {
                                    setInspectedUser(u);
                                    setIsInspectDropdownOpen(false);
                                    setInspectedSearch('');
                                    fetchInspectedUserData(u.id);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between hover:bg-white/5 ${inspectedUser?.id === u.id ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted hover:text-white'}`}
                                >
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold truncate">{u.name}</span>
                                    <span className="text-[10px] text-text-muted truncate">{u.email}</span>
                                  </div>
                                  <span className="text-[9px] font-black uppercase tracking-wider bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-white/60 capitalize shrink-0 ml-2">
                                    {u.user_position.replace(/_/g, ' ')}
                                  </span>
                                </button>
                              ));
                            })()}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Main Admin Content Area */}
                <div className="w-full min-w-0">
                  {inspectedUser ? (
                    loadingInspect ? (
                      <LoadingState />
                    ) : inspectedData ? (
                      <div className="space-y-12">
                        {/* Premium Active Inspection Banner */}
                        <div className="bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/30 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4 animate-in slide-in-from-top-4 duration-300">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30 text-accent text-xl font-bold">
                              {inspectedUser.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/15 px-2.5 py-0.5 rounded-full border border-accent/30">
                                  User Inspection Active
                                </span>
                                <span className="text-xs text-text-muted">
                                  {inspectedUser.email}
                                </span>
                              </div>
                              <h2 className="text-lg font-black text-white mt-1">
                                Viewing {inspectedUser.name}'s Personalized Dashboard
                              </h2>
                              <p className="text-xs text-text-muted mt-0.5">
                                Role: <span className="text-white font-semibold">{inspectedUser.user_position}</span> | Type: <span className="text-white font-semibold">{inspectedUser.user_type}</span>
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => { setInspectedUser(null); setInspectedData(null); }}
                            className="px-6 py-2.5 bg-accent/20 hover:bg-accent/30 border border-accent/40 rounded-2xl text-xs font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                          >
                            <span>Close Inspection</span>
                          </button>
                        </div>

                        {/* User Summary metrics and charts */}
                        <DashboardSummary 
                          data={inspectedData} 
                          isAdmin={false} 
                          selectedMetrics={inspectedMetrics}
                          setSelectedMetrics={setInspectedMetrics}
                          datePreset={datePreset}
                          startDate={startDate}
                          endDate={endDate}
                          handlePresetChange={handlePresetChange}
                          setStartDate={setStartDate}
                          setEndDate={setEndDate}
                        />
                        <InsightsChart 
                          data={inspectedData} 
                          isAdmin={false} 
                          selectedMetrics={inspectedMetrics}
                          user={inspectedUser}
                          startDate={startDate}
                          endDate={endDate}
                        />
                        <ActivityExplorer user={inspectedUser} />
                      </div>
                    ) : (
                      <div className="text-center p-12 text-text-muted text-sm">
                        No inspection data found for this user.
                      </div>
                    )
                  ) : selectedDepartment === 'Overview' ? (
                    <div className="space-y-12">
                      <DashboardSummary 
                        data={data} 
                        isAdmin={isAdmin} 
                        hideKPIs={false}
                        datePreset={datePreset}
                        startDate={startDate}
                        endDate={endDate}
                        handlePresetChange={handlePresetChange}
                        setStartDate={setStartDate}
                        setEndDate={setEndDate}
                      />
                      <InsightsChart data={data} isAdmin={isAdmin} user={user} startDate={startDate} endDate={endDate} />
                    </div>
                  ) : (
                    <div className="space-y-12">
                      <DashboardSummary 
                        data={data} 
                        isAdmin={isAdmin} 
                        hideKPIs={true}
                        selectedDepartment={selectedDepartment}
                        datePreset={deptDatePreset}
                        startDate={deptStartDate}
                        endDate={deptEndDate}
                        handlePresetChange={handleDeptPresetChange}
                        setStartDate={setDeptStartDate}
                        setEndDate={setDeptEndDate}
                      />
                      <DepartmentDashboard 
                        department={selectedDepartment} 
                        adminStartDate={deptStartDate} 
                        adminEndDate={deptEndDate} 
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <DashboardSummary 
                  data={data} 
                  isAdmin={isAdmin} 
                  selectedMetrics={selectedMetrics}
                  setSelectedMetrics={setSelectedMetrics}
                  datePreset={datePreset}
                  startDate={startDate}
                  endDate={endDate}
                  handlePresetChange={handlePresetChange}
                  setStartDate={setStartDate}
                  setEndDate={setEndDate}
                />
                <InsightsChart 
                  data={data} 
                  isAdmin={isAdmin} 
                  selectedMetrics={selectedMetrics}
                  user={user}
                  startDate={startDate}
                  endDate={endDate}
                />
                <ActivityExplorer user={user} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Premium Sign Out Warning Modal (Perfect Screen Centering) */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <div className="bg-bg-card backdrop-blur-2xl border border-glass-border rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-black/80">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-danger/20 border border-danger/30 flex items-center justify-center text-danger mb-4 shrink-0">
                <LogOut size={24} />
              </div>
              <h4 className="text-xl font-bold text-white">Sign Out</h4>
              <p className="text-sm text-text-muted mt-1 font-medium">Are you sure you want to end your session?</p>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-glass-border bg-white/5 text-sm font-bold text-white hover:bg-white/10 transition-all cursor-pointer hover:scale-[1.02]"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-danger text-sm font-bold text-white hover:bg-danger/90 hover:scale-[1.02] shadow-lg shadow-danger/20 transition-all cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
