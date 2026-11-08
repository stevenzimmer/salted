export function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function calendarDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function pickupLabel(key: string): string {
  return calendarDate(key).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Pickup times are already Pacific wall-clock values, not UTC instants.
export function pickupWindowLabel(startTime: string, endTime: string): string {
  const [start, end] = [startTime, endTime].map((time) => {
    const [hour, minute] = time.split(":").map(Number);
    return {
      label: `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, "0")}` : ""}`,
      period: hour < 12 ? "am" : "pm",
    };
  });
  return `${start.label}${start.period === end.period ? "" : start.period}–${end.label}${end.period} PT`;
}
