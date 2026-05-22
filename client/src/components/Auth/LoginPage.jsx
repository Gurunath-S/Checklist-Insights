import React from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';
import { Sparkles, ShieldCheck, BarChart3, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

const LoginPage = ({ onLoginSuccess, onMicrosoftLoginSuccess, onLoginError }) => {
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
    // Using redirect instead of popup to avoid popup timeouts and cross-origin blocking issues
    instance.loginRedirect(loginRequest)
      .catch(e => {
        console.error(e);
        onLoginError(e);
      });
  };

  return (
    <div className="fixed inset-0 w-screen h-screen flex items-center justify-center overflow-hidden bg-slate-950 font-outfit">
      {/* Animated Background Layers */}
      <div className="app-bg"></div>
      <div className="mesh-gradient"></div>
      <div className="blob"></div>
      <div className="blob-2"></div>
      <div className="stars-overlay"></div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 w-full max-w-6xl px-8 items-center z-10">
        {/* Left Side: Brand & Value Prop */}
        <div className="animate-[slideInLeft_0.8s_cubic-bezier(0.23,1,0.32,1)]">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-xs font-semibold text-primary mb-6">
            <Sparkles size={14} />
            <span>Next-Gen Analytics Platform</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold leading-[1.1] tracking-tight text-white mb-6">
            Unlock the Power of <br />
            <span className="text-gradient">Checklist Genie</span>
          </h1>

          <p className="text-base leading-relaxed text-text-muted max-w-md mb-8">
            Transform your manual checklists into actionable insights.
            Automate tracking, identify trends, and boost team performance with
            AI-powered analytics.
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/5 border border-glass-border rounded-xl flex items-center justify-center text-accent shadow-xl shadow-accent/5">
                <BarChart3 size={18} />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white mb-1">Smart Visualization</h4>
                <p className="text-sm text-text-muted">Interactive charts that tell your data's story.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/5 border border-glass-border rounded-xl flex items-center justify-center text-accent shadow-xl shadow-accent/5">
                <Zap size={18} />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white mb-1">Real-time Tracking</h4>
                <p className="text-sm text-text-muted">Instant updates on every checklist submission.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="bg-slate-900/40 backdrop-blur-[40px] border border-white/10 rounded-3xl p-8 lg:p-10 shadow-2xl shadow-black/50 text-center animate-[slideInRight_0.8s_cubic-bezier(0.23,1,0.32,1)]">
          <div className="mb-8">
            <div className="w-12 h-12 bg-linear-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/30">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">Get Started</h3>
            <p className="text-text-muted">Experience the future of reporting</p>
          </div>

          <div className="flex flex-col gap-4 mb-4">
            <button
              onClick={() => loginWithGoogle()}
              className="w-full flex items-center justify-center gap-3 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-300 group shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
              <span className="text-white font-medium">Continue with Google</span>
            </button>

            <button
              onClick={handleMicrosoftLogin}
              className="w-full flex items-center justify-center gap-3 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-300 group shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0H10.8V10.8H0V0Z" fill="#F25022" />
                <path d="M12.2 0H23V10.8H12.2V0Z" fill="#7FBA00" />
                <path d="M0 12.2H10.8V23H0V12.2Z" fill="#00A4EF" />
                <path d="M12.2 12.2H23V23H12.2V12.2Z" fill="#FFB900" />
              </svg>
              <span className="text-white font-medium">Continue with Microsoft</span>
            </button>
          </div>

          <div className="mt-6 flex items-center gap-4 text-white/20">
            <div className="flex-1 h-px bg-current"></div>
            <span className="text-xs uppercase tracking-widest font-bold">Secure Access</span>
            <div className="flex-1 h-px bg-current"></div>
          </div>

          <div className="pt-6">
            <div className="flex items-center justify-center gap-2 text-success text-sm font-semibold">
              <CheckCircle2 size={14} />
              <span>Enterprise Grade Security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
