import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  ShieldCheck,
  User,
  Lock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export function Login({ onGoToEnrollment, onLoginSuccess }) {
  const { login } = useAuth();
  const [roleTab, setRoleTab] = useState('STUDENT'); // 'STUDENT' or 'ADMIN'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!identifier || !password) {
      setError('Please fill in both username/email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(identifier, password);
      if (onLoginSuccess) onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (type) => {
    setError(null);
    if (type === 'admin') {
      setRoleTab('ADMIN');
      setIdentifier('admin@college.edu');
      setPassword('Admin@123');
    } else if (type === 'vishal') {
      setRoleTab('STUDENT');
      setIdentifier('vishal@college.edu');
      setPassword('Student@123');
    } else if (type === 'abhinav') {
      setRoleTab('STUDENT');
      setIdentifier('abhinav@college.edu');
      setPassword('Student@123');
    } else if (type === 'prakhar') {
      setRoleTab('STUDENT');
      setIdentifier('prakhar@college.edu');
      setPassword('Student@123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        {/* College Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-bg shadow-xl shadow-cyan-500/20 text-white mb-4">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Apex<span className="text-cyan-400">Attend</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Smart AI Facial Attendance Portal</p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl">
          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setRoleTab('STUDENT');
                setError(null);
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                roleTab === 'STUDENT'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Student Portal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleTab('ADMIN');
                setError(null);
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                roleTab === 'ADMIN'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Portal</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                {roleTab === 'STUDENT' ? 'College Email / Enrollment / Roll No' : 'Administrator Email'}
              </label>
              <div className="relative">
                <input
                  type={roleTab === 'STUDENT' ? 'text' : 'email'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    roleTab === 'STUDENT'
                      ? 'e.g. vishal@college.edu or EN2023CS01'
                      : 'admin@college.edu'
                  }
                  required
                  className="w-full glass-input pl-10"
                />
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Account Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full glass-input pl-10"
                />
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center space-x-2 ${
                roleTab === 'STUDENT'
                  ? 'bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 shadow-cyan-500/20'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/20'
              } disabled:opacity-50`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to {roleTab === 'STUDENT' ? 'Student Dashboard' : 'Admin Console'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 text-center uppercase tracking-wider mb-2.5">
              Instant Demo Credentials:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickDemo('admin')}
                className="p-2 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-700/40 text-indigo-300 font-medium text-center transition-all"
              >
                Admin (Manager)
              </button>
              <button
                type="button"
                onClick={() => fillQuickDemo('vishal')}
                className="p-2 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-700/40 text-cyan-300 font-medium text-center transition-all"
              >
                Vishal (Regular)
              </button>
              <button
                type="button"
                onClick={() => fillQuickDemo('prakhar')}
                className="p-2 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/40 text-amber-300 font-medium text-center transition-all"
              >
                Prakhar (&lt;75% Warning)
              </button>
              <button
                type="button"
                onClick={() => fillQuickDemo('abhinav')}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 font-medium text-center transition-all"
              >
                Abhinav (Student)
              </button>
            </div>
          </div>

          {/* New Student Enrollment Trigger */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              New Student? Not registered yet?
            </p>
            <button
              type="button"
              onClick={onGoToEnrollment}
              className="mt-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center justify-center space-x-1 mx-auto transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              <span>Enroll With AI Facial Recognition Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
