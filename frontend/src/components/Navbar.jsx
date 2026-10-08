import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  LogOut,
  User,
  ShieldCheck,
  GraduationCap,
  Bell,
  Camera,
} from 'lucide-react';

export function Navbar({ onNavigate, activeTab }) {
  const { user, logout } = useAuth();
  const isStudent = user?.role === 'STUDENT';

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate(isStudent ? 'student-dash' : 'admin-dash')}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl gradient-bg shadow-lg shadow-cyan-500/20 text-white">
            <GraduationCap className="w-6 h-6" />
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">Apex<span className="text-cyan-400">Attend</span></span>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center space-x-1">
                <Sparkles className="w-2.5 h-2.5 mr-0.5" /> AI Powered
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Smart College Attendance System</p>
          </div>
        </div>

        {/* Navigation Tabs (For Student or shortcuts) */}
        {isStudent && (
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onNavigate('student-dash')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'student-dash'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onNavigate('student-attendance')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'student-attendance'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Attendance History
            </button>
            <button
              onClick={() => onNavigate('student-profile')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'student-profile'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              My Profile
            </button>
          </nav>
        )}

        {/* User Badge, Live Camera shortcut for Admin, Logout */}
        <div className="flex items-center space-x-3">
          {!isStudent && (
            <button
              onClick={() => onNavigate('admin-camera')}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
              title="Launch Live Face Camera Recognition"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Live AI Camera</span>
            </button>
          )}

          {/* User info chip */}
          <div className="flex items-center space-x-2.5 pl-2 py-1 pr-1 rounded-full bg-slate-900/80 border border-slate-800">
            <div className="w-7 h-7 rounded-full bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 flex items-center justify-center text-xs font-bold overflow-hidden">
              {user?.photo_url ? (
                <img src={user.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.full_name?.charAt(0) || 'U'
              )}
            </div>
            <div className="hidden sm:block text-left pr-2">
              <p className="text-xs font-medium text-slate-200 leading-tight truncate max-w-[120px]">
                {user?.full_name || 'User'}
              </p>
              <div className="flex items-center space-x-1">
                {isStudent ? (
                  <span className="text-[10px] text-cyan-400 font-medium">Student</span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-medium flex items-center">
                    <ShieldCheck className="w-2.5 h-2.5 mr-0.5 inline" /> Admin
                  </span>
                )}
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
