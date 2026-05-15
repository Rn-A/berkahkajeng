// Recharts components deferred for better initial render performance
const XAxis = React.lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
const YAxis = React.lazy(() => import('recharts').then(m => ({ default: m.YAxis })));
const CartesianGrid = React.lazy(() => import('recharts').then(m => ({ default: m.CartesianGrid })));
const Tooltip = React.lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
const ResponsiveContainer = React.lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));
const PieChart = React.lazy(() => import('recharts').then(m => ({ default: m.PieChart })));
const Pie = React.lazy(() => import('recharts').then(m => ({ default: m.Pie })));
const Cell = React.lazy(() => import('recharts').then(m => ({ default: m.Cell })));
const Legend = React.lazy(() => import('recharts').then(m => ({ default: m.Legend })));
const LineChart = React.lazy(() => import('recharts').then(m => ({ default: m.LineChart })));
const Line = React.lazy(() => import('recharts').then(m => ({ default: m.Line })));
import { TrendingUp, Package, ShoppingCart, Wallet, ArrowUpRight, CreditCard, Activity, Download, Database } from 'lucide-react';
import { DashboardData, Sale, WoodSet, InventoryItem, Expense } from '../types';
import { roundPrice } from '../lib/utils';

interface DashboardViewProps {
  data: DashboardData | null;
  salesHistory: Sale[];
  purchasesHistory: WoodSet[];
  inventory: InventoryItem[];
  expenses: Expense[];
  userRole?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const COLORS = ['var(--chart-primary)', '#10b981', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#84cc16'];

const renderFinancialLegend = (payload: any[]) => {
  return (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-6 bg-zinc-50 dark:bg-zinc-800/30 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 w-fit mx-auto">
      {payload.map((entry: any, index: number) => (
        <div key={`item-${index}`} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const renderOperationalLegend = (payload: any[]) => {
  const hargaItems = payload.filter((e: any) => e.value.includes('Harga'));
  const volumeItems = payload.filter((e: any) => e.value.includes('Volume'));

  return (
    <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8 mb-6 mt-2">
      <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 w-full sm:w-auto">
        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-3 text-center sm:text-left">Indikator Harga (Rp)</p>
        <div className="flex flex-col gap-3">
          {hargaItems.map((entry: any, index: number) => (
            <div key={`item-harga-${index}`} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 w-full sm:w-auto">
        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest mb-3 text-center sm:text-left">Indikator Volume (m³)</p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-8">
          <div className="flex flex-col gap-3">
            {volumeItems.slice(0, 2).map((entry: any, index: number) => (
              <div key={`item-vol-${index}`} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{entry.value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {volumeItems.slice(2).map((entry: any, index: number) => (
              <div key={`item-vol-stok-${index}`} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const renderPieTooltip = (props: any) => {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    const data = payload[0];
    const isPrimaryColor = data.payload.fill === 'var(--chart-primary)';
    return (
      <div className="bg-white dark:bg-zinc-900 px-4 py-3 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800">
        <p 
          className={`text-[13px] md:text-sm font-bold tracking-wide ${isPrimaryColor ? 'text-zinc-900 dark:text-white' : ''}`} 
          style={!isPrimaryColor ? { color: data.payload.fill } : {}}
        >
          {data.name} : {data.value.toFixed(2)} m³
        </p>
      </div>
    );
  }
  return null;
};

const renderLineTooltip = (props: any) => {
  const { active, payload, label } = props;
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-zinc-900 px-4 py-3 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 min-w-[200px]">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">{label}</p>
        <div className="flex flex-col gap-2">
          {payload.map((data: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{data.name}</span>
              </div>
              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                {data.name.includes('Harga') || data.name.includes('Rp') 
                  ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.value) 
                  : `${data.value.toFixed(2)} m³`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function DashboardView({ data, salesHistory, purchasesHistory, inventory, expenses, userRole = 'mandor' }: DashboardViewProps) {
  const [period, setPeriod] = useState<'hari' | 'minggu' | 'bulan' | 'tahun'>('bulan');

  // Compute groupings dynamically based on the period
  const groupedData = useMemo(() => {
    const getLabel = (dateStr: string) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Unknown';
      if (period === 'hari') return `${d.getDate()} ${d.toLocaleString('id-ID', { month: 'short' })}`;
      if (period === 'minggu') {
        const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `Mg ${weekNum} '${String(d.getFullYear()).slice(2)}`;
      }
      if (period === 'bulan') return `${d.toLocaleString('id-ID', { month: 'short' })} ${d.getFullYear()}`;
      return `${d.getFullYear()}`;
    };

    const allLabels = new Set<string>();
    const labelTime: Record<string, number> = {};
    
    const trackLabel = (dateStr: string) => {
        const l = getLabel(dateStr);
        allLabels.add(l);
        const time = new Date(dateStr).getTime();
        if (!labelTime[l] || time < labelTime[l]) {
            labelTime[l] = time;
        }
        return l;
    };

    const pMap: Record<string, { vol: number; val: number }> = {};
    purchasesHistory.forEach(p => {
      const l = trackLabel(p.date);
      if (!pMap[l]) pMap[l] = { vol: 0, val: 0 };
      pMap[l].vol += Number(p.total_volume) || 0;
      pMap[l].val += Number(p.total_value) || 0;
    });
    // Round purchase totals per label
    Object.keys(pMap).forEach(l => pMap[l].val = roundPrice(pMap[l].val));

    const sMap: Record<string, { vol: number; rev: number; profit: number }> = {};
    salesHistory.forEach(s => {
      const l = trackLabel(s.date);
      if (!sMap[l]) sMap[l] = { vol: 0, rev: 0, profit: 0 };
      const vol = s.items?.reduce((sum, item) => sum + Number(item.volume || 0), 0) || 0;
      sMap[l].vol += vol;
      sMap[l].rev += Number(s.total_revenue) || 0;
      sMap[l].profit += Number(s.total_profit) || 0;
    });
    // Round sales totals per label
    Object.keys(sMap).forEach(l => {
        sMap[l].rev = roundPrice(sMap[l].rev);
        sMap[l].profit = roundPrice(sMap[l].profit);
    });

    const eMap: Record<string, number> = {};
    expenses.forEach(e => {
      const l = trackLabel(e.date);
      eMap[l] = (eMap[l] || 0) + Number(e.amount || 0);
    });
    // Round expense totals per label
    Object.keys(eMap).forEach(l => eMap[l] = roundPrice(eMap[l]));

    const sortedLabels = Array.from(allLabels).sort((a, b) => labelTime[a] - labelTime[b]);

    // Calculate actual current physical stock
    const actualCurrentStock = inventory.reduce((sum, item) => sum + Number(item.total_volume || 0), 0);

    // Backward calculation: stock_yesterday = stock_today - purchases_today + sales_today
    // We traverse from the newest date to the oldest so the newest date perfectly matches actualCurrentStock.
    const results = new Array(sortedLabels.length);
    let currentStock = actualCurrentStock;

    for (let i = sortedLabels.length - 1; i >= 0; i--) {
      const l = sortedLabels[i];
      const pVol = pMap[l]?.vol || 0;
      const sVol = sMap[l]?.vol || 0;
      const pVal = pMap[l]?.val || 0;
      const sRev = sMap[l]?.rev || 0;
      const eAmt = eMap[l] || 0;
      
      results[i] = {
        label: l,
        purchase_volume: pVol,
        purchase_value: pVal,
        sales_volume: sVol,
        sales_revenue: sRev,
        expense_amount: eAmt,
        net_cashflow: roundPrice(sRev - pVal - eAmt),
        stock_volume: currentStock < 0 ? 0 : currentStock
      };

      // Calculate the stock for the PREVIOUS step in time
      currentStock = currentStock - pVol + sVol;
    }

    return results;
  }, [period, salesHistory, purchasesHistory, expenses, inventory]);

  // Inventory composition grouped by wood type (Volume & Value)
  const stockData = useMemo(() => {
    const map: Record<string, { vol: number, val: number }> = {};
    inventory.forEach(i => {
      if (!map[i.wood_type]) map[i.wood_type] = { vol: 0, val: 0 };
      map[i.wood_type].vol += Number(i.total_volume) || 0;
      map[i.wood_type].val += Number(i.total_value) || 0;
    });
    return Object.entries(map).map(([wood_type, data]) => ({
      wood_type,
      volume: data.vol,
      value: data.val
    })).filter(x => x.volume > 0).sort((a, b) => b.volume - a.volume);
  }, [inventory]);

  // Compute period-filtered stats for the 6 top cards (Current Period Only)
  const filteredStats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    // For "minggu", we take the last 7 days including today (or current week)
    const startOfWeek = new Date(startOfToday - (now.getDay() * 86400000)).getTime(); 
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    const isWithinPeriod = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr).getTime();
      switch (period) {
        case 'hari': return d >= startOfToday;
        case 'minggu': return d >= startOfWeek;
        case 'bulan': return d >= startOfMonth;
        case 'tahun': return d >= startOfYear;
        default: return true;
      }
    };

    const currentPurchases = purchasesHistory.filter(p => isWithinPeriod(p.date));
    const currentSales = salesHistory.filter(s => isWithinPeriod(s.date));
    const currentExpenses = expenses.filter(e => isWithinPeriod(e.date));

    const totalPurchaseVolume = currentPurchases.reduce((sum, p) => sum + (Number(p.total_volume) || 0), 0);
    const totalPurchaseValue = roundPrice(currentPurchases.reduce((sum, p) => sum + (Number(p.total_value) || 0), 0));
    
    const totalSalesVolume = currentSales.reduce((sum, s) => {
      const vol = s.items?.reduce((v, item) => v + Number(item.volume || 0), 0) || 0;
      return sum + vol;
    }, 0);
    const totalSalesRevenue = roundPrice(currentSales.reduce((sum, s) => sum + (Number(s.total_revenue) || 0), 0));
    const totalSalesProfit = roundPrice(currentSales.reduce((sum, s) => sum + (Number(s.total_profit) || 0), 0));
    
    const totalExpensesAmt = roundPrice(currentExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));
    
    const avgPurchasePrice = totalPurchaseVolume > 0 ? roundPrice(totalPurchaseValue / totalPurchaseVolume) : 0;
    const avgSalesPrice = totalSalesVolume > 0 ? roundPrice(totalSalesRevenue / totalSalesVolume) : 0;
    const netCashflow = roundPrice(totalSalesRevenue - totalPurchaseValue - totalExpensesAmt);
    const totalNetProfit = roundPrice(totalSalesProfit - totalExpensesAmt);

    return {
      totalPurchaseVolume,
      totalPurchaseValue,
      totalSalesVolume,
      totalSalesRevenue,
      totalExpenses: totalExpensesAmt,
      totalSalesProfit,
      totalNetProfit,
      avgPurchasePrice,
      avgSalesPrice,
      netCashflow
    };
  }, [period, salesHistory, purchasesHistory, expenses]);

  if (!data) return (
    <div className="p-4 md:p-8 space-y-8 animate-pulse">
      <div className="flex justify-between items-end gap-4 mb-8">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
          <div className="h-4 w-96 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800"></div>
        ))}
      </div>
    </div>
  );

  const hasChartData = (data as any).trends || (purchasesHistory.length > 0 && salesHistory.length > 0);

  // Build stats cards — mandor hanya melihat Stok, Volume Pembelian, Volume Penjualan
  const isOwner = userRole === 'owner';

  const stats = [
    {
      label: 'Total Stok Aktif',
      value: `${data.inventory?.total_volume?.toFixed(2) || 0} m³`,
      subValue: isOwner ? formatCurrency(roundPrice(data.inventory?.total_value || 0)) : `${inventory.length} jenis kayu`,
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      label: 'Total Pembelian',
      value: `${filteredStats.totalPurchaseVolume.toFixed(2)} m³`,
      subValue: isOwner ? `Total: ${formatCurrency(filteredStats.totalPurchaseValue)}` : `Rata-rata: ${filteredStats.avgPurchasePrice > 0 ? filteredStats.totalPurchaseVolume.toFixed(2) + ' m³' : '-'}`,
      subValue2: isOwner ? `Rerata: ${formatCurrency(filteredStats.avgPurchasePrice)}/m³` : undefined,
      icon: Wallet,
      color: 'bg-zinc-900 dark:bg-zinc-700'
    },
    {
      label: 'Total Penjualan',
      value: `${filteredStats.totalSalesVolume.toFixed(2)} m³`,
      subValue: isOwner ? `Total: ${formatCurrency(filteredStats.totalSalesRevenue)}` : `Volume terjual periode ini`,
      subValue2: isOwner ? `Rerata: ${formatCurrency(filteredStats.avgSalesPrice)}/m³` : undefined,
      icon: ShoppingCart,
      color: 'bg-emerald-500'
    },
    ...(isOwner ? [
      {
        label: 'Total Pengeluaran',
        value: formatCurrency(filteredStats.totalExpenses),
        subValue: 'Operasional & Gaji',
        icon: CreditCard,
        color: 'bg-red-500'
      },
      {
        label: 'Arus Kas Bersih',
        value: formatCurrency(filteredStats.netCashflow),
        subValue: filteredStats.netCashflow >= 0 ? 'Surplus / Positif' : 'Defisit / Negatif',
        subValue2: '(Pendapatan - Pembelian - Pengeluaran)',
        icon: TrendingUp,
        color: 'bg-indigo-500'
      },
      {
        label: 'Laba Bersih',
        value: formatCurrency(filteredStats.totalNetProfit),
        subValue: 'Laba Penjualan - Pengeluaran',
        icon: Activity,
        color: 'bg-emerald-600'
      }
    ] : [])
  ];

  const ChartPlaceholder = () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 animate-pulse">
      <Activity size={24} className="text-zinc-300 dark:text-zinc-700 mb-2" />
      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Menyiapkan Grafik...</span>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard Ringkasan</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Pantau pergerakan stok dan keuangan pangkalan kayu Anda.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 flex shadow-sm">
            {(['hari', 'minggu', 'bulan', 'tahun'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-bold capitalize rounded-lg transition-colors ${
                  period === p 
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow' 
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
                aria-label={`Lihat periode ${p}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {userRole === 'owner' && (
        <div className="bg-zinc-900 dark:bg-white p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-white dark:text-zinc-900 font-bold text-lg">Pusat Cadangan Data (Backup)</h2>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm">Ekspor seluruh database ke format JSON untuk arsip keamanan.</p>
          </div>
          <button 
            onClick={async () => {
              try {
                const token = JSON.parse(localStorage.getItem('logyard_auth') || '{}').token;
                const res = await fetch('/api/export-all', {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_berkah_kajeng_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              } catch (e) {
                alert('Gagal mengekspor data.');
              }
            }}
            className="bg-white/10 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 rounded-2xl flex items-center gap-2 font-bold hover:bg-white/20 dark:hover:bg-zinc-200 transition-all active:scale-95 border border-white/10 dark:border-zinc-200"
          >
            <Database size={20} />
            Backup Data Utama
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <h2 className="sr-only">Statistik Utama</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat: any, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`${stat.color} p-2.5 rounded-xl text-white`}>
                <stat.icon size={22} />
              </div>
            </div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white truncate">{stat.value}</p>
            <div className="space-y-0.5 mt-1">
              <p className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 truncate">{stat.subValue}</p>
              {stat.subValue2 && (
                <p className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 truncate">{stat.subValue2}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Financial Trend (Line Chart) — hanya owner */}
      {userRole === 'owner' && (
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-500" />
          Tren Keuangan ({period})
        </h2>

        {renderFinancialLegend([
          { value: 'Pendapatan (Rp)', color: '#10b981' },
          { value: 'Pembelian (Rp)', color: '#f97316' },
          { value: 'Pengeluaran (Rp)', color: '#ef4444' },
          { value: 'Arus Kas Bersih (Rp)', color: '#3b82f6' }
        ])}
 
        <div className="h-[350px]">
          {!hasChartData ? <ChartPlaceholder /> : (
            <React.Suspense fallback={<ChartPlaceholder />}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={groupedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" className="dark:stroke-zinc-800" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#a1a1aa'}} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{fontSize: 10, fill: '#a1a1aa'}}
                    width={80}
                    tickFormatter={(v) => `Rp${(v/1000000).toFixed(0)}M`}
                  />
                  <Tooltip content={renderLineTooltip} cursor={{ stroke: '#a1a1aa', strokeWidth: 1, strokeDasharray: '5 5' }} />

                  <Line type="monotone" dataKey="sales_revenue" name="Pendapatan (Rp)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="purchase_value" name="Pembelian (Rp)" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="expense_amount" name="Pengeluaran (Rp)" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="net_cashflow" name="Arus Kas Bersih (Rp)" stroke="#3b82f6" strokeWidth={4} strokeDasharray="5 5" dot={{ r: 5 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </React.Suspense>
          )}
        </div>
      </div>
      )}

      {/* Operational Trend Chart (Line Chart) */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-500" />
          Tren Volume & Harga Operasional ({period})
        </h2>

        {renderOperationalLegend([
          { value: 'Harga Penjualan (Rp)', color: '#10b981' },
          { value: 'Harga Pembelian (Rp)', color: '#f97316' },
          { value: 'Volume Penjualan (m³)', color: '#8b5cf6' },
          { value: 'Volume Pembelian (m³)', color: '#eab308' },
          { value: 'Volume Stok Tersedia (m³)', color: '#06b6d4' }
        ])}

        <div className="h-[400px]">
          {!hasChartData ? <ChartPlaceholder /> : (
            <React.Suspense fallback={<ChartPlaceholder />}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={groupedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" className="dark:stroke-zinc-800" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#a1a1aa'}} />
                  
                  {/* Left Y-Axis for Rupiah (Value) */}
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#a1a1aa'}} 
                    width={80} 
                    tickFormatter={(v) => `Rp${(v/1000000).toFixed(0)}M`} 
                  />
                  
                  {/* Right Y-Axis for Volume (m³) */}
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#a1a1aa'}} 
                    width={40} 
                    tickFormatter={(v) => `${v.toFixed(0)}`}
                  />
                  
                  <Tooltip content={renderLineTooltip} cursor={{ stroke: '#a1a1aa', strokeWidth: 1, strokeDasharray: '5 5' }} />

                  {/* Rupiah Lines (Left Axis) */}
                  <Line yAxisId="left" type="monotone" dataKey="sales_revenue" name="Harga Penjualan (Rp)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line yAxisId="left" type="monotone" dataKey="purchase_value" name="Harga Pembelian (Rp)" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  
                  {/* Volume Lines (Right Axis) */}
                  <Line yAxisId="right" type="monotone" dataKey="sales_volume" name="Volume Penjualan (m³)" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="purchase_volume" name="Volume Pembelian (m³)" stroke="#eab308" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="stock_volume" name="Volume Stok Tersedia (m³)" stroke="#06b6d4" strokeWidth={4} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </React.Suspense>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Stock Composition Volume (Pie) */}
        <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
          <h2 className="text-[15px] font-extrabold text-zinc-900 dark:text-white mb-8 flex items-center gap-2">
            <Package size={18} className="text-blue-500" />
            Komposisi Stok
          </h2>
          <div className="flex-1 flex flex-col justify-between">
            <div className="h-56 md:h-64 w-full flex justify-center mb-8">
              <React.Suspense fallback={<ChartPlaceholder />}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockData}
                      cx="50%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="volume"
                      nameKey="wood_type"
                      stroke="none"
                    >
                      {stockData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={renderPieTooltip} cursor={{fill: 'transparent'}} />
                  </PieChart>
                </ResponsiveContainer>
              </React.Suspense>
            </div>
            
            <div className="flex flex-col gap-3.5 w-full border-t border-zinc-100 dark:border-zinc-800 pt-6">
              {stockData.map((entry, index) => (
                <div key={`legend-${index}`} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[13px] md:text-sm text-zinc-500 dark:text-zinc-400 font-medium truncate">{entry.wood_type}</span>
                  </div>
                  <span className="text-[13px] md:text-sm font-bold text-zinc-900 dark:text-white shrink-0">
                    {entry.volume.toFixed(2)} m³
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
