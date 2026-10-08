import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import {
  ClipboardList,
  Search,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

export function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getAuditLogs({ action: actionFilter, limit: 100 });
      setLogs(data);
    } catch (err) {
      setError(err.message || 'Failed to load audit trail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">System Security & Audit Trail</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of every administrative modification, approval, manual punch, and deletion
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex items-center space-x-3">
        <Search className="w-4 h-4 text-cyan-400" />
        <input
          type="text"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="Filter by action name (e.g. APPROVE, DELETE, ATTENDANCE)..."
          className="w-full glass-input text-xs"
        />
      </div>

      {/* Audit Log Table */}
      <div className="rounded-3xl glass-card border border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No audit events recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 pl-4">Timestamp</th>
                  <th className="py-3.5">Administrator</th>
                  <th className="py-3.5">Action Executed</th>
                  <th className="py-3.5">Target Entity</th>
                  <th className="py-3.5">Client IP</th>
                  <th className="py-3.5 pr-4">Change Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 pl-4 font-mono text-slate-300 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 text-white font-medium">{log.admin_email || 'System'}</td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-cyan-950/80 border border-cyan-800/40 text-cyan-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-300">
                      {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}
                    </td>
                    <td className="py-3.5 font-mono text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                    <td className="py-3.5 pr-4 font-mono text-[10px] text-slate-400 max-w-xs truncate">
                      {log.new_values || log.old_values || '-'}
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
