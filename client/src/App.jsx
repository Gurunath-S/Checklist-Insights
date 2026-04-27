import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles } from 'lucide-react';
import Sidebar from './components/Dashboard/Sidebar';
import LoginPage from './components/Auth/LoginPage';
import UserProfileHeader from './components/Dashboard/Summary/UserProfileHeader';
import DashboardSummary from './components/Dashboard/Summary/DashboardSummary';
import InsightsChart from './components/Dashboard/Charts/InsightsChart';
import ActivityTable from './components/Dashboard/Activity/ActivityTable';
import LoadingState from './components/UI/LoadingState';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

function App() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
  }, [isAdmin, user]);

  const fetchData = async () => {
    if (!user || !user.id) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint = isAdmin ? `${API_BASE}/insights/admin/summary` : `${API_BASE}/insights/personal/${user.id}`;
      const response = await axios.get(endpoint);
      setData(response.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      const { credential } = credentialResponse;
      const res = await axios.post(`${API_BASE}/auth/google`, { token: credential });
      const { token, user: loggedUser } = res.data;
      
      setUser(loggedUser);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedUser));
    } catch (err) {
      console.error('Login Failed:', err);
      alert('Login failed. Please check backend connection.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setData(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Login view is isolated to fix alignment issues
  if (!user || !user.id) {
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess} 
        onLoginError={() => alert('Login Failed')} 
      />
    );
  }

  return (
    <div className="app-layout">
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

      <main className="main-content">
        {!isAdmin && <UserProfileHeader user={user} />}
        
        <header className="dashboard-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>
                {isAdmin ? 'Admin' : 'Performance'} <span className="text-accent">Insights</span>
              </h1>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {isAdmin ? 'System-wide analytics overview.' : 'Your personalized checklist performance data.'}
              </p>
            </div>
            {!isAdmin && (
              <div className="ai-insights-box" style={{ margin: 0, padding: '1rem 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Sparkles size={18} color="var(--accent)" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>AI Insight Active</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--danger)' }}>
            <p>{error}</p>
            <button onClick={fetchData} className="feature-pill" style={{ margin: '1rem auto', cursor: 'pointer', border: 'none' }}>Retry</button>
          </div>
        ) : (
          <>
            <DashboardSummary data={data} isAdmin={isAdmin} />
            <InsightsChart data={data} isAdmin={isAdmin} />
            {!isAdmin && <ActivityTable activities={data?.recentActivity} />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
