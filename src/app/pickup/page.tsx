import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { PageIntro } from "@/components/content/page-intro";
import { pickupConfig } from "@/data/pickup-config";

export const metadata: Metadata = {
  title: "Friday pickup",
  description:
    "Friday pickup, 2–6 pm in Rocklin, California. Plan your next Salted Focaccia Friday.",
  alternates: { canonical: "/pickup" },
};

export default function PickupPage() {
  return (
    <div className="shell pb-24">
      <PageIntro
        eyebrow="See you Friday"
        title={"Your weekend\nstarts with bread."}
        description="Pick your good stuff, choose your Friday, and swing by. We’ll keep the pickup details right here."
      />
      <div className="pickup-info-grid">
        <section className="pickup-info-card">
          <p className="eyebrow">The when</p>
          <h2>
            {pickupConfig.dayLabel}s.
            <br />
            {pickupConfig.hoursLabel}.
          </h2>
          <p>
            Orders close {pickupConfig.cutoffLabel}. Available dates depend on
            everything in your bag.
          </p>
        </section>
        <section className="pickup-location">
          <MapPin size={32} strokeWidth={1.1} />
          <p className="eyebrow mt-6">The where</p>
          <h2>{pickupConfig.city}</h2>
          <p>{pickupConfig.address}</p>
          <p className="mt-5 text-sm leading-relaxed">
            One pickup date covers your whole order. Need bread for different
            Fridays? Plan separate orders.
          </p>
          <Link className="inline-link mt-7" href="/#products">
            Plan your Friday <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
      <section className="policy-section">
        <p className="eyebrow">Before you head over</p>
        <h2>The pickup details.</h2>
        <p className="draft-note mt-3">
          Draft policies · bakery approval required before live orders.
        </p>
        <div className="policy-list">
          {pickupConfig.policies.map((policy) => (
            <section key={policy.title}>
              <h3>{policy.title}</h3>
              <p>{policy.copy}</p>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
