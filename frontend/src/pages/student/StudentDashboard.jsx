import React, { useState, useEffect } from 'react';
import { studentApi } from '../../api/student';
import { StatCard } from '../../components/StatCard';
import {
  CalendarCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BookOpen,
  Camera,
  TrendingUp,
  RefreshCw,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await studentApi.getDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load student dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"></div>
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="p-6 rounded-2xl glass-card border border-rose-500/30">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Error Loading Dashboard</h3>
          <p className="text-xs text-slate-300 mb-4">{error || 'Data unavailable'}</p>
          <button
            onClick={fetchDashboard}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const {
    student,
    overall_percentage,
    total_classes,
    total_present,
    total_absent,
    classes_this_month,
    is_low_attendance,
    threshold,
    subject_stats,
    recent_attendance,
    monthly_trend,
  } = data;

  const pieData = [
    { name: 'Present', value: total_present, color: '#06b6d4' },
    { name: 'Absent', value: total_absent, color: '#f43f5e' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl glass-card border border-cyan-500/20 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center space-x-4">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-cyan-500/40 shadow-xl bg-slate-900 shrink-0">
            {student.photo_url ? (
              <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-cyan-400">
                {student.full_name?.charAt(0)}
              </div>
            )}
            <div className="absolute bottom-0 right-0 bg-emerald-500 text-white p-0.5 rounded-full" title="Face Enrolled">
              <Camera className="w-3 h-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">{student.full_name}</h2>
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Enrolled
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Roll: <span className="text-slate-200">{student.roll_no}</span> • Enr: <span className="text-slate-200">{student.enrollment_no}</span>
            </p>
            <p className="text-xs text-cyan-400 mt-1 font-medium">
              {student.department} • Semester {student.semester} • Section {student.section}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboard}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-all"
            title="Refresh Attendance Stats"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Low Attendance Warning Alert (< 75%) */}
      {is_low_attendance && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 shadow-lg shadow-rose-950/20 text-rose-200 flex items-start space-x-3.5 animate-pulse">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white mb-0.5">
              Low Attendance Warning Alert ({overall_percentage}%)
            </h4>
            <p className="text-xs text-rose-300 leading-relaxed">
              Your overall attendance is currently <span className="font-bold underline">{overall_percentage}%</span>, which falls below the mandatory college threshold of <span className="font-bold">{threshold}%</span>. Students with attendance under 75% are ineligible for final semester examinations. Please attend upcoming classes to restore your eligibility.
            </p>
          </div>
        </div>
      )}

      {/* Main Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Overall Attendance"
          value={`${overall_percentage}%`}
          subtitle={overall_percentage >= 75 ? 'Meets 75% requirement' : 'Deficient attendance'}
          icon={overall_percentage >= 75 ? Award : AlertTriangle}
          colorScheme={overall_percentage >= 75 ? 'emerald' : 'rose'}
        />
        <StatCard
          title="Total Conducted"
          value={total_classes}
          subtitle="Conducted this semester"
          icon={BookOpen}
          colorScheme="cyan"
        />
        <StatCard
          title="Classes Attended"
          value={total_present}
          subtitle="Verified by AI / Faculty"
          icon={CheckCircle}
          colorScheme="emerald"
        />
        <StatCard
          title="Classes Missed"
          value={total_absent}
          subtitle="Unexcused absences"
          icon={XCircle}
          colorScheme="rose"
        />
        <StatCard
          title="This Month"
          value={classes_this_month}
          subtitle="Active lecture sessions"
          icon={Clock}
          colorScheme="indigo"
        />
      </div>

      {/* Attendance Visualizations: Monthly Trend & Ratio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-card border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Monthly Attendance Trend</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Recent 5 weeks</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis domain={[40, 100]} stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="percentage" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#attendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Present vs Absent Ratio */}
        <div className="p-6 rounded-3xl glass-card border border-slate-800 shadow-xl flex flex-col justify-between">
          <h3 className="text-sm font-bold text-white mb-2">Attendance Ratio</h3>
          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-slate-800 text-xs">
            <div className="p-2 rounded-xl bg-cyan-950/30 border border-cyan-800/30">
              <span className="text-slate-400 block text-[10px]">Present</span>
              <span className="text-cyan-400 font-bold text-sm">{total_present}</span>
            </div>
            <div className="p-2 rounded-xl bg-rose-950/30 border border-rose-800/30">
              <span className="text-slate-400 block text-[10px]">Absent</span>
              <span className="text-rose-400 font-bold text-sm">{total_absent}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subject-Wise Attendance Breakdown Table */}
      <div className="p-6 rounded-3xl glass-card border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Subject-Wise Attendance Breakdown</h3>
          </div>
          <span className="text-xs text-slate-400">{subject_stats.length} Subjects Registered</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="pb-3 pl-2">Subject</th>
                <th className="pb-3 text-center">Conducted</th>
                <th className="pb-3 text-center">Present</th>
                <th className="pb-3 text-center">Absent</th>
                <th className="pb-3 text-right pr-2">Attendance %</th>
                <th className="pb-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {subject_stats.map((s) => (
                <tr key={s.subject_id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 pl-2">
                    <span className="font-bold text-white font-mono">{s.subject_code}</span>
                    <span className="text-slate-400 block text-[11px] truncate max-w-xs">{s.subject_name}</span>
                  </td>
                  <td className="py-3.5 text-center text-slate-300 font-bold">{s.total_classes}</td>
                  <td className="py-3.5 text-center text-emerald-400 font-bold">{s.present}</td>
                  <td className="py-3.5 text-center text-rose-400 font-bold">{s.absent}</td>
                  <td className="py-3.5 text-right pr-2">
                    <div className="inline-flex flex-col items-end">
                      <span className={`font-black ${s.is_low ? 'text-rose-400' : 'text-cyan-400'}`}>
                        {s.percentage}%
                      </span>
                      <div className="w-20 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.is_low ? 'bg-rose-500' : 'bg-cyan-500'}`}
                          style={{ width: `${s.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-center">
                    {s.is_low ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        Low (&lt;75%)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Sufficient
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Attendance Punches */}
      <div className="p-6 rounded-3xl glass-card border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Recent Attendance Logs</h3>
          </div>
          <span className="text-xs text-slate-400">Latest 10 biometric logs</span>
        </div>

        {recent_attendance.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No attendance records found yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="pb-3 pl-2">Date & Time</th>
                  <th className="pb-3">Subject</th>
                  <th className="pb-3">In-Time</th>
                  <th className="pb-3">Out-Time</th>
                  <th className="pb-3">Recognition</th>
                  <th className="pb-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {recent_attendance.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 pl-2">
                      <span className="text-white block font-bold">{r.session_date}</span>
                      <span className="text-slate-400 text-[10px]">{r.session_time || 'Regular Session'}</span>
                    </td>
                    <td className="py-3">
                      <span className="text-white font-mono font-bold">{r.subject_code}</span>
                      <span className="text-slate-400 block text-[11px] truncate max-w-[180px]">{r.subject_name}</span>
                    </td>
                    <td className="py-3 text-slate-300 font-mono">{r.in_time || '-'}</td>
                    <td className="py-3 text-slate-300 font-mono">{r.out_time || '-'}</td>
                    <td className="py-3">
                      <span className="text-cyan-400 font-mono text-[11px]">
                        {r.confidence ? `${Math.round(r.confidence * 100)}% match` : 'Manual'}
                      </span>
                      <span className="text-slate-500 block text-[10px]">{r.marked_by}</span>
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'PRESENT'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
