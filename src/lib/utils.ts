import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Text colour class for a formatted change string like "+1.20%", "-0.4%", "Unavailable". */
export function changeClass(change?: string | null) {
  const v = change?.trim() ?? '';
  if (v.startsWith('+')) return 'text-up';
  if (v.startsWith('-')) return 'text-down';
  return 'text-white/40';
}
