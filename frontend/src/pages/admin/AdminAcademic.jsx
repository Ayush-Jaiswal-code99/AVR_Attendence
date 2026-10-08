import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { Modal } from '../../components/Modal';
import {
  BookOpen,
  Users,
  Building,
  Plus,
  CheckCircle,
} from 'lucide-react';

export function AdminAcademic() {
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSubjectModal, setIsSubjectModal] = useState(false);
  const [isFacultyModal, setIsFacultyModal] = useState(false);

  const [subjectForm, setSubjectForm] = useState({
    code: '',
    name: '',
    department: 'CSE',
    semester: 4,
    credits: 4,
  });

  const [facultyForm, setFacultyForm] = useState({
    name: '',
    email: '',
    department: 'CSE',
    designation: 'Assistant Professor',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [depts, subs, facs] = await Promise.all([
        apiRequest('/api/academic/departments'),
        apiRequest('/api/academic/subjects'),
        apiRequest('/api/academic/faculty'),
      ]);
      setDepartments(depts);
      setSubjects(subs);
      setFaculty(facs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/academic/subjects', {
        method: 'POST',
        body: JSON.stringify(subjectForm),
      });
      setIsSubjectModal(false);
      setSubjectForm({ code: '', name: '', department: 'CSE', semester: 4, credits: 4 });
      fetchData();
    } catch (err) {
      alert(`Error creating subject: ${err.message}`);
    }
  };

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/academic/faculty', {
        method: 'POST',
        body: JSON.stringify(facultyForm),
      });
      setIsFacultyModal(false);
      setFacultyForm({ name: '', email: '', department: 'CSE', designation: 'Assistant Professor' });
      fetchData();
    } catch (err) {
      alert(`Error creating faculty: ${err.message}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Academic Curriculum & Faculty</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure departments, course subjects, and teaching faculty for session scheduling
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsSubjectModal(true)}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Subject Course</span>
          </button>
          <button
            onClick={() => setIsFacultyModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Faculty</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subjects List */}
        <div className="p-6 rounded-3xl glass-card border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Course Subjects ({subjects.length})</h3>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-cyan-400 mr-2">{sub.code}</span>
                  <span className="font-bold text-white">{sub.name}</span>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {sub.department} • Semester {sub.semester}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
                  {sub.credits} Credits
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Faculty List */}
        <div className="p-6 rounded-3xl glass-card border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Faculty Members ({faculty.length})</h3>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {faculty.map((fac) => (
              <div
                key={fac.id}
                className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white block">{fac.name}</span>
                  <span className="text-[11px] text-slate-400">{fac.email}</span>
                  <div className="text-[11px] text-cyan-400 mt-0.5">
                    {fac.department} • {fac.designation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Departments Overview */}
      <div className="p-6 rounded-3xl glass-card border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
          <Building className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Academic Departments</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {departments.map((d) => (
            <div key={d.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-lg font-black text-cyan-400 block font-mono">{d.code}</span>
              <span className="text-xs text-slate-300 font-semibold">{d.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: Add Subject */}
      <Modal
        isOpen={isSubjectModal}
        onClose={() => setIsSubjectModal(false)}
        title="Add Course Subject"
      >
        <form onSubmit={handleCreateSubject} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Subject Code *</label>
            <input
              type="text"
              value={subjectForm.code}
              onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
              placeholder="e.g. CS406"
              className="w-full glass-input text-xs font-mono"
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Subject Name *</label>
            <input
              type="text"
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              placeholder="e.g. Artificial Intelligence"
              className="w-full glass-input text-xs"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Department</label>
              <select
                value={subjectForm.department}
                onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value })}
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
                value={subjectForm.semester}
                onChange={(e) => setSubjectForm({ ...subjectForm, semester: Number(e.target.value) })}
                className="w-full glass-input text-xs"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s} className="bg-slate-900">Sem {s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Credits</label>
              <input
                type="number"
                min="1"
                max="6"
                value={subjectForm.credits}
                onChange={(e) => setSubjectForm({ ...subjectForm, credits: Number(e.target.value) })}
                className="w-full glass-input text-xs text-center"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsSubjectModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
            >
              Add Subject
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Add Faculty */}
      <Modal
        isOpen={isFacultyModal}
        onClose={() => setIsFacultyModal(false)}
        title="Add Faculty Member"
      >
        <form onSubmit={handleCreateFaculty} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Faculty Name *</label>
            <input
              type="text"
              value={facultyForm.name}
              onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
              placeholder="e.g. Dr. Rajesh Gupta"
              className="w-full glass-input text-xs"
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Faculty Email *</label>
            <input
              type="email"
              value={facultyForm.email}
              onChange={(e) => setFacultyForm({ ...facultyForm, email: e.target.value.toLowerCase() })}
              placeholder="e.g. r.gupta@college.edu"
              className="w-full glass-input text-xs"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Department</label>
              <select
                value={facultyForm.department}
                onChange={(e) => setFacultyForm({ ...facultyForm, department: e.target.value })}
                className="w-full glass-input text-xs"
              >
                <option value="CSE" className="bg-slate-900">CSE</option>
                <option value="ECE" className="bg-slate-900">ECE</option>
                <option value="MECH" className="bg-slate-900">MECH</option>
                <option value="IT" className="bg-slate-900">IT</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Designation</label>
              <input
                type="text"
                value={facultyForm.designation}
                onChange={(e) => setFacultyForm({ ...facultyForm, designation: e.target.value })}
                placeholder="Assistant Professor"
                className="w-full glass-input text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsFacultyModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
            >
              Add Faculty
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
