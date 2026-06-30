import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Custom Rounding: Round to 1000. 
 * Rule: <= 500 rounds DOWN, > 500 rounds UP.
 */
export function roundPrice(price: number): number {
  const remainder = price % 1000;
  if (remainder <= 500) {
    return Math.floor(price / 1000) * 1000;
  } else {
    return Math.ceil(price / 1000) * 1000;
  }
}

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    
    // Set version 4 (0100) and variant (10xx)
    array[6] = (array[6] & 0x0f) | 0x40;
    array[8] = (array[8] & 0x3f) | 0x80;
    
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }
  
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function formatPeriodDisplay(
  dateStr: string,
  period: 'all' | 'hari' | 'minggu' | 'bulan' | 'tahun' | 'daily' | 'weekly' | 'monthly' | 'yearly'
): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const monthsShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  if (period === 'hari' || period === 'daily') {
    return `${d.getDate()} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;
  }

  if (period === 'minggu' || period === 'weekly') {
    const start = new Date(d);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const startDay = start.getDate();
    const startMonth = monthsShort[start.getMonth()];
    const startYear = start.getFullYear();

    const endDay = end.getDate();
    const endMonth = monthsShort[end.getMonth()];
    const endYear = end.getFullYear();

    if (startYear !== endYear) {
      return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
    }
    if (startMonth !== endMonth) {
      return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`;
    }
    return `${startDay} - ${endDay} ${startMonth} ${startYear}`;
  }

  if (period === 'bulan' || period === 'monthly') {
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  if (period === 'tahun' || period === 'yearly') {
    return `${d.getFullYear()}`;
  }

  return 'Semua Waktu';
}


