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
