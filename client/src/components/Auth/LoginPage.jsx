import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';
import { Sparkles, ShieldCheck, BarChart3, Zap, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import Genie3D from './Genie3D';

const LoginPage = ({ onLoginSuccess, onMicrosoftLoginSuccess, loginError, setLoginError }) => {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHoveredGoogle, setIsHoveredGoogle] = useState(false);
  const [isHoveredMS, setIsHoveredMS] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setCoords({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const loginWithGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = window.location.origin;
    const scope = 'openid profile email';
    const responseType = 'token';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${encodeURIComponent(scope)}`;

    window.location.href = authUrl;
  };

  const { instance } = useMsal();

  const handleMicrosoftLogin = () => {
    instance.loginRedirect(loginRequest)
      .catch(e => {
        console.error(e);
        if (setLoginError) {
          setLoginError(`Microsoft Login failed: ${e.message || e}`);
        }
      });
  };

  return (
    <div className="fixed inset-0 w-screen h-screen flex items-center justify-center overflow-hidden bg-slate-950 font-outfit">
      {/* Animated Background Layers */}
      <div className="app-bg"></div>
      <div className="mesh-gradient"></div>
      <div className="stars-overlay"></div>



      {/* Dynamic Cursor Spotlight Tracker */}
      <div 
        className="pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-radial from-primary/10 via-accent/5 to-transparent blur-[100px] z-0 transition-opacity duration-500 hidden lg:block"
        style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 w-full max-w-6xl px-8 items-center z-10">
        {/* Left Side: Brand & Value Prop */}
        <div className="animate-[slideInLeft_0.8s_cubic-bezier(0.23,1,0.32,1)] flex flex-col justify-center relative">
          {/* Floating 3D Animated Genie behind Left Content */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] lg:w-[700px] lg:h-[700px] opacity-35 pointer-events-none -z-10 select-none">
            <Genie3D mouseCoords={coords} />
          </div>

          <div className="self-start inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full text-xs font-semibold text-primary mb-6 shadow-md shadow-primary/5">
            <Sparkles size={14} className="animate-spin duration-3000" />
            <span>Next-Gen Analytics Platform</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold leading-[1.1] tracking-tight text-white mb-6">
            Unlock the Power of <br />
            <span className="text-gradient drop-shadow-[0_0_30px_var(--color-primary-glow)]">Checklist Genie</span>
          </h1>

          <p className="text-base leading-relaxed text-text-muted max-w-md mb-8">
            Transform your manual checklists into actionable insights.
            Automate tracking, identify trends, and boost team performance with
            AI-powered analytics.
          </p>

          {/* Staggered features list */}
          <div className="flex flex-col gap-5 mb-6">
            <div className="flex items-center gap-4 group transition-all duration-300 hover:translate-x-1">
              <div className="w-10 h-10 bg-white/5 border border-glass-border rounded-xl flex items-center justify-center text-accent shadow-xl group-hover:border-accent/40 group-hover:shadow-accent/10 transition-all duration-300">
                <BarChart3 size={18} />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white mb-0.5 group-hover:text-accent transition-colors">Smart Visualization</h4>
                <p className="text-sm text-text-muted">Interactive charts that tell your data's story.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 group transition-all duration-300 hover:translate-x-1">
              <div className="w-10 h-10 bg-white/5 border border-glass-border rounded-xl flex items-center justify-center text-primary shadow-xl group-hover:border-primary/40 group-hover:shadow-primary/10 transition-all duration-300">
                <Zap size={18} />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white mb-0.5 group-hover:text-primary transition-colors">Real-time Tracking</h4>
                <p className="text-sm text-text-muted">Instant updates on every checklist submission.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card with rich neon shadow & borders */}
        <div className="relative group/card bg-slate-900/50 backdrop-blur-[40px] border border-white/10 hover:border-primary/30 rounded-[32px] p-8 lg:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_rgba(99,102,241,0.15)] transition-all duration-500 text-center animate-[slideInRight_0.8s_cubic-bezier(0.23,1,0.32,1)]">
          {/* Card subtle background gradient glow */}
          <div className="absolute -inset-[1px] bg-gradient-to-br from-primary/10 to-accent/10 rounded-[32px] -z-10 opacity-50 group-hover/card:opacity-100 transition-opacity duration-500"></div>

          <div className="mb-8">
            <div className="w-14 h-14 bg-linear-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/30 group-hover/card:scale-105 transition-transform duration-300">
              <ShieldCheck size={28} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">Get Started</h3>
            <p className="text-text-muted">Experience the future of reporting</p>
          </div>

          <div className="flex flex-col gap-4 mb-4">
            <button
              onClick={() => loginWithGoogle()}
              onMouseEnter={() => setIsHoveredGoogle(true)}
              onMouseLeave={() => setIsHoveredGoogle(false)}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/30 rounded-full transition-all duration-300 group shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <svg className={`w-5 h-5 transition-transform duration-300 ${isHoveredGoogle ? 'scale-110' : ''}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
              <span className="text-white font-semibold">Continue with Google</span>
            </button>

            <button
              onClick={handleMicrosoftLogin}
              onMouseEnter={() => setIsHoveredMS(true)}
              onMouseLeave={() => setIsHoveredMS(false)}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/30 rounded-full transition-all duration-300 group shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <svg className={`w-5 h-5 transition-transform duration-300 ${isHoveredMS ? 'scale-110' : ''}`} viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0H10.8V10.8H0V0Z" fill="#F25022" />
                <path d="M12.2 0H23V10.8H12.2V0Z" fill="#7FBA00" />
                <path d="M0 12.2H10.8V23H0V12.2Z" fill="#00A4EF" />
                <path d="M12.2 12.2H23V23H12.2V12.2Z" fill="#FFB900" />
              </svg>
              <span className="text-white font-semibold">Continue with Microsoft</span>
            </button>
          </div>

          <div className="mt-6 flex items-center gap-4 text-white/10">
            <div className="flex-1 h-px bg-current"></div>
            <span className="text-[10px] uppercase tracking-widest font-black text-text-muted">Secure Access</span>
            <div className="flex-1 h-px bg-current"></div>
          </div>

          <div className="pt-6">
            <div className="flex items-center justify-center gap-2 text-success text-sm font-semibold">
              <CheckCircle2 size={14} className="animate-pulse" />
              <span>Enterprise Grade Security</span>
            </div>
          </div>
        </div>
      </div>

      {/* Login Error Modal */}
      {loginError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900/90 backdrop-blur-2xl border border-danger/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-danger/20 border border-danger/30 flex items-center justify-center text-danger mb-4 shrink-0 animate-bounce">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-base font-extrabold text-white">Access Restricted</h3>
              <p className="text-xs text-text-muted mt-2 leading-relaxed">
                Your account is currently disabled or unauthorized.
              </p>
              <div className="w-full bg-danger/5 border border-danger/10 rounded-xl p-3 text-[11px] text-danger-light font-medium text-center mt-4 leading-normal">
                {loginError}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-glass-border">
              <button
                onClick={() => setLoginError(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-danger text-xs font-bold text-white hover:bg-danger/90 hover:scale-[1.02] shadow-lg shadow-danger/25 transition-all cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
