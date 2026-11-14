import { isRecord } from "./navigation";

export const specialOrderLiveCopy = {
  submit: "Send my request",
  submitting: "Sending…",
  submitError:
    "We couldn’t confirm your request. Please retry, or contact the bakery if the problem continues.",
  rateLimited:
    "Too many requests. Please wait a few minutes before trying again.",
  consentChanged:
    "The newsletter wording changed. Refresh and review it again, or uncheck the newsletter option to send your request.",
  note: "Your request is saved for bakery review. It does not confirm availability or place a paid order.",
  successEyebrow: "Request received",
  successHeading: "Your request\nis with us.",
  successBody:
    "Thank you for sharing your plans. Your request has been saved for the bakery to review.",
  successNote:
    "Every special order needs bakery approval before payment. Sending a request does not guarantee acceptance.",
  restart: "Send another request",
};
export const specialOrderNotificationCopy = {
  subject: "New special-order request",
  heading: "A new special-order request",
  nameLabel: "Name",
  emailLabel: "Email",
  phoneLabel: "Phone",
  dateLabel: "Requested date",
  productsLabel: "Products, quantities, occasion and notes",
  consentLabel: "Newsletter opt-in",
  footer:
    "Reply to this email to contact the customer. This request awaits bakery review and approval.",
};
const previousPreviewCopy: Record<string, string> = {
  submit: "Preview my request",
  note: "Preview form · your information stays in this browser and is not sent or persisted.",
  successEyebrow: "Looking good",
  successHeading: "Your request preview\nis ready.",
  successBody:
    "Your details passed the form check. This is a preview, so nothing was sent to the bakery or saved on a server.",
  successNote:
    "When special orders launch, the bakery will review each request before approval and payment. Submission won’t guarantee acceptance.",
  restart: "Start another preview",
};

// Replace only known preview wording; preserve custom/cleared copy and drafts.
export function activateSpecialOrderCopy(document: Record<string, unknown>) {
  const updates: Record<string, unknown> = {};
  if (isRecord(document.form)) {
    for (const [key, value] of Object.entries(specialOrderLiveCopy)) {
      if (
        !(key in document.form) ||
        (key in previousPreviewCopy &&
          document.form[key] === previousPreviewCopy[key])
      )
        updates[`form.${key}`] = value;
    }
  }
  if (!("notificationEmail" in document))
    updates.notificationEmail = specialOrderNotificationCopy;
  if (
    isRecord(document.seo) &&
    document.seo.description ===
      "Something good for your gathering. Preview a Salted Focaccia special-order request."
  )
    updates["seo.description"] =
      "Something good for your gathering. Send a Salted Focaccia special-order request for bakery review.";
  return Object.keys(updates).length ? updates : null;
}
