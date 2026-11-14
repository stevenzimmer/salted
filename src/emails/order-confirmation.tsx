import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from "react-email";
import type { CommerceCopy } from "../../sanity.types";
import { hasText, safeUrl } from "../sanity/lib/content";
import { money, pickupWindowLabel } from "../lib/format";

export type OrderEmailDetails = {
  number: string;
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  totalCents: number;
  pickup: {
    date: string;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  items: {
    name: string;
    variant: string;
    quantity: number;
    lineTotalCents: number;
  }[];
};
export type OrderConfirmationEmailProps = {
  order: OrderEmailDetails;
  audience: "customer" | "business";
  copy: CommerceCopy["orderEmail"] | null;
  pickupGuidance?: string | null;
  receiptUrl: string;
  confirmationUrl: string;
  wordmarkUrl: string;
};
export function OrderConfirmationEmail({
  order,
  audience,
  copy,
  pickupGuidance,
  receiptUrl,
  confirmationUrl,
  wordmarkUrl,
}: OrderConfirmationEmailProps) {
  const heading =
    audience === "customer" ? copy?.customerHeading : copy?.businessHeading;
  const body =
    audience === "customer" ? copy?.customerBody : copy?.businessBody;
  const directionsUrl = safeUrl(copy?.pickupDirectionsUrl);
  const guidance =
    audience === "customer" ? copy?.pickupGuidance : pickupGuidance;
  const pickupWindow = pickupWindowLabel(
    order.pickup.startTime,
    order.pickup.endTime,
  ).replace(/ PT$/, "");
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${order.pickup.date}T12:00:00Z`));
  return (
    <Html lang="en">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                cream: "#faf3e7",
                charcoal: "#292521",
                copper: "#945c39",
              },
            },
          },
        }}
      >
        <Head />
        <Body className="m-0 bg-cream px-3 py-8 font-serif text-charcoal">
          <Preview>{`${order.number} · ${date} · ${pickupWindow}`}</Preview>
          <Container className="mx-auto max-w-[560px]">
            <Img
              src={wordmarkUrl}
              alt="Salted Focaccia"
              width="240"
              height="73"
              className="mb-8"
            />
            {hasText(heading) ? (
              <Heading
                as="h1"
                className="text-[30px] font-normal leading-tight"
              >
                {heading}
              </Heading>
            ) : null}
            {hasText(body) ? (
              <Text className="text-base leading-7">{body}</Text>
            ) : null}
            <Text className="text-sm text-copper">
              {hasText(copy?.orderLabel) ? `${copy.orderLabel} ` : ""}
              {order.number}
            </Text>
            <Hr className="my-6 border-solid border-[#d9cebf]" />
            <Section>
              {hasText(copy?.pickupLabel) ? (
                <Heading as="h2" className="text-lg font-normal">
                  {copy.pickupLabel}
                </Heading>
              ) : null}
              <Text className="text-base leading-7">
                {date}
                <br />
                {pickupWindow}
              </Text>
              {audience === "customer" ? (
                <>
                  {hasText(copy?.pickupAddress) ? (
                    <Text className="whitespace-pre-line text-base leading-7">
                      {copy.pickupAddress}
                    </Text>
                  ) : null}
                  {directionsUrl && hasText(copy?.pickupDirectionsLabel) ? (
                    <Text>
                      <Link
                        href={directionsUrl}
                        className="text-sm text-copper underline"
                      >
                        {copy.pickupDirectionsLabel}
                      </Link>
                    </Text>
                  ) : null}
                </>
              ) : null}
              {hasText(guidance) ? (
                <Text className="whitespace-pre-line text-sm leading-6">
                  {guidance}
                </Text>
              ) : null}
            </Section>
            <Hr className="my-6 border-solid border-[#d9cebf]" />
            {order.items.map((item, index) => (
              <Row key={index} className="mb-4">
                <Column className="pr-4 text-sm leading-6">
                  {item.quantity} × {item.name}
                  <br />
                  {item.variant}
                </Column>
                <Column align="right" className="text-sm">
                  {money(item.lineTotalCents)}
                </Column>
              </Row>
            ))}
            <Text className="text-lg">
              {hasText(copy?.totalLabel) ? `${copy.totalLabel}: ` : ""}
              {money(order.totalCents)}
            </Text>
            {audience === "business" ? (
              <Section>
                {hasText(copy?.customerLabel) ? (
                  <Heading as="h2" className="text-lg font-normal">
                    {copy.customerLabel}
                  </Heading>
                ) : null}
                <Text className="text-sm leading-6">
                  {order.customerName ? (
                    <>
                      {order.customerName}
                      <br />
                    </>
                  ) : null}
                  {order.customerEmail}
                  {order.customerPhone ? (
                    <>
                      <br />
                      {order.customerPhone}
                    </>
                  ) : null}
                </Text>
              </Section>
            ) : null}
            {hasText(copy?.confirmationLink) ? (
              <Button
                href={confirmationUrl}
                className="box-border mt-5 bg-copper px-6 py-4 text-center text-sm text-cream"
              >
                {copy.confirmationLink}
              </Button>
            ) : null}
            {hasText(copy?.receiptLink) ? (
              <Text>
                <Link
                  href={receiptUrl}
                  className="text-sm text-copper underline"
                >
                  {copy.receiptLink}
                </Link>
              </Text>
            ) : null}
            {hasText(copy?.footer) ? (
              <>
                <Hr className="my-6 border-solid border-[#d9cebf]" />
                <Text className="text-sm leading-6">{copy.footer}</Text>
              </>
            ) : null}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
