import { formatDistanceToNow, format } from "date-fns";
import { tr } from "date-fns/locale";

export function formatTarih(date: Date | string): string {
  return format(new Date(date), "dd.MM.yyyy HH:mm", { locale: tr });
}

export function formatZamanOnce(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: tr });
}

export function formatSayi(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}b`;
  return num.toString();
}
