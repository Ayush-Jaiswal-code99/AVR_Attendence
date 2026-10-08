import React, { useState, useEffect } from 'react';
import { studentApi } from '../../api/student';
import {
  Calendar,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

export function StudentAttendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status_filter = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const data = await studentApi.getAttendanceHistory(params);
      setRecords(data);
    } catch (err) {
      setError(err.message || 'Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [statusFilter, dateFrom, dateTo]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">My Attendance History</h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete verifiable log of every class session and AI biometric scan
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-300">Filters:</span>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="glass-input text-xs py-1.5 px-3"
          >
            <option value="" className="bg-slate-900">All Statuses</option>
            <option value="PRESENT" className="bg-slate-900">Present Only</option>
            <option value="ABSENT" className="bg-slate-900">Absent Only</option>
            <option value="LATE" className="bg-slate-900">Late Only</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">From:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="glass-input text-xs py-1.5 px-3"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">To:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="glass-input text-xs py-1.5 px-3"
          />
        </div>

        {(statusFilter || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setDateFrom('');
              setDateTo('');
            }}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Attendance History Table */}
      <div className="rounded-3xl glass-card border border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading attendance records...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No attendance logs found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting the filter criteria above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 pl-4">Session Date</th>
                  <th className="py-3.5">Subject</th>
                  <th className="py-3.5">Class Time</th>
                  <th className="py-3.5">In-Time</th>
                  <th className="py-3.5">Out-Time</th>
                  <th className="py-3.5">AI Confidence</th>
                  <th className="py-3.5 text-center">Status</th>
                  <th className="py-3.5 pr-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 pl-4">
                      <span className="text-white font-bold block">{r.session_date}</span>
                    </td>
                    <td className="py-3.5">
                      <span className="text-cyan-400 font-mono font-bold">{r.subject_code}</span>
                      <span className="text-slate-400 block text-[11px] truncate max-w-[200px]">{r.subject_name}</span>
                    </td>
                    <td className="py-3.5 text-slate-300">{r.session_time || '-'}</td>
                    <td className="py-3.5 text-slate-200 font-mono">{r.in_time || '-'}</td>
                    <td className="py-3.5 text-slate-200 font-mono">{r.out_time || '-'}</td>
                    <td className="py-3.5">
                      {r.confidence ? (
                        <div>
                          <span className="text-emerald-400 font-bold font-mono">
                            {Math.round(r.confidence * 100)}%
                          </span>
                          <span className="text-slate-500 block text-[10px]">{r.camera_id || 'AI Cam'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">{r.marked_by}</span>
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
                    <td className="py-3.5 pr-4 text-slate-400 text-[11px] truncate max-w-[150px]">
                      {r.remarks || '-'}
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
