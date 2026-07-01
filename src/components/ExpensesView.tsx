import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Plus, Search, Calendar, DollarSign, X, Save, FileText, Download, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Expense } from '../types';
import { cn, generateUUID, formatPeriodDisplay } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ExpensesViewProps {
  expenses: Expense[];
  onSave: (expense: Expense) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function ExpensesView({ expenses, onSave, onDelete }: ExpensesViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState<Expense>({
    id: '',
    category: 'Operasional',
    description: '',
    amount: 0,
    date: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })()
  });

  const [period, setPeriod] = useState<'all' | 'hari' | 'minggu' | 'bulan' | 'tahun'>('all');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handlePeriodChange = (newPeriod: 'all' | 'hari' | 'minggu' | 'bulan' | 'tahun') => {
    setPeriod(newPeriod);
    setCurrentPage(1);
    if (newPeriod === 'tahun') {
      setShowYearDropdown(true);
    } else if (newPeriod !== 'all') {
      setTimeout(() => {
        try {
          dateInputRef.current?.showPicker();
        } catch (e) {
          console.error(e);
        }
      }, 50);
    }
  };

  const isWithinPeriod = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr).getTime();
    switch (period) {
      case 'hari': {
        const dDate = new Date(dateStr).toISOString().split('T')[0];
        return dDate === selectedDate;
      }
      case 'minggu': {
        const start = new Date(selectedDate);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return d >= start.getTime() && d <= end.getTime();
      }
      case 'bulan': {
        const [selY, selM] = selectedDate.split('-');
        const dObj = new Date(dateStr);
        return dObj.getFullYear() === parseInt(selY) && (dObj.getMonth() + 1) === parseInt(selM);
      }
      case 'tahun': {
        const selY = selectedDate.split('-')[0];
        return new Date(dateStr).getFullYear() === parseInt(selY);
      }
      case 'all': return true;
      default: return true;
    }
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         e.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && isWithinPeriod(e.date);
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredExpenses.slice(indexOfFirstItem, indexOfLastItem);

  const exportToCSV = () => {
    if (filteredExpenses.length === 0) return;

    const csvEscape = (val: any): string => {
      const str = String(val ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    };

    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const periodLabel = 
      period === 'hari' ? 'Hari Ini' :
      period === 'minggu' ? 'Minggu Ini' :
      period === 'bulan' ? 'Bulan Ini' :
      period === 'tahun' ? 'Tahun Ini' : 'Semua Waktu';

    const titleRows = [
      [csvEscape('💸 LAPORAN PENGELUARAN OPERASIONAL'), '', '', '', ''],
      [csvEscape('BERKAH KAJENG'), '', '', '', ''],
      [csvEscape(`Tanggal Ekspor: ${todayStr}  |  Periode: ${periodLabel}  |  Total Catatan: ${filteredExpenses.length}`), '', '', '', ''],
      ['', '', '', '', '']
    ];

    const headers = ['No', 'Tanggal', 'Kategori', 'Deskripsi', 'Jumlah Pengeluaran'];
    
    let totalExpenses = 0;

    const rows = filteredExpenses.map((e, idx) => {
      totalExpenses += e.amount;
      return [
        csvEscape(idx + 1),
        csvEscape(e.date),
        csvEscape(e.category),
        csvEscape(e.description),
        csvEscape(formatCurrency(e.amount))
      ];
    });

    const summaryRow = [
      csvEscape('TOTAL PENGELUARAN'),
      '',
      '',
      '',
      csvEscape(formatCurrency(totalExpenses))
    ];

    const footerRows = [
      ['', '', '', '', ''],
      [csvEscape(`Laporan ini digenerate secara otomatis — Berkah Kajeng © ${new Date().getFullYear()}`), '', '', '', '']
    ];

    const allRows = [
      ...titleRows,
      headers.map(h => csvEscape(h)),
      ...rows,
      summaryRow,
      ...footerRows
    ];

    const csvContent = allRows.map(row => row.join(",")).join("\n");
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `pengeluaran_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ ...formData, id: isEditing ? formData.id : generateUUID() });
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setFormData({
      id: '', category: 'Operasional', description: '', amount: 0, date: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })()
    });
  };

  const handleEdit = (expense: Expense) => {
    setFormData(expense);
    setIsEditing(true);
    setShowForm(true);
  };

  const categories = ['Operasional', 'Gaji', 'Bensin', 'Listrik', 'Perawatan', 'Lain-lain'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Pengeluaran Operasional</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50 shadow-sm select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Filter Aktif: {formatPeriodDisplay(selectedDate, period)}
            </span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Catat semua biaya operasional pangkalan.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Catat Pengeluaran
        </button>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
        <div className="bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-sm w-full lg:w-auto">
          <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'Semua Waktu' },
              { id: 'hari', label: 'Hari Ini' },
              { id: 'minggu', label: 'Minggu Ini' },
              { id: 'bulan', label: 'Bulan Ini' },
              { id: 'tahun', label: 'Tahun Ini' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => handlePeriodChange(opt.id as any)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all whitespace-nowrap uppercase",
                  period === opt.id 
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-lg scale-105" 
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-2 px-2 border-t sm:border-t-0 sm:border-l border-zinc-200 dark:border-zinc-700 pt-2 sm:pt-0 sm:ml-1">
            <span className="sm:hidden text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pilih Tanggal:</span>
            <div className="relative flex items-center pl-6 min-w-[120px]">
              <Calendar size={14} className="absolute left-1 text-zinc-400 pointer-events-none" />
              
              {period === 'tahun' ? (
                <div className="relative">
                  <button
                    onClick={() => setShowYearDropdown(!showYearDropdown)}
                    className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none select-none whitespace-nowrap"
                  >
                    {formatPeriodDisplay(selectedDate, period)}
                  </button>
                  {showYearDropdown && (
                    <>
                      <button
                        onClick={() => setShowYearDropdown(false)}
                        className="fixed inset-0 z-40 cursor-default focus:outline-none"
                        aria-label="Tutup pilihan tahun"
                      />
                      <div className="absolute right-0 mt-6 py-1 w-24 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                        {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                          <button
                            key={year}
                            onClick={() => {
                              const [, m, d] = selectedDate.split('-');
                              setSelectedDate(`${year}-${m || '01'}-${d || '01'}`);
                              setShowYearDropdown(false);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-bold"
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 pointer-events-none select-none whitespace-nowrap">
                    {formatPeriodDisplay(selectedDate, period)}
                  </span>
                  <input
                    ref={dateInputRef}
                    type={period === 'bulan' ? 'month' : 'date'}
                    value={period === 'bulan' ? selectedDate.slice(0, 7) : selectedDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (period === 'bulan') {
                        setSelectedDate(val ? `${val}-01` : selectedDate);
                      } else {
                        setSelectedDate(val || selectedDate);
                      }
                      setCurrentPage(1);
                      if (period === 'all') setPeriod('hari');
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', minWidth: 0, minHeight: 0 }}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="relative flex-1 w-full lg:w-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Cari kategori atau deskripsi..."
            className={cn("input-field w-full !pl-12")}
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
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tanggal</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Kategori</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Deskripsi</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Jumlah</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {currentItems.map((expense) => (
                <tr key={expense.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">{expense.date}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold rounded uppercase tracking-wider">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-900 dark:text-white">{expense.description}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-500">{formatCurrency(expense.amount)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(expense)}
                        className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => onDelete(expense.id)}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredExpenses.length === 0 && (
          <div className="p-12 text-center text-zinc-400">
            <CreditCard size={48} className="mx-auto mb-4 opacity-10" />
            <p>Belum ada catatan pengeluaran.</p>
          </div>
        )}
        
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredExpenses.length)} dari {filteredExpenses.length} pengeluaran
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

      {createPortal(
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" 
                onClick={resetForm} 
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                  <h2 className="text-lg font-bold dark:text-white">{isEditing ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}</h2>
                  <button onClick={resetForm} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                    <X size={20} className="dark:text-zinc-400" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Kategori</label>
                    <select
                      className="input-field w-full"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Tanggal</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input
                        type="date"
                        className={cn("input-field w-full !pl-12")}
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Jumlah (Rp)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input
                        required
                        type="number"
                        min="0"
                        className={cn("input-field w-full !pl-12 font-mono")}
                        placeholder="0"
                        value={formData.amount || ''}
                        onChange={(e) => setFormData({ ...formData, amount: Math.max(0, parseFloat(e.target.value) || 0) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Deskripsi</label>
                    <textarea
                      required
                      className="input-field w-full h-24 resize-none"
                      placeholder="Contoh: Beli bensin truk pengiriman"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-4 shadow-lg shadow-zinc-900/10 active:scale-95 transition-all">
                    <Save size={20} />
                    {isEditing ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
