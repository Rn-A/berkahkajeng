import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  BellRing,
  CheckCheck,
  AlertTriangle,
  Clock,
  Info,
  CheckCircle2,
  ChevronRight,
  Smartphone,
  X,
} from "lucide-react";
import {
  AppNotification,
  getDeviceNotificationPermission,
  requestDeviceNotificationPermission,
  sendSystemNotification,
} from "../lib/notifications";
import { cn } from "../lib/utils";

interface NotificationBellProps {
  notifications: AppNotification[];
  readIds: string[];
  onMarkAllRead: () => void;
  onMarkOneRead: (id: string) => void;
  onSelectNotification: (notif: AppNotification) => void;
  isMobile?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  readIds,
  onMarkAllRead,
  onMarkOneRead,
  onSelectNotification,
  isMobile = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => getDeviceNotificationPermission());
  const [testSent, setTestSent] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadNotifications = notifications.filter(
    (n) => !readIds.includes(n.id),
  );
  const unreadCount = unreadNotifications.length;
  const hasCritical = unreadNotifications.some(
    (n) => n.severity === "critical",
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleEnablePermission = async () => {
    const res = await requestDeviceNotificationPermission();
    setPermission(res);
    if (res === "granted") {
      await sendSystemNotification(
        "✅ Notifikasi Berkah Kajeng Aktif!",
        "Anda akan menerima pengingat jatuh tempo hutang/piutang, presensi harian, dan laporan transaksi di perangkat ini.",
        "bk-welcome-notif",
        "dashboard",
      );
    }
  };

  const handleTestNotification = async () => {
    const ok = await sendSystemNotification(
      "🔔 Uji Notifikasi Berkah Kajeng",
      "Sistem notifikasi Android APK & PWA iOS berfungsi dengan baik!",
      `bk-test-${Date.now()}`,
      "dashboard",
    );
    if (ok) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "relative flex items-center justify-center transition-all rounded-full",
          isMobile
            ? "w-9 h-9 bg-white/10 text-white hover:bg-white/20"
            : "w-10 h-10 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white",
        )}
        title="Pusat Notifikasi & Pengingat"
        aria-label="Pusat Notifikasi & Pengingat"
      >
        {unreadCount > 0 ? (
          <BellRing
            size={isMobile ? 18 : 20}
            className={cn(
              hasCritical
                ? "text-rose-500 animate-bounce"
                : "text-amber-500 dark:text-amber-400",
            )}
          />
        ) : (
          <Bell size={isMobile ? 18 : 20} />
        )}

        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center text-white shadow-sm",
              hasCritical ? "bg-rose-600" : "bg-emerald-600",
            )}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={cn(
            "fixed md:absolute z-[120] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col",
            isMobile
              ? "inset-x-3 top-16 max-h-[82vh]"
              : "right-0 mt-3 w-[410px] max-h-[80vh]",
          )}
        >
          {/* Header */}
          <div className="p-4 bg-zinc-900 text-white flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <BellRing className="w-5 h-5 text-emerald-400" />
              <div>
                <h4 className="font-bold text-sm leading-tight">
                  Pusat Notifikasi & Pengingat
                </h4>
                <p className="text-[11px] text-zinc-400">
                  {unreadCount > 0
                    ? `${unreadCount} pengingat belum dibaca`
                    : "Semua pengingat sudah dibaca"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors"
                  title="Tandai semua sudah dibaca"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Baca Semua
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Device Push / System Notification Banner (Android APK & iOS PWA) */}
          <div className="px-4 py-3 bg-stone-50 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Smartphone className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <div className="text-xs leading-snug">
                {permission === "granted" ? (
                  <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                    Notifikasi Layar HP Aktif (Android / PWA iOS)
                  </span>
                ) : permission === "denied" ? (
                  <span className="text-rose-600 dark:text-rose-400 font-medium">
                    Izin notifikasi HP diblokir di pengaturan browser/HP.
                  </span>
                ) : permission === "unsupported" ? (
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Di iPhone (iOS): gunakan menu{" "}
                    <b>Share &gt; Add to Home Screen</b> untuk mengaktifkan
                    notifikasi layar.
                  </span>
                ) : (
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                    Aktifkan pop-up notifikasi di layar atas HP Anda
                  </span>
                )}
              </div>
            </div>

            {permission === "default" && (
              <button
                type="button"
                onClick={handleEnablePermission}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shrink-0 shadow-sm transition-all"
              >
                Aktifkan
              </button>
            )}

            {permission === "granted" && (
              <button
                type="button"
                onClick={handleTestNotification}
                className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 rounded-lg text-[11px] font-bold shrink-0 transition-all"
              >
                {testSent ? "Terkirim!" : "Tes Pop-up"}
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  Tidak Ada Tagihan / Tugas Mendesak
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Semua presensi, stok kayu, dan hutang/piutang dalam kondisi
                  terkendali.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isRead = readIds.includes(notif.id);
                return (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => {
                      onMarkOneRead(notif.id);
                      onSelectNotification(notif);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors flex items-start gap-3.5",
                      !isRead && "bg-emerald-50/40 dark:bg-emerald-950/20",
                    )}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5",
                        notif.severity === "critical"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                          : notif.severity === "warning"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                            : notif.severity === "success"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                              : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400",
                      )}
                    >
                      {notif.severity === "critical" ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : notif.severity === "warning" ? (
                        <Clock className="w-4 h-4" />
                      ) : notif.severity === "success" ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={cn(
                            "text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md",
                            notif.severity === "critical"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : notif.severity === "warning"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : notif.severity === "success"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                          )}
                        >
                          {notif.badgeText || "Info"}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          {notif.timestamp}
                        </span>
                      </div>

                      <p
                        className={cn(
                          "text-xs text-zinc-900 dark:text-zinc-100 leading-snug",
                          !isRead ? "font-extrabold" : "font-semibold",
                        )}
                      >
                        {notif.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    <div className="flex flex-col items-end justify-between self-stretch">
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      )}
                      <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 mt-auto" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default NotificationBell;

