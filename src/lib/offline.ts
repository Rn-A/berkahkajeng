import {
  WoodSet,
  InventoryItem,
  Sale,
  DashboardData,
  Supplier,
  Customer,
  Expense,
  AuditLog,
  DIAMETER_RANGES,
} from "../types";

const CACHE_PREFIX = "logyard_cache_";
const QUEUE_KEY = "logyard_offline_queue";
const DRAFT_SET_KEY = "logyard_active_set_draft";

export type OfflineActionType =
  | "PURCHASE_CREATE"
  | "SALE_CREATE"
  | "EXPENSE_SAVE"
  | "SUPPLIER_SAVE"
  | "CUSTOMER_SAVE"
  | "WOOD_TYPE_ADD";

export interface OfflineQueueItem {
  id: string;
  type: OfflineActionType;
  endpoint: string;
  method: "POST" | "PUT" | "DELETE";
  payload: any;
  label: string;
  createdAt: string;
  error?: string;
}

export function loadCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to save cache for", key, err);
  }
}

export function loadDraftSet(): WoodSet | null {
  try {
    const raw = localStorage.getItem(DRAFT_SET_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WoodSet;
  } catch {
    return null;
  }
}

export function saveDraftSet(set: WoodSet | null): void {
  try {
    if (!set) {
      localStorage.removeItem(DRAFT_SET_KEY);
    } else {
      localStorage.setItem(DRAFT_SET_KEY, JSON.stringify(set));
    }
  } catch (err) {
    console.warn("Failed to save draft set", err);
  }
}

export function loadOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineQueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn("Failed to save offline queue", err);
  }
}

export function enqueueOfflineItem(
  item: Omit<OfflineQueueItem, "id" | "createdAt">,
): OfflineQueueItem[] {
  const queue = loadOfflineQueue();
  const newItem: OfflineQueueItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [...queue, newItem];
  saveOfflineQueue(updated);
  return updated;
}

export function getDiameterGroup(diameter: number): string {
  for (const r of DIAMETER_RANGES) {
    if (diameter >= r.min && diameter <= r.max) return r.label;
  }
  return diameter < 10 ? "10-14" : "30+";
}

/**
 * Optimistically updates local inventory when a Purchase Set is saved offline.
 */
export function applyOptimisticPurchaseToInventory(
  currentInventory: InventoryItem[],
  woodSet: WoodSet,
): InventoryItem[] {
  const updated = [...currentInventory.map((item) => ({ ...item }))];

  for (const cat of woodSet.categories || []) {
    // Group logs by diameter range
    const grouped: Record<string, { logs: number; volume: number }> = {};
    for (const log of cat.logs || []) {
      const dGroup = getDiameterGroup(Number(log.diameter));
      if (!grouped[dGroup]) grouped[dGroup] = { logs: 0, volume: 0 };
      grouped[dGroup].logs += 1;
      grouped[dGroup].volume += Number(log.volume) || 0;
    }

    for (const [dGroup, stats] of Object.entries(grouped)) {
      const addedValue = stats.volume * (Number(cat.pricePerM3) || 0);
      const existingIdx = updated.findIndex(
        (inv) =>
          inv.wood_type === cat.woodType &&
          inv.diameter_group === dGroup &&
          Number(inv.length) === Number(cat.length) &&
          inv.condition_val === cat.condition,
      );

      if (existingIdx >= 0) {
        const existing = updated[existingIdx];
        const newVolume = Number(existing.total_volume) + stats.volume;
        const newValue = Number(existing.total_value) + addedValue;
        updated[existingIdx] = {
          ...existing,
          total_logs: Number(existing.total_logs) + stats.logs,
          total_volume: Number(newVolume.toFixed(4)),
          total_value: Math.round(newValue),
          avg_price: newVolume > 0 ? Math.round(newValue / newVolume) : existing.avg_price,
        };
      } else {
        updated.push({
          id: Date.now() + Math.floor(Math.random() * 10000),
          wood_type: cat.woodType,
          diameter_group: dGroup,
          length: Number(cat.length),
          condition_val: cat.condition,
          total_logs: stats.logs,
          total_volume: Number(stats.volume.toFixed(4)),
          avg_price: Number(cat.pricePerM3) || 0,
          total_value: Math.round(addedValue),
        });
      }
    }
  }

  return updated;
}

/**
 * Optimistically updates local inventory when a Sale is saved offline.
 */
export function applyOptimisticSaleToInventory(
  currentInventory: InventoryItem[],
  sale: Sale,
): InventoryItem[] {
  const updated = [...currentInventory.map((item) => ({ ...item }))];

  for (const saleItem of sale.items || []) {
    const idx = updated.findIndex(
      (inv) =>
        inv.wood_type === saleItem.wood_type &&
        inv.diameter_group === saleItem.diameter_group &&
        Number(inv.length) === Number(saleItem.length) &&
        (!saleItem.condition || inv.condition_val === saleItem.condition),
    );

    if (idx >= 0) {
      const existing = updated[idx];
      const soldVol = Number(saleItem.volume) || 0;
      const prevVol = Number(existing.total_volume) || 0;
      const newVol = Math.max(0, Number((prevVol - soldVol).toFixed(4)));
      const ratio = prevVol > 0 ? newVol / prevVol : 0;
      updated[idx] = {
        ...existing,
        total_logs: Math.max(0, Math.round(Number(existing.total_logs) * ratio)),
        total_volume: newVol,
        total_value: Math.round(newVol * Number(existing.avg_price)),
      };
    }
  }

  return updated;
}

export interface CachedAppData {
  dashboardData: DashboardData | null;
  inventory: InventoryItem[];
  salesHistory: Sale[];
  history: WoodSet[];
  suppliers: Supplier[];
  customers: Customer[];
  expenses: Expense[];
  woodTypes: { name: string }[];
  auditLogs: AuditLog[];
}

