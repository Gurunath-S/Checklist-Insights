import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X, HelpCircle, MapPin, Sparkles } from 'lucide-react';

/**
 * TourGuide – page-navigating interactive help tour.
 *
 * Props:
 *  - isOpen        {boolean}   show/hide the tour
 *  - onClose       {function}  called when tour is closed/finished
 *  - isAdmin       {boolean}   true → admin steps, false → regular-user steps
 *  - navigateTo    {function}  (view, isAdmin?) → switches the current page in the app
 *  - currentView   {string}    current active page key so tour can detect mismatches
 */
export default function TourGuide({ isOpen, onClose, isAdmin, navigateTo, currentView }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightStyle, setHighlightStyle] = useState({ display: 'none' });
  const [tooltipStyle, setTooltipStyle] = useState({ display: 'none' });
  const resizeObserver = useRef(null);
  const stepTimeoutRef = useRef(null);

  /* ─────────────────────────────────────────────────────────────────────────
   * STEP DEFINITIONS
   * Each step can optionally have:
   *   navigateTo  – { view, admin? }  navigate BEFORE showing spotlight
   *   target      – CSS selector to spotlight (null → centred modal)
   *   placement   – 'right' | 'left' | 'bottom' | 'top' | 'center'
   *   delay       – ms to wait after navigating before computing spotlight
   * ────────────────────────────────────────────────────────────────────────*/

  const adminSteps = [
    // ── Welcome ──────────────────────────────────────────────────────────────
    {
      title: "Welcome to GenieAI! 🌟",
      content: "You're about to get a guided tour of your entire intelligence dashboard. We'll walk through every page, every button, and show you how to get the most out of your admin tools. Let's start!",
      target: null,
      placement: "center"
    },
    // ── Sidebar navigation ───────────────────────────────────────────────────
    {
      title: "Your Navigation Hub",
      content: "The Sidebar is your main navigation. It lists all available pages and sections. Hover over it anytime to see the full labels. Click any item to switch pages instantly.",
      target: "#sidebar-menu",
      placement: "right",
      navigateTo: { view: 'dashboard', admin: true }
    },
    {
      title: "Admin Section",
      content: "As an Admin, you have access to the 'Admin Overview' section. Expand it to see System Overview, User Management, Reports, and Template Console — each for different aspects of team management.",
      target: "#sidebar-admin-menu",
      placement: "right"
    },
    // ── Dashboard page ────────────────────────────────────────────────────────
    {
      title: "Main Dashboard — Stat Cards",
      content: "Your dashboard opens with KPI stat cards: total submissions, compliance rate, streak, and today's count. These update in real-time. Click the date preset buttons (Today, This Week, etc.) to filter the range.",
      target: "#dashboard-summary-cards",
      placement: "bottom",
      navigateTo: { view: 'dashboard', admin: true },
      delay: 400
    },
    {
      title: "Department Filter Bar",
      content: "Use this bar to filter ALL data by department. Switch between Overview, Development, Sales, HR, etc. The charts and tables below update instantly. 'Overview' shows the whole organisation.",
      target: "#admin-departments",
      placement: "bottom"
    },
    {
      title: "User Inspection Dropdown",
      content: "This powerful dropdown lets you select ANY team member to load their personal dashboard view — their own submission history, compliance score, and checklist breakdown — without them needing to share their account.",
      target: "#user-performance-explorer",
      placement: "bottom"
    },
    {
      title: "Insights Chart",
      content: "The chart visualises submission patterns over time. Select which checklist items to display using the toggle chips above the chart. Click any bar to jump directly to that item's detail breakdown below.",
      target: "#insights-chart-container",
      placement: "top"
    },
    {
      title: "Checklist Explorer",
      content: "The Checklist Explorer shows granular item-level data. Pick any checklist question from the dropdown, select a date range, and see a detailed chart plus a user-by-user breakdown table below.",
      target: "#checklist-explorer-container",
      placement: "top"
    },
    {
      title: "Activity Log",
      content: "At the bottom of the dashboard is the Activity Explorer. It shows recent submission events as a timeline — great for spotting who submitted what and when.",
      target: "#activity-explorer-container",
      placement: "top"
    },
    // ── Admin Overview ─────────────────────────────────────────────────────
    {
      title: "System Overview — Tag Relationships",
      content: "Inside the Admin section, the Overview page has two tabs. 'Dashboard Overview' is what you just saw. The 'Tag Relationships' tab shows a visual graph of how departments, tags, and templates are linked.",
      target: "#sidebar-admin-overview",
      placement: "right",
      navigateTo: { view: 'dashboard', admin: true }
    },
    // ── User Management ────────────────────────────────────────────────────
    {
      title: "User Management Page",
      content: "Click 'User Management' to manage all team members. Here you can add new users, edit existing profiles, assign them to departments, set their role (Admin or Member), and control system access. Every change is saved instantly.",
      target: "#sidebar-user-management",
      placement: "right",
      navigateTo: { view: 'user-management', admin: true },
      delay: 300
    },
    {
      title: "User Management — Add & Edit",
      content: "Use the '+ Add User' button at the top to create new accounts. Click any existing user row to open their edit panel on the right — change their name, email, department, or role. The 'Delete' button permanently removes a user.",
      target: "#user-management-container",
      placement: "top"
    },
    // ── Reports ────────────────────────────────────────────────────────────
    {
      title: "Reports Page",
      content: "The Reports page aggregates submission history for the whole team. You'll see per-user compliance stats, submission counts, and last activity dates. Use the search and department filter at the top to narrow results.",
      target: "#sidebar-reports",
      placement: "right",
      navigateTo: { view: 'reports', admin: true },
      delay: 300
    },
    {
      title: "Reports — Export & Drill-down",
      content: "On the Reports page, click any user row to expand a detailed breakdown of every submission they've made. Use the 'Export CSV' button (top-right) to download the full dataset as a spreadsheet.",
      target: "#reports-container",
      placement: "top"
    },
    // ── Template Console ────────────────────────────────────────────────────
    {
      title: "Template Console",
      content: "The Template Console is the heart of checklist administration. It shows every template in your system, organised by Department → Tag → Template. Switch between 'Interactive Console' (table) and 'Tree Diagram' (graph) views using the tabs at the top.",
      target: "#sidebar-admin-menu",
      placement: "right",
      navigateTo: { view: 'template-dashboard', admin: true },
      delay: 400
    },
    {
      title: "Template Console — Search",
      content: "Use the Search bar (top-right of the console) to instantly filter templates and tags by name. Results update live across both the table and graph views.",
      target: "#template-search-input",
      placement: "bottom"
    },
    {
      title: "Template Console — Interactive Table",
      content: "In 'Interactive Console' mode, each template row lets you: change its Priority (LOW/MEDIUM/HIGH), assign an Owner, move it to a different Tag, or Disconnect it (which moves it to the Unconnected area). All changes sync to the database automatically.",
      target: "#template-table-view",
      placement: "top"
    },
    {
      title: "Template Console — Delete Tag",
      content: "Each tag row has a 'Delete Tag' button. When you delete a tag, all templates connected to it are safely moved to the Unconnected area — they are NOT deleted. You can then reconnect them to a different tag.",
      target: "#template-table-view",
      placement: "top"
    },
    {
      title: "Template Console — Tree Diagram",
      content: "Switch to 'Tree Diagram' to see a radial mind-map. Click any department tab at the top to focus on it. Toggle between 'Tags Map' (shows tag nodes) and 'Templates Map' (shows all templates). Click any node to open a detail panel. Drag to pan, scroll to zoom.",
      target: "#template-table-view",
      placement: "top"
    },
    // ── Settings ─────────────────────────────────────────────────────────────
    {
      title: "Settings Page",
      content: "Head to Settings to personalise your experience. You can switch between 4 premium themes: Classic Dark, Genie Mode, Ocean Sapphire, and Light Glass. Your theme choice is saved to your account and persists across devices.",
      target: "#sidebar-settings",
      placement: "right",
      navigateTo: { view: 'settings', admin: true },
      delay: 300
    },
    {
      title: "Settings — Help Tour",
      content: "You can restart this guided tour at any time! Click the 'Help Tour' button in the Settings page or in the sidebar. It will always reflect your current role (Admin or Member) and show the relevant steps.",
      target: "#settings-help-tour-btn",
      placement: "bottom"
    },
    // ── Done ────────────────────────────────────────────────────────────────
    {
      title: "You're All Set! 🎉",
      content: "You now know every major feature of the GenieAI Admin Dashboard. Use the sidebar anytime to jump between pages, and remember you can restart this tour from the Settings page. Good luck!",
      target: null,
      placement: "center"
    }
  ];

  const userSteps = [
    // ── Welcome ──────────────────────────────────────────────────────────────
    {
      title: "Welcome to GenieAI! 🌟",
      content: "Let's take a quick guided tour of your personal dashboard. We'll walk through every section so you know exactly how to track your work, view your stats, and make the most of your daily checklists.",
      target: null,
      placement: "center"
    },
    // ── Sidebar ───────────────────────────────────────────────────────────────
    {
      title: "Your Navigation Sidebar",
      content: "The sidebar on the left is your main navigation. It has two items: 'Dashboard' (your home page with all your stats) and 'Settings' (to customise your experience). Click either to switch instantly.",
      target: "#sidebar-menu",
      placement: "right",
      navigateTo: { view: 'dashboard', admin: false }
    },
    // ── Dashboard ─────────────────────────────────────────────────────────────
    {
      title: "Your Personal KPI Cards",
      content: "These cards at the top of your dashboard show your key metrics at a glance: total submissions you've made, your overall compliance rate, your current streak, and today's submission count. They update each time you submit a checklist.",
      target: "#dashboard-summary-cards",
      placement: "bottom",
      navigateTo: { view: 'dashboard', admin: false },
      delay: 400
    },
    {
      title: "Date Preset Filters",
      content: "Use the date preset buttons (Today, Yesterday, This Week, This Month, All Time) to filter your stats by time period. You can also set a custom date range. The charts and cards below will update to show data for that period only.",
      target: "#date-preset-bar",
      placement: "bottom"
    },
    {
      title: "Your Insights Chart",
      content: "The chart tracks your checklist submission patterns over time. Use the toggle chips above it to choose which checklist items you want to visualise. Click any bar or point to drill into that item's detail in the Checklist Explorer below.",
      target: "#insights-chart-container",
      placement: "top"
    },
    {
      title: "Checklist Explorer",
      content: "The Checklist Explorer gives you a deep-dive into any single checklist question. Pick a question from the dropdown, set a date range, and see a chart of your responses over time plus a summary table. Great for tracking habits.",
      target: "#checklist-explorer-container",
      placement: "top"
    },
    {
      title: "Activity Log",
      content: "Your Activity Log is at the bottom of the dashboard. It shows a live timeline of your recent submissions — what you submitted, which checklist it was for, and when. Useful for verifying that your entries were saved correctly.",
      target: "#activity-explorer-container",
      placement: "top"
    },
    // ── Settings ──────────────────────────────────────────────────────────────
    {
      title: "Settings Page",
      content: "Click 'Settings' in the sidebar to customise your workspace. You can choose from 4 beautiful themes: Classic Dark, Genie Mode, Ocean Sapphire, and Light Glass. Your preference is stored and will be remembered next time you log in.",
      target: "#sidebar-settings",
      placement: "right",
      navigateTo: { view: 'settings', admin: false },
      delay: 300
    },
    {
      title: "Restart This Tour Anytime",
      content: "Found this tour helpful? You can restart it at any time by clicking the 'Help Tour' button on the Settings page. It will guide you through the full walkthrough again from the beginning.",
      target: "#settings-help-tour-btn",
      placement: "bottom"
    },
    // ── Done ──────────────────────────────────────────────────────────────────
    {
      title: "You're Ready to Go! 🎉",
      content: "That's everything! Your dashboard is designed to give you clear visibility into your daily work performance. Submit your checklists regularly to keep your stats accurate. You can restart this tour from Settings anytime.",
      target: null,
      placement: "center"
    }
  ];

  const steps = isAdmin ? adminSteps : userSteps;

  /* ─────────────────────────────────────────────────────────────────────────
   * SPOTLIGHT LOGIC
   * ────────────────────────────────────────────────────────────────────────*/
  const updateSpotlight = useCallback(() => {
    if (!isOpen) return;
    const step = steps[currentStep];
    if (!step) return;

    if (!step.target) {
      setHighlightStyle({ display: 'none' });
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        width: '440px',
        maxWidth: 'calc(100vw - 32px)'
      });
      return;
    }

    const el = document.querySelector(step.target);
    if (!el) {
      // Element not on screen → fallback to center
      setHighlightStyle({ display: 'none' });
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        width: '380px',
        maxWidth: 'calc(100vw - 32px)'
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    const pad = 10;

    setHighlightStyle({
      position: 'fixed',
      top: `${rect.top - pad}px`,
      left: `${rect.left - pad}px`,
      width: `${rect.width + pad * 2}px`,
      height: `${rect.height + pad * 2}px`,
      borderRadius: '18px',
      boxShadow: '0 0 0 9999px rgba(2, 8, 23, 0.78)',
      border: '2px solid rgba(99,102,241,0.55)',
      zIndex: 9998,
      pointerEvents: 'none',
      transition: 'all 0.35s cubic-bezier(0.25, 1, 0.5, 1)'
    });

    // Tooltip placement
    const gap = 18;
    const TW = 360;
    const TH = 230; // estimate height including margins
    let top = 0;
    let left = 0;

    if (step.placement === 'right') {
      top = rect.top + rect.height / 2 - TH / 2;
      left = rect.right + gap;
    } else if (step.placement === 'left') {
      top = rect.top + rect.height / 2 - TH / 2;
      left = rect.left - TW - gap;
    } else if (step.placement === 'bottom') {
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - TW / 2;
    } else {
      // top
      top = rect.top - TH - gap;
      left = rect.left + rect.width / 2 - TW / 2;
    }

    // Clamp to viewport
    const vpad = 20;
    if (left < vpad) left = vpad;
    if (left + TW > window.innerWidth - vpad) left = window.innerWidth - TW - vpad;
    
    // Also prevent clamping top below screen top or bottom
    if (top < vpad) top = vpad;
    if (top + TH > window.innerHeight - vpad) top = window.innerHeight - TH - vpad;

    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      transform: 'none',
      zIndex: 9999,
      width: `${TW}px`,
      transition: 'all 0.35s cubic-bezier(0.25, 1, 0.5, 1)'
    });
  }, [isOpen, currentStep, steps]);

  /* ─────────────────────────────────────────────────────────────────────────
   * STEP EFFECT — navigate + delay + spotlight
   * ────────────────────────────────────────────────────────────────────────*/
  useEffect(() => {
    if (!isOpen) return;

    const step = steps[currentStep];
    if (!step) return;

    // Clean up previous timers / observers
    if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
    if (resizeObserver.current) resizeObserver.current.disconnect();

    // Navigate to the target page if required
    if (step.navigateTo && navigateTo) {
      navigateTo(step.navigateTo.view, step.navigateTo.admin ?? isAdmin);
    }

    // Wait for page transition + optional extra delay, then compute spotlight
    const delay = step.delay ?? (step.navigateTo ? 500 : 80);

    stepTimeoutRef.current = setTimeout(() => {
      updateSpotlight();

      if (step.target) {
        const el = document.querySelector(step.target);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

          // Recompute after scroll settles
          stepTimeoutRef.current = setTimeout(updateSpotlight, 350);

          resizeObserver.current = new ResizeObserver(updateSpotlight);
          resizeObserver.current.observe(el);
        }
      }
    }, delay);

    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, { passive: true });

    return () => {
      if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight);
      if (resizeObserver.current) resizeObserver.current.disconnect();
    };
  }, [isOpen, currentStep]);

  // Reset step counter when tour opens
  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const activeStep = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const handleFinish = () => {
    onClose();
    setCurrentStep(0);
  };

  const progress = Math.round(((currentStep + 1) / steps.length) * 100);

  return (
    <div className="fixed inset-0 z-[9990] pointer-events-none" style={{ isolation: 'isolate' }}>
      {/* Dark overlay */}
      {activeStep.target ? (
        <div style={highlightStyle} />
      ) : (
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm pointer-events-auto"
          onClick={handleFinish}
        />
      )}

      {/* Tooltip card */}
      <div
        style={tooltipStyle}
        className="pointer-events-auto bg-bg-card/98 backdrop-blur-2xl border border-glass-border rounded-3xl p-6 shadow-2xl flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
              <HelpCircle size={14} className="text-primary" />
            </div>
            <h3 className="text-sm font-black text-text-main leading-tight">{activeStep.title}</h3>
          </div>
          <button
            onClick={handleFinish}
            className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-muted hover:text-text-main transition-all cursor-pointer shrink-0"
          >
            <X size={13} />
          </button>
        </div>

        {/* Step page label */}
        {activeStep.navigateTo && (
          <div className="flex items-center gap-1.5 -mt-1">
            <MapPin size={10} className="text-accent shrink-0" />
            <span className="text-[10px] font-bold text-accent uppercase tracking-widest">
              {activeStep.navigateTo.view.replace(/-/g, ' ')} page
            </span>
          </div>
        )}

        {/* Content */}
        <p className="text-xs text-text-muted leading-relaxed">{activeStep.content}</p>

        {/* Progress bar */}
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-text-muted font-bold">
            {currentStep + 1} / {steps.length}
          </span>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-glass-border hover:bg-white/10 rounded-xl text-[10px] font-bold text-text-main transition-all cursor-pointer"
              >
                <ChevronLeft size={12} />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white hover:bg-primary/90 rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-lg shadow-primary/25"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <Sparkles size={11} />
                  <span>Finish Tour</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight size={12} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
