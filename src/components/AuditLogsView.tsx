import React, { useState } from 'react';
import { ShieldAlert, Search, Clock, User, Activity, Info, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogsViewProps {
  logs: AuditLog[];
}

export default function AuditLogsView({ logs }: AuditLogsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const filteredLogs = logs.filter(log => 
    log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    
    const headers = ['Waktu', 'Pengguna', 'Aksi', 'Detail'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString('id-ID'),
      log.username,
      log.action,
      log.details
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN')) return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
    if (action.includes('PURCHASE')) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
    if (action.includes('SALE')) return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
    if (action.includes('EXPENSE')) return 'text-red-500 bg-red-50 dark:bg-red-900/20';
    return 'text-zinc-500 bg-zinc-50 dark:bg-zinc-900/20';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Audit Log Keamanan</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Pantau semua aktivitas pengguna di sistem.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text"
            placeholder="Cari pengguna, aksi, atau detail..."
            className="input-field w-full !pl-12"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <button 
          onClick={exportToCSV}
          className="p-3 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors shrink-0"
          title="Export CSV"
        >
          <Download size={20} />
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Waktu</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pengguna</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Aksi</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {currentItems.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <Clock size={14} />
                      <span>{new Date(log.created_at).toLocaleString('id-ID')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                        <User size={14} />
                      </div>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">{log.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
                      <Info size={14} className="mt-1 shrink-0 opacity-50" />
                      <span>{log.details}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLogs.length === 0 && (
          <div className="p-12 text-center text-zinc-400">
            <ShieldAlert size={48} className="mx-auto mb-4 opacity-10" />
            <p>Belum ada catatan aktivitas.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredLogs.length)} dari {filteredLogs.length} log
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-30 hover:bg-white dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-30 hover:bg-white dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
