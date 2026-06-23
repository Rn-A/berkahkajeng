import React, { useState, useMemo } from 'react';
import { Search, Filter, Package, Layers, Download } from 'lucide-react';
import { InventoryItem } from '../types';
import { cn, roundPrice } from '../lib/utils';

interface InventoryViewProps {
  inventory: InventoryItem[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function InventoryView({ inventory }: InventoryViewProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('Semua');

  const woodTypes = useMemo(() => {
    const types = new Set(inventory.map(item => item.wood_type));
    return ['Semua', ...Array.from(types)];
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.wood_type.toLowerCase().includes(search.toLowerCase()) || 
                           item.diameter_group.includes(search);
      const matchesType = filterType === 'Semua' || item.wood_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [inventory, search, filterType]);

  const totalStats = useMemo(() => {
    return filteredInventory.reduce((acc, item) => ({
      volume: acc.volume + Number(item.total_volume),
      value: acc.value + roundPrice(Number(item.total_value)),
      logs: acc.logs + Number(item.total_logs)
    }), { volume: 0, value: 0, logs: 0 });
  }, [filteredInventory]);

  const groupedInventory = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    filteredInventory.forEach(item => {
      const lengthLabel = (item.condition_val === 'X' || Number(item.length) === 0) ? 'Bebas' : `${item.length} cm`;
      const key = `${item.wood_type} - ${lengthLabel} - ${item.condition_val || 'Umum'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [filteredInventory]);

  const exportToCSV = () => {
    if (filteredInventory.length === 0) return;
    
    const csvEscape = (val: any): string => {
      const str = String(val ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    };

    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const titleRows = [
      [csvEscape('LAPORAN DATA INVENTARIS STOK - BERKAH KAJENG')],
      [csvEscape('Tanggal Ekspor'), csvEscape(todayStr)],
      [csvEscape('Filter Jenis Kayu'), csvEscape(filterType === 'Semua' ? 'Semua Jenis Kayu' : filterType)],
      [csvEscape('Total Baris Data'), csvEscape(filteredInventory.length)],
      []
    ];

    const headers = [
      'No', 
      'Jenis Kayu', 
      'Diameter', 
      'Panjang', 
      'Kondisi', 
      'Jumlah Batang', 
      'Total Volume', 
      'Harga Rata-rata / Satuan', 
      'Total Nilai Aset'
    ];

    let totalLogs = 0;
    let totalVolume = 0;
    let totalValue = 0;

    const rows = filteredInventory.map((item, idx) => {
      const logs = Number(item.total_logs);
      const volume = Number(item.total_volume);
      const value = roundPrice(Number(item.total_value));
      const avgPrice = roundPrice(Number(item.avg_price));
      
      totalLogs += logs;
      totalVolume += volume;
      totalValue += value;

      const isX = item.condition_val === 'X' || item.diameter_group === 'X' || item.diameter_group === '<10';
      const priceUnit = isX ? '/ Btg' : '/ m³';

      return [
        csvEscape(idx + 1),
        csvEscape(item.wood_type),
        csvEscape(item.diameter_group === 'X' ? 'Bebas' : `${item.diameter_group} cm`),
        csvEscape(Number(item.length) === 0 ? 'Bebas' : `${item.length} cm`),
        csvEscape(item.condition_val || 'Umum'),
        csvEscape(`${logs} Btg`),
        csvEscape(`${volume.toFixed(3)} m³`),
        csvEscape(`${formatCurrency(avgPrice)} ${priceUnit}`),
        csvEscape(formatCurrency(value))
      ];
    });

    const summaryRow = [
      csvEscape('TOTAL ASET INVENTARIS'),
      csvEscape(''),
      csvEscape(''),
      csvEscape(''),
      csvEscape(''),
      csvEscape(`${totalLogs} Btg`),
      csvEscape(`${totalVolume.toFixed(3)} m³`),
      csvEscape(''),
      csvEscape(formatCurrency(totalValue))
    ];

    const allRows = [
      ...titleRows,
      headers.map(h => csvEscape(h)),
      ...rows,
      summaryRow
    ];

    const csvContent = allRows.map(e => e.join(",")).join("\n");
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventaris_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Manajemen Inventaris</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Stok kayu gelondongan yang tersedia di pangkalan Anda.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari kayu atau diameter..."
              className={cn("input-field !pl-12 w-full")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 shrink-0 shadow-sm">
            <Filter size={16} className="text-zinc-400" />
            <select 
              className="bg-transparent outline-none text-xs font-bold dark:text-zinc-300 cursor-pointer"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              {woodTypes.map(type => <option key={type} value={type} className="dark:bg-zinc-900">{type}</option>)}
            </select>
          </div>
          <button 
            onClick={exportToCSV}
            className="p-3 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-2xl transition-all shrink-0 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm"
            title="Export CSV"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 dark:bg-zinc-800 text-white p-8 rounded-3xl shadow-xl shadow-zinc-900/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Package size={80} />
          </div>
          <p className="label-caps text-zinc-400 mb-2">Total Volume Stok</p>
          <div className="flex items-end gap-2">
            <h3 className="text-4xl font-black tracking-tighter">{totalStats.volume.toFixed(3)}</h3>
            <span className="text-sm font-bold text-zinc-500 mb-1.5 uppercase">m³</span>
          </div>
        </div>
        <div className="card-base p-8">
          <p className="label-caps mb-2">Total Nilai Stok</p>
          <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">{formatCurrency(totalStats.value)}</h3>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-2">Estimasi nilai aset saat ini</p>
        </div>
        <div className="card-base p-8">
          <p className="label-caps mb-2">Total Batang</p>
          <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
            {totalStats.logs} <span className="text-sm font-bold text-zinc-400 uppercase ml-1">Batang</span>
          </h3>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-2">Tersedia di lapangan</p>
        </div>
      </div>

      {/* Inventory Grouped Tables */}
      <div className="space-y-8">
        {Object.keys(groupedInventory).map((groupName) => {
          const items = groupedInventory[groupName];
          const groupTotalVolume = items.reduce((sum, i) => sum + Number(i.total_volume), 0);
          const groupTotalLogs = items.reduce((sum, i) => sum + Number(i.total_logs), 0);
          
          return (
            <div key={groupName} className="card-base overflow-hidden">
              {/* Group Header */}
              <div className="bg-zinc-100 dark:bg-zinc-800/80 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-3 text-sm md:text-base">
                  <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg shadow-sm shrink-0">
                    <Layers size={18} className="text-zinc-600 dark:text-zinc-400" />
                  </div>
                  {groupName}
                </h3>
                <div className="flex items-center gap-4 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  <span className="bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">{groupTotalLogs} Batang</span>
                  <span className="bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">{groupTotalVolume.toFixed(3)} m³</span>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                      <th className="px-6 py-4 label-caps">Diameter (cm)</th>
                      <th className="px-6 py-4 label-caps text-right">Jumlah Batang</th>
                      <th className="px-6 py-4 label-caps text-right">Volume (m³)</th>
                      <th className="px-6 py-4 label-caps text-right">Harga Rata-rata</th>
                      <th className="px-6 py-4 label-caps text-right">Total Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-black text-zinc-600 dark:text-zinc-400">
                            Ø {item.diameter_group}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm font-bold dark:text-zinc-300">{item.total_logs}</td>
                        <td className="px-6 py-4 text-right font-mono text-sm font-black dark:text-white">{Number(item.total_volume).toFixed(3)}</td>
                        <td className="px-6 py-4 text-right text-xs font-bold text-zinc-500 dark:text-zinc-400">{formatCurrency(roundPrice(Number(item.avg_price)))}</td>
                        <td className="px-6 py-4 text-right font-black text-zinc-900 dark:text-white">{formatCurrency(roundPrice(Number(item.total_value)))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                {items.map((item) => (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-black text-zinc-600 dark:text-zinc-400 uppercase">
                        Ø {item.diameter_group}
                      </span>
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{item.total_logs} Batang</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <p className="label-caps mb-1">Volume</p>
                        <p className="font-mono font-black text-sm dark:text-white">{Number(item.total_volume).toFixed(3)} m³</p>
                      </div>
                      <div className="text-right">
                        <p className="label-caps mb-1">Total Nilai</p>
                        <p className="font-black text-sm text-zinc-900 dark:text-white">{formatCurrency(roundPrice(Number(item.total_value)))}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-50 dark:border-zinc-800">
                      <span className="label-caps">Harga Rata-rata</span>
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{formatCurrency(roundPrice(Number(item.avg_price)))}/m³</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filteredInventory.length === 0 && (
          <div className="px-8 py-24 text-center text-zinc-400">
            <Package size={64} className="mx-auto mb-6 opacity-10" />
            <h3 className="text-lg font-bold text-zinc-500 dark:text-zinc-400">Stok Kosong</h3>
            <p className="text-sm">Tidak ada data stok yang ditemukan untuk filter ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
