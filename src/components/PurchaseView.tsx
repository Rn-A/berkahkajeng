import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Edit2,
  Minus,
  Plus as PlusIcon,
  Info
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
import { cn, roundPrice, generateUUID } from '../lib/utils';
import XLSX from 'xlsx-js-style';

interface PurchaseViewProps {
  activeSet: WoodSet | null;
  setActiveSet: (set: WoodSet | null) => void;
  history: WoodSet[];
  onSave: (setOverride?: WoodSet) => Promise<void>;
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
  currentUser?: { full_name: string; username: string } | null;
}

const calculateVolume = (diameterCm: number, lengthCm: number): number => {
  if (diameterCm < 10) return 0;
  const diameterM = diameterCm / 100;
  const lengthM = lengthCm / 100;
  const vol = 0.785 * Math.pow(diameterM, 2) * lengthM;
  
  // Custom Rounding: 3 decimal places
  // Rule: 4th decimal <= 5 rounds down, > 5 rounds up
  const factor = 1000;
  const temp = vol * factor;
  const floor = Math.floor(temp);
  const decimal = temp - floor;
  
  if (decimal <= 0.5) {
    return floor / factor;
  } else {
    return (floor + 1) / factor;
  }
};

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
  return res.trim();
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export const isValidConditionAndLength = (condition: WoodCondition, length: number): boolean => {
  if (condition === 'Kerab') return true;
  if (condition === 'X') {
    return length === 0 || length === 100 || length === 130;
  }
  if (condition === 'Rijelk' || condition === 'Super kecil') {
    return length === 100 || length === 130;
  }
  if (condition === 'C/Standar' || condition === 'Super') {
    return length === 100 || length === 130 || length === 200 || length === 260;
  }
  return false;
};

export const determineWoodCategory = (condition: WoodCondition, length: number, diameter: number): string | null => {
  if (condition === 'Kerab') return `Kerab`;

  if (diameter < 10 || condition === 'X') {
    if (condition === 'X' && diameter < 10 && (length === 100 || length === 130)) return `X`;
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
    if ((length === 130 || length === 100) && diameter >= 15 && diameter <= 19) {
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

export const getCategoryRuleInfo = (condition: WoodCondition): string => {
  switch (condition) {
    case 'X':
      return "• Panjang: 100 cm atau 130 cm\n• Diameter: < 10 cm";
    case 'Rijelk':
      return "• Panjang: 100 cm atau 130 cm\n• Diameter: 10 - 19 cm\n  (Rijelk 1: 10-14 cm, Rijelk 2: 15-19 cm)";
    case 'Super kecil':
      return "• Panjang: 100 cm atau 130 cm\n• Diameter: 15 - 19 cm";
    case 'C/Standar':
      return "• Panjang: 100, 130, 200, atau 260 cm\n• Diameter: >= 20 cm";
    case 'Super':
      return "• Panjang: 100, 130, 200, atau 260 cm\n• Diameter: >= 20 cm";
    case 'Kerab':
      return "• Ukuran panjang dan diameter bebas";
    default:
      return "• Ukuran tidak sesuai dengan ketentuan kategori ini";
  }
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
  userRole = 'mandor',
  currentUser
}: PurchaseViewProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [editingLogDiameter, setEditingLogDiameter] = useState<number | null>(null);
  const [tempLogCount, setTempLogCount] = useState<string>('');

  // Auto Sketch Session States
  const [sessionWoodType, setSessionWoodType] = useState('Jati');
  const [sessionLength, setSessionLength] = useState<number>(200);
  const [sessionCondition, setSessionCondition] = useState<WoodCondition>('Super');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Reset selection & sync session states whenever the active set changes
  useEffect(() => {
    if (activeSet) {
      if (activeSet.categories.length > 0) {
        const firstCat = activeSet.categories[0];
        setSelectedCategoryId(firstCat.id);
        setSessionWoodType(firstCat.woodType);
        setSessionLength(firstCat.length);
        setSessionCondition(firstCat.condition);
      } else {
        setSelectedCategoryId(null);
        // Keep current sessionWoodType — don't force 'Jati'
      }
    } else {
      setSelectedCategoryId(null);
    }
  }, [activeSet?.id]);

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
    const rawTotals = set.categories.reduce((acc, cat) => {
      const catVolume = cat.logs.reduce((sum, log) => {
        const isX = cat.condition === 'X' || log.diameter < 10;
        return sum + (isX ? 0 : calculateVolume(log.diameter, cat.length || 200));
      }, 0);
      const catPrice = cat.logs.reduce((sum, log) => {
        const isX = cat.condition === 'X' || log.diameter < 10;
        if (isX) return sum + 1000;
        return sum + (calculateVolume(log.diameter, cat.length || 200) * cat.pricePerM3);
      }, 0);
      return { volume: acc.volume + catVolume, price: acc.price + catPrice };
    }, { volume: 0, price: 0 });

    return { ...rawTotals, price: roundPrice(rawTotals.price) };
  };

  const exportToExcel = () => {
    if (filteredHistory.length === 0) return;

    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // ======== Color Palette (matching the reports / mockup) ========
    const NAVY = '1B2A4A';
    const DARK_NAVY = '0F1D33';
    const GOLD = 'C8A951';
    const WHITE = 'FFFFFF';
    const LIGHT_GRAY = 'F2F4F8';
    const MID_GRAY = 'E8ECF1';
    const DARK_TEXT = '1B2A4A';
    const BLUE_ACCENT = '1E88E5';
    const GREEN_ACCENT = '2E7D32';
    const TEAL_ACCENT = '00695C';

    const thinBorder = {
      top: { style: 'thin', color: { rgb: MID_GRAY } },
      bottom: { style: 'thin', color: { rgb: MID_GRAY } },
      left: { style: 'thin', color: { rgb: MID_GRAY } },
      right: { style: 'thin', color: { rgb: MID_GRAY } }
    } as any;

    // Supplier Color Palettes
    const supplierPalettes = [
      { // Blue (Alip)
        lightBg: 'E8F0FE',
        darkText: '1A73E8',
        solidBg: '1A73E8',
      },
      { // Orange (budi)
        lightBg: 'FFEFE2',
        darkText: 'E65100',
        solidBg: 'E65100',
      },
      { // Green (Keri)
        lightBg: 'E8F5E9',
        darkText: '2E7D32',
        solidBg: '2E7D32',
      },
      { // Purple (Mesno)
        lightBg: 'F3E5F5',
        darkText: '7B1FA2',
        solidBg: '7B1FA2',
      },
      { // Teal
        lightBg: 'E0F2F1',
        darkText: '00796B',
        solidBg: '00796B',
      },
      { // Red
        lightBg: 'FFEBEE',
        darkText: 'C62828',
        solidBg: 'C62828',
      }
    ];

    // Cell factory helpers
    const titleCell = (v: string) => ({
      v, t: 's',
      s: {
        font: { bold: true, sz: 14, color: { rgb: WHITE }, name: 'Calibri' },
        fill: { fgColor: { rgb: NAVY } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    });

    const subtitleCell = (v: string) => ({
      v, t: 's',
      s: {
        font: { bold: true, sz: 11, color: { rgb: GOLD }, name: 'Calibri' },
        fill: { fgColor: { rgb: NAVY } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    });

    const dateSubtitleCell = (v: string) => ({
      v, t: 's',
      s: {
        font: { italic: true, sz: 9, color: { rgb: 'B0BEC5' }, name: 'Calibri' },
        fill: { fgColor: { rgb: NAVY } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    });

    const sectionHeaderCell = (v: string) => ({
      v, t: 's',
      s: {
        font: { bold: true, sz: 11, color: { rgb: WHITE }, name: 'Calibri' },
        fill: { fgColor: { rgb: NAVY } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    });

    const cardTitleCell = (v: string, bgColor: string) => ({
      v, t: 's',
      s: {
        font: { bold: true, sz: 9, color: { rgb: WHITE }, name: 'Calibri' },
        fill: { fgColor: { rgb: bgColor } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    });

    const cardValueCell = (v: string, bgColor: string) => ({
      v, t: 's',
      s: {
        font: { bold: true, sz: 14, color: { rgb: WHITE }, name: 'Calibri' },
        fill: { fgColor: { rgb: bgColor } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    });

    const tableHeaderCell = (v: string, align: string = 'center') => ({
      v, t: 's',
      s: {
        font: { bold: true, sz: 10, color: { rgb: WHITE }, name: 'Calibri' },
        fill: { fgColor: { rgb: BLUE_ACCENT } },
        alignment: { horizontal: align, vertical: 'center', wrapText: true },
        border: thinBorder
      }
    });

    const dataCell = (v: string, isEven: boolean = false, align: string = 'left', bold: boolean = false, fontColor: string = DARK_TEXT, customBg: string = '') => ({
      v, t: 's',
      s: {
        font: { sz: 10, color: { rgb: fontColor }, name: 'Calibri', bold },
        fill: { fgColor: { rgb: customBg ? customBg : (isEven ? LIGHT_GRAY : WHITE) } },
        alignment: { horizontal: align, vertical: 'center' },
        border: thinBorder
      }
    });

    const totalRowCell = (v: string, align: string = 'left') => ({
      v, t: 's',
      s: {
        font: { bold: true, sz: 10, color: { rgb: WHITE }, name: 'Calibri' },
        fill: { fgColor: { rgb: DARK_NAVY } },
        alignment: { horizontal: align, vertical: 'center' },
        border: thinBorder
      }
    });

    const emptyCell = () => ({
      v: '', t: 's',
      s: { fill: { fgColor: { rgb: WHITE } } }
    });

    // -------- Calculations --------
    const totalTransactions = filteredHistory.length;
    let totalVolume = 0;
    let totalPrice = 0;
    const uniqueSuppliers = new Set<string>();

    filteredHistory.forEach(set => {
      const totals = calculateSetTotals(set);
      totalVolume += Number(totals.volume || 0);
      totalPrice += Number(totals.price || 0);
      if (set.supplierName) {
        uniqueSuppliers.add(set.supplierName);
      }
    });

    const supplierCount = uniqueSuppliers.size;

    // Supplier Colors Map
    const supplierColorsMap: Record<string, typeof supplierPalettes[0]> = {};
    Array.from(uniqueSuppliers).forEach((name, idx) => {
      supplierColorsMap[name] = supplierPalettes[idx % supplierPalettes.length];
    });

    // Supplier Recap Map
    const supplierRecapMap: Record<string, { count: number, volume: number, price: number }> = {};
    filteredHistory.forEach(set => {
      const name = set.supplierName || 'Umum';
      const totals = calculateSetTotals(set);
      if (!supplierRecapMap[name]) {
        supplierRecapMap[name] = { count: 0, volume: 0, price: 0 };
      }
      supplierRecapMap[name].count += 1;
      supplierRecapMap[name].volume += Number(totals.volume || 0);
      supplierRecapMap[name].price += Number(totals.price || 0);
    });

    const supplierRecap = Object.entries(supplierRecapMap).map(([name, stats]) => {
      const percent = totalPrice > 0 ? (stats.price / totalPrice) * 100 : 0;
      return {
        name,
        count: stats.count,
        volume: stats.volume,
        price: stats.price,
        percent
      };
    }).sort((a, b) => b.price - a.price);

    // -------- Build Workbook Data Array --------
    const wsData: any[] = [];
    const merges: any[] = [];
    let row = 0;

    const padRow = (arr: any[]) => {
      while (arr.length < 6) arr.push(emptyCell());
      return arr;
    };

    // 1. Header block
    wsData.push(padRow([titleCell('🪵 LAPORAN RIWAYAT PEMBELIAN')]));
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 5 } });
    row++;

    wsData.push(padRow([subtitleCell('BERKAH KAJENG')]));
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 5 } });
    row++;

    wsData.push(padRow([dateSubtitleCell(`Tanggal Ekspor: ${todayStr}  |  Total Transaksi: ${totalTransactions}`)]));
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 5 } });
    row++;

    // Spacer
    wsData.push(padRow([]));
    row++;

    // 2. Ringkasan Pembelian
    wsData.push(padRow([sectionHeaderCell('📊 RINGKASAN PEMBELIAN')]));
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 5 } });
    row++;

    // Cards headers
    wsData.push(padRow([
      cardTitleCell('Total Volume Beli', BLUE_ACCENT), emptyCell(),
      cardTitleCell('Total Nilai Beli', GREEN_ACCENT), emptyCell(),
      cardTitleCell('Jumlah Transaksi', TEAL_ACCENT),
      cardTitleCell('Jumlah Supplier', DARK_NAVY)
    ]));
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 1 } });
    merges.push({ s: { r: row, c: 2 }, e: { r: row, c: 3 } });
    row++;

    // Cards values
    wsData.push(padRow([
      cardValueCell(`${totalVolume.toFixed(3)} m³`, BLUE_ACCENT), emptyCell(),
      cardValueCell(formatCurrency(totalPrice), GREEN_ACCENT), emptyCell(),
      cardValueCell(`${totalTransactions} Transaksi`, TEAL_ACCENT),
      cardValueCell(`${supplierCount} Supplier`, DARK_NAVY)
    ]));
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 1 } });
    merges.push({ s: { r: row, c: 2 }, e: { r: row, c: 3 } });
    row++;

    // Spacer
    wsData.push(padRow([]));
    row++;

    // 3. Rekap per Supplier
    wsData.push(padRow([sectionHeaderCell('📊 REKAP PER SUPPLIER')]));
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 5 } });
    row++;

    // Rekap Headers
    wsData.push(padRow([
      tableHeaderCell('Supplier', 'left'), emptyCell(),
      tableHeaderCell('Jumlah Transaksi'),
      tableHeaderCell('Total Volume', 'right'),
      tableHeaderCell('Total Nilai', 'right'),
      tableHeaderCell('% Nilai', 'right')
    ]));
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 1 } });
    row++;

    // Rekap Data Rows
    supplierRecap.forEach((sup, idx) => {
      const isEven = idx % 2 === 1;
      const palette = supplierColorsMap[sup.name] || supplierPalettes[0];

      wsData.push(padRow([
        dataCell(sup.name, isEven, 'left', true, palette.darkText, palette.lightBg), emptyCell(),
        dataCell(`${sup.count}x`, isEven, 'center', false, DARK_TEXT, palette.lightBg),
        dataCell(`${sup.volume.toFixed(3)} m³`, isEven, 'right', false, DARK_TEXT, palette.lightBg),
        dataCell(formatCurrency(sup.price), isEven, 'right', true, palette.darkText, palette.lightBg),
        {
          v: `${sup.percent.toFixed(1)}%`,
          t: 's',
          s: {
            font: { bold: true, sz: 10, color: { rgb: WHITE }, name: 'Calibri' },
            fill: { fgColor: { rgb: palette.solidBg } },
            alignment: { horizontal: 'right', vertical: 'center' },
            border: thinBorder
          }
        }
      ]));
      merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 1 } });
      row++;
    });

    // Spacer
    wsData.push(padRow([]));
    row++;

    // 4. Detail Transaksi
    wsData.push(padRow([sectionHeaderCell('📑 DETAIL TRANSAKSI PEMBELIAN')]));
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 5 } });
    row++;

    // Keterangan Warna Supplier
    const captionText = `Keterangan Warna Supplier: ` + Array.from(uniqueSuppliers).join('   ');
    const captionCell = {
      v: captionText,
      t: 's',
      s: {
        font: { italic: true, sz: 9, color: { rgb: '757575' }, name: 'Calibri' },
        alignment: { horizontal: 'left', vertical: 'center' }
      }
    };
    wsData.push(padRow([captionCell]));
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 5 } });
    row++;

    // Table Headers
    wsData.push(padRow([
      tableHeaderCell('No'),
      tableHeaderCell('ID Pembelian'),
      tableHeaderCell('Tanggal'),
      tableHeaderCell('Supplier'),
      tableHeaderCell('Volume (m³)', 'right'),
      tableHeaderCell('Total Harga', 'right')
    ]));
    row++;

    // Table Data
    filteredHistory.forEach((set, idx) => {
      const isEven = idx % 2 === 1;
      const totals = calculateSetTotals(set);
      const palette = supplierColorsMap[set.supplierName || 'Umum'] || supplierPalettes[0];

      wsData.push(padRow([
        dataCell(String(idx + 1), isEven, 'center'),
        { v: set.id, t: 's', s: { font: { sz: 8, italic: true, color: { rgb: '757575' }, name: 'Calibri' }, fill: { fgColor: { rgb: isEven ? LIGHT_GRAY : WHITE } }, border: thinBorder } },
        dataCell(set.date, isEven, 'center'),
        {
          v: set.supplierName || 'Umum',
          t: 's',
          s: {
            font: { bold: true, sz: 10, color: { rgb: WHITE }, name: 'Calibri' },
            fill: { fgColor: { rgb: palette.solidBg } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: thinBorder
          }
        },
        dataCell(totals.volume.toFixed(4), isEven, 'right'),
        dataCell(formatCurrency(totals.price), isEven, 'right', true, palette.darkText)
      ]));
      row++;
    });

    // Total Row
    wsData.push(padRow([
      totalRowCell('TOTAL', 'left'),
      totalRowCell('', 'center'),
      totalRowCell('', 'center'),
      totalRowCell(`${totalTransactions} Transaksi`, 'center'),
      totalRowCell(`${totalVolume.toFixed(3)} m³`, 'right'),
      totalRowCell(formatCurrency(totalPrice), 'right')
    ]));
    row++;

    // Spacer
    wsData.push(padRow([]));
    row++;

    // Footer
    const footerTextCell = {
      v: `Laporan ini digenerate secara otomatis — Berkah Kajeng © ${new Date().getFullYear()}`,
      t: 's',
      s: {
        font: { italic: true, sz: 8, color: { rgb: '9E9E9E' }, name: 'Calibri' },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    };
    wsData.push(padRow([footerTextCell]));
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 5 } });
    row++;

    // ======== Create workbook ========
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 6 },   // No
      { wch: 38 },  // ID Pembelian
      { wch: 15 },  // Tanggal
      { wch: 18 },  // Supplier
      { wch: 18 },  // Volume (m3)
      { wch: 20 }   // Total Harga
    ];

    // Row heights
    const rowHeights: any[] = [];
    for (let i = 0; i < row; i++) {
      if (i <= 2) {
        rowHeights.push({ hpt: i === 0 ? 32 : i === 1 ? 24 : 18 });
      } else if (i === 5 || i === 6) {
        rowHeights.push({ hpt: i === 5 ? 18 : 28 }); // card deck sizes
      } else {
        rowHeights.push({ hpt: 20 });
      }
    }
    ws['!rows'] = rowHeights;

    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Pembelian');

    const dateFileStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();

    XLSX.writeFile(wb, `Riwayat_Pembelian_BerkahKajeng_${dateFileStr}.xlsx`);
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

    if (!isValidConditionAndLength(sessionCondition, sessionLength)) {
      const ruleInfo = getCategoryRuleInfo(sessionCondition);
      setErrorMessage(`Kondisi Sket: ${sessionCondition}\nPanjang Sket: ${sessionLength} cm\n\nSetup Sket Anda saat ini tidak valid.\n\nKetentuan untuk Kondisi ${sessionCondition}:\n${ruleInfo}`);
      return;
    }

    if (diameter < 10) {
      const X_NAME = 'X';
      let targetCat = undefined;

      if (selectedCategoryId) {
        const selectedCat = activeSet.categories.find(c => c.id === selectedCategoryId);
        if (selectedCat && selectedCat.woodType === sessionWoodType && selectedCat.condition === 'X') {
          targetCat = selectedCat;
        }
      }

      if (!targetCat) {
        targetCat = activeSet.categories.find(c =>
          c.woodType === sessionWoodType && c.condition === 'X'
        );
      }

      let newCategories = [...activeSet.categories];
      if (!targetCat) {
        targetCat = {
          id: generateUUID(),
          name: X_NAME,
          woodType: sessionWoodType,
          length: 0,
          condition: 'X',
          pricePerM3: 0,
          logs: []
        };
        newCategories.push(targetCat);
      }
      const newLog: LogEntry = { id: generateUUID(), diameter, volume: 0 };
      newCategories = newCategories.map(cat =>
        cat.id === targetCat!.id ? { ...cat, logs: [...cat.logs, newLog] } : cat
      );
      setActiveSet({ ...activeSet, categories: newCategories });
      setSelectedCategoryId(targetCat.id);
      return;
    }

    const inferredName = determineWoodCategory(sessionCondition, sessionLength, diameter);

    if (!inferredName) {
      const ruleInfo = getCategoryRuleInfo(sessionCondition);
      setErrorMessage(`Kondisi: ${sessionCondition}\nPanjang: ${sessionLength} cm\nDiameter: ${diameter} cm\n\nData ini tidak memenuhi pedoman klasifikasi kategori.\n\nAturan/Rekomendasi Input untuk Kondisi ${sessionCondition}:\n${ruleInfo}`);
      return;
    }

    let targetCat = undefined;

    // Prioritaskan kategori yang sedang dipilih jika cocok kriterianya
    if (selectedCategoryId) {
      const selectedCat = activeSet.categories.find(c => c.id === selectedCategoryId);
      if (selectedCat && 
          selectedCat.woodType === sessionWoodType && 
          selectedCat.length === sessionLength && 
          selectedCat.condition === sessionCondition &&
          selectedCat.name === inferredName) {
        targetCat = selectedCat;
      }
    }

    // Jika tidak ada yang dipilih atau tidak cocok, cari yang pertama cocok
    if (!targetCat) {
      targetCat = activeSet.categories.find(c =>
        c.woodType === sessionWoodType &&
        c.length === sessionLength &&
        c.condition === sessionCondition &&
        c.name === inferredName
      );
    }

    let newCategories = [...activeSet.categories];

    if (!targetCat) {
      targetCat = {
        id: generateUUID(),
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
      id: generateUUID(),
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

  const removeLogByDiameter = (categoryId: string, diameter: number) => {
    if (!activeSet) return;
    const catIndex = activeSet.categories.findIndex(c => c.id === categoryId);
    if (catIndex === -1) return;

    const cat = activeSet.categories[catIndex];
    const logIndex = cat.logs.findIndex(l => l.diameter === diameter);
    if (logIndex === -1) return;

    const newLogs = [...cat.logs];
    newLogs.splice(logIndex, 1);

    const newCategories = [...activeSet.categories];
    newCategories[catIndex] = { ...cat, logs: newLogs };

    setActiveSet({ ...activeSet, categories: newCategories });
  };

  const addLogByDiameter = (categoryId: string, diameter: number) => {
    if (!activeSet) return;
    const catIndex = activeSet.categories.findIndex(c => c.id === categoryId);
    if (catIndex === -1) return;

    const cat = activeSet.categories[catIndex];
    const log: LogEntry = {
      id: generateUUID(),
      diameter,
      volume: calculateVolume(diameter, cat.length || 200)
    };

    const newCategories = [...activeSet.categories];
    newCategories[catIndex] = {
      ...cat,
      logs: [log, ...cat.logs]
    };

    setActiveSet({ ...activeSet, categories: newCategories });
  };

  const setLogCountByDiameter = (categoryId: string, diameter: number, count: number) => {
    if (!activeSet) return;
    const catIndex = activeSet.categories.findIndex(c => c.id === categoryId);
    if (catIndex === -1) return;

    const cat = activeSet.categories[catIndex];
    const otherLogs = cat.logs.filter(l => l.diameter !== diameter);
    
    const newCountLogs: LogEntry[] = Array.from({ length: Math.max(0, count) }, () => ({
      id: generateUUID(),
      diameter,
      volume: calculateVolume(diameter, cat.length || 200)
    }));

    const newCategories = [...activeSet.categories];
    newCategories[catIndex] = {
      ...cat,
      logs: [...otherLogs, ...newCountLogs]
    };

    setActiveSet({ ...activeSet, categories: newCategories });
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
      return sum + (isX ? 0 : calculateVolume(l.diameter, cat.length || 200));
    }, 0);
    const price = cat.logs.reduce((sum, log) => {
      const isX = cat.condition === 'X' || log.diameter < 10;
      if (isX) return sum + 1000;
      return sum + (calculateVolume(log.diameter, cat.length || 200) * cat.pricePerM3);
    }, 0);
    return { volume, price };
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-full relative">
      {/* Custom Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className={cn(
              "fixed top-4 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border font-bold text-sm",
              toast.type === 'success' 
                ? "bg-zinc-900 text-white border-white/10 dark:bg-white dark:text-zinc-900" 
                : "bg-red-500 text-white border-red-400"
            )}
          >
            {toast.type === 'success' ? <PlusCircle size={20} /> : <AlertTriangle size={20} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Type Management Modal */}
      {showTypeManager && createPortal(
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
        </div>,
        document.body
      )}

      {createPortal(
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
                          await onSaveSupplier({ ...supplierFormData, id: supplierFormData.id || generateUUID() });
                          setSupplierFormData({ id: '', name: '', phone: '', address: '' });
                          showToast('Penyetor berhasil disimpan!');
                        } catch (error) {
                          showToast('Gagal menyimpan penyetor.', 'error');
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
                        <button onClick={() => onDeleteSupplier(s.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {(activeSet?.categories || [])
              .slice()
              .sort((a, b) => {
                const minA = a.logs.length > 0 ? Math.min(...a.logs.map(l => l.diameter)) : 0;
                const minB = b.logs.length > 0 ? Math.min(...b.logs.map(l => l.diameter)) : 0;
                return minA - minB;
              })
              .map((cat) => (
                <div key={cat.id} className="group relative">
                  <button
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      // Sync session states with the selected category
                      setSessionWoodType(cat.woodType);
                      setSessionLength(cat.length);
                      setSessionCondition(cat.condition);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all pr-10 ${selectedCategoryId === cat.id
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg shadow-zinc-200 dark:shadow-none'
                      : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700'
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
                      {cat.logs.reduce((sum, l) => sum + calculateVolume(l.diameter, cat.length || 200), 0).toFixed(4)} m³
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

        {/* Info Aturan Kategori */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <button
            onClick={() => setShowRulesModal(true)}
            className="w-full flex items-center justify-center gap-2 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all active:scale-95 shadow-sm"
          >
            <Info size={14} className="text-zinc-500" />
            Petunjuk Ketentuan Kategori
          </button>
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
                      onChange={(e) => {
                        setSessionWoodType(e.target.value);
                      }}
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
                      onClick={() => {
                        setSessionLength(len);
                      }}
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
                      onChange={(e) => {
                        const len = Math.max(0, parseFloat(e.target.value) || 0);
                        setSessionLength(len);
                      }}
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
                      onClick={() => {
                        setSessionCondition(grade);
                      }}
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
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {(() => {
                    const grouped = activeCategory.logs.reduce((acc, log) => {
                      acc[log.diameter] = (acc[log.diameter] || 0) + 1;
                      return acc;
                    }, {} as Record<number, number>);

                    return Object.entries(grouped)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([diameter, count]) => {
                        const diamNum = Number(diameter);
                        const volPerBatang = calculateVolume(diamNum, activeCategory.length);
                        return (
                          <div key={diameter} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all hover:border-zinc-200 dark:hover:border-zinc-700">
                            <div className="flex flex-col">
                              <span className="font-black text-sm dark:text-white">Ø {diameter} cm</span>
                              <span className="text-[10px] font-mono text-zinc-400">{(volPerBatang * count).toFixed(4)} m³</span>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => removeLogByDiameter(activeCategory.id, diamNum)}
                                className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-90"
                              >
                                <Minus size={14} />
                              </button>
                              
                                <input
                                  type="number"
                                  min="0"
                                  className="w-12 bg-transparent text-center font-bold text-sm dark:text-white border-b border-zinc-300 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                                  value={editingLogDiameter === diamNum ? tempLogCount : count}
                                  onFocus={() => {
                                    setEditingLogDiameter(diamNum);
                                    setTempLogCount(count.toString());
                                  }}
                                  onChange={(e) => {
                                    setTempLogCount(e.target.value);
                                  }}
                                  onBlur={() => {
                                    const val = parseInt(tempLogCount);
                                    if (!isNaN(val) && val >= 0) {
                                      setLogCountByDiameter(activeCategory.id, diamNum, val);
                                    } else if (tempLogCount === '' || isNaN(val)) {
                                      setLogCountByDiameter(activeCategory.id, diamNum, 0);
                                    }
                                    setEditingLogDiameter(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                />
                              
                              <button 
                                onClick={() => addLogByDiameter(activeCategory.id, diamNum)}
                                className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-90"
                              >
                                <PlusIcon size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      });
                  })()}
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
              onClick={() => {
                if (activeSet) {
                  // Sanitize volumes before saving to ensure old unrounded data is fixed
                  const sanitizedCategories = activeSet.categories.map(cat => ({
                    ...cat,
                    logs: cat.logs.map(log => ({
                      ...log,
                      volume: calculateVolume(log.diameter, cat.length || 200)
                    }))
                  }));
                  const sanitizedSet = { ...activeSet, categories: sanitizedCategories };
                  setActiveSet(sanitizedSet);
                  // Pass directly to ensure closure has the updated state
                  onSave(sanitizedSet);
                } else {
                  onSave();
                }
              }}
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
                    {(activeSet?.categories || [])
                      .slice()
                      .sort((a, b) => {
                        const minA = a.logs.length > 0 ? Math.min(...a.logs.map(l => l.diameter)) : 0;
                        const minB = b.logs.length > 0 ? Math.min(...b.logs.map(l => l.diameter)) : 0;
                        return minA - minB;
                      })
                      .map(cat => {
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
                    <div className="border-t border-zinc-400 pt-1 mx-4">( {activeSet?.supplierName || '....................'} )</div>
                  </div>
                  <div className="space-y-12">
                  </div>
                  <div className="space-y-12">
                    <p>Kasir</p>
                    <div className="border-t border-zinc-400 pt-1 mx-4">( {currentUser?.full_name || '....................'} )</div>
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
      {createPortal(
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
        </AnimatePresence>,
        document.body
      )}

      {/* History Modal */}
      {createPortal(
        <AnimatePresence>
          {showHistory && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistory(false)} className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-zinc-200 dark:border-zinc-800">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold dark:text-white">Riwayat Set Kayu</h2>
                    <button
                      onClick={exportToExcel}
                      className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <Download size={14} />
                      Export Excel
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
                          <button 
                            onClick={() => { 
                              setActiveSet(set); 
                              setShowHistory(false);
                              if (set.categories.length > 0) {
                                const firstCat = set.categories[0];
                                setSelectedCategoryId(firstCat.id);
                                // Sync session states when opening from history
                                setSessionWoodType(firstCat.woodType);
                                setSessionLength(firstCat.length);
                                setSessionCondition(firstCat.condition);
                              }
                            }} 
                            className="btn-secondary text-xs py-2 px-4"
                          >
                            Buka Kembali
                          </button>
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
        </AnimatePresence>,
        document.body
      )}

      {/* Rules Modal */}
      {showRulesModal && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6">
          <div onClick={() => setShowRulesModal(false)} className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-900 text-white">
              <div className="flex items-center gap-3">
                <Info size={22} className="text-emerald-400" />
                <h2 className="text-base md:text-lg font-bold">Panduan Ketentuan Kategori Kayu</h2>
              </div>
              <button onClick={() => setShowRulesModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} className="text-white" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 dark:bg-zinc-950">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Berikut adalah tabel pedoman ketentuan diameter, panjang, dan kondisi untuk pengelompokan kategori kayu secara otomatis di sistem Berkah Kajeng:
              </p>
              
              <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-800">
                      <th className="p-3">Kondisi / Grade</th>
                      <th className="p-3">Ketentuan Panjang</th>
                      <th className="p-3">Ketentuan Diameter</th>
                      <th className="p-3">Nama Kategori Terbentuk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                      <td className="p-3 font-bold text-zinc-900 dark:text-white">X</td>
                      <td className="p-3">100 cm atau 130 cm</td>
                      <td className="p-3">&lt; 10 cm</td>
                      <td className="p-3">X</td>
                    </tr>
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                      <td className="p-3 font-bold text-zinc-900 dark:text-white" rowSpan={2}>Rijelk</td>
                      <td className="p-3" rowSpan={2}>100 cm atau 130 cm</td>
                      <td className="p-3">10 - 14 cm</td>
                      <td className="p-3">Rijelk 1</td>
                    </tr>
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                      <td className="p-3">15 - 19 cm</td>
                      <td className="p-3">Rijelk 2</td>
                    </tr>
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                      <td className="p-3 font-bold text-zinc-900 dark:text-white">Super kecil</td>
                      <td className="p-3">100 cm atau 130 cm</td>
                      <td className="p-3">15 - 19 cm</td>
                      <td className="p-3">Super kecil</td>
                    </tr>
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                      <td className="p-3 font-bold text-zinc-900 dark:text-white">C/Standar</td>
                      <td className="p-3">100, 130, 200, atau 260 cm</td>
                      <td className="p-3">&gt;= 20 cm</td>
                      <td className="p-3">C/Standar [Panjang]</td>
                    </tr>
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                      <td className="p-3 font-bold text-zinc-900 dark:text-white" rowSpan={4}>Super</td>
                      <td className="p-3">100 cm atau 130 cm</td>
                      <td className="p-3">
                        • 20 - 24 cm<br />
                        • &gt;= 25 cm (25up)
                      </td>
                      <td className="p-3">
                        • Super [Panjang] (20-24)<br />
                        • Super [Panjang] (25up)
                      </td>
                    </tr>
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                      <td className="p-3" rowSpan={2}>200 cm atau 260 cm</td>
                      <td className="p-3" rowSpan={2}>
                        • 20 - 24 cm<br />
                        • 25 - 29 cm<br />
                        • 30 - 39 cm<br />
                        • 40 - 49 cm<br />
                        • &gt;= 50 cm (50up)
                      </td>
                      <td className="p-3" rowSpan={2}>
                        • Super [Panjang] (20-24)<br />
                        • Super [Panjang] (25-29)<br />
                        • Super [Panjang] (30-39)<br />
                        • Super [Panjang] (40-49)<br />
                        • Super [Panjang] (50up)
                      </td>
                    </tr>
                    <tr></tr>
                    <tr></tr>
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                      <td className="p-3 font-bold text-zinc-900 dark:text-white">Kerab</td>
                      <td className="p-3">Bebas (Semua ukuran)</td>
                      <td className="p-3">Bebas (Semua ukuran)</td>
                      <td className="p-3">Kerab</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4 text-amber-800 dark:text-amber-300 text-xs space-y-1.5">
                <span className="font-bold block">💡 Petunjuk Input:</span>
                <p>
                  Sistem secara otomatis mengelompokkan diameter kayu gelondongan yang Anda input ke dalam kategori yang tepat sesuai ketentuan di atas. Jika Anda menginput data yang tidak sesuai dengan kombinasi ketentuan panjang & diameter di atas, sistem akan menampilkan pesan peringatan dan menolak input tersebut untuk menjaga kebersihan data.
                </p>
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-end">
              <button onClick={() => setShowRulesModal(false)} className="bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-bold px-6 py-2.5 rounded-xl transition-all">
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
