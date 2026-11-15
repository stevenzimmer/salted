import { isRecord } from "./navigation";

// Initial editorial wording only; runtime emails always read published Sanity copy.
export const initialPickupReminderCopy = {
  reminderSubject: "Your Friday focaccia is calling",
  reminderHeading: "You have a hot date. With focaccia.",
  reminderBody:
    "Cancel your plans to forget your bread. It’s pickup Friday! Swing by during the window below, grab your order, and let your weekend get a little salty. Your delicious agenda is below.",
};

export function migratePickupReminderCopy(document: Record<string, unknown>) {
  const group = document.orderEmail;
  // Cleared groups and fields are editorial choices. Preserve drafts and edits.
  if (
    !isRecord(group) ||
    !Object.keys(group).some((key) => !key.startsWith("_"))
  )
    return null;
  const updates: Record<string, string> = {};
  for (const [key, value] of Object.entries(initialPickupReminderCopy)) {
    if (!(key in group)) updates[`orderEmail.${key}`] = value;
  }
  return Object.keys(updates).length ? updates : null;
}
