import React from 'react';
import { Mail, Calendar } from 'lucide-react';

const UserProfileHeader = ({ user }) => {
  // Get greeting based on time of day
  const getGreetingDetails = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return {
        greeting: "Good morning",
        emoji: "☀️",
        subtext: "Wishing you a productive and wonderful day ahead."
      };
    } else if (hour < 17) {
      return {
        greeting: "Good afternoon",
        emoji: "🌤️",
        subtext: "Hope your day is going well! Here's your checklist summary."
      };
    } else {
      return {
        greeting: "Good evening",
        emoji: "🌙",
        subtext: "Unwinding? Here is your performance overview for today."
      };
    }
  };

  const { greeting, emoji, subtext } = getGreetingDetails();
  const firstName = user?.name ? user.name.split(' ')[0] : 'User';

  return (
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 mb-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300">
      {/* Left side: Avatar and warm greeting */}
      <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-primary to-accent p-[1px] shadow-lg shadow-primary/20 flex items-center justify-center shrink-0">
          <div className="w-full h-full bg-bg-card rounded-[15px] flex items-center justify-center font-black text-lg text-white">
            {firstName.charAt(0).toUpperCase()}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
            <span>{greeting}, {firstName}!</span>
            <span className="animate-bounce-slow text-base">{emoji}</span>
          </h2>
          <p className="text-xs text-text-muted mt-0.5 font-medium">{subtext}</p>
        </div>
      </div>

      {/* Right side: Minimal info tags */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 w-full md:w-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-glass-border text-xs text-text-muted hover:text-white transition-colors duration-200">
          <Mail size={13} className="text-primary shrink-0" />
          <span className="font-semibold truncate max-w-[180px]">{user?.email || 'N/A'}</span>
        </div>
        
        {user?.doj && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-glass-border text-xs text-text-muted hover:text-white transition-colors duration-200">
            <Calendar size={13} className="text-accent shrink-0" />
            <span className="font-semibold">
              Member since {new Date(user.doj).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileHeader;
