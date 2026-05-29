import React, { useState } from 'react';
import { BarChart, ClipboardCheck, Building, Layers, User } from 'lucide-react';

// Modular Imports
import SubmissionsReport from './SubmissionsReport';
import DepartmentReport from './DepartmentReport';
import TemplateReport from './TemplateReport';
import UserReport from './UserReport';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('submissions');

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart className="text-accent animate-pulse" size={24} />
            Checklist Reports
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Access multi-dimensional analytics. View department, template, user compliance or detailed logs.
          </p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-white/5 border border-glass-border rounded-2xl w-max max-w-full">
        {[
          { id: 'submissions', label: 'Detailed Submissions', icon: ClipboardCheck },
          { id: 'departments', label: 'Department Reports', icon: Building },
          { id: 'templates', label: 'Template Reports', icon: Layers },
          { id: 'users', label: 'User Reports', icon: User }
        ].map(tab => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isActive 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <IconComp size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Views */}
      <div className="space-y-6">
        {activeTab === 'submissions' && <SubmissionsReport />}
        {activeTab === 'departments' && <DepartmentReport />}
        {activeTab === 'templates' && <TemplateReport />}
        {activeTab === 'users' && <UserReport />}
      </div>
    </div>
  );
}
