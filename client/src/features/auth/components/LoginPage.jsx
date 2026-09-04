import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../../authConfig';
import { 
  Sparkles, 
  ShieldCheck, 
  BarChart3, 
  Zap, 
  CheckCircle2, 
  ShieldAlert, 
  Loader2, 
  Lock,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const LoginPage = () => {
  const { loginError, setLoginError, isGoogleLoading, isMicrosoftLoading } = useAuthStore();

  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHoveredGoogle, setIsHoveredGoogle] = useState(false);
  const [isHoveredMS, setIsHoveredMS] = useState(false);
  const [isLocalGoogleLoading, setIsLocalGoogleLoading] = useState(false);
  const [isLocalMicrosoftLoading, setIsLocalMicrosoftLoading] = useState(false);

  useEffect(() => {
    // Ensure Genie AI Theme is active for the Login Page without altering saved preferences
    document.documentElement.setAttribute('data-theme', 'genie');

    const handleMouseMove = (e) => {
      setCoords({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const googleLoading = isGoogleLoading || isLocalGoogleLoading;
  const microsoftLoading = isMicrosoftLoading || isLocalMicrosoftLoading;
  const anyLoading = googleLoading || microsoftLoading;

  const generateOAuthState = () => {
    const array = new Uint32Array(4);
    window.crypto.getRandomValues(array);
    let state = '';
    for (let i = 0; i < array.length; i++) {
      state += array[i].toString(16);
    }
    return state;
  };

  const loginWithGoogle = () => {
    if (anyLoading) return;
    setIsLocalGoogleLoading(true);

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = window.location.origin;
    const scope = 'openid profile email';
    const responseType = 'token';

    const state = generateOAuthState();
    sessionStorage.setItem('oauth_state', state);

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${encodeURIComponent(scope)}&state=${state}`;

    window.location.href = authUrl;
  };

  const { instance } = useMsal();

  const handleMicrosoftLogin = () => {
    if (anyLoading) return;
    setIsLocalMicrosoftLoading(true);

    instance.loginRedirect(loginRequest)
      .catch(e => {
        console.error(e);
        setIsLocalMicrosoftLoading(false);
        if (setLoginError) {
          setLoginError(`Microsoft Login failed: ${e.message || e}`);
        }
      });
  };

  return (
    <div className="fixed inset-0 w-screen h-screen flex items-center justify-center overflow-hidden bg-bg-dark font-outfit select-none">
      {/* Aurora Waves Background & Contrast Glass Overlay */}
      <div 
        className="fixed inset-0 w-screen h-screen bg-cover bg-center transition-all duration-700 -z-30 scale-105 animate-[pulse_14s_ease-in-out_infinite]"
        style={{ backgroundImage: `url(/backgrounds/aurora-waves.png)` }}
      />
      {/* Glass Overlay for High Text Legibility & Crisp Contrast */}
      <div className="fixed inset-0 w-screen h-screen bg-bg-dark/70 backdrop-blur-[8px] -z-20 transition-all duration-500" />

      {/* Dynamic Cursor Spotlight Tracker */}
      <div 
        className="pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-radial from-primary/15 via-accent/5 to-transparent blur-[120px] z-0 transition-opacity duration-500 hidden lg:block"
        style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
      />

      {/* Main Login Split Container */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 w-full max-w-6xl px-8 items-center z-10 my-auto">
        
        {/* Left Column: Brand Showcase & Value Props */}
        <div className="animate-[slideInLeft_0.8s_cubic-bezier(0.23,1,0.32,1)] flex flex-col justify-center relative">

          {/* Hero Heading */}
          <h1 className="text-4xl lg:text-5xl font-extrabold leading-[1.15] tracking-tight text-text-main mb-5">
            Transform Checklists into <br />
            <span className="text-gradient drop-shadow-[0_0_30px_var(--color-primary-glow)]">Actionable Intelligence</span>
          </h1>

          <p className="text-base leading-relaxed text-text-muted max-w-md mb-8">
            Automate tracking, gain real-time visibility, and empower teams with AI-driven operational insights.
          </p>

          {/* Feature Highlight List */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-glass-border/40 backdrop-blur-md transition-all duration-300 hover:border-primary/40 hover:translate-x-1.5">
              <div className="w-10 h-10 bg-primary/15 border border-primary/30 rounded-xl flex items-center justify-center text-primary shadow-md">
                <BarChart3 size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-main mb-0.5">Interactive Visual Dashboards</h4>
                <p className="text-xs text-text-muted">Real-time metrics & automated compliance tracking.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-glass-border/40 backdrop-blur-md transition-all duration-300 hover:border-accent/40 hover:translate-x-1.5">
              <div className="w-10 h-10 bg-accent/15 border border-accent/30 rounded-xl flex items-center justify-center text-accent shadow-md">
                <Zap size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-main mb-0.5">Instant Data Synchronization</h4>
                <p className="text-xs text-text-muted">Sub-second updates across teams and locations.</p>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex items-center gap-6 pt-2 text-xs text-text-muted font-medium border-t border-glass-border/40">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-success" />
              <span>ISO 27001 Certified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock size={14} className="text-primary" />
              <span>OAuth 2.0 Verified</span>
            </div>
          </div>
        </div>

        {/* Right Column: Clean & Clear Login Card */}
        <div className="relative group/card bg-bg-card/90 backdrop-blur-2xl border border-glass-border hover:border-primary/40 rounded-[32px] p-8 lg:p-10 login-card transition-all duration-500 text-center animate-[slideInRight_0.8s_cubic-bezier(0.23,1,0.32,1)] shadow-2xl">
          {/* Subtle Outer Glow */}
          <div className="absolute -inset-[1px] bg-gradient-to-br from-primary/20 via-transparent to-accent/20 rounded-[32px] -z-10 opacity-60 group-hover/card:opacity-100 transition-opacity duration-500" />

          {/* Card Header */}
          <div className="mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/30 group-hover/card:scale-105 transition-transform duration-300 border border-white/20">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-black text-text-main mb-1.5 tracking-tight">Sign In to Workspace</h2>
            <p className="text-xs text-text-muted">Select your organization's SSO login option</p>
          </div>

          {/* Login Buttons Container */}
          <div className="flex flex-col gap-4 mb-6">
            {/* Google SSO Button */}
            <button
              onClick={() => loginWithGoogle()}
              onMouseEnter={() => setIsHoveredGoogle(true)}
              onMouseLeave={() => setIsHoveredGoogle(false)}
              disabled={anyLoading}
              className="login-btn w-full flex items-center justify-center gap-3.5 px-6 py-3.5 rounded-2xl transition-all duration-300 group shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus:outline-none cursor-pointer"
            >
              {googleLoading ? (
                <Loader2 size={20} className="animate-spin text-primary" />
              ) : (
                <svg className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isHoveredGoogle ? 'scale-110' : ''}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              )}
              <span className="font-bold text-sm tracking-wide text-center">
                {googleLoading ? 'Authenticating with Google...' : 'Continue with Google'}
              </span>
            </button>

            {/* Microsoft SSO Button */}
            <button
              onClick={handleMicrosoftLogin}
              onMouseEnter={() => setIsHoveredMS(true)}
              onMouseLeave={() => setIsHoveredMS(false)}
              disabled={anyLoading}
              className="login-btn w-full flex items-center justify-center gap-3.5 px-6 py-3.5 rounded-2xl transition-all duration-300 group shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus:outline-none cursor-pointer"
            >
              {microsoftLoading ? (
                <Loader2 size={20} className="animate-spin text-[#00A4EF]" />
              ) : (
                <svg className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isHoveredMS ? 'scale-110' : ''}`} viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 0H10.8V10.8H0V0Z" fill="#F25022" />
                  <path d="M12.2 0H23V10.8H12.2V0Z" fill="#7FBA00" />
                  <path d="M0 12.2H10.8V23H0V12.2Z" fill="#00A4EF" />
                  <path d="M12.2 12.2H23V23H12.2V12.2Z" fill="#FFB900" />
                </svg>
              )}
              <span className="font-bold text-sm tracking-wide text-center">
                {microsoftLoading ? 'Authenticating with Microsoft...' : 'Continue with Microsoft'}
              </span>
            </button>
          </div>

          {/* Premium Footer Branding Badge Link */}
          <div className="mt-5 pt-4 border-t border-glass-border/40 flex items-center justify-center">
            <a 
              href="https://ibacustech.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-primary/10 border border-glass-border/60 hover:border-primary/30 text-[11px] font-medium text-text-muted hover:text-primary transition-all duration-300 group cursor-pointer shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 group-hover:bg-primary animate-pulse" />
              <span>Designed & Engineered by</span>
              <span className="font-bold text-text-main group-hover:text-primary transition-colors">Ibacus Team</span>
              <ExternalLink size={12} className="text-text-muted/60 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 ml-0.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Login Error Modal */}
      {loginError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-bg-card backdrop-blur-2xl border border-danger/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-danger/20 border border-danger/30 flex items-center justify-center text-danger mb-4 shrink-0 animate-bounce">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-base font-extrabold text-text-main">Access Restricted</h3>
              <p className="text-xs text-text-muted mt-2 leading-relaxed">
                Your account is currently disabled or unauthorized for this workspace.
              </p>
              <div className="w-full bg-danger/10 border border-danger/20 rounded-xl p-3 text-[11px] text-danger font-semibold text-center mt-4 leading-normal">
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
