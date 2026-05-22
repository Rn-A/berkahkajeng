/**
 * Validation Utilities for Security
 */

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== "string") return false;
  if (email.length > 255) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password complexity
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export const isValidPassword = (password: string): boolean => {
  if (!password || typeof password !== "string") return false;
  if (password.length < 8) return false;

  return (
    /[A-Z]/.test(password) && // Uppercase
    /[a-z]/.test(password) && // Lowercase
    /[0-9]/.test(password) && // Number
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) // Special char
  );
};

/**
 * Sanitize string input - remove potentially dangerous characters
 */
export const sanitizeString = (str: string, maxLen: number = 255): string => {
  if (!str || typeof str !== "string")
    throw new Error("Invalid input: string required");
  if (str.length > maxLen)
    throw new Error(`Input exceeds maximum length of ${maxLen}`);

  // Only allow alphanumeric, spaces, and basic punctuation
  // Remove SQL injection attempts and XSS payloads
  const sanitized = str
    .replace(/[<>\"'`]/g, "") // Remove HTML/JS delimiters
    .replace(/;/g, "") // Remove statement terminators
    .trim();

  return sanitized;
};

/**
 * Validate and sanitize pagination parameters
 */
export const sanitizePagination = (
  limit: any,
  offset: any = 0,
): { limit: number; offset: number } => {
  const MAX_LIMIT = 100;
  const DEFAULT_LIMIT = 50;

  let lim = parseInt(limit);
  let off = parseInt(offset);

  if (isNaN(lim)) lim = DEFAULT_LIMIT;
  if (isNaN(off)) off = 0;

  lim = Math.min(Math.max(lim, 1), MAX_LIMIT);
  off = Math.max(off, 0);

  return { limit: lim, offset: off };
};

/**
 * Sanitize numeric input for financial calculations
 */
export const sanitizeNumber = (
  value: any,
  allowNegative: boolean = false,
): number => {
  const num = parseFloat(value);

  if (isNaN(num)) return 0;
  if (!allowNegative && num < 0) return 0;

  // Round to 2 decimal places to prevent floating point errors
  return Math.round(num * 100) / 100;
};

/**
 * Validate UUID format
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate date format (YYYY-MM-DD)
 */
export const isValidDate = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== "string") return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};
