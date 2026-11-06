import React, { useState, useMemo } from "react";
import {
  UserCheck,
  Users,
  Wallet,
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Banknote,
  Trash2,
  Edit3,
  FileText,
  Printer,
  Check,
  Search,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Employee, Attendance, Payroll, User } from "../types";
import ConfirmationModal from "./ConfirmationModal";

interface PayrollViewProps {
  employees: Employee[];
  attendance: Attendance[];
  payrolls: Payroll[];
  currentUser: User | null;
  onSaveEmployee: (emp: Partial<Employee>) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onSaveAttendance: (records: Partial<Attendance>[]) => Promise<void>;
  onSavePayroll: (payroll: Partial<Payroll> & { attendance_ids?: string[] }) => Promise<void>;
  onDeletePayroll: (id: string) => Promise<void>;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  employees,
  attendance,
  payrolls,
  currentUser,
  onSaveEmployee,
  onDeleteEmployee,
  onSaveAttendance,
  onSavePayroll,
  onDeletePayroll,
}) => {
  const isOwner = currentUser?.role === "owner";

  const [activeTab, setActiveTab] = useState<"attendance" | "payroll" | "employees">("attendance");

  // --- TAB 1: PRESENSI HARIAN STATE ---
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [draftAttendance, setDraftAttendance] = useState<
    Record<
      string,
      {
        status: "hadir" | "setengah_hari" | "izin" | "alfa";
        overtime_pay: string;
        cash_advance: string;
        notes: string;
      }
    >
  >({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceSavedToast, setAttendanceSavedToast] = useState(false);

  // Active employees
  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status !== "nonaktif"),
    [employees]
  );

  // Get attendance record for an employee on selectedDate (either from draft or saved attendance)
  const getEmpAttendanceForDate = (empId: string) => {
    if (draftAttendance[empId]) {
      return draftAttendance[empId];
    }
    const existing = attendance.find(
      (a) => String(a.employee_id) === String(empId) && a.date === selectedDate
    );
    if (existing) {
      return {
        status: existing.status,
        overtime_pay: existing.overtime_pay ? String(existing.overtime_pay) : "",
        cash_advance: existing.cash_advance ? String(existing.cash_advance) : "",
        notes: existing.notes || "",
      };
    }
    return {
      status: "hadir" as const,
      overtime_pay: "",
      cash_advance: "",
      notes: "",
    };
  };

  const isEmpPaidOnDate = (empId: string) => {
    const existing = attendance.find(
      (a) => String(a.employee_id) === String(empId) && a.date === selectedDate
    );
    return existing?.payroll_id != null;
  };

  const hasSavedAttendanceOnDate = (empId: string) => {
    return attendance.some(
      (a) => String(a.employee_id) === String(empId) && a.date === selectedDate
    );
  };

  const updateDraft = (
    empId: string,
    field: "status" | "overtime_pay" | "cash_advance" | "notes",
    value: string
  ) => {
    const current = getEmpAttendanceForDate(empId);
    setDraftAttendance((prev) => ({
      ...prev,
      [empId]: {
        ...current,
        [field]: value,
      },
    }));
  };

  const handleMarkAllHadir = () => {
    const nextDraft: typeof draftAttendance = { ...draftAttendance };
    activeEmployees.forEach((emp) => {
      if (!isEmpPaidOnDate(emp.id)) {
        const cur = getEmpAttendanceForDate(emp.id);
        nextDraft[emp.id] = {
          ...cur,
          status: "hadir",
        };
      }
    });
    setDraftAttendance(nextDraft);
  };

  const handleSaveDailyAttendance = async () => {
    if (activeEmployees.length === 0) return;
    setIsSavingAttendance(true);
    try {
      const recordsToSave: Partial<Attendance>[] = activeEmployees
        .filter((emp) => !isEmpPaidOnDate(emp.id))
        .map((emp) => {
          const entry = getEmpAttendanceForDate(emp.id);
          return {
            employee_id: emp.id,
            date: selectedDate,
            status: entry.status,
            overtime_pay: Number(entry.overtime_pay) || 0,
            cash_advance: Number(entry.cash_advance) || 0,
            notes: entry.notes,
          };
        });

      await onSaveAttendance(recordsToSave);
      setDraftAttendance({});
      setAttendanceSavedToast(true);
      setTimeout(() => setAttendanceSavedToast(false), 3000);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // --- TAB 2: PENGGAJIAN / PENCAIRAN GAJI STATE ---
  const [periodStart, setPeriodStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split("T")[0];
  });
  const [periodEnd, setPeriodEnd] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [payingEmployeeId, setPayingEmployeeId] = useState<string | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<Payroll | null>(null);
  const [deletePayrollId, setDeletePayrollId] = useState<string | null>(null);

  // Calculate unpaid attendance per employee within [periodStart, periodEnd]
  const payrollCalculations = useMemo(() => {
    return employees.map((emp) => {
      const empUnpaidRecords = attendance.filter(
        (a) =>
          String(a.employee_id) === String(emp.id) &&
          a.date >= periodStart &&
          a.date <= periodEnd &&
          (a.payroll_id === null || a.payroll_id === undefined)
      );

      const totalHadir = empUnpaidRecords.filter((a) => a.status === "hadir").length;
      const totalSetengah = empUnpaidRecords.filter(
        (a) => a.status === "setengah_hari"
      ).length;
      const totalIzin = empUnpaidRecords.filter((a) => a.status === "izin").length;
      const totalAlfa = empUnpaidRecords.filter((a) => a.status === "alfa").length;

      const dailyWage = Number(emp.daily_wage) || 0;
      const baseSalary =
        totalHadir * dailyWage + totalSetengah * 0.5 * dailyWage;
      const totalOvertime = empUnpaidRecords.reduce(
        (sum, a) => sum + (Number(a.overtime_pay) || 0),
        0
      );
      const totalDeduction = empUnpaidRecords.reduce(
        (sum, a) => sum + (Number(a.cash_advance) || 0),
        0
      );
      const netSalary = baseSalary + totalOvertime - totalDeduction;

      return {
        employee: emp,
        records: empUnpaidRecords,
        totalHadir,
        totalSetengah,
        totalIzin,
        totalAlfa,
        dailyWage,
        baseSalary,
        totalOvertime,
        totalDeduction,
        netSalary,
      };
    });
  }, [employees, attendance, periodStart, periodEnd]);

  const handleDisburseSalary = async (calc: (typeof payrollCalculations)[0]) => {
    if (calc.records.length === 0) return;
    setPayingEmployeeId(calc.employee.id);
    try {
      await onSavePayroll({
        employee_id: calc.employee.id,
        employee_name: calc.employee.name,
        period_start: periodStart,
        period_end: periodEnd,
        payment_date: new Date().toISOString().split("T")[0],
        total_hadir: calc.totalHadir,
        total_setengah_hari: calc.totalSetengah,
        daily_wage: calc.dailyWage,
        base_salary: calc.baseSalary,
        total_overtime: calc.totalOvertime,
        total_deduction: calc.totalDeduction,
        net_salary: calc.netSalary,
        notes: `Gaji ${calc.employee.name} (${periodStart} s/d ${periodEnd})`,
        attendance_ids: calc.records.map((r) => r.id),
      });
    } finally {
      setPayingEmployeeId(null);
    }
  };

  // --- TAB 3: DATA KARYAWAN STATE ---
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empName, setEmpName] = useState("");
  const [empPosition, setEmpPosition] = useState("Pekerja Logyard");
  const [empPhone, setEmpPhone] = useState("");
  const [empWage, setEmpWage] = useState("");
  const [empStatus, setEmpStatus] = useState<"aktif" | "nonaktif">("aktif");
  const [isSavingEmp, setIsSavingEmp] = useState(false);
  const [deleteEmpId, setDeleteEmpId] = useState<string | null>(null);

  const openAddEmpModal = () => {
    setEditingEmp(null);
    setEmpName("");
    setEmpPosition("Pekerja Logyard");
    setEmpPhone("");
    setEmpWage("100000");
    setEmpStatus("aktif");
    setShowEmpModal(true);
  };

  const openEditEmpModal = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpName(emp.name);
    setEmpPosition(emp.position);
    setEmpPhone(emp.phone || "");
    setEmpWage(String(emp.daily_wage));
    setEmpStatus(emp.status || "aktif");
    setShowEmpModal(true);
  };

  const handleSaveEmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empWage) return;
    setIsSavingEmp(true);
    try {
      await onSaveEmployee({
        id: editingEmp?.id,
        name: empName,
        position: empPosition || "Pekerja Logyard",
        phone: empPhone,
        daily_wage: Number(empWage) || 0,
        status: empStatus,
      });
      setShowEmpModal(false);
    } finally {
      setIsSavingEmp(false);
    }
  };

  // Summary metrics
  const todayStats = useMemo(() => {
    let hadir = 0;
    let setengah = 0;
    let izinAlfa = 0;
    activeEmployees.forEach((emp) => {
      const rec = getEmpAttendanceForDate(emp.id);
      if (rec.status === "hadir") hadir++;
      else if (rec.status === "setengah_hari") setengah++;
      else izinAlfa++;
    });
    return { hadir, setengah, izinAlfa };
  }, [activeEmployees, attendance, selectedDate, draftAttendance]);

  const totalUnpaidSalaryInPeriod = useMemo(
    () =>
      payrollCalculations.reduce(
        (sum, c) => sum + (c.records.length > 0 ? Math.max(0, c.netSalary) : 0),
        0
      ),
    [payrollCalculations]
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Navigation Tabs */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-700" />
            Presensi Harian & Penggajian Karyawan
          </h3>
          <p className="text-stone-500 text-sm mt-1">
            Catat kehadiran pekerja harian, lembur, kasbon, dan cairkan gaji otomatis ke pengeluaran operasional.
          </p>
        </div>

        <div className="flex flex-wrap bg-stone-100 p-1.5 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === "attendance"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Presensi Harian
          </button>

          {isOwner && (
            <button
              onClick={() => setActiveTab("payroll")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === "payroll"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Wallet className="w-4 h-4" />
              Penggajian & Slip
              {totalUnpaidSalaryInPeriod > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-400 text-stone-950 font-black">
                  !
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab("employees")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === "employees"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Users className="w-4 h-4" />
            Data Karyawan ({activeEmployees.length})
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: PRESENSI HARIAN                                                */}
      {/* ===================================================================== */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Date Selector & Quick Actions */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                  Tanggal Presensi
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setDraftAttendance({});
                  }}
                  className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 md:pt-0">
                <div className="px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-800">
                  Hadir Penuh: {todayStats.hadir}
                </div>
                <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs font-bold text-amber-800">
                  Setengah Hari: {todayStats.setengah}
                </div>
                <div className="px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-600">
                  Izin/Alfa: {todayStats.izinAlfa}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleMarkAllHadir}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all"
              >
                Set Hadir Semua
              </button>
              <button
                type="button"
                disabled={isSavingAttendance || activeEmployees.length === 0}
                onClick={handleSaveDailyAttendance}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {isSavingAttendance ? "Menyimpan..." : "Simpan Presensi Tanggal Ini"}
              </button>
            </div>
          </div>

          {attendanceSavedToast && (
            <div className="bg-emerald-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-bold animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Data presensi tanggal {selectedDate} berhasil disimpan!
            </div>
          )}

          {activeEmployees.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-4">
              <Users className="w-12 h-12 text-stone-300 mx-auto" />
              <div>
                <h4 className="text-lg font-bold text-stone-800">
                  Belum Ada Data Karyawan Aktif
                </h4>
                <p className="text-sm text-stone-500 mt-1">
                  Tambahkan daftar pekerja harian/mandor terlebih dahulu di tab Data Karyawan.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveTab("employees");
                  openAddEmpModal();
                }}
                className="px-5 py-2.5 bg-emerald-800 text-white rounded-xl text-sm font-bold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tambah Karyawan Pertama
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50/80 text-stone-400 text-[11px] uppercase tracking-wider border-b border-stone-100">
                      <th className="px-5 py-3.5 font-semibold">Nama Pekerja & Jabatan</th>
                      <th className="px-5 py-3.5 font-semibold">Upah / Hari</th>
                      <th className="px-5 py-3.5 font-semibold">Status Kehadiran</th>
                      <th className="px-5 py-3.5 font-semibold">Bonus / Lembur (Rp)</th>
                      <th className="px-5 py-3.5 font-semibold">Kasbon / Potongan (Rp)</th>
                      <th className="px-5 py-3.5 font-semibold">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm">
                    {activeEmployees.map((emp) => {
                      const entry = getEmpAttendanceForDate(emp.id);
                      const isPaid = isEmpPaidOnDate(emp.id);
                      const isSaved = hasSavedAttendanceOnDate(emp.id);

                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-stone-50/60 transition-colors ${
                            isPaid ? "bg-emerald-50/30" : ""
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div className="font-bold text-stone-900 flex items-center gap-2">
                              {emp.name}
                              {isPaid && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                                  Sudah Digaji
                                </span>
                              )}
                              {!isPaid && isSaved && !draftAttendance[emp.id] && (
                                <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md text-[10px] font-bold">
                                  Tersimpan
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-stone-500">{emp.position}</div>
                          </td>

                          <td className="px-5 py-4 font-semibold text-stone-700 whitespace-nowrap">
                            Rp {Number(emp.daily_wage).toLocaleString("id-ID")}
                          </td>

                          <td className="px-5 py-4">
                            <div className="inline-flex bg-stone-100 p-1 rounded-xl gap-1">
                              {(
                                [
                                  { id: "hadir", label: "Hadir (100%)", activeClass: "bg-emerald-700 text-white" },
                                  { id: "setengah_hari", label: "1/2 Hari (50%)", activeClass: "bg-amber-600 text-white" },
                                  { id: "izin", label: "Izin", activeClass: "bg-sky-600 text-white" },
                                  { id: "alfa", label: "Alfa", activeClass: "bg-rose-600 text-white" },
                                ] as const
                              ).map((st) => (
                                <button
                                  key={st.id}
                                  type="button"
                                  disabled={isPaid}
                                  onClick={() => updateDraft(emp.id, "status", st.id)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                    entry.status === st.id
                                      ? `${st.activeClass} shadow-sm`
                                      : "text-stone-600 hover:text-stone-900"
                                  } disabled:opacity-60`}
                                >
                                  {st.label}
                                </button>
                              ))}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <input
                              type="number"
                              min="0"
                              disabled={isPaid}
                              placeholder="0"
                              value={entry.overtime_pay}
                              onChange={(e) =>
                                updateDraft(emp.id, "overtime_pay", e.target.value)
                              }
                              className="w-32 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm font-semibold text-emerald-800 focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
                            />
                          </td>

                          <td className="px-5 py-4">
                            <input
                              type="number"
                              min="0"
                              disabled={isPaid}
                              placeholder="0"
                              value={entry.cash_advance}
                              onChange={(e) =>
                                updateDraft(emp.id, "cash_advance", e.target.value)
                              }
                              className="w-32 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm font-semibold text-rose-700 focus:ring-2 focus:ring-rose-500 outline-none disabled:opacity-60"
                            />
                          </td>

                          <td className="px-5 py-4">
                            <input
                              type="text"
                              disabled={isPaid}
                              placeholder="Ket. lembur/kasbon..."
                              value={entry.notes}
                              onChange={(e) =>
                                updateDraft(emp.id, "notes", e.target.value)
                              }
                              className="w-44 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: PENGGAJIAN & SLIP GAJI (OWNER ONLY)                            */}
      {/* ===================================================================== */}
      {activeTab === "payroll" && isOwner && (
        <div className="space-y-6">
          {/* Period Filter & Total Unpaid Banner */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-800"
                />
              </div>
            </div>

            <div className="bg-emerald-900 text-white px-5 py-3.5 rounded-2xl flex items-center gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold">
                  Total Gaji Belum Dicairkan (Periode Ini)
                </p>
                <p className="text-xl font-black">
                  Rp {totalUnpaidSalaryInPeriod.toLocaleString("id-ID")}
                </p>
              </div>
              <Banknote className="w-8 h-8 text-emerald-400 opacity-80" />
            </div>
          </div>

          {/* Perhitungan Gaji Karyawan (Unpaid Attendance in Period) */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-stone-900">
                  Kalkulasi Gaji Berdasarkan Presensi Belum Dibayar
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Saat tombol <b>Cairkan Gaji</b> ditekan, sistem otomatis mencatat pengeluaran kategori <b>Gaji & Upah</b> dan menandai presensi sebagai lunas.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50/80 text-stone-400 text-[11px] uppercase tracking-wider border-b border-stone-100">
                    <th className="px-5 py-3.5 font-semibold">Karyawan</th>
                    <th className="px-5 py-3.5 font-semibold">Rekap Kehadiran</th>
                    <th className="px-5 py-3.5 font-semibold">Gaji Pokok</th>
                    <th className="px-5 py-3.5 font-semibold">+ Lembur/Bonus</th>
                    <th className="px-5 py-3.5 font-semibold">- Kasbon</th>
                    <th className="px-5 py-3.5 font-semibold">Gaji Bersih (Take Home)</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Aksi Pencairan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {payrollCalculations.map((calc) => (
                    <tr key={calc.employee.id} className="hover:bg-stone-50/50">
                      <td className="px-5 py-4">
                        <div className="font-bold text-stone-900">
                          {calc.employee.name}
                        </div>
                        <div className="text-xs text-stone-500">
                          {calc.employee.position} • Rp{" "}
                          {calc.dailyWage.toLocaleString("id-ID")}/hari
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {calc.records.length === 0 ? (
                          <span className="text-xs text-stone-400 italic">
                            Tidak ada presensi belum dibayar
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                            {calc.totalHadir > 0 && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                                {calc.totalHadir} Hari Penuh
                              </span>
                            )}
                            {calc.totalSetengah > 0 && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                                {calc.totalSetengah} Setengah Hari
                              </span>
                            )}
                            {(calc.totalIzin > 0 || calc.totalAlfa > 0) && (
                              <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md">
                                {calc.totalIzin + calc.totalAlfa} Izin/Alfa
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 font-semibold text-stone-700 whitespace-nowrap">
                        Rp {calc.baseSalary.toLocaleString("id-ID")}
                      </td>

                      <td className="px-5 py-4 font-semibold text-emerald-700 whitespace-nowrap">
                        + Rp {calc.totalOvertime.toLocaleString("id-ID")}
                      </td>

                      <td className="px-5 py-4 font-semibold text-rose-600 whitespace-nowrap">
                        - Rp {calc.totalDeduction.toLocaleString("id-ID")}
                      </td>

                      <td className="px-5 py-4 font-black text-stone-900 whitespace-nowrap">
                        Rp {calc.netSalary.toLocaleString("id-ID")}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {calc.records.length > 0 ? (
                          <button
                            onClick={() => handleDisburseSalary(calc)}
                            disabled={payingEmployeeId === calc.employee.id}
                            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 whitespace-nowrap"
                          >
                            {payingEmployeeId === calc.employee.id
                              ? "Memproses..."
                              : "Cairkan Gaji & Catat Pengeluaran"}
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-stone-400">
                            Sudah Lunas / Kosong
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Riwayat Pencairan Gaji & Slip Gaji */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-stone-100">
              <h4 className="font-bold text-stone-900">
                Riwayat Pencairan Gaji & Arsip Slip Gaji
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50/80 text-stone-400 text-[11px] uppercase tracking-wider border-b border-stone-100">
                    <th className="px-5 py-3.5 font-semibold">Tgl Bayar</th>
                    <th className="px-5 py-3.5 font-semibold">Karyawan</th>
                    <th className="px-5 py-3.5 font-semibold">Periode Kerja</th>
                    <th className="px-5 py-3.5 font-semibold">Kehadiran</th>
                    <th className="px-5 py-3.5 font-semibold">Gaji Bersih</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Slip / Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {payrolls.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-8 text-center text-stone-400 italic"
                      >
                        Belum ada riwayat pencairan gaji.
                      </td>
                    </tr>
                  ) : (
                    payrolls.map((p) => (
                      <tr key={p.id} className="hover:bg-stone-50/50">
                        <td className="px-5 py-3.5 font-semibold text-stone-700 whitespace-nowrap">
                          {p.payment_date}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-stone-900">
                            {p.employee_name}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-stone-600 whitespace-nowrap">
                          {p.period_start} s/d {p.period_end}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-stone-700">
                          {p.total_hadir} Hadir, {p.total_setengah_hari} Setengah Hari
                        </td>
                        <td className="px-5 py-3.5 font-black text-emerald-800 whitespace-nowrap">
                          Rp {Number(p.net_salary).toLocaleString("id-ID")}
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedSlip(p)}
                            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Slip Gaji
                          </button>
                          <button
                            onClick={() => setDeletePayrollId(p.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Batalkan Pencairan Gaji"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: DATA KARYAWAN                                                  */}
      {/* ===================================================================== */}
      {activeTab === "employees" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-stone-900">
                Daftar Pekerja & Tarif Upah Harian
              </h4>
              <p className="text-xs text-stone-500">
                Kelola daftar pekerja logyard, operator chainsaw, kuli bongkar muat, dan mandor.
              </p>
            </div>
            <button
              onClick={openAddEmpModal}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Tambah Karyawan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase mb-2 ${
                        emp.status === "aktif"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {emp.status}
                    </span>
                    <h5 className="font-bold text-stone-900 text-base">
                      {emp.name}
                    </h5>
                    <p className="text-xs text-stone-500">{emp.position}</p>
                    {emp.phone && (
                      <p className="text-xs text-stone-400 mt-1">{emp.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditEmpModal(emp)}
                      className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {isOwner && (
                      <button
                        onClick={() => setDeleteEmpId(emp.id)}
                        className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-stone-400 font-semibold">
                    Tarif Upah Harian
                  </span>
                  <span className="text-sm font-black text-emerald-800">
                    Rp {Number(emp.daily_wage).toLocaleString("id-ID")} / hari
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT KARYAWAN */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <h4 className="text-lg font-bold text-stone-900">
              {editingEmp ? "Edit Data Karyawan" : "Tambah Karyawan Baru"}
            </h4>
            <form onSubmit={handleSaveEmpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                  Nama Lengkap Pekerja
                </label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="Contoh: Pak Slamet"
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                  Jabatan / Peran Kerja
                </label>
                <input
                  type="text"
                  required
                  value={empPosition}
                  onChange={(e) => setEmpPosition(e.target.value)}
                  placeholder="Contoh: Operator Chainsaw / Kuli Muat"
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                    Upah Harian (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={empWage}
                    onChange={(e) => setEmpWage(e.target.value)}
                    placeholder="100000"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                    Status Kerja
                  </label>
                  <select
                    value={empStatus}
                    onChange={(e) =>
                      setEmpStatus(e.target.value as "aktif" | "nonaktif")
                    }
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                  No. HP / WhatsApp (Opsional)
                </label>
                <input
                  type="text"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  placeholder="0812..."
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEmpModal(false)}
                  className="px-4 py-2.5 bg-stone-100 text-stone-700 rounded-xl text-sm font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEmp}
                  className="px-5 py-2.5 bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-md"
                >
                  {isSavingEmp ? "Menyimpan..." : "Simpan Karyawan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SLIP GAJI */}
      {selectedSlip && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="text-center border-b border-dashed border-stone-200 pb-4">
              <h4 className="text-lg font-black text-emerald-950 uppercase tracking-wider">
                UD. BERKAH KAJENG
              </h4>
              <p className="text-xs text-stone-500 font-semibold">
                SLIP PEMBAYARAN GAJI & UPAH KERJA
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Nama Pekerja:</span>
                <span className="font-bold text-stone-900">
                  {selectedSlip.employee_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Periode Absensi:</span>
                <span className="font-semibold text-stone-700">
                  {selectedSlip.period_start} s/d {selectedSlip.period_end}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Tanggal Cair:</span>
                <span className="font-semibold text-stone-700">
                  {selectedSlip.payment_date}
                </span>
              </div>
            </div>

            <div className="bg-stone-50 p-4 rounded-2xl space-y-2.5 text-sm border border-stone-200/80">
              <div className="flex justify-between">
                <span className="text-stone-600">
                  Upah Harian ({selectedSlip.total_hadir} hari penuh,{" "}
                  {selectedSlip.total_setengah_hari} setengah hari)
                </span>
                <span className="font-bold text-stone-900">
                  Rp {Number(selectedSlip.base_salary).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Bonus / Lembur</span>
                <span className="font-bold">
                  + Rp {Number(selectedSlip.total_overtime).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Potongan Kasbon</span>
                <span className="font-bold">
                  - Rp {Number(selectedSlip.total_deduction).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="pt-2.5 border-t border-stone-200 flex justify-between items-center text-base">
                <span className="font-black text-stone-900">TOTAL DITERIMA</span>
                <span className="font-black text-emerald-800 text-lg">
                  Rp {Number(selectedSlip.net_salary).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-sm font-bold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Cetak Slip
              </button>
              <button
                onClick={() => setSelectedSlip(null)}
                className="px-5 py-2.5 bg-emerald-800 text-white rounded-xl text-sm font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE EMPLOYEE */}
      <ConfirmationModal
        isOpen={deleteEmpId !== null}
        title="Hapus Data Karyawan"
        message="Apakah Anda yakin ingin menghapus/menonaktifkan karyawan ini?"
        onConfirm={async () => {
          if (deleteEmpId !== null) {
            await onDeleteEmployee(deleteEmpId);
            setDeleteEmpId(null);
          }
        }}
        onClose={() => setDeleteEmpId(null)}
      />

      {/* CONFIRM DELETE PAYROLL */}
      <ConfirmationModal
        isOpen={deletePayrollId !== null}
        title="Batalkan Pencairan Gaji"
        message="Membatalkan pencairan gaji ini juga akan otomatis menghapus catatan pengeluaran gaji terkait dan mengembalikan status presensi menjadi belum dibayar. Lanjutkan?"
        onConfirm={async () => {
          if (deletePayrollId !== null) {
            await onDeletePayroll(deletePayrollId);
            setDeletePayrollId(null);
          }
        }}
        onClose={() => setDeletePayrollId(null)}
      />
    </div>
  );
};

export default PayrollView;
