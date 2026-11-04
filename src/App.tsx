import React, { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  Truck,
  Package,
  ShoppingCart,
  FileText,
  LogOut,
  Menu,
  X,
  Users,
  UserCheck,
  CreditCard,
  ShieldAlert,
  UserPlus,
  User as UserIcon,
  Moon,
  Sun,
  CheckCircle2,
  Info,
  XCircle,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  WoodSet,
  InventoryItem,
  Sale,
  DashboardData,
  User,
  AuthState,
  Supplier,
  Customer,
  Expense,
  AuditLog,
} from "./types";
import { apiUrl } from "./lib/api";
import {
  loadCache,
  saveCache,
  loadDraftSet,
  saveDraftSet,
  loadOfflineQueue,
  saveOfflineQueue,
  enqueueOfflineItem,
  applyOptimisticPurchaseToInventory,
  applyOptimisticSaleToInventory,
  OfflineQueueItem,
} from "./lib/offline";
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error("Chunk load error:", error);
      if (typeof navigator === "undefined" || navigator.onLine) {
        window.location.reload();
      }
      return { default: () => null };
    }
  });

const DashboardView = lazyWithRetry(() => import("./components/DashboardView"));
const PurchaseView = lazyWithRetry(() => import("./components/PurchaseView"));
const InventoryView = lazyWithRetry(() => import("./components/InventoryView"));
const SalesView = lazyWithRetry(() => import("./components/SalesView"));
const ReportsView = lazyWithRetry(() => import("./components/ReportsView"));
const SuppliersView = lazyWithRetry(() => import("./components/SuppliersView"));
const CustomersView = lazyWithRetry(() => import("./components/CustomersView"));
const ExpensesView = lazyWithRetry(() => import("./components/ExpensesView"));
const AuditLogsView = lazyWithRetry(
  () => import("./components/AuditLogsView"),
);
const UserManagementView = lazyWithRetry(
  () => import("./components/UserManagementView"),
);
const ProfileView = lazyWithRetry(() => import("./components/ProfileView"));
const Login = lazyWithRetry(() => import("./components/Login"));
const ForgotPasswordView = lazyWithRetry(
  () => import("./components/ForgotPasswordView"),
);
const ConfirmationModal = lazyWithRetry(
  () => import("./components/ConfirmationModal"),
);
import { cn, generateUUID } from "./lib/utils";

type ViewType =
  | "dashboard"
  | "purchase"
  | "inventory"
  | "sales"
  | "reports"
  | "suppliers"
  | "customers"
  | "expenses"
  | "audit-logs"
  | "users"
  | "profile"
  | "forgot-password";

const ViewSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="flex justify-between items-end">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
        <div className="h-4 w-64 bg-zinc-100 dark:bg-zinc-900 rounded-lg"></div>
      </div>
      <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-32 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm"
        ></div>
      ))}
    </div>
    <div className="h-96 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm"></div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-24 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm"
        ></div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-96 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm"></div>
      <div className="h-96 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm"></div>
    </div>
  </div>
);

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("logyard_theme") === "dark",
  );

  // Auth state
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem("logyard_auth");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { user: parsed, isAuthenticated: true };
      } catch (e) {
        return { user: null, isAuthenticated: false };
      }
    }
    return { user: null, isAuthenticated: false };
  });

  // State for data (initialized from local offline cache)
  const [activeSet, setActiveSet] = useState<WoodSet | null>(() =>
    loadDraftSet(),
  );
  const [history, setHistory] = useState<WoodSet[]>(() =>
    loadCache<WoodSet[]>("history", []),
  );
  const [inventory, setInventory] = useState<InventoryItem[]>(() =>
    loadCache<InventoryItem[]>("inventory", []),
  );
  const [salesHistory, setSalesHistory] = useState<Sale[]>(() =>
    loadCache<Sale[]>("sales", []),
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    loadCache<Supplier[]>("suppliers", []),
  );
  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadCache<Customer[]>("customers", []),
  );
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    loadCache<Expense[]>("expenses", []),
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    loadCache<AuditLog[]>("auditLogs", []),
  );
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(() =>
    loadCache<DashboardData | null>("dashboard", null),
  );
  const [woodTypes, setWoodTypes] = useState<{ name: string }[]>(() =>
    loadCache<{ name: string }[]>("woodTypes", []),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(() => {
    const hasCached =
      loadCache<InventoryItem[]>("inventory", []).length > 0 ||
      loadCache<WoodSet[]>("history", []).length > 0 ||
      loadCache<DashboardData | null>("dashboard", null) !== null;
    return !hasCached && (typeof navigator === "undefined" || navigator.onLine);
  });

  // Offline & Sync Queue State
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() =>
    loadOfflineQueue(),
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // Persist activeSet draft & cached data automatically
  useEffect(() => {
    saveDraftSet(activeSet);
  }, [activeSet]);

  useEffect(() => {
    saveCache("history", history);
  }, [history]);

  useEffect(() => {
    saveCache("inventory", inventory);
  }, [inventory]);

  useEffect(() => {
    saveCache("sales", salesHistory);
  }, [salesHistory]);

  useEffect(() => {
    saveCache("suppliers", suppliers);
  }, [suppliers]);

  useEffect(() => {
    saveCache("customers", customers);
  }, [customers]);

  useEffect(() => {
    saveCache("expenses", expenses);
  }, [expenses]);

  useEffect(() => {
    saveCache("auditLogs", auditLogs);
  }, [auditLogs]);

  useEffect(() => {
    if (dashboardData) saveCache("dashboard", dashboardData);
  }, [dashboardData]);

  useEffect(() => {
    if (woodTypes.length > 0) saveCache("woodTypes", woodTypes);
  }, [woodTypes]);

  // Modal & Toast State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
    onConfirm: () => { },
  });

  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "info" | "error";
  }>({
    isOpen: false,
    message: "",
    type: "success",
  });

  const showToast = useCallback(
    (message: string, type: "success" | "info" | "error" = "success") => {
      setToast({ isOpen: true, message, type });
      setTimeout(() => setToast((prev) => ({ ...prev, isOpen: false })), 3000);
    },
    [],
  );

  // Password Reset State
  const [resetData, setResetData] = useState<{
    email: string;
    token: string;
  } | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("logyard_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("logyard_theme", "light");
    }
  }, [isDarkMode]);

  const handleLogout = useCallback(() => {
    if (auth.user?.token) {
      fetch(apiUrl("/api/logout"), {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.user.token}` }
      }).catch(console.error);
    }
    setAuth({ user: null, isAuthenticated: false });
    localStorage.removeItem("logyard_auth");
    setActiveView("dashboard");
  }, [auth.user?.token]);

  const createNewSet = useCallback(() => {
    const newSet: WoodSet = {
      id: generateUUID(),
      supplierName: "",
      date: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })(),
      categories: [],
      total_volume: 0,
      total_value: 0,
    };
    setActiveSet(newSet);
  }, []);

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = auth.user?.token;
      const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // FIX #9: Add request timeout (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const targetUrl =
          url.startsWith("http://") || url.startsWith("https://")
            ? url
            : apiUrl(url);
        const response = await fetch(targetUrl, {
          ...options,
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    [auth.user?.token],
  );

  const isFetchingRef = React.useRef(false);
  const fetchData = useCallback(
    async (viewArg?: ViewType) => {
      if (!viewArg || isFetchingRef.current) return;

      isFetchingRef.current = true;
      const view = viewArg;

      try {
        if (view === "dashboard") {
          // FIX #10: Use Promise.allSettled instead of Promise.all for better error handling
          const results = await Promise.allSettled([
            fetchWithAuth("/api/dashboard"),
            fetchWithAuth("/api/inventory"),
            fetchWithAuth("/api/sales"),
            fetchWithAuth("/api/sets"),
            fetchWithAuth("/api/expenses"),
          ]);

          // Process results safely
          if (results[0].status === "fulfilled" && results[0].value?.ok) {
            setDashboardData(await results[0].value.json());
          }
          if (results[1].status === "fulfilled" && results[1].value?.ok) {
            setInventory(await results[1].value.json());
          }
          if (results[2].status === "fulfilled" && results[2].value?.ok) {
            setSalesHistory(await results[2].value.json());
          }
          if (results[3].status === "fulfilled" && results[3].value?.ok) {
            setHistory(await results[3].value.json());
          }
          if (results[4].status === "fulfilled" && results[4].value?.ok) {
            setExpenses(await results[4].value.json());
          }

          // Check for auth errors
          if (
            results[0].status === "fulfilled" &&
            (results[0].value?.status === 401 ||
              results[0].value?.status === 403)
          ) {
            handleLogout();
          }
        } else {
          // Handle other views with proper error handling
          switch (view) {
            case "purchase": {
              const res = await Promise.allSettled([
                fetchWithAuth("/api/sets"),
                fetchWithAuth("/api/suppliers"),
                fetchWithAuth("/api/wood-types"),
              ]);
              if (res[0].status === "fulfilled" && res[0].value?.ok)
                setHistory(await res[0].value.json());
              if (res[1].status === "fulfilled" && res[1].value?.ok)
                setSuppliers(await res[1].value.json());
              if (res[2].status === "fulfilled" && res[2].value?.ok)
                setWoodTypes(await res[2].value.json());
              break;
            }
            case "inventory": {
              const res = await fetchWithAuth("/api/inventory");
              if (res?.ok) setInventory(await res.json());
              break;
            }
            case "sales": {
              const res = await Promise.allSettled([
                fetchWithAuth("/api/sales"),
                fetchWithAuth("/api/customers"),
                fetchWithAuth("/api/inventory"),
              ]);
              if (res[0].status === "fulfilled" && res[0].value?.ok)
                setSalesHistory(await res[0].value.json());
              if (res[1].status === "fulfilled" && res[1].value?.ok)
                setCustomers(await res[1].value.json());
              if (res[2].status === "fulfilled" && res[2].value?.ok)
                setInventory(await res[2].value.json());
              break;
            }
            case "expenses": {
              const res = await fetchWithAuth("/api/expenses");
              if (res?.ok) setExpenses(await res.json());
              break;
            }
            case "reports": {
              const res = await Promise.allSettled([
                fetchWithAuth("/api/sales"),
                fetchWithAuth("/api/sets"),
                fetchWithAuth("/api/expenses"),
                fetchWithAuth("/api/inventory"),
              ]);
              if (res[0].status === "fulfilled" && res[0].value?.ok)
                setSalesHistory(await res[0].value.json());
              if (res[1].status === "fulfilled" && res[1].value?.ok)
                setHistory(await res[1].value.json());
              if (res[2].status === "fulfilled" && res[2].value?.ok)
                setExpenses(await res[2].value.json());
              if (res[3].status === "fulfilled" && res[3].value?.ok)
                setInventory(await res[3].value.json());
              break;
            }
            case "suppliers": {
              const res = await fetchWithAuth("/api/suppliers");
              if (res?.ok) setSuppliers(await res.json());
              break;
            }
            case "customers": {
              const res = await fetchWithAuth("/api/customers");
              if (res?.ok) setCustomers(await res.json());
              break;
            }
            case "audit-logs": {
              if (auth.user?.role === "owner") {
                const res = await fetchWithAuth("/api/audit-logs");
                if (res?.ok) setAuditLogs(await res.json());
              }
              break;
            }
          }
        }
      } catch (error) {
        console.error("Fetch error:", error);
        if (typeof navigator !== "undefined" && navigator.onLine) {
          showToast("Gagal memuat data terbaru. Menampilkan data tersimpan.", "info");
        }
      } finally {
        setIsInitialLoad(false);
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    },
    [fetchWithAuth, auth.user?.role, handleLogout, showToast],
  );

  const isSyncingRef = React.useRef(false);
  const syncOfflineQueue = useCallback(async () => {
    if (isSyncingRef.current || !auth.isAuthenticated) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const currentQueue = loadOfflineQueue();
    if (currentQueue.length === 0) return;

    isSyncingRef.current = true;
    setIsSyncing(true);
    let remainingQueue = [...currentQueue];
    let syncedCount = 0;

    try {
      for (const item of currentQueue) {
        try {
          const res = await fetchWithAuth(item.endpoint, {
            method: item.method,
            body: JSON.stringify(item.payload),
          });

          if (res.ok) {
            remainingQueue = remainingQueue.filter((q) => q.id !== item.id);
            saveOfflineQueue(remainingQueue);
            setOfflineQueue([...remainingQueue]);
            syncedCount++;
          } else if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
            let errMessage = `Kode ${res.status}`;
            try {
              const errData = await res.json();
              if (errData?.error) errMessage = errData.error;
            } catch {
              // ignore JSON parse error
            }
            remainingQueue = remainingQueue.filter((q) => q.id !== item.id);
            saveOfflineQueue(remainingQueue);
            setOfflineQueue([...remainingQueue]);
            showToast(`Gagal sinkronisasi ${item.label}: ${errMessage}`, "error");
          } else {
            // 5xx or rate-limit: stop and retry later
            break;
          }
        } catch (networkErr) {
          // Network dropped during sync; keep remaining items for next online event
          break;
        }
      }

      if (syncedCount > 0) {
        showToast(
          `${syncedCount} transaksi offline berhasil disinkronkan ke server!`,
          "success",
        );
        await fetchData(activeView);
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [auth.isAuthenticated, fetchWithAuth, fetchData, activeView, showToast]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const q = loadOfflineQueue();
      if (q.length > 0) {
        showToast(`Internet terhubung! Menyinkronkan ${q.length} transaksi...`, "info");
        syncOfflineQueue();
      } else {
        showToast("Koneksi internet kembali aktif.", "success");
        fetchData(activeView);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast(
        "Mode Offline: Anda tetap bisa mencatat transaksi, data akan disinkronkan saat online.",
        "info",
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncOfflineQueue, fetchData, activeView, showToast]);

  useEffect(() => {
    if (auth.isAuthenticated && isOnline && offlineQueue.length > 0) {
      syncOfflineQueue();
    }
  }, [auth.isAuthenticated, isOnline, offlineQueue.length, syncOfflineQueue]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchData(activeView);
    }
  }, [auth.isAuthenticated, activeView]);

  // Preload core views and reference data in background so all menus work offline
  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const timer = setTimeout(() => {
      import("./components/DashboardView").catch(() => {});
      import("./components/PurchaseView").catch(() => {});
      import("./components/InventoryView").catch(() => {});
      import("./components/SalesView").catch(() => {});
      import("./components/SuppliersView").catch(() => {});
      import("./components/CustomersView").catch(() => {});
      import("./components/ExpensesView").catch(() => {});
      import("./components/ReportsView").catch(() => {});

      if (typeof navigator === "undefined" || navigator.onLine) {
        Promise.allSettled([
          fetchWithAuth("/api/suppliers"),
          fetchWithAuth("/api/customers"),
          fetchWithAuth("/api/wood-types"),
        ]).then(async (res) => {
          if (res[0].status === "fulfilled" && res[0].value?.ok)
            setSuppliers(await res[0].value.json());
          if (res[1].status === "fulfilled" && res[1].value?.ok)
            setCustomers(await res[1].value.json());
          if (res[2].status === "fulfilled" && res[2].value?.ok)
            setWoodTypes(await res[2].value.json());
        });
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [auth.isAuthenticated, fetchWithAuth]);

  useEffect(() => {
    if (auth.isAuthenticated && activeView === "purchase" && !activeSet) {
      createNewSet();
    }
  }, [auth.isAuthenticated, activeView, activeSet, createNewSet]);

  const handleLogin = async (credentials: any) => {
    try {
      const response = await fetch(apiUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", text.substring(0, 100));
        throw new Error(
          "Server returned an invalid response (not JSON). Please check if the server is running correctly.",
        );
      }

      const data = await response.json();
      if (response.ok) {
        setAuth({ user: data, isAuthenticated: true });
        localStorage.setItem("logyard_auth", JSON.stringify(data));
      } else {
        throw new Error(data.error || "Login gagal");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      throw err;
    }
  };

  const handleSaveSet = async (setOverride?: any) => {
    const setToSave = setOverride || activeSet;
    if (!setToSave || setToSave.categories.length === 0) return;
    setIsSaving(true);

    const saveOffline = () => {
      const updatedQueue = enqueueOfflineItem({
        type: "PURCHASE_CREATE",
        endpoint: "/api/sets",
        method: "POST",
        payload: setToSave,
        label: `Pembelian (${setToSave.supplierName || "Supplier"})`,
      });
      setOfflineQueue(updatedQueue);
      setHistory((prev) => [setToSave, ...prev.filter((s) => s.id !== setToSave.id)]);
      setInventory((prev) => applyOptimisticPurchaseToInventory(prev, setToSave));
      createNewSet();
      showToast(
        "Disimpan secara Offline! Otomatis disinkronkan saat internet aktif.",
        "info",
      );
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveOffline();
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetchWithAuth("/api/sets", {
        method: "POST",
        body: JSON.stringify(setToSave),
      });
      if (response.ok) {
        createNewSet();
        showToast("Tersimpan!", "success");
        fetchData(activeView);
      } else {
        showToast("Gagal menyimpan ke database!", "error");
      }
    } catch (error) {
      // Network failure fallback -> Queue offline so Mandor's log measurements are never lost
      saveOffline();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSet = async (id: string) => {
    setModalConfig({
      isOpen: true,
      title: "Hapus Riwayat Pembelian",
      message:
        "Apakah Anda yakin ingin menghapus riwayat pembelian ini? Stok yang terkait akan dikembalikan.",
      variant: "danger",
      onConfirm: async () => {
        try {
          const response = await fetchWithAuth(`/api/sets/${id}`, {
            method: "DELETE",
          });
          if (response.ok) await fetchData(activeView);
        } catch (error) {
          alert("Gagal menghapus.");
        }
      },
    });
  };

  const handleSaveSale = async (sale: any) => {
    const saveSaleOffline = () => {
      const updatedQueue = enqueueOfflineItem({
        type: "SALE_CREATE",
        endpoint: "/api/sales",
        method: "POST",
        payload: sale,
        label: `Penjualan (${sale.customer_name || "Pelanggan"})`,
      });
      setOfflineQueue(updatedQueue);
      setSalesHistory((prev) => [sale, ...prev.filter((s) => s.id !== sale.id)]);
      setInventory((prev) => applyOptimisticSaleToInventory(prev, sale));
      showToast(
        "Penjualan disimpan Offline! Otomatis disinkronkan saat internet aktif.",
        "info",
      );
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveSaleOffline();
      return;
    }

    try {
      const response = await fetchWithAuth("/api/sales", {
        method: "POST",
        body: JSON.stringify(sale),
      });
      if (response.ok) {
        showToast("Penjualan berhasil dicatat!", "success");
        // Fetch data di background
        fetchData(activeView);
      } else {
        const err = await response.json();
        showToast("Gagal: " + err.error, "error");
        throw new Error(err.error);
      }
    } catch (error: any) {
      // Only queue offline if it was a network error (not a server validation error)
      if (
        error?.name === "AbortError" ||
        error instanceof TypeError ||
        (typeof navigator !== "undefined" && !navigator.onLine) ||
        String(error?.message || "").toLowerCase().includes("failed to fetch") ||
        String(error?.message || "").toLowerCase().includes("network")
      ) {
        saveSaleOffline();
        return;
      }
      console.error(error);
      throw error;
    }
  };

  const handleDeleteSale = async (id: string) => {
    setModalConfig({
      isOpen: true,
      title: "Hapus Riwayat Penjualan",
      message:
        "Apakah Anda yakin ingin menghapus riwayat penjualan ini? Stok akan dikembalikan.",
      variant: "danger",
      onConfirm: async () => {
        try {
          const response = await fetchWithAuth(`/api/sales/${id}`, {
            method: "DELETE",
          });
          if (response.ok) await fetchData(activeView);
        } catch (error) {
          alert("Gagal menghapus.");
        }
      },
    });
  };

  const handleSaveSupplier = async (supplier: any) => {
    const saveOffline = () => {
      const updatedQueue = enqueueOfflineItem({
        type: "SUPPLIER_SAVE",
        endpoint: "/api/suppliers",
        method: "POST",
        payload: supplier,
        label: `Supplier (${supplier.name})`,
      });
      setOfflineQueue(updatedQueue);
      setSuppliers((prev) => [
        supplier,
        ...prev.filter((s) => s.id !== supplier.id),
      ]);
      showToast("Supplier disimpan offline & masuk antrean sinkronisasi.", "info");
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveOffline();
      return;
    }

    try {
      const response = await fetchWithAuth("/api/suppliers", {
        method: "POST",
        body: JSON.stringify(supplier),
      });
      if (response.ok) await fetchData(activeView);
    } catch {
      saveOffline();
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    setModalConfig({
      isOpen: true,
      title: "Hapus Supplier",
      message: "Apakah Anda yakin ingin menghapus data supplier ini?",
      variant: "danger",
      onConfirm: async () => {
        try {
          const response = await fetchWithAuth(`/api/suppliers/${id}`, {
            method: "DELETE",
          });
          if (response.ok) await fetchData(activeView);
        } catch (error) {
          alert("Gagal menghapus supplier.");
        }
      },
    });
  };

  const handleSaveCustomer = async (customer: any) => {
    const saveOffline = () => {
      const updatedQueue = enqueueOfflineItem({
        type: "CUSTOMER_SAVE",
        endpoint: "/api/customers",
        method: "POST",
        payload: customer,
        label: `Pelanggan (${customer.name})`,
      });
      setOfflineQueue(updatedQueue);
      setCustomers((prev) => [
        customer,
        ...prev.filter((c) => c.id !== customer.id),
      ]);
      showToast("Pelanggan disimpan offline & masuk antrean sinkronisasi.", "info");
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveOffline();
      return;
    }

    try {
      const response = await fetchWithAuth("/api/customers", {
        method: "POST",
        body: JSON.stringify(customer),
      });
      if (response.ok) await fetchData(activeView);
    } catch {
      saveOffline();
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setModalConfig({
      isOpen: true,
      title: "Hapus Pelanggan",
      message: "Apakah Anda yakin ingin menghapus data pelanggan ini?",
      variant: "danger",
      onConfirm: async () => {
        try {
          const response = await fetchWithAuth(`/api/customers/${id}`, {
            method: "DELETE",
          });
          if (response.ok) await fetchData(activeView);
        } catch (error) {
          alert("Gagal menghapus pelanggan.");
        }
      },
    });
  };

  const handleSaveExpense = async (expense: any) => {
    const isUpdate = expense.id && expenses.some((e) => e.id === expense.id);
    const url = isUpdate ? `/api/expenses/${expense.id}` : "/api/expenses";
    const method = isUpdate ? "PUT" : "POST";

    const saveOffline = () => {
      const updatedQueue = enqueueOfflineItem({
        type: "EXPENSE_SAVE",
        endpoint: url,
        method,
        payload: expense,
        label: `Pengeluaran (${expense.category})`,
      });
      setOfflineQueue(updatedQueue);
      setExpenses((prev) =>
        isUpdate
          ? prev.map((e) => (e.id === expense.id ? expense : e))
          : [expense, ...prev],
      );
      showToast("Pengeluaran disimpan offline & masuk antrean sinkronisasi.", "info");
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveOffline();
      return;
    }

    try {
      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(expense),
      });
      if (response.ok) await fetchData(activeView);
    } catch {
      saveOffline();
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setModalConfig({
      isOpen: true,
      title: "Hapus Pengeluaran",
      message: "Apakah Anda yakin ingin menghapus catatan pengeluaran ini?",
      variant: "danger",
      onConfirm: async () => {
        try {
          const response = await fetchWithAuth(`/api/expenses/${id}`, {
            method: "DELETE",
          });
          if (response.ok) await fetchData(activeView);
        } catch (error) {
          alert("Gagal menghapus pengeluaran.");
        }
      },
    });
  };

  const handleAddWoodType = async (name: string) => {
    const saveOffline = () => {
      const updatedQueue = enqueueOfflineItem({
        type: "WOOD_TYPE_ADD",
        endpoint: "/api/wood-types",
        method: "POST",
        payload: { name },
        label: `Jenis Kayu (${name})`,
      });
      setOfflineQueue(updatedQueue);
      setWoodTypes((prev) =>
        prev.some((w) => w.name.toLowerCase() === name.toLowerCase())
          ? prev
          : [...prev, { name }],
      );
      showToast(`Jenis kayu "${name}" disimpan offline.`, "info");
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveOffline();
      return;
    }

    try {
      const res = await fetchWithAuth("/api/wood-types", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (res.ok) await fetchData(activeView);
    } catch (e) {
      saveOffline();
    }
  };

  const handleDeleteWoodType = async (name: string) => {
    setModalConfig({
      isOpen: true,
      title: "Hapus Jenis Kayu",
      message: `Apakah Anda yakin ingin menghapus jenis kayu "${name}"? Ini tidak akan menghapus data stok lama tapi akan menghilangkannya dari opsi input baru.`,
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetchWithAuth(`/api/wood-types/${name}`, {
            method: "DELETE",
          });
          if (res.ok) await fetchData(activeView);
        } catch (e) {
          alert("Gagal menghapus");
        }
      },
    });
  };

  const handleDeleteUser = async (id: number, username: string) => {
    setModalConfig({
      isOpen: true,
      title: "Hapus Akun Mandor",
      message: `Apakah Anda yakin ingin menghapus akun mandor "${username}" secara permanen?`,
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetchWithAuth(`/api/users/${id}`, {
            method: "DELETE",
          });
          if (res.ok) await fetchData(activeView);
          else alert("Gagal menghapus");
        } catch (e) {
          alert("Terjadi kesalahan jaringan.");
        }
      },
    });
  };

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["owner", "mandor"],
    },
    {
      id: "purchase",
      label: "Pembelian (Set)",
      icon: Truck,
      roles: ["owner", "mandor"],
    },
    {
      id: "inventory",
      label: "Inventaris",
      icon: Package,
      roles: ["owner", "mandor"],
    },
    {
      id: "sales",
      label: "Penjualan",
      icon: ShoppingCart,
      roles: ["owner", "mandor"],
    },
    {
      id: "expenses",
      label: "Pengeluaran",
      icon: CreditCard,
      roles: ["owner"],
    },
    {
      id: "suppliers",
      label: "Supplier",
      icon: Users,
      roles: ["owner", "mandor"],
    },
    {
      id: "customers",
      label: "Pelanggan",
      icon: UserCheck,
      roles: ["owner", "mandor"],
    },
    { id: "reports", label: "Laporan", icon: FileText, roles: ["owner"] },
    { id: "users", label: "Akun Mandor", icon: UserPlus, roles: ["owner"] },
    {
      id: "audit-logs",
      label: "Audit Log",
      icon: ShieldAlert,
      roles: ["owner"],
    },
    {
      id: "profile",
      label: "Profil Saya",
      icon: UserIcon,
      roles: ["owner", "mandor"],
    },
  ].filter((item) => item.roles.includes(auth.user?.role || ""));

  if (!auth.isAuthenticated) {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-white rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest animate-pulse">
                Menyiapkan Akses...
              </p>
            </div>
          </div>
        }
      >
        {activeView === "forgot-password" ? (
          <ForgotPasswordView onBack={() => setActiveView("dashboard")} />
        ) : (
          <Login
            onLogin={handleLogin}
            onForgotPassword={() => setActiveView("forgot-password")}
          />
        )}
      </React.Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex bg-zinc-900 text-white transition-all duration-300 flex-col sticky top-0 h-screen z-40 print:hidden",
          isSidebarOpen ? "w-64" : "w-20",
        )}
      >
        <div className="p-4 flex items-center gap-3 border-b border-white/10">
          <img
            src="/logo.png"
            alt="Berkah Kajeng"
            width="40"
            height="40"
            className="h-10 w-10 object-contain shrink-0"
          />
          {isSidebarOpen && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="font-bold text-lg tracking-tight">
                Berkah Kajeng
              </h1>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                Management System
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as ViewType)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all group",
                activeView === item.id
                  ? "bg-white text-zinc-900 shadow-lg shadow-black/20"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon
                size={22}
                className={cn(
                  "shrink-0",
                  activeView === item.id
                    ? "text-zinc-900"
                    : "group-hover:scale-110 transition-transform",
                )}
              />
              {isSidebarOpen && (
                <span className="font-medium">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center gap-3 p-3 text-zinc-400 hover:text-white transition-colors rounded-xl mb-2"
          >
            {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
            {isSidebarOpen && (
              <span className="font-medium">
                {isDarkMode ? "Mode Terang" : "Mode Gelap"}
              </span>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 transition-colors rounded-xl mb-2"
          >
            <LogOut size={22} className="shrink-0" />
            {isSidebarOpen && <span className="font-medium">Keluar</span>}
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center gap-3 p-3 text-zinc-400 hover:text-white transition-colors"
            aria-label={isSidebarOpen ? "Tutup menu" : "Buka menu"}
            title={isSidebarOpen ? "Tutup menu" : "Buka menu"}
          >
            {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
            {isSidebarOpen && <span className="font-medium">Tutup Menu</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden h-16 bg-zinc-900 text-white flex items-center justify-between px-4 sticky top-0 z-50 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            aria-label="Buka menu navigasi"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Berkah Kajeng"
              width="32"
              height="32"
              className="h-8 w-8 object-contain"
            />
            <div>
              <h1 className="font-bold text-sm tracking-tight leading-none">
                Berkah Kajeng
              </h1>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                Management System
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
              <WifiOff size={12} />
              Offline
            </span>
          )}
          {offlineQueue.length > 0 && (
            <button
              onClick={syncOfflineQueue}
              disabled={!isOnline || isSyncing}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-transform"
              title="Ketuk untuk sinkronisasi antrean offline"
            >
              <RefreshCw size={12} className={cn(isSyncing && "animate-spin")} />
              {offlineQueue.length} Sync
            </button>
          )}
          <div className="text-right mr-1">
            <p className="text-[10px] font-bold uppercase text-zinc-400 leading-none">
              {auth.user?.role}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center"
          >
            <LogOut size={18} className="text-zinc-400" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-white dark:bg-zinc-900 z-[70] md:hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 bg-zinc-900 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2">
                  <img
                    src="/logo.png"
                    alt="Berkah Kajeng"
                    width="40"
                    height="40"
                    className="h-10 w-10 object-contain"
                  />
                  <div>
                    <h1 className="font-bold text-base tracking-tight text-white">
                      Berkah Kajeng
                    </h1>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                      Management System
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Tutup menu navigasi"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id as ViewType);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl transition-all mb-1",
                      activeView === item.id
                        ? isDarkMode
                          ? "bg-white text-zinc-900 shadow-lg shadow-white/10"
                          : "bg-zinc-900 text-white shadow-lg shadow-zinc-900/20"
                        : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                    )}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-700 flex items-center justify-center text-white font-bold">
                    {auth.user?.full_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold dark:text-white">
                      {auth.user?.role === "owner"
                        ? `Hallo Pak Bos ${auth.user?.full_name}`
                        : `Hi, ${auth.user?.full_name}`}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-400 tracking-widest font-mono">
                      {auth.user?.username}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <LogOut size={18} />
                  Keluar Aplikasi
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="hidden md:flex h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 items-center justify-between px-8 sticky top-0 z-30 print:hidden">
          <h2 className="font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest text-xs">
            {menuItems.find((m) => m.id === activeView)?.label}
          </h2>
          <div className="flex items-center gap-4">
            {!isOnline && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-bold">
                <WifiOff size={14} />
                Mode Offline
              </span>
            )}
            {offlineQueue.length > 0 && (
              <button
                onClick={syncOfflineQueue}
                disabled={!isOnline || isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-60"
                title="Klik untuk sinkronisasi antrean transaksi offline"
              >
                <RefreshCw size={14} className={cn(isSyncing && "animate-spin")} />
                {isSyncing
                  ? "Menyinkronkan..."
                  : `${offlineQueue.length} Antrean Sync`}
              </button>
            )}
            <div className="text-right">
              <p className="text-xs font-bold text-zinc-900 dark:text-white">
                {auth.user?.role === "owner"
                  ? `Hallo Pak Bos ${auth.user?.full_name}`
                  : `Hi, ${auth.user?.full_name}`}
              </p>
              <p className="text-[10px] text-zinc-400 font-mono">
                {auth.user?.username}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto relative">
          {/* Loading State Fetch Awal */}
          {(isLoading || isInitialLoad) && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-white rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest">
                  Memuat Data...
                </p>
              </div>
            </div>
          )}
          <React.Suspense
            fallback={
              <div className="p-4 md:p-8">
                <ViewSkeleton />
              </div>
            }
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <div className="p-4 md:p-8">
                  {activeView === "dashboard" && (
                    <React.Suspense fallback={<DashboardSkeleton />}>
                      <DashboardView
                        data={dashboardData}
                        salesHistory={salesHistory}
                        purchasesHistory={history}
                        inventory={inventory}
                        expenses={expenses}
                        userRole={auth.user?.role || "mandor"}
                      />
                    </React.Suspense>
                  )}
                  {activeView === "purchase" && (
                    <PurchaseView
                      activeSet={activeSet}
                      setActiveSet={setActiveSet}
                      history={history}
                      onSave={handleSaveSet}
                      onDelete={handleDeleteSet}
                      isLoading={isSaving}
                      createNewSet={createNewSet}
                      suppliers={suppliers}
                      woodTypes={woodTypes}
                      onAddWoodType={handleAddWoodType}
                      onDeleteWoodType={handleDeleteWoodType}
                      onSaveSupplier={handleSaveSupplier}
                      onDeleteSupplier={handleDeleteSupplier}
                      userRole={auth.user?.role || "mandor"}
                      currentUser={auth.user}
                    />
                  )}
                  {activeView === "inventory" && (
                    <InventoryView inventory={inventory} />
                  )}
                  {activeView === "sales" && (
                    <SalesView
                      inventory={inventory}
                      onSave={handleSaveSale}
                      onDelete={handleDeleteSale}
                      salesHistory={salesHistory}
                      customers={customers}
                    />
                  )}
                  {activeView === "suppliers" && (
                    <SuppliersView
                      suppliers={suppliers}
                      onSave={handleSaveSupplier}
                      onDelete={handleDeleteSupplier}
                    />
                  )}
                  {activeView === "customers" && (
                    <CustomersView
                      customers={customers}
                      onSave={handleSaveCustomer}
                      onDelete={handleDeleteCustomer}
                    />
                  )}
                  {activeView === "expenses" && (
                    <ExpensesView
                      expenses={expenses}
                      onSave={handleSaveExpense}
                      onDelete={handleDeleteExpense}
                    />
                  )}
                  {activeView === "reports" && (
                    <ReportsView
                      inventory={inventory}
                      sales={salesHistory}
                      purchases={history}
                      expenses={expenses}
                    />
                  )}
                  {activeView === "audit-logs" && (
                    <AuditLogsView logs={auditLogs} />
                  )}
                  {activeView === "users" && (
                    <UserManagementView
                      auth={auth}
                      onDeleteUser={handleDeleteUser}
                    />
                  )}
                  {activeView === "profile" && (
                    <ProfileView
                      auth={auth}
                      onUpdateAuth={(user) => {
                        const newAuth = { ...auth, user };
                        setAuth(newAuth);
                        localStorage.setItem(
                          "logyard_auth",
                          JSON.stringify(newAuth.user),
                        );
                      }}
                    />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </React.Suspense>
        </div>
      </main>

      {/* Floating Theme Toggle for Mobile */}
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="md:hidden print:hidden fixed bottom-6 right-6 w-14 h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full shadow-2xl flex items-center justify-center z-[100] active:scale-90 transition-transform border border-white/10 dark:border-zinc-200"
      >
        {isDarkMode ? (
          <Sun size={24} className="text-yellow-400" />
        ) : (
          <Moon size={24} />
        )}
      </button>
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        variant={modalConfig.variant}
      />

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast.isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-4 rounded-2xl shadow-2xl font-medium tracking-wide"
          >
            {toast.type === "success" && (
              <CheckCircle2 className="text-emerald-500" size={24} />
            )}
            {toast.type === "info" && (
              <Info className="text-blue-500" size={24} />
            )}
            {toast.type === "error" && (
              <XCircle className="text-red-500" size={24} />
            )}
            <p className="text-sm">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
