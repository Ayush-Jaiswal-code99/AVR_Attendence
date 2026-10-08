import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarCheck,
  Clock,
  Camera,
  BookOpen,
  ClipboardList,
} from 'lucide-react';

export function Sidebar({ activeTab, onSelectTab, pendingCount = 0 }) {
  const menuItems = [
    { id: 'admin-dash', label: 'Overview', icon: LayoutDashboard },
    { id: 'admin-students', label: 'Student Directory', icon: Users },
    {
      id: 'admin-enrollments',
      label: 'Enrollment Approvals',
      icon: UserCheck,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    { id: 'admin-attendance', label: 'Attendance Records', icon: CalendarCheck },
    { id: 'admin-sessions', label: 'Class Sessions', icon: Clock },
    { id: 'admin-camera', label: 'Live AI Camera', icon: Camera, highlight: true },
    { id: 'admin-academic', label: 'Courses & Faculty', icon: BookOpen },
    { id: 'admin-audit', label: 'System Audit Logs', icon: ClipboardList },
  ];

  return (
    <aside className="w-64 shrink-0 hidden lg:block border-r border-slate-800/80 bg-slate-950/60 min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Management Portal
        </p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-sky-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                  : item.highlight
                  ? 'text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : ''}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && item.badge !== undefined && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8 p-4 rounded-2xl glass-card border border-cyan-500/20 relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl pointer-events-none"></div>
        <p className="text-xs font-semibold text-slate-200 mb-1">AI Pipeline Status</p>
        <p className="text-[11px] text-slate-400 mb-3">Model dlib 128-d vector inference engine active.</p>
        <div className="flex items-center space-x-2 text-[11px] text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Fast Encodings Active</span>
        </div>
      </div>
    </aside>
  );
}
