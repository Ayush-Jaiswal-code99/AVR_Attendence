import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { Modal } from '../../components/Modal';
import { PhotoUpload } from '../../components/PhotoUpload';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Camera,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [viewStudent, setViewStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [photoStudent, setPhotoStudent] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Add Student Form State
  const [addForm, setAddForm] = useState({
    full_name: '',
    college_email: '',
    personal_email: '',
    phone_number: '',
    enrollment_no: '',
    roll_no: '',
    department: 'CSE',
    branch: 'CSE',
    year: 1,
    semester: 1,
    section: 'A',
    password: 'Student@123',
    enrollment_status: 'APPROVED',
  });

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (deptFilter) params.department = deptFilter;
      if (statusFilter) params.enrollment_status = statusFilter;

      const data = await adminApi.getStudents(params);
      setStudents(data.students);
      setTotal(data.total);
    } catch (err) {
      setError(err.message || 'Failed to fetch students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, search, deptFilter, statusFilter]);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createStudent(addForm);
      setIsAddOpen(false);
      setAddForm({
        full_name: '',
        college_email: '',
        personal_email: '',
        phone_number: '',
        enrollment_no: '',
        roll_no: '',
        department: 'CSE',
        branch: 'CSE',
        year: 1,
        semester: 1,
        section: 'A',
        password: 'Student@123',
        enrollment_status: 'APPROVED',
      });
      fetchStudents();
    } catch (err) {
      alert(`Error creating student: ${err.message}`);
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editStudent) return;
    try {
      await adminApi.updateStudent(editStudent.id, {
        full_name: editStudent.full_name,
        department: editStudent.department,
        branch: editStudent.branch,
        year: editStudent.year,
        semester: editStudent.semester,
        section: editStudent.section,
        phone_number: editStudent.phone_number,
        enrollment_status: editStudent.enrollment_status,
      });
      setEditStudent(null);
      fetchStudents();
    } catch (err) {
      alert(`Error updating student: ${err.message}`);
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteId) return;
    try {
      await adminApi.deleteStudent(deleteId);
      setDeleteId(null);
      fetchStudents();
    } catch (err) {
      alert(`Error deleting student: ${err.message}`);
    }
  };

  const handleReplacePhoto = async (file) => {
    if (!photoStudent || !file) return;
    try {
      await adminApi.replacePhoto(photoStudent.id, file);
      setPhotoStudent(null);
      fetchStudents();
    } catch (err) {
      alert(`Error uploading photo: ${err.message}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Student Management Directory</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage student records, biometrics, academic enrollments, and status
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Student Manually</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, roll no, enrollment, email..."
              className="w-full glass-input text-xs pl-9"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="glass-input text-xs py-2 px-3"
          >
            <option value="" className="bg-slate-900">All Departments</option>
            <option value="CSE" className="bg-slate-900">CSE</option>
            <option value="ECE" className="bg-slate-900">ECE</option>
            <option value="MECH" className="bg-slate-900">MECH</option>
            <option value="IT" className="bg-slate-900">IT</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="glass-input text-xs py-2 px-3"
          >
            <option value="" className="bg-slate-900">All Statuses</option>
            <option value="APPROVED" className="bg-slate-900">Approved</option>
            <option value="PENDING" className="bg-slate-900">Pending</option>
            <option value="REJECTED" className="bg-slate-900">Rejected</option>
          </select>
        </div>

        <button
          onClick={fetchStudents}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Student Table */}
      <div className="rounded-3xl glass-card border border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading student directory...
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No students found matching query</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 pl-4">Student</th>
                  <th className="py-3.5">Enrollment / Roll</th>
                  <th className="py-3.5">Branch / Sec</th>
                  <th className="py-3.5 text-center">Attendance %</th>
                  <th className="py-3.5 text-center">Status</th>
                  <th className="py-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/40 transition-colors">
                    {/* Photo & Name */}
                    <td className="py-3.5 pl-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                          {s.photo_url ? (
                            <img src={s.photo_url} alt={s.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-cyan-400">
                              {s.full_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-white block text-sm">{s.full_name}</span>
                          <span className="text-slate-400 text-[11px]">{s.college_email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Enrollment & Roll */}
                    <td className="py-3.5 font-mono">
                      <span className="text-slate-200 block font-bold">{s.roll_no}</span>
                      <span className="text-slate-500 text-[11px]">{s.enrollment_no}</span>
                    </td>

                    {/* Branch & Sec */}
                    <td className="py-3.5">
                      <span className="text-cyan-400 font-bold block">{s.department} ({s.branch})</span>
                      <span className="text-slate-400 text-[11px]">Sem {s.semester} • Sec {s.section}</span>
                    </td>

                    {/* Attendance % */}
                    <td className="py-3.5 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`font-black ${
                            s.attendance_percentage < 75 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {s.attendance_percentage}%
                        </span>
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              s.attendance_percentage < 75 ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${s.attendance_percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          s.enrollment_status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : s.enrollment_status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {s.enrollment_status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-4 text-right">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          onClick={() => setViewStudent(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditStudent({ ...s })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                          title="Edit Student"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPhotoStudent(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                          title="Replace Face Photo & Retrain AI"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(s.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Delete Student"
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

      {/* MODAL: View Details */}
      <Modal
        isOpen={!!viewStudent}
        onClose={() => setViewStudent(null)}
        title="Student Profile & Biometric Status"
      >
        {viewStudent && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 pb-4 border-b border-slate-800">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                {viewStudent.photo_url ? (
                  <img src={viewStudent.photo_url} alt={viewStudent.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-cyan-400">
                    {viewStudent.full_name?.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{viewStudent.full_name}</h3>
                <p className="text-xs text-slate-400">{viewStudent.college_email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    {viewStudent.enrollment_status}
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">
                    Overall Attendance: {viewStudent.attendance_percentage}%
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/40 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block">Enrollment No:</span>
                <span className="text-white font-mono font-bold">{viewStudent.enrollment_no}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Roll No:</span>
                <span className="text-white font-mono font-bold">{viewStudent.roll_no}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Department & Branch:</span>
                <span className="text-white font-bold">{viewStudent.department} ({viewStudent.branch})</span>
              </div>
              <div>
                <span className="text-slate-400 block">Year / Semester / Section:</span>
                <span className="text-white font-bold">Year {viewStudent.year}, Sem {viewStudent.semester}, Sec {viewStudent.section}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Phone Number:</span>
                <span className="text-white font-bold">{viewStudent.phone_number}</span>
              </div>
              <div>
                <span className="text-slate-400 block">AI Face Vector Status:</span>
                <span className="text-emerald-400 font-bold">
                  {viewStudent.has_face_profile ? '128-d Vector Trained' : 'Missing Vector'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: Add Student Manually */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Student Record Manually"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Full Legal Name *</label>
            <input
              type="text"
              value={addForm.full_name}
              onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
              className="w-full glass-input text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Enrollment No *</label>
              <input
                type="text"
                value={addForm.enrollment_no}
                onChange={(e) => setAddForm({ ...addForm, enrollment_no: e.target.value.toUpperCase() })}
                className="w-full glass-input text-xs font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Roll No *</label>
              <input
                type="text"
                value={addForm.roll_no}
                onChange={(e) => setAddForm({ ...addForm, roll_no: e.target.value.toUpperCase() })}
                className="w-full glass-input text-xs font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">College Email *</label>
              <input
                type="email"
                value={addForm.college_email}
                onChange={(e) => setAddForm({ ...addForm, college_email: e.target.value.toLowerCase() })}
                className="w-full glass-input text-xs"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Phone Number *</label>
              <input
                type="tel"
                value={addForm.phone_number}
                onChange={(e) => setAddForm({ ...addForm, phone_number: e.target.value })}
                className="w-full glass-input text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Department</label>
              <select
                value={addForm.department}
                onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
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
                value={addForm.semester}
                onChange={(e) => setAddForm({ ...addForm, semester: Number(e.target.value) })}
                className="w-full glass-input text-xs"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={sem} className="bg-slate-900">Sem {sem}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Section</label>
              <select
                value={addForm.section}
                onChange={(e) => setAddForm({ ...addForm, section: e.target.value })}
                className="w-full glass-input text-xs"
              >
                <option value="A" className="bg-slate-900">Section A</option>
                <option value="B" className="bg-slate-900">Section B</option>
                <option value="C" className="bg-slate-900">Section C</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
            >
              Add Student
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Edit Student */}
      <Modal
        isOpen={!!editStudent}
        onClose={() => setEditStudent(null)}
        title="Edit Student Academic Information"
      >
        {editStudent && (
          <form onSubmit={handleUpdateStudent} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={editStudent.full_name}
                onChange={(e) => setEditStudent({ ...editStudent, full_name: e.target.value })}
                className="w-full glass-input text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Department</label>
                <input
                  type="text"
                  value={editStudent.department}
                  onChange={(e) => setEditStudent({ ...editStudent, department: e.target.value.toUpperCase() })}
                  className="w-full glass-input text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Section</label>
                <input
                  type="text"
                  value={editStudent.section}
                  onChange={(e) => setEditStudent({ ...editStudent, section: e.target.value.toUpperCase() })}
                  className="w-full glass-input text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editStudent.phone_number}
                  onChange={(e) => setEditStudent({ ...editStudent, phone_number: e.target.value })}
                  className="w-full glass-input text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Status</label>
                <select
                  value={editStudent.enrollment_status}
                  onChange={(e) => setEditStudent({ ...editStudent, enrollment_status: e.target.value })}
                  className="w-full glass-input text-xs"
                >
                  <option value="APPROVED" className="bg-slate-900">APPROVED</option>
                  <option value="PENDING" className="bg-slate-900">PENDING</option>
                  <option value="REJECTED" className="bg-slate-900">REJECTED</option>
                  <option value="INACTIVE" className="bg-slate-900">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: Replace Face Photo */}
      <Modal
        isOpen={!!photoStudent}
        onClose={() => setPhotoStudent(null)}
        title={`Replace Face Photo for ${photoStudent?.full_name}`}
      >
        {photoStudent && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Uploading a replacement photo will automatically update the 128-d face embedding in the database and re-train the AI recognition cache immediately.
            </p>
            <PhotoUpload onPhotoSelected={handleReplacePhoto} label="Select New Photo" />
          </div>
        )}
      </Modal>

      {/* MODAL: Confirm Delete */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Confirm Student Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h4 className="text-sm font-bold text-white">Permanently delete this student account?</h4>
          <p className="text-xs text-slate-400">
            This action cannot be undone. All attendance records, facial embeddings, and student credentials will be removed. This event will be logged in the system audit trail.
          </p>
          <div className="flex justify-center space-x-3 pt-2">
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteStudent}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
