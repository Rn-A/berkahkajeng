import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  Search,
  ChevronRight,
  History,
  X,
  Truck,
  Package,
  ArrowUpRight,
  Printer,
  FileText,
  User,
  Calendar,
  DollarSign,
  Download,
  ChevronLeft
} from 'lucide-react';
import { InventoryItem, Sale, SaleItem, Customer } from '../types';
import { cn, roundPrice } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SalesViewProps {
  inventory: InventoryItem[];
  onSave: (sale: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  salesHistory: Sale[];
  customers: Customer[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

// Helper Terbilang
const terbilang = (n: number): string => {
  n = Math.floor(n);
  if (n < 0) return "Minus " + terbilang(Math.floor(-n));
  const words = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let res = "";
  if (n < 12) res = words[n];
  else if (n < 20) res = terbilang(n - 10) + " Belas";
  else if (n < 100) res = terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10);
  else if (n < 200) res = "Seratus " + terbilang(n - 100);
  else if (n < 1000) res = terbilang(Math.floor(n / 100)) + " Ratus " + terbilang(n % 100);
  else if (n < 2000) res = "Seribu " + terbilang(n - 1000);
  else if (n < 1000000) res = terbilang(Math.floor(n / 1000)) + " Ribu " + terbilang(n % 1000);
  else if (n < 1000000000) res = terbilang(Math.floor(n / 1000000)) + " Juta " + terbilang(n % 1000000);
  else if (n < 1000000000000) res = terbilang(Math.floor(n / 1000000000)) + " Miliar " + terbilang(n % 1000000000);
  else if (n < 1000000000000000) res = terbilang(Math.floor(n / 1000000000000)) + " Triliun " + terbilang(n % 1000000000000);
  return res.trim() + " Rupiah";
};

interface SaleItemRowProps {
  item: any;
  inventory: InventoryItem[];
  onUpdate: (updates: any) => void;
  onRemove: () => void;
}

const SaleItemRow = React.memo(({ item, inventory, onUpdate, onRemove }: SaleItemRowProps) => {
  const [tempVolume, setTempVolume] = useState(item.volume?.toString() || '');
  const [tempPrice, setTempPrice] = useState(item.sale_price_per_m3?.toString() || '');
  const [tempLogs, setTempLogs] = useState(item.total_logs?.toString() || '0');

  useEffect(() => {
    setTempVolume(item.volume?.toString() || '');
    setTempPrice(item.sale_price_per_m3?.toString() || '');
    setTempLogs(item.total_logs?.toString() || '0');
  }, [item.id, item.volume, item.sale_price_per_m3, item.total_logs]);

  const availableTypes = Array.from(new Set(inventory.filter(i => i.total_logs > 0).map(i => i.wood_type)));
  const availableLengths = Array.from(new Set(inventory.filter(i => i.wood_type === item.wood_type && i.total_logs > 0).map(i => i.length)));
  const availableConditions = Array.from(new Set(inventory.filter(i => i.wood_type === item.wood_type && (!item.length || i.length === Number(item.length)) && i.total_logs > 0).map(i => i.condition_val)));
  const availableGroups = Array.from(new Set(inventory.filter(i => i.wood_type === item.wood_type && (!item.length || i.length === Number(item.length)) && (!item.condition || i.condition_val === item.condition) && i.total_logs > 0).map(i => i.diameter_group)));

  const selectedInv = inventory.find(i =>
    i.wood_type === item.wood_type &&
    i.diameter_group === item.diameter_group &&
    i.length === Number(item.length) &&
    i.condition_val === item.condition
  );

  const handleBlur = (field: string, value: string) => {
    if (field === 'volume') {
      const val = Math.max(0, parseFloat(value) || 0);
      onUpdate({ volume: val });
      setTempVolume(val.toString());
    } else if (field === 'price') {
      const val = Math.max(0, parseInt(value) || 0);
      onUpdate({ sale_price_per_m3: val });
      setTempPrice(val.toString());
    } else if (field === 'logs') {
      const val = Math.max(0, parseInt(value) || 0);
      onUpdate({ total_logs: val });
      setTempLogs(val.toString());
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-end relative group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
      <div className="md:col-span-2">
        <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Jenis Kayu</label>
        <select
          className="input-field w-full dark:bg-zinc-900 dark:text-white"
          value={item.wood_type}
          onChange={(e) => onUpdate({ wood_type: e.target.value, length: 0, condition: '', diameter_group: '' })}
        >
          <option value="" className="dark:bg-zinc-900">Pilih...</option>
          {availableTypes.map(t => <option key={t} value={t} className="dark:bg-zinc-900">{t}</option>)}
        </select>
      </div>
      <div className="md:col-span-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Pjg</label>
        <select
          className="input-field w-full dark:bg-zinc-900 dark:text-white"
          value={item.length || ''}
          onChange={(e) => onUpdate({ length: e.target.value, condition: '', diameter_group: '' })}
          disabled={!item.wood_type}
        >
          <option value="" className="dark:bg-zinc-900">...</option>
          {availableLengths.map(l => <option key={l} value={l} className="dark:bg-zinc-900">{l}</option>)}
        </select>
      </div>
      <div className="md:col-span-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Kondisi</label>
        <select
          className="input-field w-full dark:bg-zinc-900 dark:text-white text-xs"
          value={item.condition || ''}
          onChange={(e) => onUpdate({ condition: e.target.value, diameter_group: '' })}
          disabled={!item.length}
        >
          <option value="" className="dark:bg-zinc-900">Pilih...</option>
          {availableConditions.map(c => <option key={c} value={c} className="dark:bg-zinc-900">{c}</option>)}
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Diameter</label>
        <select
          className="input-field w-full dark:bg-zinc-900 dark:text-white"
          value={item.diameter_group}
          onChange={(e) => onUpdate({ diameter_group: e.target.value })}
          disabled={!item.condition}
        >
          <option value="" className="dark:bg-zinc-900">Pilih...</option>
          {availableGroups.map(g => <option key={g} value={g} className="dark:bg-zinc-900">{g}</option>)}
        </select>
      </div>
      <div className="md:col-span-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Batang</label>
        <input
          type="number"
          min="0"
          className="input-field w-full font-mono dark:bg-zinc-900 dark:text-white"
          placeholder="0"
          value={tempLogs}
          onChange={(e) => setTempLogs(e.target.value)}
          onBlur={(e) => handleBlur('logs', e.target.value)}
        />
        {selectedInv && (
          <p className="text-[9px] text-zinc-400 mt-1">Stok: {selectedInv.total_logs}</p>
        )}
      </div>
      <div className="md:col-span-2">
        <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Volume (m³)</label>
        <input
          type="number"
          min="0"
          step="0.001"
          className="input-field w-full font-mono dark:bg-zinc-900 dark:text-white"
          placeholder="0.000"
          value={tempVolume}
          onChange={(e) => setTempVolume(e.target.value)}
          onBlur={(e) => handleBlur('volume', e.target.value)}
        />
        {selectedInv && (
          <p className="text-[9px] text-zinc-400 mt-1">Stok: {selectedInv.total_volume.toFixed(3)} m³</p>
        )}
      </div>
      <div className="md:col-span-2">
        <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Harga Jual / m³</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">Rp</span>
          <input
            type="number"
            min="0"
            className="input-field w-full pl-8 font-mono dark:bg-zinc-900 dark:text-white"
            placeholder="0"
            value={tempPrice}
            onChange={(e) => setTempPrice(e.target.value)}
            onBlur={(e) => handleBlur('price', e.target.value)}
          />
        </div>
        {selectedInv && (
          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1 truncate">Modal: {formatCurrency(selectedInv.avg_price)}</p>
        )}
      </div>
      <div className="md:col-span-1 flex justify-end">
        <button
          onClick={onRemove}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
});

export default function SalesView({ inventory, onSave, onDelete, salesHistory, customers }: SalesViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [period, setPeriod] = useState<'all' | 'hari' | 'minggu' | 'bulan' | 'tahun'>('all');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [customerName, setCustomerName] = useState('');
  const [saleDate, setSaleDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const filteredHistory = salesHistory.filter(sale => {
    const matchesSearch = sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && isWithinPeriod(sale.date);
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);

  const exportToCSV = () => {
    if (salesHistory.length === 0) return;

    const headers = ['ID', 'Tanggal', 'Pelanggan', 'Total Pendapatan (Rp)', 'Total Laba (Rp)'];
    const rows = salesHistory.map(sale => [
      sale.id,
      sale.date,
      sale.customer_name,
      sale.total_revenue,
      sale.total_profit
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `riwayat_penjualan_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addItem = () => {
    setSaleItems([...saleItems, {
      id: crypto.randomUUID(),
      wood_type: '',
      diameter_group: '',
      length: 0,
      volume: 0,
      sale_price_per_m3: 0,
      total_logs: 0,
      condition: ''
    }]);
  };

  const removeItem = (id: string) => {
    setSaleItems(saleItems.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: any) => {
    setSaleItems(saleItems.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const totals = useMemo(() => {
    const rawTotals = saleItems.reduce((acc, item) => ({
      volume: acc.volume + Number(item.volume || 0),
      revenue: acc.revenue + (Number(item.volume || 0) * Number(item.sale_price_per_m3 || 0))
    }), { volume: 0, revenue: 0 });

    return { ...rawTotals, revenue: roundPrice(rawTotals.revenue) };
  }, [saleItems]);

  const handleSubmit = async () => {
    if (!customerName || saleItems.length === 0) {
      alert('Mohon lengkapi data pembeli dan item penjualan.');
      return;
    }

    for (const item of saleItems) {
      if (!item.wood_type || !item.volume || !item.sale_price_per_m3 || !item.condition) {
        alert('Mohon lengkapi detail item (Jenis Kayu, Kondisi, Volume, Harga).');
        return;
      }

      const inv = inventory.find(i =>
        i.wood_type === item.wood_type &&
        i.diameter_group === item.diameter_group &&
        i.length === Number(item.length) &&
        i.condition_val === item.condition
      );
      if (!inv || inv.total_volume < item.volume) {
        alert(`Stok tidak mencukupi untuk ${item.wood_type} ${item.diameter_group} L=${item.length} (${item.condition})`);
        return;
      }
    }

    setIsLoading(true);
    try {
      await onSave({
        id: crypto.randomUUID(),
        customer_name: customerName,
        date: saleDate,
        items: saleItems
      });
      setShowForm(false);
      setCustomerName('');
      setSaleItems([]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">Transaksi Penjualan</h1>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">Catat pengiriman kayu ke pabrik atau pelanggan.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2 w-full lg:w-auto justify-center"
        >
          <Plus size={20} />
          Buat Penjualan Baru
        </button>
      </div>

      {/* Sales History Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden print:hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <History size={16} className="text-zinc-400" />
            Riwayat Penjualan Terakhir
          </h3>
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 w-full lg:w-auto">
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
                    onClick={() => { setPeriod(opt.id as any); setCurrentPage(1); }}
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
                <div className="relative flex items-center">
                  <Calendar size={14} className="absolute left-0 text-zinc-400 pointer-events-none" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
                    className="bg-transparent border-none text-[10px] font-bold focus:ring-0 dark:text-white cursor-pointer pl-5 py-1"
                  />
                </div>
              </div>
            </div>

            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                type="text"
                placeholder="Cari pelanggan..."
                className={cn("input-field w-full !pl-10 py-1.5 text-sm")}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <button
              onClick={exportToCSV}
              className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors shrink-0"
              title="Export CSV"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tanggal</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pelanggan</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Total Pendapatan</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {currentItems.map((sale) => (
                <tr key={sale.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">{sale.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Truck size={16} />
                      </div>
                      <span className="font-bold text-zinc-900 dark:text-white">{sale.customer_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-white">{formatCurrency(roundPrice(sale.total_revenue))}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => setSelectedSale(sale)}
                      className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                    >
                      <FileText size={20} />
                    </button>
                    <button
                      onClick={() => onDelete(sale.id)}
                      className="p-2 text-zinc-300 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredHistory.length)} dari {filteredHistory.length} transaksi
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

      {/* Sale Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 print:hidden">
          <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-6xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-200 dark:border-zinc-800">
            <div className="p-4 md:p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-900 text-white">
              <div className="flex items-center gap-3">
                <ShoppingCart size={24} />
                <h2 className="text-base md:text-lg font-bold">Input Penjualan Baru</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 dark:bg-zinc-950">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Nama Pelanggan / Pabrik</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <select
                      className="input-field w-full pl-12 dark:bg-zinc-900 dark:text-white"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    >
                      <option value="" className="dark:bg-zinc-900">Pilih Pelanggan...</option>
                      {customers.map(c => <option key={c.id} value={c.name} className="dark:bg-zinc-900">{c.name}</option>)}
                      <option value="Umum" className="dark:bg-zinc-900">Umum</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Tanggal Penjualan</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input
                      type="date"
                      className="input-field w-full pl-12 dark:bg-zinc-900 dark:text-white"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Package size={16} />
                    Detail Item Kayu
                  </h3>
                  <button
                    onClick={addItem}
                    className="btn-secondary py-2 px-4 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Tambah Item
                  </button>
                </div>

                <div className="space-y-4">
                  {saleItems.map((item, idx) => (
                    <SaleItemRow
                      key={item.id}
                      item={item}
                      inventory={inventory}
                      onUpdate={(updates) => updateItem(item.id, updates)}
                      onRemove={() => removeItem(item.id)}
                    />
                  ))}
                  {saleItems.length === 0 && (
                    <div className="text-center py-16 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/50">
                      <Package size={48} className="mx-auto text-zinc-200 dark:text-zinc-800 mb-3" />
                      <p className="text-zinc-400 font-medium">Belum ada item penjualan.</p>
                      <button onClick={addItem} className="text-zinc-900 dark:text-white font-bold text-sm mt-2 hover:underline">Tambah Item Sekarang</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 bg-zinc-900 text-white flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex gap-12 w-full md:w-auto justify-around md:justify-start">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Volume</p>
                  <p className="text-xl md:text-2xl font-bold font-mono">{totals.volume.toFixed(3)} m³</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Penjualan</p>
                  <p className="text-xl md:text-2xl font-bold text-emerald-400">{formatCurrency(totals.revenue)}</p>
                </div>
              </div>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className={cn(
                  "bg-emerald-500 hover:bg-emerald-600 text-white h-14 px-10 rounded-2xl font-bold text-lg flex items-center gap-3 shadow-xl shadow-emerald-500/20 transition-all w-full md:w-auto justify-center",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                <Save size={24} />
                {isLoading ? 'Memproses...' : 'Simpan Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Detail / Nota Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6 overflow-y-auto print:static print:block print:p-0">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm print:hidden" onClick={() => setSelectedSale(null)} />
          <div className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto border border-zinc-200 dark:border-zinc-800 print:max-w-none print:shadow-none print:border-none print:overflow-visible print:static">
            <div className="p-4 md:p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-900 text-white print:hidden">
              <div className="flex items-center gap-3">
                <FileText size={24} />
                <h2 className="text-lg font-bold">Detail Nota Penjualan</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 px-4"
                >
                  <Printer size={20} />
                  <span className="text-sm font-bold">Cetak (F4)</span>
                </button>
                <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <div id="printable-nota" className="min-w-[800px] w-full print:min-w-0 p-8 md:p-12 bg-white dark:bg-white text-zinc-900">
                <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-8 mb-8">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <img src="/logo1.png" alt="Logo" className="w-10 h-12 object-contain" />
                      <h1 className="text-3xl font-black tracking-tighter text-zinc-900 uppercase">BERKAH KAJENG</h1>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pangkalan Kayu & Logistik</p>
                    <p className="text-[10px] text-zinc-600 mt-2 font-bold">Jl. Banjarnegara - Pagentan, Karanganyar, Singamerta, Kec. Sigaluh, Banjarnegara</p>
                    <p className="text-[10px] font-bold text-zinc-900">WhatsApp: 0852-2700-1122</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold text-zinc-900 mb-1">NOTA PENJUALAN</h2>
                    <p className="text-sm font-mono text-zinc-500">#{selectedSale.id.substring(0, 8).toUpperCase()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-12">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Pelanggan / Pabrik</p>
                    <p className="text-lg font-bold text-zinc-900">{selectedSale.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Tanggal Transaksi</p>
                    <p className="text-lg font-bold text-zinc-900">{selectedSale.date}</p>
                  </div>
                </div>

                <div className="mb-12">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-zinc-900">
                        <th className="py-3 text-[10px] font-bold text-zinc-900 uppercase tracking-widest">Item / Jenis Kayu</th>
                        <th className="py-3 text-[10px] font-bold text-zinc-900 uppercase tracking-widest text-center">Volume</th>
                        <th className="py-3 text-[10px] font-bold text-zinc-900 uppercase tracking-widest text-right">Harga/m³</th>
                        <th className="py-3 text-[10px] font-bold text-zinc-900 uppercase tracking-widest text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {[...selectedSale.items].sort((a, b) => {
                        if (a.wood_type !== b.wood_type) return a.wood_type.localeCompare(b.wood_type);
                        if (a.length !== b.length) return Number(a.length) - Number(b.length);
                        if (a.condition !== b.condition) return (a.condition || '').localeCompare(b.condition || '');
                        return (a.diameter_group || '').localeCompare(b.diameter_group || '');
                      }).map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-4">
                            <p className="font-bold text-zinc-900">{item.wood_type}</p>
                            <p className="text-xs text-zinc-500">D: {item.diameter_group} | P: {item.length} cm | {item.condition}</p>
                          </td>
                          <td className="py-4 text-center font-mono font-bold">{item.volume.toFixed(3)} m³</td>
                          <td className="py-4 text-right font-mono">{formatCurrency(item.sale_price_per_m3)}</td>
                          <td className="py-4 text-right font-bold text-zinc-900">{formatCurrency(item.subtotal_revenue || (item.volume * item.sale_price_per_m3))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-zinc-900">
                        <td colSpan={2} className="py-6">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Terbilang</p>
                          <p className="text-sm font-bold text-zinc-900 italic"># {terbilang(roundPrice(selectedSale.total_revenue))} #</p>
                        </td>
                        <td className="py-6 text-right">
                          <p className="text-sm font-bold text-zinc-900">TOTAL</p>
                        </td>
                        <td className="py-6 text-right">
                          <p className="text-2xl font-black text-zinc-900">{formatCurrency(roundPrice(selectedSale.total_revenue))}</p>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-12 mt-20">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-16">Penerima / Pelanggan</p>
                    <div className="w-48 border-b border-zinc-300 mx-auto"></div>
                    <p className="text-xs font-bold text-zinc-900 mt-2">( ............................ )</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-16">Hormat Kami,</p>
                    <div className="w-48 border-b border-zinc-300 mx-auto"></div>
                    <p className="text-xs font-bold text-zinc-900 mt-2">BERKAH KAJENG ADMIN</p>
                  </div>
                </div>
                <div className="mt-20 pt-8 border-t border-zinc-100 text-center">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em]">Terima Kasih Atas Kepercayaan Anda</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
