export function money(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  const n = Math.max(0, value);
  if (n >= 1_000_000) {
    const millions = n / 1_000_000;
    return `$${millions >= 10 ? millions.toFixed(1) : millions.toFixed(2)}M`;
  }
  if (n >= 100_000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function formatDust(value: number): string {
  return Math.floor(Math.max(0, value)).toLocaleString("en-US");
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${total}s`;
}
