import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  ShoppingCart,
  ArrowRight,
  CreditCard,
  Calendar,
  Filter
} from 'lucide-react';
import { InventoryItem, Sale, WoodSet, Expense } from '../types';
import { cn, roundPrice } from '../lib/utils';

interface ReportsViewProps {
  inventory: InventoryItem[];
  sales: Sale[];
  purchases: WoodSet[];
  expenses: Expense[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

type Period = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function ReportsView({
  inventory = [],
  sales = [],
  purchases = [],
  expenses = [],
}: ReportsViewProps) {
  const [period, setPeriod] = useState<Period>('all');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const filteredData = useMemo(() => {
    const isWithinPeriod = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr).getTime();
      switch (period) {
        case 'daily': {
          const dDate = new Date(dateStr).toISOString().split('T')[0];
          return dDate === selectedDate;
        }
        case 'weekly': {
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
        case 'monthly': {
          const [selY, selM] = selectedDate.split('-');
          const dObj = new Date(dateStr);
          return dObj.getFullYear() === parseInt(selY) && (dObj.getMonth() + 1) === parseInt(selM);
        }
        case 'yearly': {
          const selY = selectedDate.split('-')[0];
          return new Date(dateStr).getFullYear() === parseInt(selY);
        }
        case 'all': return true;
        default: return true;
      }
    };

    return {
      sales: sales.filter(s => isWithinPeriod(s.date)),
      purchases: purchases.filter(p => isWithinPeriod(p.date)),
      expenses: expenses.filter(e => isWithinPeriod(e.date))
    };
  }, [sales, purchases, expenses, period, selectedDate, selectedMonth, selectedYear]);

  const financialSummary = useMemo(() => {
    const { sales: fSales, purchases: fPurchases, expenses: fExpenses } = filteredData;

    const totalRevenue = roundPrice(fSales.reduce((acc, s) => acc + Number(s.total_revenue), 0));
    const totalCost = roundPrice(fSales.reduce((acc, s) => acc + Number(s.total_cost), 0));
    const totalExpenses = roundPrice(fExpenses.reduce((acc, e) => acc + Number(e.amount), 0));
    const totalProfit = roundPrice(totalRevenue - totalCost - totalExpenses);
    const totalInventoryValue = roundPrice(inventory.reduce((acc, i) => acc + Number(i.total_value), 0));
    
    const totalPurchaseVolume = fPurchases.reduce((acc, p) => acc + (p.total_volume || 0), 0);
    
    const totalPurchaseValue = roundPrice(fPurchases.reduce((acc, p) => acc + (p.total_value || 0), 0));

    const totalSalesVolume = fSales.reduce((acc, s) => {
      const items = s.items ?? [];
      return acc + items.reduce((sum, item) => sum + Number(item.volume || 0), 0);
    }, 0);

    const avgPurchasePrice = totalPurchaseVolume > 0 ? roundPrice(totalPurchaseValue / totalPurchaseVolume) : 0;
    const avgSalesPrice = totalSalesVolume > 0 ? roundPrice(totalRevenue / totalSalesVolume) : 0;

    return { 
      totalRevenue, 
      totalCost, 
      totalProfit, 
      totalInventoryValue, 
      totalPurchaseValue, 
      totalExpenses,
      totalPurchaseVolume,
      totalSalesVolume,
      avgPurchasePrice,
      avgSalesPrice
    };
  }, [inventory, filteredData]);

  const exportToCSV = () => {
    const headers = ['Kategori', 'Nilai (Rp)'];
    const rows = [
      ['Total Penjualan', financialSummary.totalRevenue],
      ['Total Pembelian', financialSummary.totalPurchaseValue],
      ['Total Pengeluaran Operasional', financialSummary.totalExpenses],
      ['Laba Bersih', financialSummary.totalProfit],
      ['Nilai Aset Stok', financialSummary.totalInventoryValue]
    ];

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `laporan_${period}_${(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const periodOptions: { id: Period; label: string }[] = [
    { id: 'all', label: 'Semua Waktu' },
    { id: 'daily', label: 'Hari Ini' },
    { id: 'weekly', label: 'Minggu Ini' },
    { id: 'monthly', label: 'Bulan Ini' },
    { id: 'yearly', label: 'Tahun Ini' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Analisis Laporan</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Pantau performa keuangan dan stok pangkalan kayu.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-sm w-full lg:w-auto">
            <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl overflow-x-auto no-scrollbar">
              {periodOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPeriod(opt.id)}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black rounded-lg transition-all whitespace-nowrap uppercase",
                    period === opt.id 
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-lg scale-105" 
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-2 px-2 border-t sm:border-t-0 sm:border-l border-zinc-200 dark:border-zinc-700 pt-2 sm:pt-0 sm:ml-1">
              <span className="sm:hidden text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pilih Tanggal:</span>
              <div className="relative flex items-center pl-6">
                <Calendar size={14} className="absolute left-1 text-zinc-400 pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-bold focus:ring-0 dark:text-white cursor-pointer w-full py-1 p-0"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={exportToCSV} className="p-2.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors" title="Export CSV">
              <Download size={20} />
            </button>
            <button onClick={() => window.print()} className="p-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 rounded-xl shadow-lg shadow-zinc-200 dark:shadow-none transition-all" title="Cetak Laporan">
              <Printer size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
            <TrendingUp size={64} />
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Penjualan</p>
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">{financialSummary.totalSalesVolume.toFixed(2)} <span className="text-xs font-bold text-zinc-400">m³</span></h3>
          <div className="mt-4 space-y-1">
            <p className="text-sm font-bold text-zinc-900 dark:text-white">{formatCurrency(financialSummary.totalRevenue)}</p>
            <p className="text-[10px] text-zinc-500 font-medium">Rerata: {formatCurrency(financialSummary.avgSalesPrice)}/m³</p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
            <TrendingUp size={14} />
            Pendapatan Kotor
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-orange-500">
            <ShoppingCart size={64} />
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">HPP (Modal Kayu)</p>
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">{financialSummary.totalPurchaseVolume.toFixed(2)} <span className="text-xs font-bold text-zinc-400">m³</span></h3>
          <div className="mt-4 space-y-1">
            <p className="text-sm font-bold text-zinc-900 dark:text-white">{formatCurrency(financialSummary.totalPurchaseValue)}</p>
            <p className="text-[10px] text-zinc-500 font-medium">Rerata Beli: {formatCurrency(financialSummary.avgPurchasePrice)}/m³</p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-wider">
            <TrendingDown size={14} />
            Total Pembelian
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-red-500">
            <CreditCard size={64} />
          </div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Operasional</p>
          <h3 className="text-2xl font-black text-red-600 dark:text-red-400 tracking-tighter">{formatCurrency(financialSummary.totalExpenses)}</h3>
          <div className="mt-4">
            <p className="text-[10px] text-zinc-500 font-medium italic">Biaya rutin & perawatan</p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider">
            <CreditCard size={14} />
            Pengeluaran
          </div>
        </div>

        <div className="bg-zinc-900 dark:bg-zinc-100 p-6 rounded-3xl shadow-xl shadow-zinc-200 dark:shadow-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-20 group-hover:scale-110 transition-transform text-white dark:text-zinc-900">
            <TrendingUp size={64} />
          </div>
          <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Laba Bersih</p>
          <h3 className="text-2xl font-black text-emerald-400 dark:text-emerald-600 tracking-tighter">{formatCurrency(financialSummary.totalProfit)}</h3>
          <div className="mt-4">
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium italic">Estimasi profit bersih periode ini</p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-emerald-400 dark:text-emerald-600 text-[10px] font-black uppercase tracking-wider">
            <TrendingUp size={14} />
            Keuntungan Akhir
          </div>
        </div>
      </div>

      {/* Movement Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inbound Movement */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Aliran Barang Masuk</h3>
            </div>
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{filteredData.purchases.length} Transaksi</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10">
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tanggal</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Supplier</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Volume</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                {filteredData.purchases.map(p => (
                  <tr key={p.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">{p.date}</td>
                    <td className="px-6 py-4 font-bold text-sm text-zinc-900 dark:text-white">{p.supplierName}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      {p.total_volume.toFixed(3)} <span className="text-[10px] font-bold text-zinc-400">m³</span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-white">
                      {formatCurrency(roundPrice(p.total_value))}
                    </td>
                  </tr>
                ))}
                {filteredData.purchases.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 text-sm">Tidak ada transaksi masuk di periode ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Outbound Movement */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingDown size={16} />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Aliran Barang Keluar</h3>
            </div>
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{filteredData.sales.length} Transaksi</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10">
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tanggal</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pelanggan</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Volume</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Pendapatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                {filteredData.sales.map(s => (
                  <tr key={s.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">{s.date}</td>
                    <td className="px-6 py-4 font-bold text-sm text-zinc-900 dark:text-white">{s.customer_name}</td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      {(s.items ?? []).reduce((acc, i) => acc + Number(i.volume || 0), 0).toFixed(3)} <span className="text-[10px] font-bold text-zinc-400">m³</span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(roundPrice(s.total_revenue))}
                    </td>
                  </tr>
                ))}
                {filteredData.sales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 text-sm">Tidak ada transaksi keluar di periode ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Expenses Breakdown */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center">
            <CreditCard size={16} />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Rincian Pengeluaran Operasional</h3>
        </div>
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tanggal</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Kategori</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Keterangan</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
              {filteredData.expenses.map(e => (
                <tr key={e.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">{e.date}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-black rounded uppercase tracking-tighter">
                      {e.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-600 dark:text-zinc-400">{e.description}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-500">
                    {formatCurrency(roundPrice(e.amount))}
                  </td>
                </tr>
              ))}
              {filteredData.expenses.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 text-sm">Belum ada pengeluaran di periode ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
