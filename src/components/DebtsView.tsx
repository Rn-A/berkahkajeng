import React, { useState, useMemo } from "react";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  History,
  X,
  User,
  Truck,
  Banknote,
} from "lucide-react";
import { WoodSet, Sale, DebtPayment } from "../types";
import { cn, formatCurrency, generateUUID } from "../lib/utils";

interface DebtsViewProps {
  purchases: WoodSet[];
  sales: Sale[];
  debtPayments: DebtPayment[];
  onSavePayment: (payment: Omit<DebtPayment, "created_at">) => Promise<void>;
  userRole: "owner" | "mandor";
}

export default function DebtsView({
  purchases,
  sales,
  debtPayments,
  onSavePayment,
}: DebtsViewProps) {
  const [activeTab, setActiveTab] = useState<"piutang" | "hutang">("piutang");
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "paid">(
    "unpaid",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<{
    type: "purchase" | "sale";
    id: string;
    partnerName: string;
    date: string;
    dueDate?: string | null;
    totalAmount: number;
    amountPaid: number;
    remaining: number;
    status: string;
  } | null>(null);

  const [payAmount, setPayAmount] = useState<string>("");
  const [payDate, setPayDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [payNotes, setPayNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Normalize sales into Receivable items
  const receivableList = useMemo(() => {
    return sales.map((s) => {
      const total = Number(s.total_revenue || 0);
      const isPiutang = s.payment_status === "piutang";
      const paid = isPiutang
        ? Math.min(total, Number(s.amount_paid || 0))
        : total;
      const remaining = Math.max(0, total - paid);
      const isPaid = remaining <= 0 || !isPiutang;
      return {
        type: "sale" as const,
        id: s.id,
        partnerName: s.customer_name || "Pelanggan Umum",
        date: s.date,
        dueDate: s.due_date || null,
        totalAmount: total,
        amountPaid: paid,
        remaining,
        status: isPaid ? "lunas" : "piutang",
        isOverdue:
          !isPaid && Boolean(s.due_date && s.due_date < todayStr),
      };
    });
  }, [sales, todayStr]);

  // Normalize purchases into Payable items
  const payableList = useMemo(() => {
    return purchases.map((p) => {
      const total = Number(p.total_value || 0);
      const isHutang = p.payment_status === "hutang";
      const paid = isHutang
        ? Math.min(total, Number(p.amount_paid || 0))
        : total;
      const remaining = Math.max(0, total - paid);
      const isPaid = remaining <= 0 || !isHutang;
      return {
        type: "purchase" as const,
        id: p.id,
        partnerName: p.supplierName || "Supplier Umum",
        date: p.date,
        dueDate: p.due_date || null,
        totalAmount: total,
        amountPaid: paid,
        remaining,
        status: isPaid ? "lunas" : "hutang",
        isOverdue:
          !isPaid && Boolean(p.due_date && p.due_date < todayStr),
      };
    });
  }, [purchases, todayStr]);

  const summary = useMemo(() => {
    const unpaidReceivables = receivableList.filter((r) => r.remaining > 0);
    const unpaidPayables = payableList.filter((p) => p.remaining > 0);

    const totalPiutang = unpaidReceivables.reduce(
      (sum, r) => sum + r.remaining,
      0,
    );
    const totalHutang = unpaidPayables.reduce((sum, p) => sum + p.remaining, 0);
    const overdueCount =
      unpaidReceivables.filter((r) => r.isOverdue).length +
      unpaidPayables.filter((p) => p.isOverdue).length;

    return {
      totalPiutang,
      piutangCount: unpaidReceivables.length,
      totalHutang,
      hutangCount: unpaidPayables.length,
      netBalance: totalPiutang - totalHutang,
      overdueCount,
    };
  }, [receivableList, payableList]);

  const activeItems = useMemo(() => {
    const source = activeTab === "piutang" ? receivableList : payableList;
    return source.filter((item) => {
      const matchSearch =
        item.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      if (statusFilter === "unpaid") return item.remaining > 0;
      if (statusFilter === "paid") return item.remaining <= 0;
      return true;
    });
  }, [activeTab, receivableList, payableList, searchTerm, statusFilter]);

  const selectedRecordPayments = useMemo(() => {
    if (!selectedRecord) return [];
    return debtPayments.filter(
      (dp) =>
        dp.reference_type === selectedRecord.type &&
        dp.reference_id === selectedRecord.id,
    );
  }, [selectedRecord, debtPayments]);

  const handleOpenModal = (item: (typeof activeItems)[0]) => {
    setSelectedRecord(item);
    setPayAmount(item.remaining > 0 ? String(item.remaining) : "");
    setPayNotes("");
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    const num = Number(payAmount || 0);
    if (num <= 0 || num > selectedRecord.remaining) {
      alert(
        `Nominal pembayaran harus antara Rp 1 hingga ${formatCurrency(selectedRecord.remaining)}`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSavePayment({
        id: generateUUID(),
        reference_type: selectedRecord.type,
        reference_id: selectedRecord.id,
        amount: num,
        payment_date: payDate,
        notes:
          payNotes.trim() ||
          (num >= selectedRecord.remaining
            ? "Pelunasan Tagihan"
            : "Pembayaran Cicilan"),
      });
      setSelectedRecord(null);
      setPayAmount("");
      setPayNotes("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">
            Manajemen Hutang & Piutang
          </h1>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
            Pantau tagihan piutang pelanggan, hutang pembelian ke supplier, dan
            riwayat cicilan pelunasan.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Total Piutang Pelanggan
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.totalPiutang)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {summary.piutangCount} nota penjualan belum lunas
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Total Hutang ke Supplier
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <p className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
            {formatCurrency(summary.totalHutang)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {summary.hutangCount} set pembelian belum lunas
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Selisih Bersih (Piutang - Hutang)
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet size={18} />
            </div>
          </div>
          <p
            className={cn(
              "text-xl font-black font-mono",
              summary.netBalance >= 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
            {formatCurrency(summary.netBalance)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Estimasi arus kas masuk bersih
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Lewat Jatuh Tempo
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-xl font-black font-mono text-red-600 dark:text-red-400">
            {summary.overdueCount} Tagihan
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Perlu segera ditindaklanjuti
          </p>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab("piutang")}
              className={cn(
                "flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                activeTab === "piutang"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
              )}
            >
              <ArrowDownLeft size={15} />
              Piutang Pelanggan ({summary.piutangCount})
            </button>
            <button
              onClick={() => setActiveTab("hutang")}
              className={cn(
                "flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                activeTab === "hutang"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
              )}
            >
              <ArrowUpRight size={15} />
              Hutang Supplier ({summary.hutangCount})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl gap-1">
              {[
                { id: "unpaid", label: "Belum Lunas" },
                { id: "paid", label: "Sudah Lunas" },
                { id: "all", label: "Semua" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                    statusFilter === st.id
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400",
                  )}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 sm:w-64">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                placeholder={
                  activeTab === "piutang"
                    ? "Cari pelanggan..."
                    : "Cari supplier..."
                }
                className="input-field w-full !pl-9 py-1.5 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <th className="px-6 py-4">Tanggal & Jatuh Tempo</th>
                <th className="px-6 py-4">
                  {activeTab === "piutang" ? "Pelanggan" : "Supplier"}
                </th>
                <th className="px-6 py-4 text-right">Total Tagihan</th>
                <th className="px-6 py-4 text-right">Sudah Dibayar</th>
                <th className="px-6 py-4 text-right">Sisa Tagihan</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
              {activeItems.map((item) => {
                const progress =
                  item.totalAmount > 0
                    ? Math.min(
                        100,
                        Math.round((item.amountPaid / item.totalAmount) * 100),
                      )
                    : 100;
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900 dark:text-white">
                        {item.date}
                      </div>
                      {item.dueDate ? (
                        <div
                          className={cn(
                            "text-xs flex items-center gap-1 mt-0.5 font-medium",
                            item.isOverdue
                              ? "text-red-600 dark:text-red-400 font-bold"
                              : "text-zinc-400",
                          )}
                        >
                          <Calendar size={12} />
                          Tempo: {item.dueDate}
                          {item.isOverdue && " (Terlambat)"}
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-400">
                          Tanpa batas tempo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            activeTab === "piutang"
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {activeTab === "piutang" ? (
                            <User size={16} />
                          ) : (
                            <Truck size={16} />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900 dark:text-white">
                            {item.partnerName}
                          </p>
                          <p className="text-[10px] font-mono text-zinc-400">
                            #{item.id.substring(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-zinc-700 dark:text-zinc-300">
                      {formatCurrency(item.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.amountPaid)}
                      </div>
                      <div className="w-24 ml-auto mt-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-black text-amber-600 dark:text-amber-400">
                      {formatCurrency(item.remaining)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.remaining <= 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 size={12} />
                          Lunas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <Clock size={12} />
                          Belum Lunas ({progress}%)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all",
                          item.remaining > 0
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 shadow-sm"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200",
                        )}
                      >
                        {item.remaining > 0 ? (
                          <>
                            <Banknote size={14} />
                            Bayar / Cicil
                          </>
                        ) : (
                          <>
                            <History size={14} />
                            Riwayat
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {activeItems.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-zinc-400"
                  >
                    Tidak ada data{" "}
                    {activeTab === "piutang"
                      ? "piutang pelanggan"
                      : "hutang supplier"}{" "}
                    pada filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input Cicilan & Riwayat Pembayaran */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedRecord(null)}
          />
          <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-zinc-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {selectedRecord.type === "sale"
                    ? "Pembayaran Piutang Pelanggan"
                    : "Pembayaran Hutang Supplier"}
                </h3>
                <p className="text-xs text-zinc-400">
                  {selectedRecord.partnerName} • Nota #{selectedRecord.id.substring(0, 8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 hover:bg-white/10 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Ringkasan Tagihan */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase text-zinc-400">
                    Total Tagihan
                  </p>
                  <p className="font-mono font-bold text-sm dark:text-white mt-0.5">
                    {formatCurrency(selectedRecord.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-zinc-400">
                    Sudah Dibayar
                  </p>
                  <p className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(selectedRecord.amountPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-zinc-400">
                    Sisa Tagihan
                  </p>
                  <p className="font-mono font-black text-sm text-amber-600 dark:text-amber-400 mt-0.5">
                    {formatCurrency(selectedRecord.remaining)}
                  </p>
                </div>
              </div>

              {/* Form Input Cicilan Baru */}
              {selectedRecord.remaining > 0 && (
                <form
                  onSubmit={handleSubmitPayment}
                  className="space-y-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                      Catat Pembayaran Baru
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        setPayAmount(String(selectedRecord.remaining))
                      }
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Isi Lunasi Semua ({formatCurrency(selectedRecord.remaining)})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                        Nominal Bayar (Rp)
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max={selectedRecord.remaining}
                        className="input-field w-full font-mono"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                        Tanggal Bayar
                      </label>
                      <input
                        type="date"
                        required
                        className="input-field w-full"
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                      Catatan / Metode (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Cicilan ke-2 via Transfer BCA / Tunai"
                      className="input-field w-full"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2 font-bold"
                  >
                    <Plus size={18} />
                    {isSubmitting ? "Menyimpan..." : "Simpan Pembayaran"}
                  </button>
                </form>
              )}

              {/* Riwayat Cicilan */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                  <History size={14} />
                  Riwayat Pembayaran ({selectedRecordPayments.length})
                </h4>
                {selectedRecordPayments.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic py-4 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                    Belum ada riwayat cicilan tercatat.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedRecordPayments.map((dp) => (
                      <div
                        key={dp.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-xs"
                      >
                        <div>
                          <p className="font-bold text-zinc-900 dark:text-white">
                            {dp.notes || "Pembayaran"}
                          </p>
                          <p className="text-zinc-400">
                            {dp.payment_date}{" "}
                            {dp.created_by ? `• Oleh ${dp.created_by}` : ""}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(dp.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

