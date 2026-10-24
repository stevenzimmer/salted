import type { Metadata } from "next";
import { PageIntro } from "@/components/content/page-intro";
import { SpecialOrderForm } from "@/components/special-orders/special-order-form";
import { specialOrderConfig } from "@/data/special-order-config";
import { money } from "@/lib/format";

export const metadata: Metadata = {
  title: "Special orders",
  description:
    "Something good for your gathering. Preview a Salted Focaccia special-order request.",
  alternates: { canonical: "/special-orders" },
};

export default function SpecialOrdersPage() {
  return (
    <div className="shell pb-24">
      <PageIntro
        eyebrow="For a few more around the table"
        title={"Big plans.\nVery good bread."}
        description="A celebration, a gathering, or just an excellent excuse. Tell us what you have in mind and let’s make room for something good."
      />
      <div className="special-order-layout">
        <aside className="special-order-aside">
          <h2>
            A little planning
            <br />
            goes a long way.
          </h2>
          <p className="mt-5 leading-relaxed">
            {specialOrderConfig.minimumMessage}
          </p>
          <dl>
            <div>
              <dt>Product minimum</dt>
              <dd>{money(specialOrderConfig.minimumProductSubtotal)}</dd>
            </div>
            <div>
              <dt>Special-order fee</dt>
              <dd>+ {money(specialOrderConfig.fee)}</dd>
            </div>
            <div>
              <dt>Lead time</dt>
              <dd>{specialOrderConfig.leadTimeDays}+ days</dd>
            </div>
          </dl>
          <p className="text-xs leading-relaxed">
            The fee is additional and does not count toward the product minimum.
            The lead time is temporary and subject to bakery confirmation.
          </p>
          <ol className="special-workflow">
            {specialOrderConfig.workflow.map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {step}
              </li>
            ))}
          </ol>
        </aside>
        <SpecialOrderForm />
      </div>
    </div>
  );
}
