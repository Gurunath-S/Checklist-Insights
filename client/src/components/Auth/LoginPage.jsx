import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Sparkles, ShieldCheck, BarChart3, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

const LoginPage = ({ onLoginSuccess, onLoginError }) => {
  return (
    <div className="login-wrapper">
      {/* Animated Background Layers */}
      <div className="app-bg"></div>
      <div className="mesh-gradient"></div>
      <div className="blob"></div>
      <div className="blob-2"></div>
      <div className="stars-overlay"></div>

      <div className="login-container">
        {/* Left Side: Brand & Value Prop */}
        <div className="login-hero">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>Next-Gen Analytics Platform</span>
          </div>
          
          <h1 className="hero-title">
            Unlock the Power of <br />
            <span className="text-gradient">Checklist Genie</span>
          </h1>
          
          <p className="hero-subtitle">
            Transform your manual checklists into actionable insights. 
            Automate tracking, identify trends, and boost team performance with 
            AI-powered analytics.
          </p>

          <div className="hero-features">
            <div className="hero-feature-item">
              <div className="feature-icon-box"><BarChart3 size={20} /></div>
              <div>
                <h4>Smart Visualization</h4>
                <p>Interactive charts that tell your data's story.</p>
              </div>
            </div>
            <div className="hero-feature-item">
              <div className="feature-icon-box"><Zap size={20} /></div>
              <div>
                <h4>Real-time Tracking</h4>
                <p>Instant updates on every checklist submission.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="login-card-v2">
          <div className="card-top">
            <div className="login-logo-v2">
              <ShieldCheck size={32} color="#fff" />
            </div>
            <h3>Get Started</h3>
            <p>Experience the future of reporting</p>
          </div>

          <div className="google-auth-container">
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

          <div className="card-footer">
            <div className="security-tag">
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
