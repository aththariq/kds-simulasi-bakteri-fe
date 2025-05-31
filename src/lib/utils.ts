import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format numbers consistently between server and client to prevent hydration mismatches.
 * Uses a fixed locale and configuration to ensure deterministic output.
 */
export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    notation?: "standard" | "scientific" | "engineering" | "compact";
    unit?: string;
  } = {}
): string {
  const { decimals = 0, notation = "standard", unit = "" } = options;

  // Use 'en-US' locale to ensure consistent formatting between server and client
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: notation,
  });

  const formatted = formatter.format(value);
  return unit ? `${formatted}${unit}` : formatted;
}

/**
 * Format percentage values consistently
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return formatNumber(value * 100, { decimals, unit: "%" });
}

/**
 * Format scientific notation consistently
 */
export function formatScientific(value: number, decimals: number = 2): string {
  return formatNumber(value, { decimals, notation: "scientific" });
}
