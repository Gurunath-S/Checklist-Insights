import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, X, HelpCircle } from 'lucide-react';

export default function TourGuide({ isOpen, onClose, isAdmin }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightStyle, setHighlightStyle] = useState({ display: 'none' });
  const [tooltipStyle, setTooltipStyle] = useState({ display: 'none' });
  const resizeObserver = useRef(null);

  const steps = [
    {
      title: "Welcome to GenieAI! 🌟",
      content: "Let's take a quick 1-minute tour of your intelligence dashboard to help you navigate and unlock insights faster.",
      target: null, // Modal center
      placement: "center"
    },
    {
      title: "Main Navigation Hub",
      content: isAdmin 
        ? "Use the Sidebar to easily toggle between your Main Dashboard and Settings. As an Admin, you have access to the Admin Overview sections to manage the workspace." 
        : "Use the Sidebar to easily toggle between your Main Dashboard and Settings.",
      target: "#sidebar-menu",
      placement: "right"
    },
    ...(isAdmin ? [
      {
        title: "Admin Overview Hub",
        content: "Admin Overview: This expandable menu contains all organization management utilities.",
        target: "#sidebar-admin-menu",
        placement: "right"
      },
      {
        title: "System Insights Overview",
        content: "Overview: Access organization-wide insights, check overall submission counts, and view key compliance stats.",
        target: "#sidebar-admin-overview",
        placement: "right"
      },
      {
        title: "User Account Management",
        content: "User Management: Add new team members, edit details, assign departments/roles, and control system access.",
        target: "#sidebar-user-management",
        placement: "right"
      },
      {
        title: "Submission Reports",
        content: "Reports: Access and export all team submission histories, compliance scores, and question-level responses.",
        target: "#sidebar-reports",
        placement: "right"
      },
      {
        title: "Department Switcher",
        content: "Filter all analytical views by department (Overview, Development, Sales, HR, etc.) to zoom into team-specific metrics.",
        target: "#admin-departments",
        placement: "bottom"
      },
      {
        title: "User Performance Explorer",
        content: "Search and select any team member to view their individual submission details, compliance score, and focus stats.",
        target: "#user-performance-explorer",
        placement: "bottom"
      }
    ] : []),
    {
      title: "Application Customization",
      content: "Head to Settings to toggle between the four gorgeous UI themes: Classic Dark, Genie Mode, Ocean Sapphire, and Light Glass.",
      target: "#sidebar-settings",
      placement: "right"
    },
    {
      title: "You're All Set! 🎉",
      content: "You are ready to explore. You can restart this tour at any time by clicking the 'Help Tour' option in the sidebar or under Settings.",
      target: null,
      placement: "center"
    }
  ];

  const updateSpotlight = () => {
    if (!isOpen || currentStep >= steps.length) return;

    const step = steps[currentStep];
    if (!step.target) {
      // Center modal style
      setHighlightStyle({ display: 'none' });
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        width: '400px',
        maxWidth: 'calc(100vw - 32px)'
      });
      return;
    }

    const element = document.querySelector(step.target);
    if (!element) {
      // Element not present on current viewport, fallback to center or skip
      setHighlightStyle({ display: 'none' });
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        width: '400px',
        maxWidth: 'calc(100vw - 32px)'
      });
      return;
    }

    const rect = element.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    // Pad the spotlight area slightly
    const padding = 8;
    const top = rect.top + scrollY - padding;
    const left = rect.left + scrollX - padding;
    const width = rect.width + padding * 2;
    const height = rect.height + padding * 2;

    setHighlightStyle({
      position: 'absolute',
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      height: `${height}px`,
      borderRadius: '16px',
      boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.75)',
      zIndex: 9998,
      pointerEvents: 'none',
      transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
    });

    // Calculate tooltip placement
    const gap = 16;
    let tooltipTop = 0;
    let tooltipLeft = 0;
    let tooltipTransform = '';

    if (step.placement === 'right') {
      tooltipTop = top + height / 2;
      tooltipLeft = left + width + gap;
      tooltipTransform = 'translateY(-50%)';
    } else if (step.placement === 'left') {
      tooltipTop = top + height / 2;
      tooltipLeft = left - gap;
      tooltipTransform = 'translate(-100%, -50%)';
    } else if (step.placement === 'bottom') {
      tooltipTop = top + height + gap;
      tooltipLeft = left + width / 2;
      tooltipTransform = 'translateX(-50%)';
    } else {
      // top
      tooltipTop = top - gap;
      tooltipLeft = left + width / 2;
      tooltipTransform = 'translate(-50%, -100%)';
    }

    // Guard tooltip boundaries
    const paddingBoundary = 20;
    if (tooltipLeft < paddingBoundary) {
      tooltipLeft = paddingBoundary;
      tooltipTransform = '';
    } else if (tooltipLeft > window.innerWidth - 350) {
      tooltipLeft = window.innerWidth - 350;
      tooltipTransform = '';
    }

    setTooltipStyle({
      position: 'absolute',
      top: `${tooltipTop}px`,
      left: `${tooltipLeft}px`,
      transform: tooltipTransform,
      zIndex: 9999,
      width: '320px',
      transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
    });
  };

  useEffect(() => {
    if (isOpen) {
      updateSpotlight();
      window.addEventListener('resize', updateSpotlight);
      window.addEventListener('scroll', updateSpotlight);

      // Set up resize observer to track target element size shifts
      const step = steps[currentStep];
      if (step && step.target) {
        const element = document.querySelector(step.target);
        if (element) {
          resizeObserver.current = new ResizeObserver(() => updateSpotlight());
          resizeObserver.current.observe(element);
        }
      }
    }

    return () => {
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight);
      if (resizeObserver.current) {
        resizeObserver.current.disconnect();
      }
    };
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const activeStep = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
      setCurrentStep(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-100 overflow-y-auto w-screen h-screen pointer-events-none">
      {/* Dark overlay with window highlight */}
      {activeStep.target ? (
        <div style={highlightStyle} className="border-2 border-primary/45 shadow-[0_0_30px_rgba(99,102,241,0.25)]" />
      ) : (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs pointer-events-auto" onClick={onClose} />
      )}

      {/* Interactive Tooltip Card */}
      <div 
        style={tooltipStyle} 
        className="pointer-events-auto bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-6 shadow-2xl text-left flex flex-col gap-4 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <HelpCircle size={18} className="text-primary shrink-0" />
            <h3 className="text-sm font-black uppercase tracking-wider text-text-main">
              {activeStep.title}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-text-muted hover:text-text-main transition-colors p-1 hover:bg-white/5 rounded-lg cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-text-muted leading-relaxed">
          {activeStep.content}
        </p>

        <div className="flex items-center justify-between mt-2 pt-4 border-t border-glass-border/30">
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'bg-primary w-4' : 'bg-text-muted/30'
                }`}
              />
            ))}
          </div>

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
              className="flex items-center gap-1 px-4 py-1.5 bg-primary text-white hover:bg-primary-dark rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-lg shadow-primary/20 hover:shadow-primary/30"
            >
              <span>{currentStep === steps.length - 1 ? 'Finish' : 'Next'}</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
