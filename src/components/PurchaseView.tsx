import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  ChevronRight,
  Printer,
  Save,
  FileText,
  Layers,
  Calculator,
  History,
  X,
  PlusCircle,
  Download,
  Search,
  AlertTriangle,
  ChevronLeft,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  WoodSet,
  WoodCategory,
  LogEntry,
  WoodCondition,
  DIAMETER_RANGES,
  Supplier
} from '../types';
import { cn } from '../lib/utils';

interface PurchaseViewProps {
  activeSet: WoodSet | null;
  setActiveSet: (set: WoodSet | null) => void;
  history: WoodSet[];
  onSave: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
  createNewSet: () => void;
  suppliers: Supplier[];
  woodTypes: { name: string }[];
  onAddWoodType: (name: string) => Promise<void>;
  onDeleteWoodType: (name: string) => Promise<void>;
  onSaveSupplier: (supplier: Supplier) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
  userRole?: string;
}

const calculateVolume = (diameterCm: number, lengthCm: number): number => {
  if (diameterCm < 10) return 0;
  const diameterM = diameterCm / 100;
  const lengthM = lengthCm / 100;
  return 0.7854 * Math.pow(diameterM, 2) * lengthM;
};

const terbilang = (n: number): string => {
  if (n < 0) return "Minus " + terbilang(-n);
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
  return res.trim();
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export const determineWoodCategory = (condition: WoodCondition, length: number, diameter: number): string | null => {
  if (condition === 'Kerab') return `Kerab`;

  if (diameter < 10 || condition === 'X') {
    if (diameter < 10 && (length === 100 || length === 130)) return `X`;
    return null;
  }

  if (condition === 'Rijelk') {
    if (length === 100 || length === 130) {
      if (diameter >= 10 && diameter <= 14) return `Rijelk 1`;
      if (diameter >= 15 && diameter <= 19) return `Rijelk 2`;
    }
    return null;
  }

  if (condition === 'C/Standar') {
    if (diameter >= 20) {
      if (length === 100) return `C/Standar 100`;
      if (length === 130) return `C/Standar 130`;
      if (length === 200) return `C/Standar 200`;
      if (length === 260) return `C/Standar 260`;
    }
    return null;
  }

  if (condition === 'Super kecil') {
    if (length === 130 && diameter >= 15 && diameter <= 19) {
      return `Super kecil`;
    }
    return null;
  }

  if (condition === 'Super') {
    if (length === 100) {
      if (diameter >= 20 && diameter <= 24) return `Super 100 (20-24)`;
      if (diameter >= 25) return `Super 100 (25up)`;
      return null;
    }
    if (length === 130) {
      if (diameter >= 20 && diameter <= 24) return `Super 130 (20-24)`;
      if (diameter >= 25) return `Super 130 (25up)`;
      return null;
    }
    if (length === 200) {
      if (diameter >= 20 && diameter <= 24) return `Super 200 (20-24)`;
      if (diameter >= 25 && diameter <= 29) return `Super 200 (25-29)`;
      if (diameter >= 30 && diameter <= 39) return `Super 200 (30-39)`;
      if (diameter >= 40 && diameter <= 49) return `Super 200 (40-49)`;
      if (diameter >= 50) return `Super 200 (50up)`;
      return null;
    }
    if (length === 260) {
      if (diameter >= 20 && diameter <= 24) return `Super 260 (20-24)`;
      if (diameter >= 25 && diameter <= 29) return `Super 260 (25-29)`;
      if (diameter >= 30 && diameter <= 39) return `Super 260 (30-39)`;
      if (diameter >= 40 && diameter <= 49) return `Super 260 (40-49)`;
      if (diameter >= 50) return `Super 260 (50up)`;
      return null;
    }
    return null;
  }

  return null;
};

export default function PurchaseView({ 
  activeSet, 
  setActiveSet, 
  history, 
  onSave, 
  onDelete, 
  isLoading, 
  createNewSet, 
  suppliers,
  woodTypes,
  onAddWoodType,
  onDeleteWoodType,
  onSaveSupplier,
  onDeleteSupplier,
  userRole = 'mandor'
}: PurchaseViewProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [showSupplierManager, setShowSupplierManager] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [supplierFormData, setSupplierFormData] = useState<Supplier>({ id: '', name: '', phone: '', address: '' });
  const [isSupplierSaving, setIsSupplierSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeInputMode, setActiveInputMode] = useState<string | null>('manual');
  const [manualDiameter, setManualDiameter] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Auto Sketch Session States
  const [sessionWoodType, setSessionWoodType] = useState('Jati');
  const [sessionLength, setSessionLength] = useState<number>(200);
  const [sessionCondition, setSessionCondition] = useState<WoodCondition>('Super');

  const filteredHistory = history.filter(set =>
    set.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    set.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic for history
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentHistoryItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);

  const calculateSetTotals = (set: WoodSet) => {
    return set.categories.reduce((acc, cat) => {
      const catVolume = cat.logs.reduce((sum, log) => {
        const isX = cat.condition === 'X' || log.diameter < 10;
        return sum + (isX ? 0 : log.volume);
      }, 0);
      const catPrice = cat.logs.reduce((sum, log) => {
        if (log.diameter < 10) return sum + 1000;
        return sum + (log.volume * cat.pricePerM3);
      }, 0);
      return { volume: acc.volume + catVolume, price: acc.price + catPrice };
    }, { volume: 0, price: 0 });
  };

  const exportToCSV = () => {
    if (history.length === 0) return;

    const headers = ['ID', 'Tanggal', 'Supplier', 'Total Volume (m3)', 'Total Harga (Rp)'];
    const rows = history.map(set => {
      const totals = calculateSetTotals(set);
      return [set.id, set.date, set.supplierName, totals.volume.toFixed(4), totals.price];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `riwayat_pembelian_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addCategory = () => {
    if (!activeSet) return;
    const newCategory: WoodCategory = {
      id: crypto.randomUUID(),
      woodType: 'Jati',
      length: 0,
      condition: 'Super',
      pricePerM3: 0,
      logs: []
    };
    setActiveSet({
      ...activeSet,
      categories: [...activeSet.categories, newCategory]
    });
    setSelectedCategoryId(newCategory.id);
  };

  const updateCategory = (id: string, updates: Partial<WoodCategory>) => {
    if (!activeSet) return;
    setActiveSet({
      ...activeSet,
      categories: activeSet.categories.map(cat =>
        cat.id === id ? { ...cat, ...updates } : cat
      )
    });
  };

  const deleteCategory = (id: string) => {
    if (!activeSet) return;
    setActiveSet({
      ...activeSet,
      categories: activeSet.categories.filter(cat => cat.id !== id)
    });
    if (selectedCategoryId === id) setSelectedCategoryId(null);
  };

  const addLogAuto = (diameter: number) => {
    if (!activeSet) return;

    if (diameter < 10) {
      const X_NAME = 'X';
      let targetCat = activeSet.categories.find(c =>
        c.woodType === sessionWoodType && c.condition === 'X' && c.name === X_NAME
      );
      let newCategories = [...activeSet.categories];
      if (!targetCat) {
        targetCat = {
          id: crypto.randomUUID(),
          name: X_NAME,
          woodType: sessionWoodType,
          length: 0,
          condition: 'X',
          pricePerM3: 0,
          logs: []
        };
        newCategories.push(targetCat);
      }
      const newLog: LogEntry = { id: crypto.randomUUID(), diameter, volume: 0 };
      newCategories = newCategories.map(cat =>
        cat.id === targetCat!.id ? { ...cat, logs: [...cat.logs, newLog] } : cat
      );
      setActiveSet({ ...activeSet, categories: newCategories });
      setSelectedCategoryId(targetCat.id);
      return;
    }

    const inferredName = determineWoodCategory(sessionCondition, sessionLength, diameter);

    if (!inferredName) {
      setErrorMessage(`Kondisi: ${sessionCondition}\nPanjang: ${sessionLength} cm\nDiameter: ${diameter} cm\n\nData ini tidak memenuhi pedoman klasifikasi kategori.`);
      return;
    }

    let targetCat = activeSet.categories.find(c =>
      c.woodType === sessionWoodType &&
      c.length === sessionLength &&
      c.condition === sessionCondition &&
      c.name === inferredName
    );

    let newCategories = [...activeSet.categories];

    if (!targetCat) {
      targetCat = {
        id: crypto.randomUUID(),
        name: inferredName,
        woodType: sessionWoodType,
        length: sessionLength,
        condition: sessionCondition,
        pricePerM3: 0,
        logs: []
      };
      newCategories.push(targetCat);
    }

    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      diameter,
      volume: calculateVolume(diameter, sessionLength)
    };

    newCategories = newCategories.map(cat =>
      cat.id === targetCat!.id
        ? { ...cat, logs: [...cat.logs, newLog] }
        : cat
    );

    setActiveSet({ ...activeSet, categories: newCategories });
    setSelectedCategoryId(targetCat.id);
  };

  const deleteLog = (categoryId: string, logId: string) => {
    if (!activeSet) return;
    setActiveSet({
      ...activeSet,
      categories: activeSet.categories.map(cat =>
        cat.id === categoryId
          ? { ...cat, logs: cat.logs.filter(l => l.id !== logId) }
          : cat
      )
    });
  };

  const totals = useMemo(() => {
    if (!activeSet) return { volume: 0, price: 0 };
    return calculateSetTotals(activeSet);
  }, [activeSet]);

  const activeCategory = activeSet?.categories.find(c => c.id === selectedCategoryId);

  const getCategorySubtotal = (cat: WoodCategory) => {
    const volume = cat.logs.reduce((sum, l) => {
      const isX = cat.condition === 'X' || l.diameter < 10;
      return sum + (isX ? 0 : l.volume);
    }, 0);
    const price = cat.logs.reduce((sum, log) => {
      if (log.diameter < 10) return sum + 1000;
      return sum + (log.volume * cat.pricePerM3);
    }, 0);
    return { volume, price };
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-full">
      {/* Type Management Modal */}
      {showTypeManager && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Kelola Jenis Kayu</h3>
              <button onClick={() => setShowTypeManager(false)}><X size={20} /></button>
            </div>
            <div className="flex gap-2 mb-4">
              <input 
                className="input-field flex-1"
                placeholder="Jenis baru..."
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
              />
              <button onClick={() => { onAddWoodType(newTypeName); setNewTypeName(''); }} className="bg-zinc-900 text-white px-4 rounded-xl">+</button>
            </div>
            <div className="space-y-2">
              {woodTypes.map(t => (
                <div key={t.name} className="flex justify-between items-center p-2 border rounded-lg">
                  <span>{t.name}</span>
                  <button onClick={() => onDeleteWoodType(t.name)} className="text-red-500"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Supplier Management Modal */}
      <AnimatePresence>
        {showSupplierManager && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
              onClick={() => setShowSupplierManager(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm p-6 overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold dark:text-white">Kelola Penyetor</h3>
                <button onClick={() => setShowSupplierManager(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                  <X size={20} className="dark:text-zinc-400" />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Nama Penyetor</label>
                  <input 
                    className="input-field w-full"
                    placeholder="Nama..."
                    value={supplierFormData.name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    disabled={isSupplierSaving}
                    onClick={async () => {
                      if (!supplierFormData.name) return;
                      setIsSupplierSaving(true);
                      try {
                        await onSaveSupplier({ ...supplierFormData, id: supplierFormData.id || crypto.randomUUID() });
                        setSupplierFormData({ id: '', name: '', phone: '', address: '' });
                        alert('Penyetor berhasil disimpan!');
                      } catch (error) {
                        alert('Gagal menyimpan penyetor.');
                      } finally {
                        setIsSupplierSaving(false);
                      }
                    }}
                    className={`bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs w-full justify-center transition-opacity ${isSupplierSaving ? 'opacity-50' : ''}`}
                  >
                    {isSupplierSaving ? (
                      <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 dark:border-t-white rounded-full animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    {isSupplierSaving ? 'Menyimpan...' : (supplierFormData.id ? 'Update' : 'Tambah')}
                  </button>
                  {supplierFormData.id && (
                    <button 
                      onClick={() => setSupplierFormData({ id: '', name: '', phone: '', address: '' })}
                      className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-4 py-2 rounded-xl text-xs font-bold"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                {suppliers.filter(s => s.name !== 'Umum').map(s => (
                  <div key={s.id} className="flex justify-between items-center p-3 border rounded-xl bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-700">
                    <span className="text-sm font-medium dark:text-zinc-200">{s.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setSupplierFormData(s)} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1.5 rounded-lg transition-colors"><Edit2 size={14} /></button>
                      <button onClick={async () => {
                        if (confirm(`Apakah Anda yakin ingin menghapus penyetor "${s.name}"?`)) {
                          await onDeleteSupplier(s.id);
                          alert('Penyetor berhasil dihapus.');
                        }
                      }} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Left Sidebar: Set Info & Categories */}
      <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden print:hidden shrink-0">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Data Pembelian</h2>
            <button onClick={() => { setShowHistory(true); setCurrentPage(1); }} className="text-[10px] font-bold text-zinc-900 dark:border-zinc-300 hover:underline flex items-center gap-1">
              <History size={12} />
              Riwayat
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Penyetor</label>
              <select
                className="input-field w-full py-2 text-xs dark:bg-zinc-900 dark:text-white"
                value={activeSet?.supplierName || ''}
                onChange={(e) => activeSet && setActiveSet({ ...activeSet, supplierName: e.target.value })}
              >
                <option value="" className="dark:bg-zinc-900">Pilih Supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.name} className="dark:bg-zinc-900">{s.name}</option>)}
                <option value="Umum" className="dark:bg-zinc-900">Umum</option>
              </select>
              <button 
                onClick={() => setShowSupplierManager(true)}
                className="mt-2 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 uppercase tracking-widest flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-all active:scale-95"
              >
                <PlusCircle size={14} />
                Kelola Penyetor
              </button>
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Tanggal</label>
              <input
                type="date"
                className="input-field w-full py-2 text-xs dark:bg-zinc-900 dark:text-white"
                value={activeSet?.date || ''}
                onChange={(e) => activeSet && setActiveSet({ ...activeSet, date: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[250px] lg:max-h-none">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Kategori Kayu</h2>
            <button onClick={addCategory} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-600 dark:text-zinc-400">
              <PlusCircle size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {activeSet?.categories.map((cat) => (
              <div key={cat.id} className="group relative">
                <button
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all pr-10 ${selectedCategoryId === cat.id
                    ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg shadow-zinc-200 dark:shadow-none'
                    : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm tracking-tight">{cat.name || `${cat.woodType} ${cat.length}cm`}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ml-2 ${selectedCategoryId === cat.id ? 'bg-white/20 dark:bg-black/10 text-white dark:text-zinc-900' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                      }`}>
                      {cat.condition}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className={`text-xs ${selectedCategoryId === cat.id ? 'text-zinc-300 dark:text-zinc-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
                      {cat.condition === 'X' || cat.length === 0 ? '' : `${cat.length}cm • `}{cat.logs.length} Batang
                    </span>
                    <span className="font-mono text-xs font-bold">
                      {cat.logs.reduce((sum, l) => sum + l.volume, 0).toFixed(4)} m³
                    </span>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${selectedCategoryId === cat.id ? 'text-white/60 dark:text-zinc-400 hover:text-white dark:hover:text-zinc-900 hover:bg-white/10 dark:hover:bg-black/5' : 'text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                    }`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Category Details & Log Input */}
      <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

          {/* Auto Sketch Setup & Input Cepat */}
          <div className="glass-panel dark:bg-zinc-900 dark:border-zinc-800 p-4 md:p-6 rounded-2xl print:hidden">
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calculator size={14} />
              Setup Sket & Input Diameter Cepat
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 items-end mb-6">
              <div className="w-full">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Jenis Kayu</label>
                <select
                      className="input-field w-full"
                      value={sessionWoodType}
                      onChange={(e) => setSessionWoodType(e.target.value)}
                    >
                      {woodTypes.map((type) => (
                        <option key={type.name} value={type.name}>{type.name}</option>
                      ))}
                      {woodTypes.length === 0 && (
                        <>
                          <option value="Jati">Jati</option>
                          <option value="Mahoni">Mahoni</option>
                          <option value="Sengon">Sengon</option>
                        </>
                      )}
                    </select>
                    {userRole === 'owner' && (
                      <button 
                        onClick={() => setShowTypeManager(true)}
                        className="mt-2 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 uppercase tracking-widest flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-all active:scale-95"
                      >
                        <PlusCircle size={14} />
                        Kelola Jenis Kayu
                      </button>
                    )}
              </div>
              <div className="w-full">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Panjang (cm)</label>
                <div className="flex flex-wrap gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                  {[100, 130, 200, 260].map(len => (
                    <button
                      key={len}
                      onClick={() => setSessionLength(len)}
                      className={`px-2 py-1 text-[10px] font-bold rounded flex-1 min-w-[50px] transition-all active:scale-95 ${sessionLength === len
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                    >
                      {len}
                    </button>
                  ))}
                  <div className="relative flex-1 min-w-[60px]">
                    <input
                      type="number"
                      min="0"
                      className="w-full h-full px-2 py-1 text-[10px] font-bold rounded bg-transparent text-zinc-900 dark:text-white border border-transparent focus:border-zinc-300 dark:focus:border-zinc-600 focus:outline-none"
                      placeholder="Lain"
                      value={sessionLength || ''}
                      onChange={(e) => setSessionLength(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>
              </div>
              <div className="w-full sm:col-span-2 lg:col-span-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Kondisi</label>
                <div className="flex flex-wrap gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                  {(['X', 'Rijelk', 'C/Standar', 'Kerab', 'Super kecil', 'Super'] as WoodCondition[]).map(grade => (
                    <button
                      key={grade}
                      onClick={() => setSessionCondition(grade)}
                      className={`px-2 py-1 text-[10px] font-bold rounded flex-1 min-w-[60px] transition-all active:scale-95 ${sessionCondition === grade
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-6">
              <label className="text-[10px] items-center font-bold text-zinc-400 uppercase tracking-widest mb-3 flex gap-2">
                <Calculator size={14} />
                Input Diameter (Mode Pencatat)
              </label>

              <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
                <button
                  onClick={() => addLogAuto(9)}
                  className="p-3 md:p-4 rounded-xl border-2 text-center transition-all border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:border-zinc-900 dark:hover:border-white hover:bg-zinc-900 dark:hover:border-white hover:text-white dark:hover:text-zinc-900 active:scale-95 flex flex-col items-center justify-center"
                >
                  <div className="text-[9px] font-bold uppercase opacity-60 mb-1">Kecil</div>
                  <div className="text-sm md:text-base font-bold whitespace-nowrap">X (&lt;10)</div>
                </button>

                {[
                  { label: '10-19', min: 10, max: 19 },
                  { label: '20-29', min: 20, max: 29 },
                  { label: '30-39', min: 30, max: 39 },
                  { label: '40-49', min: 40, max: 49 },
                ].map(range => (
                  <button
                    key={range.label}
                    onClick={() => setActiveInputMode(range.label)}
                    className={`p-3 md:p-4 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${activeInputMode === range.label ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md transform scale-105' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                  >
                    <div className="text-[9px] font-bold uppercase opacity-60 mb-1">Range</div>
                    <div className="text-sm md:text-base font-bold whitespace-nowrap">{range.label}</div>
                  </button>
                ))}

                <button
                  onClick={() => setActiveInputMode('manual')}
                  className={`p-3 md:p-4 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${activeInputMode === 'manual' ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md transform scale-105' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                >
                  <div className="text-[9px] font-bold uppercase opacity-60 mb-1">50up</div>
                  <div className="text-sm md:text-base font-bold">Manual</div>
                </button>
              </div>

              <AnimatePresence mode="wait">
                {activeInputMode === 'manual' ? (
                  <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col justify-center bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        className="input-field w-full py-4 px-4 text-[15px] font-mono text-center font-bold tracking-widest dark:bg-zinc-800 dark:text-white border-2 border-zinc-300 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-white shadow-inner"
                        placeholder="Ketik 50up atau lainnya..."
                        value={manualDiameter}
                        onChange={(e) => {
                          const val = e.target.value;
                          setManualDiameter(val === '' ? '' : Math.max(0, parseInt(val)).toString());
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && manualDiameter) {
                            addLogAuto(Math.max(0, parseInt(manualDiameter)));
                            setManualDiameter('');
                          }
                        }}
                      />
                      <button
                        onClick={() => { if (manualDiameter) { addLogAuto(Math.max(0, parseInt(manualDiameter))); setManualDiameter(''); } }}
                        className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 rounded-xl shrink-0 hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 transition-all shadow-md"
                      >
                        <Plus size={32} />
                      </button>
                    </div>
                    <p className="text-xs text-center text-zinc-500 mt-3 font-medium">Ketik angka lalu tekan <kbd className="px-1.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 font-mono text-[10px]">Enter</kbd></p>
                  </motion.div>
                ) : activeInputMode ? (
                  <motion.div key="range" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-hidden">
                    <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Pilih Diameter ({activeInputMode}):</span>
                      </div>
                      <div className="grid grid-cols-5 gap-3 md:gap-4">
                        {Array.from({ length: 10 }, (_, i) => parseInt(activeInputMode.split('-')[0]) + i).map(d => (
                          <button key={d} onClick={() => addLogAuto(d)} className="w-full aspect-square rounded-xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 font-bold text-[17px] dark:text-white hover:bg-zinc-900 dark:hover:bg-white hover:text-white dark:hover:text-zinc-900 hover:border-zinc-900 dark:hover:border-white transition-all active:scale-95 flex items-center justify-center shadow-sm">
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          {activeCategory ? (
            <motion.div
              key={activeCategory.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 print:hidden"
            >
              <div className="lg:col-span-6 glass-panel dark:bg-zinc-900 dark:border-zinc-800 p-4 md:p-6 rounded-2xl flex flex-col justify-center">
                <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4">Pengaturan Harga Kategori: <span className="text-zinc-900 dark:text-white">{activeCategory.name}</span></h3>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Harga per m³ (Rp)</label>
                <input
                  type="number"
                  min="0"
                  className="input-field w-full text-lg font-mono dark:bg-zinc-900 dark:text-white"
                  placeholder="Contoh: 1500000"
                  value={activeCategory.pricePerM3 || ''}
                  onChange={(e) => updateCategory(activeCategory.id, { pricePerM3: Math.max(0, parseInt(e.target.value) || 0) })}
                />
              </div>

              <div className="lg:col-span-6 glass-panel dark:bg-zinc-900 dark:border-zinc-800 p-4 md:p-6 rounded-2xl flex flex-col h-[350px] md:h-[450px]">
                <div className="flex justify-between items-center mb-4 shrink-0">
                  <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Daftar Batang</h3>
                  {activeCategory.logs.length > 0 && (
                    <button
                      onClick={() => {
                        if (activeSet) {
                          setActiveSet({
                            ...activeSet,
                            categories: activeSet.categories.map(cat =>
                              cat.id === activeCategory.id ? { ...cat, logs: [] } : cat
                            )
                          });
                        }
                      }}
                      className="text-[10px] font-bold text-red-500 hover:underline"
                    >
                      Hapus Semua
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {activeCategory.logs.map((log, idx) => (
                    <div key={log.id} className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800 group gap-2 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[9px] font-mono text-zinc-400 shrink-0">#{activeCategory.logs.length - idx}</span>
                        <span className="font-bold text-xs dark:text-white truncate">Ø {log.diameter} cm</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">{log.volume.toFixed(4)} m³</span>
                        <button onClick={() => deleteLog(activeCategory.id, log.id)} className="text-zinc-300 hover:text-red-500 transition-colors md:opacity-0 md:group-hover:opacity-100 ml-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5 shrink-0">
                  <div className="flex justify-between items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    <span className="truncate">Subtotal Kubikasi</span>
                    <span className="text-zinc-900 dark:text-white font-mono text-right shrink-0">{getCategorySubtotal(activeCategory).volume.toFixed(4)} m³</span>
                  </div>
                  <div className="flex justify-between items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    <span className="truncate">Subtotal Harga</span>
                    <span className="text-zinc-900 dark:text-white text-right shrink-0">{formatCurrency(getCategorySubtotal(activeCategory).price)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 border-dashed print:hidden">
              <Layers size={48} className="mb-4 opacity-50" />
              <p className="text-sm font-bold">Pilih Kategori di samping kiri untuk mengatur harga/m³ dan melihat detail batang.</p>
            </div>
          )}

          <div className="bg-[#1c1c1c] dark:bg-zinc-900 text-white p-6 rounded-2xl print:hidden flex flex-col gap-6 shadow-xl">
            <div className="space-y-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-zinc-400">Total Kubikasi</span>
                <span className="font-mono font-bold text-2xl">{totals.volume.toFixed(4)} m³</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-zinc-400">Total Harga</span>
                <span className="font-bold text-2xl">{formatCurrency(totals.price)}</span>
              </div>
            </div>

            <button
              onClick={onSave}
              disabled={isLoading}
              className={`w-full py-2 bg-transparent text-white rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-white/5 active:scale-95 text-lg font-medium tracking-wide ${isLoading ? 'opacity-50' : ''}`}
            >
              <Save size={20} />
              {isLoading ? 'Menyimpan...' : 'Simpan & Masuk Stok'}
            </button>
          </div>

          <div className="glass-panel dark:bg-zinc-900 dark:border-zinc-800 rounded-2xl overflow-hidden print:shadow-none print:border-none print:bg-white print:overflow-visible">
            <div className="bg-zinc-900 dark:bg-zinc-800 p-4 flex justify-between items-center print:hidden">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} />
                Preview Nota
              </h3>
              <button onClick={() => window.print()} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold">
                <Printer size={18} />
                CETAK NOTA (F4)
              </button>
            </div>
            <div className="overflow-x-auto print:overflow-visible">
              <div id="printable-nota" className="min-w-[800px] w-full print:min-w-0 p-4 md:p-8 bg-white dark:bg-white font-mono text-sm space-y-6 print:text-[10pt] text-zinc-900 print:w-full">
                <div className="text-center border-b-2 border-zinc-900 pb-4">
                  <div className="flex items-center justify-center gap-3">
                    <img src="/logo1.png" alt="Logo" className="w-12 h-15 object-contain" />
                  </div>
                  <h4 className="font-bold text-xl uppercase tracking-tight">BERKAH KAJENG</h4>
                  <p className="text-xs font-bold mt-1">NOTA PEMBELIAN KAYU GELONDONGAN</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Jl. Banjarnegara - Pagentan, Karanganyar, Singamerta, Kec. Sigaluh, Banjarnegara</p>
                  <p className="text-[10px] font-bold text-zinc-600">WhatsApp: 0852-2700-1122</p>
                </div>

                <div className="flex justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <span className="w-20 text-zinc-400 font-bold uppercase text-[9px]">Penyetor</span>
                      <span className="font-bold">: {activeSet?.supplierName || '---'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="w-20 text-zinc-400 font-bold uppercase text-[9px]">ID Set</span>
                      <span className="font-mono">: {activeSet?.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex justify-end gap-2">
                      <span className="text-zinc-400 font-bold uppercase text-[9px]">Tanggal</span>
                      <span className="font-bold">: {activeSet?.date || '---'}</span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <span className="text-zinc-400 font-bold uppercase text-[9px]">Waktu</span>
                      <span className="font-bold">: {new Date().toLocaleTimeString('id-ID')}</span>
                    </div>
                  </div>
                </div>

                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-y-2 border-zinc-900 text-[10px] uppercase font-bold">
                      <th className="py-2 px-1">Deskripsi & Detail Log (D)</th>
                      <th className="py-2 px-1 text-center">Batang</th>
                      <th className="py-2 px-1 text-right">Volume</th>
                      <th className="py-2 px-1 text-right">Harga/m³</th>
                      <th className="py-2 px-1 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {activeSet?.categories.map(cat => {
                      const sub = getCategorySubtotal(cat);
                      return (
                        <React.Fragment key={cat.id}>
                          <tr className="bg-zinc-50">
                            <td className="py-2 px-1">
                              <div className="font-bold uppercase">{cat.woodType} - P: {cat.length}cm ({cat.condition})</div>
                            </td>
                            <td className="py-2 px-1 text-center font-bold">{cat.logs.length}</td>
                            <td className="py-2 px-1 text-right font-mono">{sub.volume.toFixed(4)}</td>
                            <td className="py-2 px-1 text-right">{formatCurrency(cat.pricePerM3)}</td>
                            <td className="py-2 px-1 text-right font-bold">{formatCurrency(sub.price)}</td>
                          </tr>
                          <tr>
                            <td colSpan={5} className="py-2 px-1 border-b border-zinc-100">
                              <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[10px] text-zinc-500 font-mono pb-1">
                                {(() => {
                                  const grouped = cat.logs.reduce((acc, log) => {
                                    acc[log.diameter] = (acc[log.diameter] || 0) + 1;
                                    return acc;
                                  }, {} as Record<number, number>);

                                  return Object.entries(grouped)
                                    .sort(([a], [b]) => Number(a) - Number(b))
                                    .map(([diameter, count]) => (
                                      <span key={diameter}>
                                        <span className="font-bold text-zinc-800">{diameter} cm</span> : {count} batang
                                      </span>
                                    ));
                                })()}
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-zinc-900">
                      <td colSpan={2} className="py-4">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Terbilang</p>
                        <p className="text-[11px] font-bold text-zinc-900 italic"># {terbilang(totals.price)} Rupiah #</p>
                      </td>
                      <td className="py-4 text-right font-mono font-bold text-xs">Total: {totals.volume.toFixed(4)} m³</td>
                      <td></td>
                      <td className="py-4 text-right font-bold text-lg">{formatCurrency(totals.price)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="grid grid-cols-3 gap-8 pt-12 text-center text-[10px] uppercase font-bold">
                  <div className="space-y-12">
                    <p>Penyetor</p>
                    <div className="border-t border-zinc-400 pt-1 mx-4">( .................... )</div>
                  </div>
                  <div className="space-y-12">
                  </div>
                  <div className="space-y-12">
                    <p>Kasir</p>
                    <div className="border-t border-zinc-400 pt-1 mx-4">( .................... )</div>
                  </div>
                </div>

                <div className="text-[9px] text-zinc-400 text-center pt-8 italic">
                  Mohon dicek kembali, jika ada kekeliruan silahkan kembalikan TPK.<br></br>
                  Terimakasih
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <AnimatePresence>
        {errorMessage && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-red-950/20 backdrop-blur-sm" onClick={() => setErrorMessage(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border-2 border-red-500 overflow-hidden flex flex-col items-center text-center p-8">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Peringatan Input!</h3>
              <p className="text-[15px] font-medium text-zinc-600 dark:text-zinc-300 mb-8 whitespace-pre-line leading-relaxed">{errorMessage}</p>
              <button onClick={() => setErrorMessage(null)} className="w-full bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold py-4 rounded-xl transition-all shadow-md">
                Saya Mengerti
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistory(false)} className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-zinc-200 dark:border-zinc-800">
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold dark:text-white">Riwayat Set Kayu</h2>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Download size={14} />
                    Export CSV
                  </button>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                  <X size={20} className="dark:text-zinc-400" />
                </button>
              </div>
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="text"
                    placeholder="Cari supplier atau ID..."
                    className={cn("input-field w-full !pl-10 py-2 text-sm")}
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                {currentHistoryItems.map(set => {
                  const setTotals = calculateSetTotals(set);
                  return (
                    <div key={set.id} className="p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-zinc-900 dark:text-white">{set.supplierName || 'Tanpa Nama'}</p>
                          <span className="text-[10px] font-mono bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-500 uppercase">#{set.id.substring(0, 6)}</span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{set.date} • {set.categories.length} Kategori • {set.categories.reduce((acc, c) => acc + c.logs.length, 0)} Batang</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2">{formatCurrency(setTotals.price)}</p>
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <button onClick={() => { setActiveSet(set); setShowHistory(false); }} className="btn-secondary text-xs py-2 px-4">Buka Kembali</button>
                        <button onClick={() => onDelete(set.id)} className="p-2 text-zinc-300 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  );
                })}
                {filteredHistory.length === 0 && (
                  <div className="text-center py-12 text-zinc-400">
                    <Search size={48} className="mx-auto mb-4 opacity-10" />
                    <p>Tidak ada riwayat yang cocok.</p>
                  </div>
                )}
              </div>
              {totalPages > 1 && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Halaman {currentPage} dari {totalPages}</p>
                  <div className="flex gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-30 hover:bg-white dark:hover:bg-zinc-800 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-30 hover:bg-white dark:hover:bg-zinc-800 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
