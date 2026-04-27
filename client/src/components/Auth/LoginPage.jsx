import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Sparkles, ShieldCheck, BarChart3, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

const LoginPage = ({ onLoginSuccess, onLoginError }) => {
  return (
    <div className="fixed inset-0 w-screen h-screen flex items-center justify-center overflow-hidden bg-slate-950 font-outfit">
      {/* Animated Background Layers */}
      <div className="app-bg"></div>
      <div className="mesh-gradient"></div>
      <div className="blob"></div>
      <div className="blob-2"></div>
      <div className="stars-overlay"></div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-24 w-full max-w-7xl px-8 items-center z-10">
        {/* Left Side: Brand & Value Prop */}
        <div className="animate-[slideInLeft_0.8s_cubic-bezier(0.23,1,0.32,1)]">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full text-sm font-semibold text-primary mb-8">
            <Sparkles size={14} />
            <span>Next-Gen Analytics Platform</span>
          </div>
          
          <h1 className="text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight text-white mb-8">
            Unlock the Power of <br />
            <span className="text-gradient">Checklist Genie</span>
          </h1>
          
          <p className="text-xl leading-relaxed text-text-muted max-w-lg mb-14">
            Transform your manual checklists into actionable insights. 
            Automate tracking, identify trends, and boost team performance with 
            AI-powered analytics.
          </p>

          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-white/5 border border-glass-border rounded-2xl flex items-center justify-center text-accent shadow-xl shadow-accent/5">
                <BarChart3 size={20} />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-1">Smart Visualization</h4>
                <p className="text-sm text-text-muted">Interactive charts that tell your data's story.</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-white/5 border border-glass-border rounded-2xl flex items-center justify-center text-accent shadow-xl shadow-accent/5">
                <Zap size={20} />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-1">Real-time Tracking</h4>
                <p className="text-sm text-text-muted">Instant updates on every checklist submission.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="bg-slate-900/40 backdrop-blur-[40px] border border-white/10 rounded-[3.5rem] p-16 shadow-2xl shadow-black/50 text-center animate-[slideInRight_0.8s_cubic-bezier(0.23,1,0.32,1)]">
          <div className="mb-12">
            <div className="w-16 h-16 bg-linear-to-br from-primary to-accent rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/30">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">Get Started</h3>
            <p className="text-text-muted">Experience the future of reporting</p>
          </div>

          <div className="bg-white p-1.5 rounded-full mb-12 shadow-xl shadow-white/5">
            <GoogleLogin
              onSuccess={onLoginSuccess}
              onError={onLoginError}
              useOneTap
              theme="filled_blue"
              shape="pill"
              text="continue_with"
              width="100%"
            />
          </div>

          <div className="pt-8 border-t border-glass-border">
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
