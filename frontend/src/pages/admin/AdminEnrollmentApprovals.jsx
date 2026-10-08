import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import {
  UserCheck,
  CheckCircle,
  XCircle,
  Clock,
  Camera,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export function AdminEnrollmentApprovals({ onApproved }) {
  const [pendingStudents, setPendingStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const fetchPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getStudents({ enrollment_status: 'PENDING', limit: 50 });
      setPendingStudents(data.students);
    } catch (err) {
      setError(err.message || 'Failed to load pending enrollments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id, name) => {
    setActionLoading(id);
    setMessage(null);
    setError(null);
    try {
      await adminApi.approveEnrollment(id);
      setMessage(`Successfully approved ${name}. Facial biometric embedding loaded into live AI cache.`);
      fetchPending();
      if (onApproved) onApproved();
    } catch (err) {
      setError(err.message || 'Failed to approve enrollment.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id, name) => {
    if (!window.confirm(`Are you sure you want to reject the enrollment request for ${name}?`)) return;
    setActionLoading(id);
    setMessage(null);
    setError(null);
    try {
      await adminApi.rejectEnrollment(id);
      setMessage(`Enrollment for ${name} rejected.`);
      fetchPending();
    } catch (err) {
      setError(err.message || 'Failed to reject enrollment.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-black text-white">Enrollment Verification Queue</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {pendingStudents.length} Pending
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Review self-registered students, inspect enrolled face photos, and approve for AI camera recognition
          </p>
        </div>

        <button
          onClick={fetchPending}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading pending enrollments...
        </div>
      ) : pendingStudents.length === 0 ? (
        <div className="p-16 rounded-3xl glass-card border border-slate-800 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Queue is Clear!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All registered students have been reviewed. When new students register via the enrollment wizard, their photos will appear here for verification.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingStudents.map((s) => (
            <div
              key={s.id}
              className="p-6 rounded-3xl glass-card border border-amber-500/30 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div className="flex items-start space-x-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-900 border-2 border-amber-500/40 shadow-lg shrink-0">
                  {s.photo_url ? (
                    <img src={s.photo_url} alt={s.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-xl text-amber-400">
                      {s.full_name?.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Pending Verification
                  </span>
                  <h4 className="text-base font-bold text-white truncate mt-1">{s.full_name}</h4>
                  <p className="text-xs text-slate-400 truncate">{s.college_email}</p>
                  <p className="text-xs text-cyan-400 font-mono font-bold mt-1">
                    {s.roll_no} • {s.enrollment_no}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-xs space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Department:</span>
                  <span className="font-bold text-white">{s.department} ({s.branch})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Semester & Section:</span>
                  <span className="font-bold text-white">Sem {s.semester} • Section {s.section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="text-white">{s.phone_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Biometric Vector:</span>
                  <span className="text-emerald-400 font-bold">128-d Generated</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={actionLoading === s.id}
                  onClick={() => handleReject(s.id, s.full_name)}
                  className="py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-700/50 text-slate-300 hover:text-rose-300 font-semibold text-xs transition-all flex items-center justify-center space-x-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  disabled={actionLoading === s.id}
                  onClick={() => handleApprove(s.id, s.full_name)}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-1 disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{actionLoading === s.id ? 'Approving...' : 'Approve'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
