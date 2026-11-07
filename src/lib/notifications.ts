import {
  WoodSet,
  Sale,
  InventoryItem,
  Employee,
  Attendance,
  DebtPayment,
} from "../types";
import { OfflineQueueItem } from "./offline";

export type NotificationCategory =
  | "debt_due"
  | "new_transaction"
  | "attendance_reminder"
  | "payroll_reminder"
  | "low_stock"
  | "offline_sync";

export type NotificationSeverity = "critical" | "warning" | "info" | "success";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  targetView:
    | "dashboard"
    | "purchase"
    | "inventory"
    | "sales"
    | "debts"
    | "payroll"
    | "expenses"
    | "reports";
  timestamp: string;
  badgeText?: string;
}

const READ_NOTIF_KEY = "logyard_read_notifications_v1";
const OS_SENT_NOTIF_KEY = "logyard_os_sent_notifications_v1";

export function loadReadNotificationIds(): string[] {
  try {
    const raw = localStorage.getItem(READ_NOTIF_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function markNotificationsAsRead(ids: string[]): string[] {
  try {
    const current = new Set(loadReadNotificationIds());
    ids.forEach((id) => current.add(id));
    const arr = Array.from(current).slice(-200);
    localStorage.setItem(READ_NOTIF_KEY, JSON.stringify(arr));
    return arr;
  } catch {
    return [];
  }
}

function hasSentOsNotificationToday(id: string): boolean {
  try {
    const today = new Date().toISOString().split("T")[0];
    const raw = localStorage.getItem(OS_SENT_NOTIF_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    return map[id] === today;
  } catch {
    return false;
  }
}

function recordSentOsNotificationToday(id: string): void {
  try {
    const today = new Date().toISOString().split("T")[0];
    const raw = localStorage.getItem(OS_SENT_NOTIF_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    // Keep only today's entries to prevent bloat
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(map)) {
      if (v === today) cleaned[k] = v;
    }
    cleaned[id] = today;
    localStorage.setItem(OS_SENT_NOTIF_KEY, JSON.stringify(cleaned));
  } catch {
    // ignore storage errors
  }
}

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (err) {
    console.warn("Service worker registration skipped:", err);
    return null;
  }
}

export function getDeviceNotificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestDeviceNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await registerNotificationServiceWorker();
    }
    return permission;
  } catch (err) {
    console.warn("Failed requesting notification permission:", err);
    return Notification.permission;
  }
}

export async function sendSystemNotification(
  title: string,
  body: string,
  tag?: string,
  targetView: string = "dashboard",
): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission !== "granted") {
    return false;
  }

  try {
    if ("serviceWorker" in navigator) {
      const reg =
        (await navigator.serviceWorker.getRegistration()) ||
        (await registerNotificationServiceWorker());
      if (reg) {
        if (reg.active) {
          reg.active.postMessage({
            type: "SHOW_NOTIFICATION",
            payload: { title, body, tag, targetView },
          });
          return true;
        }
        await reg.showNotification(title, {
          body,
          icon: "/logo.png",
          badge: "/logo.png",
          tag: tag || `bk-${Date.now()}`,
          data: { targetView },
        });
        return true;
      }
    }

    // Fallback to standard browser Notification constructor
    new Notification(title, {
      body,
      icon: "/logo.png",
      tag: tag || `bk-${Date.now()}`,
    });
    return true;
  } catch (err) {
    console.warn("System notification error:", err);
    return false;
  }
}

/**
 * Generates the 6 operational & accounting smart notifications tailored to the user's role.
 */
export function generateSmartNotifications(params: {
  role: "owner" | "mandor";
  purchases: WoodSet[];
  sales: Sale[];
  inventory: InventoryItem[];
  employees: Employee[];
  attendance: Attendance[];
  debtPayments: DebtPayment[];
  offlineQueue: OfflineQueueItem[];
  activeSet: WoodSet | null;
}): AppNotification[] {
  const {
    role,
    purchases,
    sales,
    inventory,
    employees,
    attendance,
    offlineQueue,
    activeSet,
  } = params;

  const notifications: AppNotification[] = [];
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  // =========================================================================
  // 1. JATUH TEMPO HUTANG SUPPLIER & PIUTANG PELANGGAN (Prioritas #1)
  // =========================================================================
  const unpaidPurchases = purchases.filter((p) => {
    const remaining = Number(p.total_value || 0) - Number(p.amount_paid ?? p.total_value ?? 0);
    return p.payment_status === "hutang" && remaining > 0;
  });

  for (const p of unpaidPurchases) {
    const remaining = Number(p.total_value || 0) - Number(p.amount_paid || 0);
    if (p.due_date && p.due_date < todayStr) {
      notifications.push({
        id: `debt-overdue-purchase-${p.id}-${todayStr}`,
        category: "debt_due",
        severity: "critical",
        title: `🚨 Hutang Supplier Lewat Jatuh Tempo!`,
        message: `Sisa hutang pembelian kayu ke Supplier ${p.supplierName || "Tanpa Nama"} sebesar Rp ${remaining.toLocaleString("id-ID")} telah melewati jatuh tempo (${p.due_date}).`,
        targetView: "debts",
        timestamp: p.due_date,
        badgeText: "Lewat Tempo",
      });
    } else if (p.due_date === todayStr) {
      notifications.push({
        id: `debt-today-purchase-${p.id}-${todayStr}`,
        category: "debt_due",
        severity: "critical",
        title: `⚠️ Hutang Supplier Jatuh Tempo Hari Ini`,
        message: `Tagihan kayu ke Supplier ${p.supplierName || "Tanpa Nama"} sebesar Rp ${remaining.toLocaleString("id-ID")} jatuh tempo hari ini (${todayStr}).`,
        targetView: "debts",
        timestamp: todayStr,
        badgeText: "Hari Ini",
      });
    } else if (p.due_date === tomorrowStr) {
      notifications.push({
        id: `debt-tomorrow-purchase-${p.id}-${todayStr}`,
        category: "debt_due",
        severity: "warning",
        title: `🔔 Pengingat H-1 Hutang Supplier`,
        message: `Sisa pembayaran kayu ke Supplier ${p.supplierName || "Tanpa Nama"} sebesar Rp ${remaining.toLocaleString("id-ID")} jatuh tempo besok (${p.due_date}).`,
        targetView: "debts",
        timestamp: todayStr,
        badgeText: "Besok",
      });
    }
  }

  const unpaidSales = sales.filter((s) => {
    const remaining = Number(s.total_revenue || 0) - Number(s.amount_paid ?? s.total_revenue ?? 0);
    return s.payment_status === "piutang" && remaining > 0;
  });

  for (const s of unpaidSales) {
    const remaining = Number(s.total_revenue || 0) - Number(s.amount_paid || 0);
    if (s.due_date && s.due_date < todayStr) {
      notifications.push({
        id: `debt-overdue-sale-${s.id}-${todayStr}`,
        category: "debt_due",
        severity: "critical",
        title: `🚨 Piutang Pelanggan Lewat Jatuh Tempo!`,
        message: `Pelanggan ${s.customer_name || "Tanpa Nama"} belum melunasi sisa tagihan Rp ${remaining.toLocaleString("id-ID")} (Jatuh tempo: ${s.due_date}). Segera lakukan penagihan.`,
        targetView: "debts",
        timestamp: s.due_date,
        badgeText: "Penagihan",
      });
    } else if (s.due_date === todayStr) {
      notifications.push({
        id: `debt-today-sale-${s.id}-${todayStr}`,
        category: "debt_due",
        severity: "warning",
        title: `⚠️ Piutang Pelanggan Jatuh Tempo Hari Ini`,
        message: `Piutang dari ${s.customer_name || "Pelanggan"} sebesar Rp ${remaining.toLocaleString("id-ID")} jatuh tempo hari ini (${todayStr}).`,
        targetView: "debts",
        timestamp: todayStr,
        badgeText: "Hari Ini",
      });
    } else if (s.due_date === tomorrowStr) {
      notifications.push({
        id: `debt-tomorrow-sale-${s.id}-${todayStr}`,
        category: "debt_due",
        severity: "info",
        title: `🔔 Pengingat H-1 Piutang Pelanggan`,
        message: `Tagihan pelanggan ${s.customer_name || "Pelanggan"} sebesar Rp ${remaining.toLocaleString("id-ID")} akan jatuh tempo besok (${s.due_date}).`,
        targetView: "debts",
        timestamp: todayStr,
        badgeText: "Besok",
      });
    }
  }

  // Summary of total active debts/receivables if any exist without specific today/overdue trigger
  if (
    (unpaidPurchases.length > 0 || unpaidSales.length > 0) &&
    !notifications.some((n) => n.category === "debt_due")
  ) {
    const totalHutang = unpaidPurchases.reduce(
      (sum, p) => sum + (Number(p.total_value || 0) - Number(p.amount_paid || 0)),
      0,
    );
    const totalPiutang = unpaidSales.reduce(
      (sum, s) => sum + (Number(s.total_revenue || 0) - Number(s.amount_paid || 0)),
      0,
    );
    notifications.push({
      id: `debt-summary-${unpaidPurchases.length}-${unpaidSales.length}-${todayStr}`,
      category: "debt_due",
      severity: "info",
      title: `💳 Ringkasan Hutang & Piutang Aktif`,
      message: `Terdapat ${unpaidSales.length} piutang pelanggan (Rp ${totalPiutang.toLocaleString("id-ID")}) dan ${unpaidPurchases.length} hutang supplier (Rp ${totalHutang.toLocaleString("id-ID")}) yang belum lunas.`,
      targetView: "debts",
      timestamp: todayStr,
      badgeText: "Monitor Kas",
    });
  }

  // =========================================================================
  // 2. PENGINGAT PRESENSI HARIAN PEKERJA BELUM DIISI (Prioritas Mandor & Owner)
  // =========================================================================
  const activeEmployees = employees.filter((e) => e.status === "aktif");
  if (activeEmployees.length > 0) {
    const recordedTodayCount = activeEmployees.filter((emp) =>
      attendance.some(
        (a) => String(a.employee_id) === String(emp.id) && a.date === todayStr,
      ),
    ).length;

    if (recordedTodayCount === 0) {
      notifications.push({
        id: `attendance-empty-${todayStr}`,
        category: "attendance_reminder",
        severity: "warning",
        title: `📋 Presensi Pekerja Hari Ini Belum Diisi`,
        message: `Kehadiran untuk ${activeEmployees.length} pekerja aktif pada tanggal ${todayStr} belum dicatat. Jangan lupa input presensi, lembur, atau kasbon harian.`,
        targetView: "payroll",
        timestamp: todayStr,
        badgeText: "Belum Absen",
      });
    } else if (recordedTodayCount < activeEmployees.length) {
      const remainingEmp = activeEmployees.length - recordedTodayCount;
      notifications.push({
        id: `attendance-partial-${recordedTodayCount}-${todayStr}`,
        category: "attendance_reminder",
        severity: "info",
        title: `📋 Presensi Harian Belum Lengkap`,
        message: `Masih ada ${remainingEmp} dari ${activeEmployees.length} pekerja aktif yang belum dicatat kehadirannya hari ini (${todayStr}).`,
        targetView: "payroll",
        timestamp: todayStr,
        badgeText: `${recordedTodayCount}/${activeEmployees.length} Selesai`,
      });
    }
  }

  // =========================================================================
  // 3. PENGINGAT GAJI PEKERJA BELUM DICAIRKAN (Khusus Owner)
  // =========================================================================
  if (role === "owner" && employees.length > 0) {
    const unpaidAttendance = attendance.filter(
      (a) => a.payroll_id === null || a.payroll_id === undefined,
    );
    if (unpaidAttendance.length > 0) {
      let totalPendingSalary = 0;
      const empSet = new Set<string>();

      for (const rec of unpaidAttendance) {
        const emp = employees.find((e) => String(e.id) === String(rec.employee_id));
        if (!emp) continue;
        empSet.add(String(emp.id));
        const wage = Number(emp.daily_wage) || 0;
        const base =
          rec.status === "hadir"
            ? wage
            : rec.status === "setengah_hari"
              ? 0.5 * wage
              : 0;
        totalPendingSalary +=
          base + (Number(rec.overtime_pay) || 0) - (Number(rec.cash_advance) || 0);
      }

      if (totalPendingSalary > 0) {
        notifications.push({
          id: `payroll-unpaid-${unpaidAttendance.length}-${todayStr}`,
          category: "payroll_reminder",
          severity: "warning",
          title: `👷 Pengingat Gaji Pekerja Belum Dicairkan`,
          message: `Terdapat ${empSet.size} pekerja (${unpaidAttendance.length} hari kerja) dengan akumulasi upah bersih Rp ${Math.max(0, totalPendingSalary).toLocaleString("id-ID")} yang siap dicairkan.`,
          targetView: "payroll",
          timestamp: todayStr,
          badgeText: "Siap Cair",
        });
      }
    }
  }

  // =========================================================================
  // 4. LAPORAN TRANSAKSI BARU HARI INI (Khusus Owner)
  // =========================================================================
  if (role === "owner") {
    const todayPurchases = purchases.filter((p) => p.date === todayStr);
    for (const p of todayPurchases.slice(0, 3)) {
      notifications.push({
        id: `tx-purchase-${p.id}`,
        category: "new_transaction",
        severity: "success",
        title: `🚚 Pembelian Kayu Masuk Hari Ini`,
        message: `Tercatat Set Pembelian dari Supplier ${p.supplierName || "-"} sebesar ${Number(p.total_volume || 0).toFixed(2)} m³ senilai Rp ${Number(p.total_value || 0).toLocaleString("id-ID")} (${p.payment_status === "hutang" ? "Hutang/Tempo" : "Lunas"}).`,
        targetView: "purchase",
        timestamp: p.date,
        badgeText: "Pembelian Baru",
      });
    }

    const todaySales = sales.filter((s) => s.date === todayStr);
    for (const s of todaySales.slice(0, 3)) {
      notifications.push({
        id: `tx-sale-${s.id}`,
        category: "new_transaction",
        severity: "success",
        title: `💰 Penjualan Kayu Hari Ini`,
        message: `Penjualan ke ${s.customer_name || "Pelanggan"} senilai Rp ${Number(s.total_revenue || 0).toLocaleString("id-ID")} (Laba Kotor: Rp ${Number(s.total_profit || 0).toLocaleString("id-ID")} • ${s.payment_status === "piutang" ? "Piutang/Tempo" : "Lunas"}).`,
        targetView: "sales",
        timestamp: s.date,
        badgeText: "Penjualan Baru",
      });
    }
  }

  // =========================================================================
  // 5. PERINGATAN STOK KAYU MENIPIS / LOW STOCK (< 2.0 m³)
  // =========================================================================
  const lowStockItems = inventory.filter(
    (item) =>
      item.condition_val !== "X" &&
      Number(item.total_volume) > 0 &&
      Number(item.total_volume) < 2.0,
  );

  if (lowStockItems.length > 0) {
    const sampleNames = lowStockItems
      .slice(0, 2)
      .map(
        (i) =>
          `${i.wood_type} (${i.length}cm, Ø${i.diameter_group}: ${Number(i.total_volume).toFixed(2)} m³)`,
      )
      .join(", ");
    notifications.push({
      id: `low-stock-${lowStockItems.length}-${todayStr}`,
      category: "low_stock",
      severity: "warning",
      title: `📦 Peringatan Stok Kayu Menipis (${lowStockItems.length} Kelompok)`,
      message: `Stok hampir habis (< 2 m³): ${sampleNames}${lowStockItems.length > 2 ? ` dan ${lowStockItems.length - 2} kelompok lainnya` : ""}.`,
      targetView: "inventory",
      timestamp: todayStr,
      badgeText: "Stok Tipis",
    });
  }

  // =========================================================================
  // 6. STATUS ANTREAN OFFLINE & DRAFT SET BELUM DISIMPAN
  // =========================================================================
  if (offlineQueue.length > 0) {
    notifications.push({
      id: `offline-queue-${offlineQueue.length}`,
      category: "offline_sync",
      severity: "info",
      title: `🔄 ${offlineQueue.length} Transaksi Offline Menunggu Sinkronisasi`,
      message: `Data Anda aman di perangkat dan akan otomatis dikirim ke server begitu koneksi internet stabil.`,
      targetView: "dashboard",
      timestamp: todayStr,
      badgeText: "Antrean Sync",
    });
  }

  if (activeSet && activeSet.categories && activeSet.categories.length > 0) {
    const totalLogsDraft = activeSet.categories.reduce(
      (sum, c) => sum + (c.logs?.length || 0),
      0,
    );
    if (totalLogsDraft > 0) {
      notifications.push({
        id: `draft-active-set-${activeSet.id}-${totalLogsDraft}`,
        category: "offline_sync",
        severity: "info",
        title: `📝 Draft Pengukuran Kayu Belum Disimpan`,
        message: `Anda memiliki draft Set Pembelian (${activeSet.supplierName || "Supplier belum diisi"} • ${totalLogsDraft} batang) yang belum ditekan tombol Simpan Set.`,
        targetView: "purchase",
        timestamp: todayStr,
        badgeText: "Draft Aktif",
      });
    }
  }

  return notifications;
}

/**
 * Automatically dispatches high-priority notifications to the device's native status bar
 * (Android APK & iOS 16.4+ PWA) once per day per notification ID.
 */
export async function dispatchNewOsNotifications(
  notifications: AppNotification[],
): Promise<void> {
  if (getDeviceNotificationPermission() !== "granted") return;

  const priorityItems = notifications.filter(
    (n) =>
      (n.severity === "critical" ||
        n.severity === "warning" ||
        n.category === "new_transaction") &&
      !hasSentOsNotificationToday(n.id),
  );

  for (const item of priorityItems.slice(0, 2)) {
    const sent = await sendSystemNotification(
      item.title,
      item.message,
      item.id,
      item.targetView,
    );
    if (sent) {
      recordSentOsNotificationToday(item.id);
    }
  }
}

