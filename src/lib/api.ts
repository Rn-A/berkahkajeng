/**
 * Utility to resolve API URLs whether running in standard Web browser,
 * local development, or native mobile (Capacitor).
 */
export const getApiBaseUrl = (): string => {
  // If explicitly specified in .env (e.g. VITE_API_URL)
  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (envApiUrl) {
    return envApiUrl;
  }

  // Detect native mobile runtime (Capacitor)
  const isCapacitor =
    typeof window !== "undefined" &&
    (window.location.protocol === "capacitor:" ||
      window.location.protocol === "ionic:" ||
      Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
      // When Capacitor Android runs on https://localhost or http://localhost without custom port
      (window.location.hostname === "localhost" && !window.location.port));

  if (isCapacitor) {
    return "https://berkahkajeng.vercel.app";
  }

  // In standard browser environment, use relative path so proxies & current domain work seamlessly
  return "";
};

export const apiUrl = (endpoint: string): string => {
  const base = getApiBaseUrl();
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
};
