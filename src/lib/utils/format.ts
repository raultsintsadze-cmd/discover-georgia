export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function formatCoordinate(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(4)}°${latitude >= 0 ? "N" : "S"}`;
  const lng = `${Math.abs(longitude).toFixed(4)}°${longitude >= 0 ? "E" : "W"}`;
  return `${lat}, ${lng}`;
}

export function formatDateRange(start: Date | string | null, end: Date | string | null): string {
  if (!start || !end) return "Dates not set";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startLabel = new Date(start).toLocaleDateString(undefined, opts);
  const endLabel = new Date(end).toLocaleDateString(undefined, opts);
  return `${startLabel} → ${endLabel}`;
}
