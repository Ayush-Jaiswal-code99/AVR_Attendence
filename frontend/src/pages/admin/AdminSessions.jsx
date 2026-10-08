import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../../api/attendance';
import { apiRequest } from '../../api/client';
import { Modal } from '../../components/Modal';
import {
  Clock,
  Plus,
  BookOpen,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

export function AdminSessions() {
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  // Create Form State
  const [form, setForm] = useState({
    subject_id: '',
    faculty_id: '',
    department: 'CSE',
    semester: 4,
    section: 'A',
    date: new Date().toISOString().slice(0, 10),
    start_time: '10:00',
    end_time: '11:00',
    room: 'Room 302',
    camera_id: 'CAM_ROOM_302',
    status: 'ACTIVE',
  });

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await attendanceApi.getSessions();
      setSessions(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch attendance sessions.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAcademicOptions = async () => {
    try {
      const subs = await apiRequest('/api/academic/subjects');
      setSubjects(subs);
      const facs = await apiRequest('/api/academic/faculty');
      setFaculties(facs);
      if (subs.length > 0 && !form.subject_id) {
        setForm((prev) => ({ ...prev, subject_id: subs[0].id }));
      }
      if (facs.length > 0 && !form.faculty_id) {
        setForm((prev) => ({ ...prev, faculty_id: facs[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchAcademicOptions();
  }, []);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      await attendanceApi.createSession({
        subject_id: Number(form.subject_id),
        faculty_id: Number(form.faculty_id),
        department: form.department,
        semester: Number(form.semester),
        section: form.section,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        room: form.room,
        camera_id: form.camera_id,
        status: form.status,
      });
      setIsCreateOpen(false);
      fetchSessions();
    } catch (err) {
      alert(`Error creating session: ${err.message}`);
    }
  };

  const handleStatusChange = async (sessionId, newStatus) => {
    try {
      await attendanceApi.updateSession(sessionId, { status: newStatus });
      fetchSessions();
    } catch (err) {
      alert(`Failed to update session status: ${err.message}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Class & Lecture Sessions</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure scheduled lecture sessions and assign physical rooms & AI camera devices
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Attendance Session</span>
        </button>
      </div>

      {/* Sessions Grid / Table */}
      <div className="rounded-3xl glass-card border border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No attendance sessions configured</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 pl-4">Session Date & Time</th>
                  <th className="py-3.5">Subject</th>
                  <th className="py-3.5">Faculty In-Charge</th>
                  <th className="py-3.5">Section</th>
                  <th className="py-3.5">Room & Camera</th>
                  <th className="py-3.5 text-center">Present Scans</th>
                  <th className="py-3.5 text-center">Status</th>
                  <th className="py-3.5 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 pl-4">
                      <span className="text-white font-bold block">{s.date}</span>
                      <span className="text-slate-400 text-[11px] font-mono">{s.start_time} - {s.end_time}</span>
                    </td>
                    <td className="py-3.5">
                      <span className="text-cyan-400 font-mono font-bold block">{s.subject_code}</span>
                      <span className="text-slate-300 text-[11px] block">{s.subject_name}</span>
                    </td>
                    <td className="py-3.5 text-slate-300 font-medium">{s.faculty_name}</td>
                    <td className="py-3.5">
                      <span className="text-white font-bold block">{s.department}</span>
                      <span className="text-slate-400 text-[11px]">Sem {s.semester} • Sec {s.section}</span>
                    </td>
                    <td className="py-3.5">
                      <span className="text-slate-200 block">{s.room}</span>
                      <span className="text-emerald-400 text-[11px] font-mono">{s.camera_id}</span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span className="text-cyan-400 font-bold text-sm">{s.total_present}</span>
                    </td>
                    <td className="py-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse'
                            : s.status === 'COMPLETED'
                            ? 'bg-slate-800 text-slate-300 border border-slate-700'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <div className="inline-flex items-center space-x-1">
                        {s.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleStatusChange(s.id, 'COMPLETED')}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-all"
                          >
                            Complete
                          </button>
                        ) : s.status === 'COMPLETED' ? (
                          <button
                            onClick={() => handleStatusChange(s.id, 'ACTIVE')}
                            className="px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-800/40 text-cyan-300 text-[11px] font-semibold transition-all"
                          >
                            Reopen
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Create Session */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Schedule New Class Attendance Session"
      >
        <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Subject Course *</label>
            <select
              value={form.subject_id}
              onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
              className="w-full glass-input text-xs"
              required
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id} className="bg-slate-900">
                  {sub.code} - {sub.name} (Sem {sub.semester})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Faculty In-Charge *</label>
            <select
              value={form.faculty_id}
              onChange={(e) => setForm({ ...form, faculty_id: e.target.value })}
              className="w-full glass-input text-xs"
              required
            >
              {faculties.map((fac) => (
                <option key={fac.id} value={fac.id} className="bg-slate-900">
                  {fac.name} ({fac.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full glass-input text-xs"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Start Time *</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full glass-input text-xs font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">End Time *</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full glass-input text-xs font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Department</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full glass-input text-xs"
              >
                <option value="CSE" className="bg-slate-900">CSE</option>
                <option value="ECE" className="bg-slate-900">ECE</option>
                <option value="MECH" className="bg-slate-900">MECH</option>
                <option value="IT" className="bg-slate-900">IT</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Semester</label>
              <select
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}
                className="w-full glass-input text-xs"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s} className="bg-slate-900">Sem {s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Section</label>
              <select
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                className="w-full glass-input text-xs"
              >
                <option value="A" className="bg-slate-900">Section A</option>
                <option value="B" className="bg-slate-900">Section B</option>
                <option value="C" className="bg-slate-900">Section C</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Classroom / Hall</label>
              <input
                type="text"
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                placeholder="Room 302"
                className="w-full glass-input text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">AI Camera ID</label>
              <input
                type="text"
                value={form.camera_id}
                onChange={(e) => setForm({ ...form, camera_id: e.target.value })}
                placeholder="CAM_ROOM_302"
                className="w-full glass-input text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
            >
              Create Session
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
