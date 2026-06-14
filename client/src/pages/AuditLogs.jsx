import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../services/auditService';
import { ClipboardList, Search, RefreshCw, Calendar, User } from 'lucide-react';

const AuditLogs = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Audit Logs
  const { data: logs = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: getAuditLogs,
  });

  // Filter logs based on search term
  const filteredLogs = logs.filter((log) => {
    const details = log.details?.toLowerCase() || '';
    const action = log.action?.toLowerCase() || '';
    const user = log.performedBy?.toLowerCase() || '';
    const query = searchTerm.toLowerCase();

    return details.includes(query) || action.includes(query) || user.includes(query);
  });

  return (
    <Layout title="Audit Logs & System Activity">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="text-blue-600" size={22} /> System Audit Trail
          </h2>
          <p className="text-xs text-slate-500">
            Chronological ledger of customer preferences, order confirmations, and shortage events.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="glass-btn-secondary flex items-center gap-2 text-xs py-2"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          {isFetching ? 'Refreshing...' : 'Refresh Logs'}
        </button>
      </div>

      {/* Search Filter Panel */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, user, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-colors"
          />
        </div>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="glass-panel p-12 text-center text-blue-600 font-mono">LOADING AUDIT LOGS...</div>
      ) : isError ? (
        <div className="glass-panel p-12 text-center text-red-500">
          Error loading logs: {error.message}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-500 text-sm">
          No logs match your search.
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-x-auto border border-slate-250 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4 w-48">Timestamp</th>
                <th className="px-6 py-4 w-48">Action</th>
                <th className="px-6 py-4 w-44">Performed By</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredLogs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Timestamp */}
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      {new Date(log.createdAt).toLocaleDateString()} at{' '}
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-100">
                      {log.action}
                    </span>
                  </td>

                  {/* Performed By */}
                  <td className="px-6 py-4 whitespace-nowrap text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                        {log.performedBy?.substring(0, 2).toUpperCase() || 'US'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 capitalize">{log.performedBy}</div>
                        <div className="text-[10px] text-slate-450">{log.user?.role}</div>
                      </div>
                    </div>
                  </td>

                  {/* Details */}
                  <td className="px-6 py-4 text-xs text-slate-650 leading-relaxed max-w-lg">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};

export default AuditLogs;
