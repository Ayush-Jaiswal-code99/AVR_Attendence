import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { attendanceApi } from '../../api/attendance';
import { StatCard } from '../../components/StatCard';
import {
  Users,
  UserCheck,
  CalendarCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Award,
  Camera,
  PlusCircle,
  FileDown,
  Clock,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getDashboard();
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load administrator statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExportCsv = async () => {
    try {
      await attendanceApi.exportCsv();
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse"></div>
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <p className="text-rose-400 text-sm mb-4">{error || 'Data unavailable'}</p>
        <button onClick={fetchStats} className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header and Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">College Attendance Overview</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time biometric monitoring, enrollment pipeline, and academic attendance logs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('admin-camera')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center space-x-1.5 transition-all"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live AI Camera</span>
          </button>
          <button
            onClick={() => onNavigate('admin-sessions')}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center space-x-1.5 transition-all"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Create Session</span>
          </button>
          <button
            onClick={() => onNavigate('admin-students')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all"
            title="Download CSV Attendance Log"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats.total_students}
          subtitle={`${stats.active_students} Active & Verified`}
          icon={Users}
          colorScheme="cyan"
        />
        <div onClick={() => onNavigate('admin-enrollments')} className="cursor-pointer">
          <StatCard
            title="Pending Enrollments"
            value={stats.pending_enrollments}
            subtitle="Click to Review Photos & Approve"
            icon={UserCheck}
            colorScheme={stats.pending_enrollments > 0 ? 'amber' : 'emerald'}
          />
        </div>
        <StatCard
          title="Average Attendance"
          value={`${stats.average_attendance_percentage}%`}
          subtitle="Across all departments"
          icon={Award}
          colorScheme="indigo"
        />
        <StatCard
          title="Low Attendance Alert"
          value={stats.low_attendance_students_count}
          subtitle="Students below 75% threshold"
          icon={AlertTriangle}
          colorScheme="rose"
        />
      </div>

      {/* Today's Punch Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-3xl glass-card border border-slate-800">
        <div>
          <span className="text-slate-400 text-xs block mb-1">Today's Class Sessions</span>
          <span className="text-2xl font-black text-white">{stats.today_sessions_count}</span>
          <span className="text-[11px] text-slate-500 block">Scheduled & Active</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-1">Punches Marked Today</span>
          <span className="text-2xl font-black text-cyan-400">{stats.today_attendance_marked}</span>
          <span className="text-[11px] text-slate-500 block">Via AI Cam & Manual</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-1">Present Today</span>
          <span className="text-2xl font-black text-emerald-400">{stats.today_present}</span>
          <span className="text-[11px] text-slate-500 block">Verified Attendance</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-1">Absent Today</span>
          <span className="text-2xl font-black text-rose-400">{stats.today_absent}</span>
          <span className="text-[11px] text-slate-500 block">Missed Lectures</span>
        </div>
      </div>

      {/* Daily Attendance Trend (7 Days Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl glass-card border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">7-Day Attendance Trend</h3>
            </div>
            <span className="text-xs text-slate-400">Daily Present vs Absent Punches</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.daily_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="present" fill="#06b6d4" name="Present" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="#f43f5e" name="Absent" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution */}
        <div className="p-6 rounded-3xl glass-card border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Department Enrollment</h3>
            <p className="text-xs text-slate-400 mb-4">Active enrolled students by branch</p>

            <div className="space-y-3">
              {stats.department_stats.map((dept) => (
                <div key={dept.department} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-white">{dept.department}</span>
                    <span className="text-cyan-400 font-mono font-semibold">{dept.count} Students</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(15, (dept.count / (stats.active_students || 1)) * 100))}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('admin-students')}
            className="w-full mt-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-all"
          >
            View Student Directory →
          </button>
        </div>
      </div>
    </div>
  );
}
