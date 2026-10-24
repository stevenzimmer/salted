"use client";

import { Calendar } from "@/components/ui/calendar";
import { calendarDate, dateKey, pickupLabel } from "@/lib/format";
import type { PickupDate } from "@/types/content";

export function PickupDatePicker({
  dates,
  selected,
  onSelect,
}: {
  dates: PickupDate[];
  selected?: string;
  onSelect: (date: string | undefined) => void;
}) {
  const keys = new Set(dates.map((date) => date.date));
  const lastDate = dates.at(-1);
  return (
    <div className="pickup-calendar">
      <Calendar
        mode="single"
        selected={selected ? calendarDate(selected) : undefined}
        onSelect={(date) => onSelect(date ? dateKey(date) : undefined)}
        defaultMonth={dates[0] ? calendarDate(dates[0].date) : new Date()}
        startMonth={dates[0] ? calendarDate(dates[0].date) : undefined}
        endMonth={lastDate ? calendarDate(lastDate.date) : undefined}
        disabled={(date) => !keys.has(dateKey(date))}
        showOutsideDays={false}
        className="salted-calendar"
      />
      <div className="calendar-key">
        <span />
        <p>Available for your whole bag</p>
      </div>
      <p className="sr-only" role="status">
        {selected
          ? `Selected ${pickupLabel(selected)}`
          : "Choose an available Friday for your complete order."}
      </p>
    </div>
  );
}
