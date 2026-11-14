export type EmailPayload = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
};
