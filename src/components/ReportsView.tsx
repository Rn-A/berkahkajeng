import React, { useState, useMemo, useRef } from 'react';
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
import { cn, roundPrice, formatPeriodDisplay } from '../lib/utils';
import XLSX from 'xlsx-js-style';

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

const formatRp = (value: number) => {
  return `Rp ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(value)}`;
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
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
    if (newPeriod === 'yearly') {
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
    
    const totalPurchaseVolume = fPurchases.reduce((acc, p) => acc + Number(p.total_volume || 0), 0);
    
    const totalPurchaseValue = roundPrice(fPurchases.reduce((acc, p) => acc + Number(p.total_value || 0), 0));

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

  const exportToExcel = () => {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const periodLabel = 
      period === 'daily' ? 'Hari Ini' :
      period === 'weekly' ? 'Minggu Ini' :
      period === 'monthly' ? 'Bulan Ini' :
      period === 'yearly' ? 'Tahun Ini' : 'Semua Waktu';

    // ======== Color Palette (matching the screenshot) ========
    const NAVY = '1B2A4A';
    const DARK_NAVY = '0F1D33';
    const GOLD = 'C8A951';
    const WHITE = 'FFFFFF';
    const LIGHT_GRAY = 'F2F4F8';
    const MID_GRAY = 'E8ECF1';
    const DARK_TEXT = '1B2A4A';
    const GREEN_BG = 'E8F5E9';
    const GREEN_TEXT = '2E7D32';
    const RED_BG = 'FFEBEE';
    const RED_TEXT = 'C62828';
    const YELLOW_BG = 'FFF8E1';
    const YELLOW_TEXT = '8B6914';
    const BLUE_ACCENT = '2196F3';

    // ======== Style helpers ========
    const thinBorder = {
      top: { style: 'thin', color: { rgb: MID_GRAY } },
      bottom: { style: 'thin', color: { rgb: MID_GRAY } },
      left: { style: 'thin', color: { rgb: MID_GRAY } },
      right: { style: 'thin', color: { rgb: MID_GRAY } }
    } as any;

    const mediumBorder = {
      top: { style: 'medium', color: { rgb: NAVY } },
      bottom: { style: 'medium', color: { rgb: NAVY } },
      left: { style: 'medium', color: { rgb: NAVY } },
      right: { style: 'medium', color: { rgb: NAVY } }
    } as any;

    const bottomThickBorder = {
      ...thinBorder,
      bottom: { style: 'medium', color: { rgb: NAVY } }
    } as any;

    // Cell factory functions
    const titleCell = (v: string) => ({
      v, t: 's',
      s: {
        font: { bold: true, sz: 16, color: { rgb: WHITE }, name: 'Calibri' },
        fill: { fgColor: { rgb: NAVY } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: mediumBorder
      }
    });

    const subtitleCell = (v: string) => ({
      v, t: 's',
      s: {
        font: { bold: true, sz: 12, color: { rgb: GOLD }, name: 'Calibri' },
        fill: { fgColor: { rgb: NAVY } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: mediumBorder
      }
    });

    const dateSubtitleCell = (v: string) => ({
      v, t: 's',
      s: {
        font: { italic: true, sz: 9, color: { rgb: 'B0BEC5' }, name: 'Calibri' },
        fill: { fgColor: { rgb: NAVY } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: mediumBorder
      }
    });

    const sectionHeaderCell = (v: string) => ({
      v, t: 's',
      s: {
        font: { bold: true, sz: 11, color: { rgb: WHITE }, name: 'Calibri' },
        fill: { fgColor: { rgb: DARK_NAVY } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: mediumBorder
      }
    });

    const tableHeaderCell = (v: string, align: string = 'center') => ({
      v, t: 's',
      s: {
        font: { bold: true, sz: 10, color: { rgb: WHITE }, name: 'Calibri' },
        fill: { fgColor: { rgb: NAVY } },
        alignment: { horizontal: align, vertical: 'center', wrapText: true },
        border: mediumBorder
      }
    });

    const dataCell = (v: string, isEven: boolean = false, align: string = 'left', bold: boolean = false) => ({
      v, t: 's',
      s: {
        font: { sz: 10, color: { rgb: DARK_TEXT }, name: 'Calibri', bold },
        fill: { fgColor: { rgb: isEven ? LIGHT_GRAY : WHITE } },
        alignment: { horizontal: align, vertical: 'center' },
        border: thinBorder
      }
    });

    const totalRowCell = (v: string, align: string = 'left') => ({
      v, t: 's',
      s: {
        font: { bold: true, sz: 10, color: { rgb: WHITE }, name: 'Calibri' },
        fill: { fgColor: { rgb: NAVY } },
        alignment: { horizontal: align, vertical: 'center' },
        border: mediumBorder
      }
    });

    const profitLabelCell = (v: string, isBold: boolean = false) => ({
      v, t: 's',
      s: {
        font: { bold: isBold, sz: 10, color: { rgb: DARK_TEXT }, name: 'Calibri' },
        fill: { fgColor: { rgb: WHITE } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: thinBorder
      }
    });

    const profitValueCell = (v: string, color: string = DARK_TEXT, bgColor: string = WHITE) => ({
      v, t: 's',
      s: {
        font: { bold: true, sz: 10, color: { rgb: color }, name: 'Calibri' },
        fill: { fgColor: { rgb: bgColor } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: thinBorder
      }
    });

    const highlightCell = (v: string, fontColor: string, bgColor: string, bold: boolean = true) => ({
      v, t: 's',
      s: {
        font: { bold, sz: 10, color: { rgb: fontColor }, name: 'Calibri' },
        fill: { fgColor: { rgb: bgColor } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: thinBorder
      }
    });

    const emptyStyledCell = (bgColor: string = WHITE) => ({
      v: '', t: 's',
      s: {
        fill: { fgColor: { rgb: bgColor } },
        border: thinBorder
      }
    });

    const navyEmptyCell = () => ({
      v: '', t: 's',
      s: {
        fill: { fgColor: { rgb: NAVY } },
        border: mediumBorder
      }
    });

    const darkNavyEmptyCell = () => ({
      v: '', t: 's',
      s: {
        fill: { fgColor: { rgb: DARK_NAVY } },
        border: mediumBorder
      }
    });

    // ======== Build worksheet data ========
    const wsData: any[][] = [];
    const merges: any[] = [];
    let row = 0;

    // ------- TITLE BLOCK (3 rows) -------
    // Row 0: Main title
    wsData.push([titleCell('🪵  LAPORAN KEUANGAN & TRANSAKSI'), navyEmptyCell(), navyEmptyCell(), navyEmptyCell()]);
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;

    // Row 1: Company name
    wsData.push([subtitleCell('BERKAH KAJENG'), navyEmptyCell(), navyEmptyCell(), navyEmptyCell()]);
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;

    // Row 2: Date & period
    wsData.push([dateSubtitleCell(`Tanggal Ekspor: ${todayStr}  |  Periode: ${periodLabel}`), navyEmptyCell(), navyEmptyCell(), navyEmptyCell()]);
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;

    // Row 3: Spacer
    wsData.push([emptyStyledCell(), emptyStyledCell(), emptyStyledCell(), emptyStyledCell()]);
    row++;

    // ------- SECTION 1: RINGKASAN KEUANGAN -------
    wsData.push([sectionHeaderCell('1. RINGKASAN KEUANGAN'), darkNavyEmptyCell(), darkNavyEmptyCell(), darkNavyEmptyCell()]);
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;

    // Table header
    wsData.push([
      tableHeaderCell('Kategori'),
      tableHeaderCell('Detail'),
      tableHeaderCell('Nilai', 'right'),
      navyEmptyCell()
    ]);
    row++;

    // Financial summary data rows
    const summaryData = [
      { category: 'Total Penjualan', detail: 'Volume', value: `${financialSummary.totalSalesVolume.toFixed(2)} m³`, isFirst: true },
      { category: '', detail: 'Nilai Penjualan (Pendapatan Kotor)', value: formatRp(financialSummary.totalRevenue), isFirst: false },
      { category: '', detail: 'Rerata Harga Jual', value: `${formatRp(financialSummary.avgSalesPrice)}/m³`, isFirst: false },
      { category: 'Total Pembelian', detail: 'Volume', value: `${financialSummary.totalPurchaseVolume.toFixed(2)} m³`, isFirst: true },
      { category: '', detail: 'Nilai Pembelian', value: formatRp(financialSummary.totalPurchaseValue), isFirst: false },
      { category: '', detail: 'Rerata Harga Beli', value: `${formatRp(financialSummary.avgPurchasePrice)}/m³`, isFirst: false },
      { category: 'Operasional', detail: 'Biaya Operasional', value: formatRp(financialSummary.totalExpenses), isFirst: true },
    ];

    summaryData.forEach((item, i) => {
      const isEven = i % 2 === 0;
      wsData.push([
        dataCell(item.category, isEven, 'left', item.isFirst),
        dataCell(item.detail, isEven),
        dataCell(item.value, isEven, 'right'),
        emptyStyledCell(isEven ? LIGHT_GRAY : WHITE)
      ]);
      row++;
    });

    // Spacer
    wsData.push([emptyStyledCell(), emptyStyledCell(), emptyStyledCell(), emptyStyledCell()]);
    row++;

    // ------- PERHITUNGAN LABA BERSIH -------
    wsData.push([sectionHeaderCell('PERHITUNGAN LABA BERSIH'), darkNavyEmptyCell(), darkNavyEmptyCell(), darkNavyEmptyCell()]);
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;

    // Profit calculation rows
    wsData.push([
      profitLabelCell('Pendapatan Kotor'),
      emptyStyledCell(),
      highlightCell(formatRp(financialSummary.totalRevenue), GREEN_TEXT, GREEN_BG),
      emptyStyledCell()
    ]);
    row++;

    wsData.push([
      profitLabelCell('– HPP (Modal Kayu)'),
      emptyStyledCell(),
      highlightCell(formatRp(financialSummary.totalCost), RED_TEXT, RED_BG),
      emptyStyledCell()
    ]);
    row++;

    wsData.push([
      profitLabelCell('– Biaya Operasional'),
      emptyStyledCell(),
      highlightCell(formatRp(financialSummary.totalExpenses), RED_TEXT, RED_BG),
      emptyStyledCell()
    ]);
    row++;

    // Laba Bersih (highlighted)
    const profitColor = financialSummary.totalProfit >= 0 ? GREEN_TEXT : RED_TEXT;
    const profitBg = financialSummary.totalProfit >= 0 ? GREEN_BG : RED_BG;
    wsData.push([
      {
        v: 'Laba Bersih', t: 's',
        s: {
          font: { bold: true, sz: 11, color: { rgb: WHITE }, name: 'Calibri' },
          fill: { fgColor: { rgb: financialSummary.totalProfit >= 0 ? GREEN_TEXT : RED_TEXT } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: mediumBorder
        }
      },
      {
        v: '', t: 's',
        s: {
          fill: { fgColor: { rgb: financialSummary.totalProfit >= 0 ? GREEN_TEXT : RED_TEXT } },
          border: mediumBorder
        }
      },
      {
        v: formatRp(financialSummary.totalProfit), t: 's',
        s: {
          font: { bold: true, sz: 11, color: { rgb: WHITE }, name: 'Calibri' },
          fill: { fgColor: { rgb: financialSummary.totalProfit >= 0 ? GREEN_TEXT : RED_TEXT } },
          alignment: { horizontal: 'right', vertical: 'center' },
          border: mediumBorder
        }
      },
      {
        v: '', t: 's',
        s: {
          fill: { fgColor: { rgb: financialSummary.totalProfit >= 0 ? GREEN_TEXT : RED_TEXT } },
          border: mediumBorder
        }
      }
    ]);
    row++;

    // Nilai Aset Stok
    wsData.push([
      {
        v: 'Nilai Aset Stok', t: 's',
        s: {
          font: { bold: true, sz: 10, color: { rgb: YELLOW_TEXT }, name: 'Calibri' },
          fill: { fgColor: { rgb: YELLOW_BG } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: thinBorder
        }
      },
      {
        v: 'Estimasi Nilai Aset Stok', t: 's',
        s: {
          font: { italic: true, sz: 10, color: { rgb: YELLOW_TEXT }, name: 'Calibri' },
          fill: { fgColor: { rgb: YELLOW_BG } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: thinBorder
        }
      },
      highlightCell(formatRp(financialSummary.totalInventoryValue), YELLOW_TEXT, YELLOW_BG),
      emptyStyledCell(YELLOW_BG)
    ]);
    row++;

    // Spacer
    wsData.push([emptyStyledCell(), emptyStyledCell(), emptyStyledCell(), emptyStyledCell()]);
    row++;

    // ------- SECTION 2: ALIRAN BARANG MASUK -------
    wsData.push([sectionHeaderCell('2. ALIRAN BARANG MASUK'), darkNavyEmptyCell(), darkNavyEmptyCell(), darkNavyEmptyCell()]);
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;

    wsData.push([
      tableHeaderCell('Tanggal'),
      tableHeaderCell('Supplier'),
      tableHeaderCell('Volume (m³)', 'right'),
      tableHeaderCell('Total (Rp)', 'right')
    ]);
    row++;

    filteredData.purchases.forEach((p, i) => {
      const isEven = i % 2 === 0;
      wsData.push([
        dataCell(p.date, isEven),
        dataCell(p.supplierName, isEven, 'left', false),
        dataCell(p.total_volume.toFixed(3), isEven, 'right'),
        dataCell(formatRp(roundPrice(p.total_value)), isEven, 'right')
      ]);
      row++;
    });

    if (filteredData.purchases.length === 0) {
      wsData.push([
        dataCell('Tidak ada transaksi masuk di periode ini.', false),
        emptyStyledCell(),
        emptyStyledCell(),
        emptyStyledCell()
      ]);
      merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
      row++;
    }

    // Total row
    wsData.push([
      totalRowCell('TOTAL'),
      totalRowCell(`${filteredData.purchases.length} Transaksi`, 'center'),
      totalRowCell(`${financialSummary.totalPurchaseVolume.toFixed(3)} m³`, 'right'),
      totalRowCell(formatRp(financialSummary.totalPurchaseValue), 'right')
    ]);
    row++;

    // Spacer
    wsData.push([emptyStyledCell(), emptyStyledCell(), emptyStyledCell(), emptyStyledCell()]);
    row++;

    // ------- SECTION 3: ALIRAN BARANG KELUAR -------
    wsData.push([sectionHeaderCell('3. ALIRAN BARANG KELUAR'), darkNavyEmptyCell(), darkNavyEmptyCell(), darkNavyEmptyCell()]);
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;

    wsData.push([
      tableHeaderCell('Tanggal'),
      tableHeaderCell('Pelanggan'),
      tableHeaderCell('Volume (m³)', 'right'),
      tableHeaderCell('Pendapatan (Rp)', 'right')
    ]);
    row++;

    filteredData.sales.forEach((s, i) => {
      const isEven = i % 2 === 0;
      const vol = (s.items ?? []).reduce((acc, item) => acc + Number(item.volume || 0), 0);
      wsData.push([
        dataCell(s.date, isEven),
        dataCell(s.customer_name, isEven, 'left', false),
        dataCell(vol.toFixed(3), isEven, 'right'),
        dataCell(formatRp(roundPrice(s.total_revenue)), isEven, 'right')
      ]);
      row++;
    });

    if (filteredData.sales.length === 0) {
      wsData.push([
        dataCell('Tidak ada transaksi keluar di periode ini.', false),
        emptyStyledCell(),
        emptyStyledCell(),
        emptyStyledCell()
      ]);
      merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
      row++;
    }

    // Total row
    wsData.push([
      totalRowCell('TOTAL'),
      totalRowCell(`${filteredData.sales.length} Transaksi`, 'center'),
      totalRowCell(`${financialSummary.totalSalesVolume.toFixed(3)} m³`, 'right'),
      totalRowCell(formatRp(financialSummary.totalRevenue), 'right')
    ]);
    row++;

    // Spacer
    wsData.push([emptyStyledCell(), emptyStyledCell(), emptyStyledCell(), emptyStyledCell()]);
    row++;

    // ------- SECTION 4: RINCIAN PENGELUARAN OPERASIONAL -------
    wsData.push([sectionHeaderCell('4. RINCIAN PENGELUARAN OPERASIONAL'), darkNavyEmptyCell(), darkNavyEmptyCell(), darkNavyEmptyCell()]);
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;

    wsData.push([
      tableHeaderCell('Tanggal'),
      tableHeaderCell('Kategori'),
      tableHeaderCell('Keterangan'),
      tableHeaderCell('Jumlah (Rp)', 'right')
    ]);
    row++;

    filteredData.expenses.forEach((e, i) => {
      const isEven = i % 2 === 0;
      wsData.push([
        dataCell(e.date, isEven),
        dataCell(e.category, isEven),
        dataCell(e.description || '', isEven),
        dataCell(formatRp(roundPrice(e.amount)), isEven, 'right')
      ]);
      row++;
    });

    if (filteredData.expenses.length === 0) {
      wsData.push([
        dataCell('Belum ada pengeluaran di periode ini.', false),
        emptyStyledCell(),
        emptyStyledCell(),
        emptyStyledCell()
      ]);
      merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
      row++;
    }

    // Total row
    wsData.push([
      totalRowCell('TOTAL'),
      totalRowCell(''),
      totalRowCell(''),
      totalRowCell(formatRp(financialSummary.totalExpenses), 'right')
    ]);
    row++;

    // Spacer
    wsData.push([emptyStyledCell(), emptyStyledCell(), emptyStyledCell(), emptyStyledCell()]);
    row++;

    // Footer
    wsData.push([
      {
        v: `Laporan ini digenerate secara otomatis — Berkah Kajeng © ${new Date().getFullYear()}`, t: 's',
        s: {
          font: { italic: true, sz: 8, color: { rgb: '9E9E9E' }, name: 'Calibri' },
          fill: { fgColor: { rgb: WHITE } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      },
      emptyStyledCell(),
      emptyStyledCell(),
      emptyStyledCell()
    ]);
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;

    // ======== Create workbook ========
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Apply merges
    ws['!merges'] = merges;

    // Column widths
    ws['!cols'] = [
      { wch: 22 },  // Tanggal / Kategori
      { wch: 32 },  // Detail / Supplier / Pelanggan
      { wch: 22 },  // Nilai / Volume
      { wch: 22 },  // Total / Pendapatan
    ];

    // Row heights
    const rowHeights: any[] = [];
    for (let i = 0; i < row; i++) {
      if (i <= 2) {
        rowHeights.push({ hpt: i === 0 ? 32 : i === 1 ? 24 : 18 });
      } else {
        rowHeights.push({ hpt: 22 });
      }
    }
    ws['!rows'] = rowHeights;

    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');

    // Generate and download
    const dateStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    XLSX.writeFile(wb, `Laporan_BerkahKajeng_${periodLabel.replace(/\s/g, '_')}_${dateStr}.xlsx`);
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
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Analisis Laporan</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50 shadow-sm select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Filter Aktif: {formatPeriodDisplay(selectedDate, period)}
            </span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Pantau performa keuangan dan stok pangkalan kayu.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <div className="bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-sm w-full lg:w-auto">
            <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl overflow-x-auto no-scrollbar">
              {periodOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handlePeriodChange(opt.id)}
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
              <div className="relative flex items-center pl-6 min-w-[120px]">
                <Calendar size={14} className="absolute left-1 text-zinc-400 pointer-events-none" />
                
                {period === 'yearly' ? (
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
                      type={period === 'monthly' ? 'month' : 'date'}
                      value={period === 'monthly' ? selectedDate.slice(0, 7) : selectedDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (period === 'monthly') {
                          setSelectedDate(val ? `${val}-01` : selectedDate);
                        } else {
                          setSelectedDate(val || selectedDate);
                        }
                        if (period === 'all') setPeriod('daily');
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', minWidth: 0, minHeight: 0 }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={exportToExcel} className="p-2.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors" title="Export Excel">
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
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Pembelian</p>
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
          <div className="mt-3 space-y-1.5 border-t border-zinc-800 dark:border-zinc-200 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Pendapatan Kotor</span>
              <span className="text-[10px] text-emerald-400 dark:text-emerald-600 font-bold">{formatCurrency(financialSummary.totalRevenue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">− HPP (Modal Kayu)</span>
              <span className="text-[10px] text-orange-400 dark:text-orange-600 font-bold">{formatCurrency(financialSummary.totalCost)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">− Operasional</span>
              <span className="text-[10px] text-red-400 dark:text-red-600 font-bold">{formatCurrency(financialSummary.totalExpenses)}</span>
            </div>
            <div className="border-t border-dashed border-zinc-700 dark:border-zinc-300 pt-1.5 flex justify-between items-center">
              <span className="text-[10px] text-zinc-300 dark:text-zinc-600 font-bold">= Laba Bersih</span>
              <span className={cn("text-[10px] font-black", financialSummary.totalProfit >= 0 ? "text-emerald-400 dark:text-emerald-600" : "text-red-400 dark:text-red-600")}>{formatCurrency(financialSummary.totalProfit)}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-emerald-400 dark:text-emerald-600 text-[10px] font-black uppercase tracking-wider">
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
