import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles } from 'lucide-react';
import Sidebar from './components/Dashboard/Sidebar';
import LoginPage from './components/Auth/LoginPage';
import UserProfileHeader from './components/Dashboard/Summary/UserProfileHeader';
import DashboardSummary from './components/Dashboard/Summary/DashboardSummary';
import InsightsChart from './components/Dashboard/Charts/InsightsChart';
import ActivityTable from './components/Dashboard/Activity/ActivityTable';
import DepartmentDashboard from './components/Dashboard/DepartmentDashboard';
import LoadingState from './components/UI/LoadingState';

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
  
  // Admin Date Filters
  const [adminStartDate, setAdminStartDate] = useState('');
  const [adminEndDate, setAdminEndDate] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('Overview');

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

  useEffect(() => {
    if (user && user.id) {
      fetchData();
    }
  }, [isAdmin, user, adminStartDate, adminEndDate]);

  const fetchData = async () => {
    if (!user || !user.id) return;
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        // Pass date filters to admin API
        const params = {};
        if (adminStartDate) params.startDate = adminStartDate;
        if (adminEndDate) params.endDate = adminEndDate;
        
        const response = await axios.get(`${API_BASE}/insights/admin/summary`, {
          params
        });
        setData(response.data);
      } else {
        const response = await axios.get(`${API_BASE}/insights/personal/${user.id}`);
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
        onLogout={handleLogout} 
        isAdmin={isAdmin} 
        setIsAdmin={setIsAdmin} 
      />

      <main className="flex-1 p-8 lg:p-12 z-10 overflow-y-auto">
        {!isAdmin && <UserProfileHeader user={user} />}
        
        <header className="mb-12">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
                {isAdmin ? 'Admin' : 'Performance'} <span className="text-accent">Insights</span>
              </h1>
              <p className="text-text-muted mt-2 text-lg">
                {isAdmin ? 'System-wide analytics overview.' : 'Your personalized checklist performance data.'}
              </p>
            </div>
            {!isAdmin && (
              <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-2xl p-4 flex items-center gap-3">
                <Sparkles size={20} className="text-accent" />
                <span className="font-semibold text-sm">AI Insight Active</span>
              </div>
            )}
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
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Admin Left Sidebar for Departments */}
            <div className="w-full lg:w-64 shrink-0 bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2rem] p-6 shadow-xl h-[500px] lg:h-[calc(100vh-12rem)] sticky top-32 flex flex-col overflow-hidden">
               <h3 className="text-sm font-bold text-white mb-4 text-center uppercase tracking-widest">Departments</h3>
               <div className="overflow-y-auto pr-2 space-y-3 flex-1 custom-scrollbar">
                  <div 
                    onClick={() => setSelectedDepartment('Overview')}
                    className={`w-full border rounded-full py-3 px-4 text-center text-xs font-semibold cursor-pointer truncate transition-all ${selectedDepartment === 'Overview' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30' : 'bg-white/5 border-glass-border text-white hover:bg-white/10'}`}
                  >
                    Overview
                  </div>
                  {data?.usersByPositionTags?.map(tag => (
                    <div 
                      key={tag.name}
                      onClick={() => setSelectedDepartment(tag.name)}
                      className={`w-full border rounded-full py-3 px-4 text-center text-xs font-semibold cursor-pointer truncate transition-all ${selectedDepartment === tag.name ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30' : 'bg-white/5 border-glass-border text-white hover:bg-white/10'}`}
                    >
                      {tag.name.replace(/_/g, ' ')}
                    </div>
                  ))}
               </div>
            </div>
            
            {/* Main Admin Content Area */}
            <div className="flex-1 w-full min-w-0">
               {selectedDepartment === 'Overview' ? (
                 <div className="space-y-12">
                   <DashboardSummary 
                     data={data} 
                     isAdmin={isAdmin} 
                     adminStartDate={adminStartDate}
                     setAdminStartDate={setAdminStartDate}
                     adminEndDate={adminEndDate}
                     setAdminEndDate={setAdminEndDate}
                     hideKPIs={false}
                   />
                   <InsightsChart data={data} isAdmin={isAdmin} />
                 </div>
               ) : (
                 <div className="space-y-12">
                   <DashboardSummary 
                     data={data} 
                     isAdmin={isAdmin} 
                     adminStartDate={adminStartDate}
                     setAdminStartDate={setAdminStartDate}
                     adminEndDate={adminEndDate}
                     setAdminEndDate={setAdminEndDate}
                     hideKPIs={true}
                   />
                   <DepartmentDashboard 
                     department={selectedDepartment} 
                     adminStartDate={adminStartDate} 
                     adminEndDate={adminEndDate} 
                   />
                 </div>
               )}
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            <DashboardSummary data={data} isAdmin={isAdmin} />
            <InsightsChart data={data} isAdmin={isAdmin} />
            <ActivityTable activities={data?.recentActivity} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
