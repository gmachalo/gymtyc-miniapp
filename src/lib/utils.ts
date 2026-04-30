import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTokens(amount: bigint | number): string {
  const n = typeof amount === "bigint" ? Number(amount) : amount;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatXp(xp: bigint | number): string {
  return formatTokens(xp);
}

export function levelFromXp(totalXp: bigint): number {
  const xp = Number(totalXp);
  // XP thresholds: 0, 100, 300, 700, 1500, 3000, 6000, 12000, ...
  const level = Math.floor(Math.log2(xp / 50 + 1)) + 1;
  return Math.max(1, Math.min(level, 50));
}

export function xpForNextLevel(currentLevel: number): number {
  return Math.floor(50 * (Math.pow(2, currentLevel) - 1));
}

export function shortAddress(address?: string | null): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
