import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { StudentEnrollment } from './pages/StudentEnrollment';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentProfile } from './pages/student/StudentProfile';
import { StudentAttendance } from './pages/student/StudentAttendance';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminEnrollmentApprovals } from './pages/admin/AdminEnrollmentApprovals';
import { AdminAttendance } from './pages/admin/AdminAttendance';
import { AdminSessions } from './pages/admin/AdminSessions';
import { AdminLiveCamera } from './pages/admin/AdminLiveCamera';
import { AdminAcademic } from './pages/admin/AdminAcademic';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';

import { adminApi } from './api/admin';

export default function App() {
  const { user, isAuthenticated, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' or 'enroll'
  const [activeTab, setActiveTab] = useState('dash');
  const [pendingCount, setPendingCount] = useState(0);

  // Set default tab based on role upon login
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'STUDENT') {
        setActiveTab('student-dash');
      } else if (user?.role === 'ADMIN') {
        setActiveTab('admin-dash');
        loadPendingCount();
      }
    }
  }, [isAuthenticated, user?.role]);

  const loadPendingCount = async () => {
    if (user?.role !== 'ADMIN') return;
    try {
      const data = await adminApi.getStudents({ enrollment_status: 'PENDING', limit: 1 });
      setPendingCount(data.total);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold tracking-wide">Starting ApexAttend Engine...</p>
      </div>
    );
  }

  // Not authenticated: render Login or Enrollment Wizard
  if (!isAuthenticated) {
    if (authView === 'enroll') {
      return <StudentEnrollment onBackToLogin={() => setAuthView('login')} />;
    }
    return (
      <Login
        onGoToEnrollment={() => setAuthView('enroll')}
        onLoginSuccess={(loggedInUser) => {
          if (loggedInUser.role === 'STUDENT') setActiveTab('student-dash');
          else setActiveTab('admin-dash');
        }}
      />
    );
  }

  // Authenticated as STUDENT
  if (user?.role === 'STUDENT') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-cyan-500 selection:text-white">
        <Navbar onNavigate={setActiveTab} activeTab={activeTab} />
        <main className="flex-1 pb-12">
          {activeTab === 'student-dash' && <StudentDashboard />}
          {activeTab === 'student-attendance' && <StudentAttendance />}
          {activeTab === 'student-profile' && <StudentProfile />}
        </main>
      </div>
    );
  }

  // Authenticated as ADMIN
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-cyan-500 selection:text-white">
      <Navbar onNavigate={setActiveTab} activeTab={activeTab} />
      <div className="flex flex-1">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingCount={pendingCount}
        />
        <main className="flex-1 pb-12 overflow-x-hidden">
          {activeTab === 'admin-dash' && <AdminDashboard onNavigate={setActiveTab} />}
          {activeTab === 'admin-students' && <AdminStudents />}
          {activeTab === 'admin-enrollments' && (
            <AdminEnrollmentApprovals onApproved={loadPendingCount} />
          )}
          {activeTab === 'admin-attendance' && <AdminAttendance />}
          {activeTab === 'admin-sessions' && <AdminSessions />}
          {activeTab === 'admin-camera' && <AdminLiveCamera />}
          {activeTab === 'admin-academic' && <AdminAcademic />}
          {activeTab === 'admin-audit' && <AdminAuditLogs />}
        </main>
      </div>
    </div>
  );
}
