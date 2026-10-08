import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../../api/attendance';
import { adminApi } from '../../api/admin';
import { Modal } from '../../components/Modal';
import {
  CalendarCheck,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  FileDown,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

export function AdminAttendance() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [dateFilter, setDateFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    student_id: '',
    session_id: '',
    status: 'PRESENT',
    in_time: '09:00:00',
    out_time: '10:30:00',
    remarks: 'Manually marked by administrator',
  });

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (dateFilter) params.date = dateFilter;
      if (sectionFilter) params.section = sectionFilter;
      if (statusFilter) params.status_filter = statusFilter;

      const data = await attendanceApi.getAttendance(params);
      setRecords(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch attendance records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxiliary = async () => {
    try {
      const stData = await adminApi.getStudents({ limit: 100, enrollment_status: 'APPROVED' });
      setStudents(stData.students);
      const sessData = await attendanceApi.getSessions();
      setSessions(sessData);
      if (stData.students.length > 0 && !manualForm.student_id) {
        setManualForm((prev) => ({ ...prev, student_id: stData.students[0].id }));
      }
      if (sessData.length > 0 && !manualForm.session_id) {
        setManualForm((prev) => ({ ...prev, session_id: sessData[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchAuxiliary();
  }, [dateFilter, sectionFilter, statusFilter]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      await attendanceApi.manualMark({
        student_id: Number(manualForm.student_id),
        session_id: Number(manualForm.session_id),
        status: manualForm.status,
        in_time: manualForm.in_time,
        out_time: manualForm.out_time,
        remarks: manualForm.remarks,
      });
      setIsManualOpen(false);
      fetchRecords();
    } catch (err) {
      alert(`Failed to manually mark attendance: ${err.message}`);
    }
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    if (!editRecord) return;
    try {
      await attendanceApi.updateRecord(editRecord.id, {
        status: editRecord.status,
        in_time: editRecord.in_time,
        out_time: editRecord.out_time,
        remarks: editRecord.remarks,
      });
      setEditRecord(null);
      fetchRecords();
    } catch (err) {
      alert(`Failed to update attendance record: ${err.message}`);
    }
  };

  const handleDeleteRecord = async () => {
    if (!deleteId) return;
    try {
      await attendanceApi.deleteRecord(deleteId);
      setDeleteId(null);
      fetchRecords();
    } catch (err) {
      alert(`Failed to delete attendance record: ${err.message}`);
    }
  };

  const handleExport = async () => {
    try {
      await attendanceApi.exportCsv({
        date: dateFilter,
        section: sectionFilter,
      });
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Attendance Audit & Records</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit logs of biometric camera punches, manual adjustments, and Excel exports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsManualOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Mark Attendance Manually</span>
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <FileDown className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-300">Filters:</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Date:</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="glass-input text-xs py-1.5 px-3"
          />
        </div>

        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="glass-input text-xs py-1.5 px-3"
        >
          <option value="" className="bg-slate-900">All Sections</option>
          <option value="A" className="bg-slate-900">Section A</option>
          <option value="B" className="bg-slate-900">Section B</option>
          <option value="C" className="bg-slate-900">Section C</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="glass-input text-xs py-1.5 px-3"
        >
          <option value="" className="bg-slate-900">All Statuses</option>
          <option value="PRESENT" className="bg-slate-900">Present</option>
          <option value="ABSENT" className="bg-slate-900">Absent</option>
          <option value="LATE" className="bg-slate-900">Late</option>
        </select>

        {(dateFilter || sectionFilter || statusFilter) && (
          <button
            onClick={() => {
              setDateFilter('');
              setSectionFilter('');
              setStatusFilter('');
            }}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2"
          >
            Clear
          </button>
        )}

        <button
          onClick={fetchRecords}
          className="ml-auto p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Attendance Records Table */}
      <div className="rounded-3xl glass-card border border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading attendance records...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No attendance records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 pl-4">Student</th>
                  <th className="py-3.5">Roll No</th>
                  <th className="py-3.5">Subject & Session</th>
                  <th className="py-3.5">Date</th>
                  <th className="py-3.5">In-Time</th>
                  <th className="py-3.5">Out-Time</th>
                  <th className="py-3.5">Verified By</th>
                  <th className="py-3.5 text-center">Status</th>
                  <th className="py-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 pl-4">
                      <span className="font-bold text-white block">{r.student_name}</span>
                      <span className="text-slate-400 text-[11px] font-mono">{r.student_enrollment_no}</span>
                    </td>
                    <td className="py-3.5 font-mono font-bold text-slate-300">{r.student_roll_no}</td>
                    <td className="py-3.5">
                      <span className="text-cyan-400 font-mono font-bold block">{r.subject_code}</span>
                      <span className="text-slate-400 text-[11px] truncate max-w-[160px] block">{r.subject_name}</span>
                    </td>
                    <td className="py-3.5 text-slate-200">{r.session_date}</td>
                    <td className="py-3.5 font-mono text-slate-300">{r.in_time || '-'}</td>
                    <td className="py-3.5 font-mono text-slate-300">{r.out_time || '-'}</td>
                    <td className="py-3.5">
                      <span className="text-white block">{r.marked_by}</span>
                      {r.confidence && (
                        <span className="text-emerald-400 text-[11px] font-mono">
                          {Math.round(r.confidence * 100)}% Match
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          r.status === 'PRESENT'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : r.status === 'LATE'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          onClick={() => setEditRecord({ ...r })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                          title="Correct/Edit Record"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(r.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Manual Attendance Mark */}
      <Modal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        title="Mark Attendance Manually"
      >
        <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Student *</label>
            <select
              value={manualForm.student_id}
              onChange={(e) => setManualForm({ ...manualForm, student_id: e.target.value })}
              className="w-full glass-input text-xs"
              required
            >
              {students.map((st) => (
                <option key={st.id} value={st.id} className="bg-slate-900">
                  {st.full_name} ({st.roll_no} - {st.enrollment_no})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Session / Lecture *</label>
            <select
              value={manualForm.session_id}
              onChange={(e) => setManualForm({ ...manualForm, session_id: e.target.value })}
              className="w-full glass-input text-xs"
              required
            >
              {sessions.map((sess) => (
                <option key={sess.id} value={sess.id} className="bg-slate-900">
                  {sess.date} • {sess.subject_code} - {sess.subject_name} ({sess.start_time}-{sess.end_time}, Sec {sess.section})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Status</label>
              <select
                value={manualForm.status}
                onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                className="w-full glass-input text-xs"
              >
                <option value="PRESENT" className="bg-slate-900">PRESENT</option>
                <option value="ABSENT" className="bg-slate-900">ABSENT</option>
                <option value="LATE" className="bg-slate-900">LATE</option>
                <option value="EXCUSED" className="bg-slate-900">EXCUSED</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">In-Time</label>
              <input
                type="text"
                value={manualForm.in_time}
                onChange={(e) => setManualForm({ ...manualForm, in_time: e.target.value })}
                placeholder="09:00:00"
                className="w-full glass-input text-xs font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Out-Time</label>
              <input
                type="text"
                value={manualForm.out_time}
                onChange={(e) => setManualForm({ ...manualForm, out_time: e.target.value })}
                placeholder="10:30:00"
                className="w-full glass-input text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Remarks / Justification</label>
            <input
              type="text"
              value={manualForm.remarks}
              onChange={(e) => setManualForm({ ...manualForm, remarks: e.target.value })}
              className="w-full glass-input text-xs"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsManualOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
            >
              Save Attendance Punch
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Edit Attendance */}
      <Modal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title="Correct / Edit Attendance Record"
      >
        {editRecord && (
          <form onSubmit={handleUpdateRecord} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-slate-300 space-y-1">
              <p><strong className="text-white">Student:</strong> {editRecord.student_name} ({editRecord.student_roll_no})</p>
              <p><strong className="text-white">Subject:</strong> {editRecord.subject_code} - {editRecord.subject_name}</p>
              <p><strong className="text-white">Date:</strong> {editRecord.session_date}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Status</label>
                <select
                  value={editRecord.status}
                  onChange={(e) => setEditRecord({ ...editRecord, status: e.target.value })}
                  className="w-full glass-input text-xs"
                >
                  <option value="PRESENT" className="bg-slate-900">PRESENT</option>
                  <option value="ABSENT" className="bg-slate-900">ABSENT</option>
                  <option value="LATE" className="bg-slate-900">LATE</option>
                  <option value="EXCUSED" className="bg-slate-900">EXCUSED</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">In-Time</label>
                <input
                  type="text"
                  value={editRecord.in_time || ''}
                  onChange={(e) => setEditRecord({ ...editRecord, in_time: e.target.value })}
                  className="w-full glass-input text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Out-Time</label>
                <input
                  type="text"
                  value={editRecord.out_time || ''}
                  onChange={(e) => setEditRecord({ ...editRecord, out_time: e.target.value })}
                  className="w-full glass-input text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Audit Remarks / Reason for Correction</label>
              <input
                type="text"
                value={editRecord.remarks || ''}
                onChange={(e) => setEditRecord({ ...editRecord, remarks: e.target.value })}
                className="w-full glass-input text-xs"
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
              >
                Save Correction
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: Delete Confirm */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Confirm Record Cancellation"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h4 className="text-sm font-bold text-white">Delete this attendance entry?</h4>
          <p className="text-xs text-slate-400">
            This will remove this student's recorded punch from the session and recalculate their percentage. This action will be logged in system audit.
          </p>
          <div className="flex justify-center space-x-3 pt-2">
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteRecord}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
            >
              Delete Entry
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
