import {
  OrderConfirmationEmail,
  type OrderConfirmationEmailProps,
} from "./order-confirmation";

export type PickupReminderEmailProps = Omit<
  OrderConfirmationEmailProps,
  "audience" | "receiptUrl"
>;

// Share the confirmation's branding, pickup block and saved order summary.
export function PickupReminderEmail(props: PickupReminderEmailProps) {
  return (
    <OrderConfirmationEmail
      {...props}
      audience="customer"
      copy={{
        ...props.copy,
        customerHeading: props.copy?.reminderHeading,
        customerBody: props.copy?.reminderBody,
      }}
    />
  );
}
