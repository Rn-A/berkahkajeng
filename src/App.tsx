import React, { useState, useEffect, useCallback } from 'react';
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
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WoodSet, InventoryItem, Sale, DashboardData, User, AuthState, Supplier, Customer, Expense, AuditLog } from './types';
import DashboardView from './components/DashboardView';
import PurchaseView from './components/PurchaseView';
import InventoryView from './components/InventoryView';
import SalesView from './components/SalesView';
import ReportsView from './components/ReportsView';
import SuppliersView from './components/SuppliersView';
import CustomersView from './components/CustomersView';
import ExpensesView from './components/ExpensesView';
import AuditLogsView from './components/AuditLogsView.tsx';
import UserManagementView from './components/UserManagementView';
import ProfileView from './components/ProfileView';
import Login from './components/Login';
import ForgotPasswordView from './components/ForgotPasswordView';
import ResetPasswordView from './components/ResetPasswordView';
import ConfirmationModal from './components/ConfirmationModal';
import { cn } from './lib/utils';

type ViewType = 'dashboard' | 'purchase' | 'inventory' | 'sales' | 'reports' | 'suppliers' | 'customers' | 'expenses' | 'audit-logs' | 'users' | 'profile' | 'forgot-password' | 'reset-password';

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('logyard_theme') === 'dark');

  // Auth state
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('logyard_auth');
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

  // State for data
  const [activeSet, setActiveSet] = useState<WoodSet | null>(null);
  const [history, setHistory] = useState<WoodSet[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [woodTypes, setWoodTypes] = useState<{ name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  // Password Reset State
  const [resetData, setResetData] = useState<{ email: string; token: string } | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('logyard_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('logyard_theme', 'light');
    }
  }, [isDarkMode]);

  // Handle URL parameters for password reset
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const email = params.get('email');

    if (token && email) {
      setResetData({ email, token });
      setActiveView('reset-password');
      // Clean up URL without refreshing
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = auth.user?.token;
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    return fetch(url, { ...options, headers });
  }, [auth.user?.token]);

  const fetchData = useCallback(async () => {
    try {
      const [setsRes, invRes, salesRes, dashRes, suppRes, custRes, expRes, woodRes, auditRes] = await Promise.all([
        fetchWithAuth('/api/sets'),
        fetchWithAuth('/api/inventory'),
        fetchWithAuth('/api/sales'),
        fetchWithAuth('/api/dashboard'),
        fetchWithAuth('/api/suppliers'),
        fetchWithAuth('/api/customers'),
        fetchWithAuth('/api/expenses'),
        fetchWithAuth('/api/wood-types'),
        auth.user?.role === 'owner' ? fetchWithAuth('/api/audit-logs') : Promise.resolve(null)
      ]);

      const processResponse = async (res: Response | null, setter: (data: any) => void, label: string) => {
        if (!res) return;
        const isApi = res.headers.get('X-API-Request') === 'true';
        const serverId = res.headers.get('X-Backend-Server');

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            alert('Sesi Anda telah berakhir. Silakan login kembali.');
            handleLogout();
            return;
          }
          console.error(`Failed to fetch ${label}: HTTP ${res.status} (API: ${isApi}, Server: ${serverId})`);
          return;
        }

        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return;
        }

        try {
          const data = await res.json();
          setter(data);
        } catch (e) {
          console.error(`Failed to parse JSON for ${label}:`, e);
        }
      };

      await Promise.all([
        processResponse(setsRes, setHistory, 'sets'),
        processResponse(invRes, setInventory, 'inventory'),
        processResponse(salesRes, setSalesHistory, 'sales'),
        processResponse(dashRes, setDashboardData, 'dashboard'),
        processResponse(suppRes, setSuppliers, 'suppliers'),
        processResponse(custRes, setCustomers, 'customers'),
        processResponse(expRes, setExpenses, 'expenses'),
        processResponse(woodRes, setWoodTypes, 'woodTypes'),
        processResponse(auditRes, setAuditLogs, 'auditLogs')
      ]);
    } catch (error) {
      console.error("Network error during fetch:", error);
    }
  }, [fetchWithAuth, auth.user?.role]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchData();
      createNewSet();
    }
  }, [fetchData, auth.isAuthenticated]);

  const handleLogin = async (credentials: any) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 100));
        throw new Error('Server returned an invalid response (not JSON). Please check if the server is running correctly.');
      }

      const data = await response.json();
      if (response.ok) {
        setAuth({ user: data, isAuthenticated: true });
        localStorage.setItem('logyard_auth', JSON.stringify(data));
      } else {
        throw new Error(data.error || 'Login gagal');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const handleLogout = () => {
    setAuth({ user: null, isAuthenticated: false });
    localStorage.removeItem('logyard_auth');
    setActiveView('dashboard');
  };

  const createNewSet = () => {
    const newSet: WoodSet = {
      id: crypto.randomUUID(),
      supplierName: '',
      date: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })(),
      categories: [],
      total_volume: 0,
      total_value: 0
    };
    setActiveSet(newSet);
  };

  const handleSaveSet = async () => {
    if (!activeSet || activeSet.categories.length === 0) return;
    setIsLoading(true);
    try {
      const response = await fetchWithAuth('/api/sets', {
        method: 'POST',
        body: JSON.stringify(activeSet)
      });
      if (response.ok) {
        await fetchData();
        createNewSet();
        alert('Set Kayu berhasil disimpan dan stok diperbarui!');
      }
    } catch (error) {
      alert('Gagal menyimpan data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSet = async (id: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Hapus Riwayat Pembelian',
      message: 'Apakah Anda yakin ingin menghapus riwayat pembelian ini? Stok yang terkait akan dikembalikan.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetchWithAuth(`/api/sets/${id}`, { method: 'DELETE' });
          if (response.ok) await fetchData();
        } catch (error) {
          alert('Gagal menghapus.');
        }
      }
    });
  };

  const handleSaveSale = async (sale: any) => {
    try {
      const response = await fetchWithAuth('/api/sales', {
        method: 'POST',
        body: JSON.stringify(sale)
      });
      if (response.ok) {
        await fetchData();
        alert('Penjualan berhasil dicatat!');
      } else {
        const err = await response.json();
        alert('Gagal: ' + err.error);
        throw new Error(err.error);
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleDeleteSale = async (id: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Hapus Riwayat Penjualan',
      message: 'Apakah Anda yakin ingin menghapus riwayat penjualan ini? Stok akan dikembalikan.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetchWithAuth(`/api/sales/${id}`, { method: 'DELETE' });
          if (response.ok) await fetchData();
        } catch (error) {
          alert('Gagal menghapus.');
        }
      }
    });
  };

  const handleSaveSupplier = async (supplier: any) => {
    const response = await fetchWithAuth('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplier)
    });
    if (response.ok) await fetchData();
  };

  const handleDeleteSupplier = async (id: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Hapus Supplier',
      message: 'Apakah Anda yakin ingin menghapus data supplier ini?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetchWithAuth(`/api/suppliers/${id}`, { method: 'DELETE' });
          if (response.ok) await fetchData();
        } catch (error) {
          alert('Gagal menghapus supplier.');
        }
      }
    });
  };

  const handleSaveCustomer = async (customer: any) => {
    const response = await fetchWithAuth('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customer)
    });
    if (response.ok) await fetchData();
  };

  const handleDeleteCustomer = async (id: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Hapus Pelanggan',
      message: 'Apakah Anda yakin ingin menghapus data pelanggan ini?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetchWithAuth(`/api/customers/${id}`, { method: 'DELETE' });
          if (response.ok) await fetchData();
        } catch (error) {
          alert('Gagal menghapus pelanggan.');
        }
      }
    });
  };

  const handleSaveExpense = async (expense: any) => {
    const isUpdate = expense.id && expenses.some(e => e.id === expense.id);
    const url = isUpdate ? `/api/expenses/${expense.id}` : '/api/expenses';
    const method = isUpdate ? 'PUT' : 'POST';

    const response = await fetchWithAuth(url, {
      method,
      body: JSON.stringify(expense)
    });
    if (response.ok) await fetchData();
  };

  const handleDeleteExpense = async (id: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Hapus Pengeluaran',
      message: 'Apakah Anda yakin ingin menghapus catatan pengeluaran ini?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetchWithAuth(`/api/expenses/${id}`, { method: 'DELETE' });
          if (response.ok) await fetchData();
        } catch (error) {
          alert('Gagal menghapus pengeluaran.');
        }
      }
    });
  };

  const handleAddWoodType = async (name: string) => {
    try {
      const res = await fetchWithAuth('/api/wood-types', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      if (res.ok) await fetchData();
    } catch (e) {
      alert('Gagal menambah jenis kayu');
    }
  };

  const handleDeleteWoodType = async (name: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Hapus Jenis Kayu',
      message: `Apakah Anda yakin ingin menghapus jenis kayu "${name}"? Ini tidak akan menghapus data stok lama tapi akan menghilangkannya dari opsi input baru.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetchWithAuth(`/api/wood-types/${name}`, { method: 'DELETE' });
          if (res.ok) await fetchData();
        } catch (e) {
          alert('Gagal menghapus');
        }
      }
    });
  };

  const handleDeleteUser = async (id: number, username: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Hapus Akun Mandor',
      message: `Apakah Anda yakin ingin menghapus akun mandor "${username}" secara permanen?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetchWithAuth(`/api/users/${id}`, { method: 'DELETE' });
          if (res.ok) await fetchData();
          else alert('Gagal menghapus');
        } catch (e) {
          alert('Terjadi kesalahan jaringan.');
        }
      }
    });
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'mandor'] },
    { id: 'purchase', label: 'Pembelian (Set)', icon: Truck, roles: ['owner', 'mandor'] },
    { id: 'inventory', label: 'Inventaris', icon: Package, roles: ['owner', 'mandor'] },
    { id: 'sales', label: 'Penjualan', icon: ShoppingCart, roles: ['owner', 'mandor'] },
    { id: 'expenses', label: 'Pengeluaran', icon: CreditCard, roles: ['owner'] },
    { id: 'suppliers', label: 'Supplier', icon: Users, roles: ['owner', 'mandor'] },
    { id: 'customers', label: 'Pelanggan', icon: UserCheck, roles: ['owner', 'mandor'] },
    { id: 'reports', label: 'Laporan', icon: FileText, roles: ['owner'] },
    { id: 'users', label: 'Akun Mandor', icon: UserPlus, roles: ['owner'] },
    { id: 'audit-logs', label: 'Audit Log', icon: ShieldAlert, roles: ['owner'] },
    { id: 'profile', label: 'Profil Saya', icon: UserIcon, roles: ['owner', 'mandor'] },
  ].filter(item => item.roles.includes(auth.user?.role || ''));

  if (!auth.isAuthenticated) {
    if (activeView === 'forgot-password') {
      return <ForgotPasswordView onBack={() => setActiveView('dashboard')} />;
    }
    if (activeView === 'reset-password' && resetData) {
      return (
        <ResetPasswordView 
          email={resetData.email} 
          token={resetData.token} 
          onSuccess={() => {
            setResetData(null);
            setActiveView('dashboard');
          }} 
        />
      );
    }
    return <Login onLogin={handleLogin} onForgotPassword={() => setActiveView('forgot-password')} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex bg-zinc-900 text-white transition-all duration-300 flex-col sticky top-0 h-screen z-40 print:hidden",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-4 flex items-center gap-3 border-b border-white/10">
          <img
            src="/logo.png"
            alt="Berkah Kajeng"
            className="h-10 w-10 object-contain shrink-0"
          />
          {isSidebarOpen && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="font-bold text-lg tracking-tight">Berkah Kajeng</h1>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Management System</p>
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
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={22} className={cn(
                "shrink-0",
                activeView === item.id ? "text-zinc-900" : "group-hover:scale-110 transition-transform"
              )} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center gap-3 p-3 text-zinc-400 hover:text-white transition-colors rounded-xl mb-2"
          >
            {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
            {isSidebarOpen && <span className="font-medium">{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>}
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
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Berkah Kajeng" className="h-8 w-8 object-contain" />
            <div>
              <h1 className="font-bold text-sm tracking-tight leading-none">Berkah Kajeng</h1>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Management System</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-1">
            <p className="text-[10px] font-bold uppercase text-zinc-400 leading-none">{auth.user?.role}</p>
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
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-white dark:bg-zinc-900 z-[70] md:hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 bg-zinc-900 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Berkah Kajeng" className="h-10 w-10 object-contain" />
                  <div>
                    <h1 className="font-bold text-base tracking-tight text-white">Berkah Kajeng</h1>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Management System</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
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
                        ? (isDarkMode ? "bg-white text-zinc-900 shadow-lg shadow-white/10" : "bg-zinc-900 text-white shadow-lg shadow-zinc-900/20")
                        : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                      {auth.user?.role === 'owner' ? `Hallo Pak Bos ${auth.user?.full_name}` : `Hi, ${auth.user?.full_name}`}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-400 tracking-widest font-mono">{auth.user?.username}</p>
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
            {menuItems.find(m => m.id === activeView)?.label}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold text-zinc-900 dark:text-white">
                {auth.user?.role === 'owner' ? `Hallo Pak Bos ${auth.user?.full_name}` : `Hi, ${auth.user?.full_name}`}
              </p>
              <p className="text-[10px] text-zinc-400 font-mono">{auth.user?.username}</p>
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
          {isLoading && !activeSet && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-white rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Memuat Data...</p>
              </div>
            </div>
          )}
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
                {activeView === 'dashboard' && <DashboardView
                  data={dashboardData}
                  salesHistory={salesHistory}
                  purchasesHistory={history}
                  inventory={inventory}
                  expenses={expenses}
                  userRole={auth.user?.role || 'mandor'}
                />}
                {activeView === 'purchase' && (
                  <PurchaseView
                    activeSet={activeSet}
                    setActiveSet={setActiveSet}
                    history={history}
                    onSave={handleSaveSet}
                    onDelete={handleDeleteSet}
                    isLoading={isLoading}
                    createNewSet={createNewSet}
                    suppliers={suppliers}
                    woodTypes={woodTypes}
                    onAddWoodType={handleAddWoodType}
                    onDeleteWoodType={handleDeleteWoodType}
                    userRole={auth.user?.role || 'mandor'}
                  />
                )}
                {activeView === 'inventory' && <InventoryView inventory={inventory} />}
                {activeView === 'sales' && (
                  <SalesView
                    inventory={inventory}
                    onSave={handleSaveSale}
                    onDelete={handleDeleteSale}
                    salesHistory={salesHistory}
                    customers={customers}
                  />
                )}
                {activeView === 'suppliers' && (
                  <SuppliersView
                    suppliers={suppliers}
                    onSave={handleSaveSupplier}
                    onDelete={handleDeleteSupplier}
                  />
                )}
                {activeView === 'customers' && (
                  <CustomersView
                    customers={customers}
                    onSave={handleSaveCustomer}
                    onDelete={handleDeleteCustomer}
                  />
                )}
                {activeView === 'expenses' && (
                  <ExpensesView
                    expenses={expenses}
                    onSave={handleSaveExpense}
                    onDelete={handleDeleteExpense}
                  />
                )}
                {activeView === 'reports' && (
                  <ReportsView
                    inventory={inventory}
                    sales={salesHistory}
                    purchases={history}
                    expenses={expenses}
                  />
                )}
                {activeView === 'audit-logs' && (
                  <AuditLogsView logs={auditLogs} />
                )}
                 {activeView === 'users' && (
                   <UserManagementView 
                    auth={auth} 
                    onDeleteUser={handleDeleteUser}
                  />
                 )}
                {activeView === 'profile' && (
                  <ProfileView
                    auth={auth}
                    onUpdateAuth={(user) => {
                      const newAuth = { ...auth, user };
                      setAuth(newAuth);
                      localStorage.setItem('logyard_auth', JSON.stringify(newAuth.user));
                    }}
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Theme Toggle for Mobile */}
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="md:hidden print:hidden fixed bottom-6 right-6 w-14 h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full shadow-2xl flex items-center justify-center z-[100] active:scale-90 transition-transform border border-white/10 dark:border-zinc-200"
      >
        {isDarkMode ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} />}
      </button>
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        variant={modalConfig.variant}
      />
    </div>
  );
}
