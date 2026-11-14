import { EmailConfirmationAccess } from "@/components/commerce/email-confirmation-access";
import { getGlobalContent } from "@/sanity/lib/data";
export const dynamic = "force-dynamic";
export default async function OpenOrderPage() {
  const { commerce } = await getGlobalContent();
  return <EmailConfirmationAccess copy={commerce?.orderEmail} />;
}
